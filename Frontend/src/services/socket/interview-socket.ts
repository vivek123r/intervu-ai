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

  constructor(
    private readonly sessionId: string,
    private readonly getTicket: () => Promise<string>,
    private readonly baseUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000",
  ) {}

  async connect() {
    this.manuallyClosed = false;
    this.emitStatus(this.reconnectAttempt ? "reconnecting" : "connecting");
    const ticket = await this.getTicket();
    this.socket = new WebSocket(
      `${this.baseUrl}/ws/interviews/${this.sessionId}?ticket=${encodeURIComponent(ticket)}`,
    );
    this.socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      this.emitStatus("connected");
      this.startHeartbeat();
    });
    this.socket.addEventListener("message", (message) => {
      const event = JSON.parse(String(message.data)) as SocketEnvelope<ServerEventType>;
      this.eventListeners.forEach((listener) => listener(event));
    });
    this.socket.addEventListener("close", () => {
      this.stopHeartbeat();
      if (!this.manuallyClosed) this.scheduleReconnect();
    });
    this.socket.addEventListener("error", () => this.socket?.close());
  }

  send<TPayload>(type: ClientEventType, payload: TPayload) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    const envelope: SocketEnvelope<ClientEventType, TPayload> = {
      type,
      payload,
      sentAt: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    };
    this.socket.send(JSON.stringify(envelope));
    return true;
  }

  sendAnswer(payload: AnswerCompletedPayload) {
    return this.send("answer.completed", payload);
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
