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

export interface SocketEnvelope<
  TType extends string = string,
  TPayload = Record<string, unknown>,
> {
  type: TType;
  payload: TPayload;
  sent_at: string;
  request_id?: string;
}

export interface QuestionCreatedPayload {
  id: string;
  text: string;
  topic: string;
  difficulty: "easy" | "normal" | "hard" | "brutal";
  is_follow_up: boolean;
  position: number;
  total_planned: number;
}

export interface AnswerCompletedPayload {
  question_id: string;
  transcript: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  pause_markers_ms?: number[];
}

export interface AnalysisProgressPayload {
  job_id: string;
  progress: number;
  phase:
    | "transcript"
    | "technical"
    | "communication"
    | "recommendations"
    | "complete";
  message: string;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    request_id?: string;
  };
}
