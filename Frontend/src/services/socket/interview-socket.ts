import type {
  AnswerCompletedPayload,
  ClientEventType,
  ServerEventType,
  SocketEnvelope,
} from "@/types/realtime";

type EventListener = (event: SocketEnvelope<ServerEventType>) => void;
type StatusListener = (status: "connecting" | "connected" | "reconnecting" | "offline") => void;

export class InterviewSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private manuallyClosed = false;
  private eventListeners = new Set<EventListener>();
  private statusListeners = new Set<StatusListener>();

  private pendingMessages: string[] = [];

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

          // Flush queued messages upon connection
          while (this.pendingMessages.length > 0) {
            const msg = this.pendingMessages.shift();
            if (msg && ws.readyState === WebSocket.OPEN) {
              ws.send(msg);
            }
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
      return true;
    }

    // If socket is connecting or reconnecting, buffer message for delivery
    if (!this.manuallyClosed) {
      this.pendingMessages.push(raw);
      return true;
    }

    return false;
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
    this.reconnectAttempt += 1;
    this.emitStatus("reconnecting");
    const delay = Math.min(10_000, 700 * 2 ** (this.reconnectAttempt - 1));
    this.reconnectTimer = window.setTimeout(() => void this.connect(), delay);
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
