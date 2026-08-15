export const sessionStates = [
  "created",
  "ready",
  "introduction",
  "resume",
  "technical",
  "behavioral",
  "candidate_questions",
  "wrap_up",
  "processing",
  "completed",
] as const;

export type SessionState = (typeof sessionStates)[number];

export const clientEventTypes = [
  "heartbeat",
  "session.start",
  "answer.started",
  "answer.partial_transcript",
  "answer.completed",
  "question.repeat",
  "session.end",
] as const;

export const serverEventTypes = [
  "heartbeat.ack",
  "session.ready",
  "session.started",
  "section.changed",
  "question.created",
  "question.started",
  "interviewer.thinking",
  "interviewer.response",
  "session.warning",
  "session.completed",
  "analysis.started",
  "analysis.progress",
  "analysis.completed",
  "error",
] as const;

export type ClientEventType = (typeof clientEventTypes)[number];
export type ServerEventType = (typeof serverEventTypes)[number];

/**
 * Every WebSocket frame — both directions — uses this envelope, with camelCase
 * field names throughout. See docs/API-CONTRACT.md for the full realtime contract.
 */
export interface SocketEnvelope<
  TType extends string = string,
  TPayload = Record<string, unknown>,
> {
  type: TType;
  payload: TPayload;
  sentAt: string;
  requestId?: string;
}

export interface QuestionCreatedPayload {
  id: string;
  text: string;
  topic: string;
  difficulty: "easy" | "normal" | "hard" | "brutal";
  isFollowUp: boolean;
  position: number;
  totalPlanned: number;
}

export interface AnswerCompletedPayload {
  questionId: string;
  transcript: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  pauseMarkersMs?: number[];
}

export interface AnalysisProgressPayload {
  jobId: string;
  progress: number;
  phase: "transcript" | "technical" | "communication" | "recommendations" | "complete";
  message: string;
}
