import type {
  AnswerCompletedPayload,
  ClientEventType,
  ServerEventType,
  SocketEnvelope,
} from "@/types/realtime";

type EventListener = (event: SocketEnvelope<ServerEventType>) => void;

/** Whether a frame actually went out, was held for the next connection, or was
 * discarded because the client is closed. */
export type SendResult = "sent" | "buffered" | "dropped";

const MAX_PENDING_MESSAGES = 32;
const PENDING_MESSAGE_TTL_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 8;
type StatusListener = (status: "connecting" | "connected" | "reconnecting" | "offline") => void;

export class InterviewSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private manuallyClosed = false;
  private eventListeners = new Set<EventListener>();
  private statusListeners = new Set<StatusListener>();

  // Buffered while the socket is down. Bounded and timestamped: an unbounded,
  // untimestamped queue meant a minutes-old `answer.completed` was replayed
  // verbatim on reconnect, which only ever worked because the server rejects
  // duplicate answers.
  private pendingMessages: Array<{ raw: string; queuedAt: number }> = [];

  constructor(
    private readonly sessionId: string,
    private readonly getTicket: () => Promise<string>,
    private readonly baseUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000",
  ) {}

  async connect(): Promise<void> {
    this.manuallyClosed = false;
    this.emitStatus(this.reconnectAttempt ? "reconnecting" : "connecting");
    const ticket = await this.getTicket();

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutTimer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("WebSocket connection timeout"));
        }
      }, 8000);

      try {
        const ws = new WebSocket(
          `${this.baseUrl}/ws/interviews/${this.sessionId}?ticket=${encodeURIComponent(ticket)}`,
        );
        this.socket = ws;

        ws.addEventListener("open", () => {
          this.reconnectAttempt = 0;
          this.emitStatus("connected");
          this.startHeartbeat();

          // Flush what's still worth sending. A frame that has been sitting in
          // the buffer longer than the interview loop's own patience is stale by
          // definition — replaying it just confuses the turn it lands in.
          const now = Date.now();
          const queued = this.pendingMessages;
          this.pendingMessages = [];
          for (const message of queued) {
            if (now - message.queuedAt > PENDING_MESSAGE_TTL_MS) continue;
            if (ws.readyState === WebSocket.OPEN) ws.send(message.raw);
          }

          if (!settled) {
            settled = true;
            window.clearTimeout(timeoutTimer);
            resolve();
          }
        });

        ws.addEventListener("message", (message) => {
          try {
            const event = JSON.parse(String(message.data)) as SocketEnvelope<ServerEventType>;
            this.eventListeners.forEach((listener) => listener(event));
          } catch (e) {
            console.warn("Failed to parse WebSocket message:", e);
          }
        });

        ws.addEventListener("close", () => {
          this.stopHeartbeat();
          if (!this.manuallyClosed) this.scheduleReconnect();
        });

        ws.addEventListener("error", (err) => {
          if (!settled) {
            settled = true;
            window.clearTimeout(timeoutTimer);
            reject(err);
          }
          this.socket?.close();
        });
      } catch (err) {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeoutTimer);
          reject(err);
        }
      }
    });
  }

  send<TPayload>(type: ClientEventType, payload: TPayload) {
    const envelope: SocketEnvelope<ClientEventType, TPayload> = {
      type,
      payload,
      sentAt: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    };
    const raw = JSON.stringify(envelope);

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(raw);
      return "sent";
    }

    // Connecting or reconnecting — hold it for the flush on open. Callers get
    // "buffered" rather than `true`, so they can tell delivery from a promise
    // of delivery.
    if (!this.manuallyClosed) {
      if (this.pendingMessages.length >= MAX_PENDING_MESSAGES) {
        this.pendingMessages.shift();
      }
      this.pendingMessages.push({ raw, queuedAt: Date.now() });
      return "buffered";
    }

    return "dropped";
  }

  sendAnswer(payload: AnswerCompletedPayload) {
    return this.send("answer.completed", payload);
  }

  sendSpeechCompleted(context?: string) {
    return this.send("speech.completed", { context: context ?? "tts_finished" });
  }

  resumeSession() {
    return this.send("session.resume", {});
  }

  subscribe(listener: EventListener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  close() {
    this.manuallyClosed = true;
    this.stopHeartbeat();
    this.pendingMessages = [];
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.emitStatus("offline");
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      // Give up out loud. Retrying forever against a backend that is down just
      // leaves the UI saying "reconnecting" with no end.
      this.emitStatus("offline");
      return;
    }
    this.reconnectAttempt += 1;
    this.emitStatus("reconnecting");
    const delay = Math.min(10_000, 700 * 2 ** (this.reconnectAttempt - 1));
    this.reconnectTimer = window.setTimeout(() => {
      // `connect()` awaits `getTicket()` *before* constructing the WebSocket, so
      // a rejected ticket mutation (expired auth, backend down) used to reject
      // this promise with nothing attached: no `close` event ever fired, nothing
      // rescheduled, and the status stayed "reconnecting" forever.
      this.connect().catch(() => this.scheduleReconnect());
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => this.send("heartbeat", {}), 20_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private emitStatus(status: "connecting" | "connected" | "reconnecting" | "offline") {
    this.statusListeners.forEach((listener) => listener(status));
  }
}
