export type InterviewStatus =
  | "detected"
  | "confirmed"
  | "upcoming"
  | "completed"
  | "cancelled";

export type InterviewType =
  | "technical"
  | "behavioral"
  | "system_design"
  | "hiring_manager"
  | "recruiter";

export interface InterviewRound {
  id: string;
  name: string;
  type: InterviewType;
  status: "completed" | "current" | "pending";
}

export interface Interview {
  id: string;
  company: string;
  companyMark: string;
  role: string;
  type: InterviewType;
  round: string;
  roundNumber: number;
  totalRounds: number;
  scheduledAt: string;
  timezone: string;
  durationMinutes: number;
  meetingUrl?: string;
  recruiter?: string;
  interviewers?: string[];
  status: InterviewStatus;
  readiness: number;
  preparationProgress: number;
  location: string;
  accent: string;
  rounds: InterviewRound[];
}

export interface PreparationTask {
  id: string;
  day: number;
  dateLabel: string;
  phase: string;
  category: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "normal";
}

export interface TopicMetric {
  topic: string;
  score: number;
  trend: number;
  relevance: "critical" | "high" | "normal";
}

export interface Question {
  id: string;
  text: string;
  category: string;
  topic: string;
  difficulty: "easy" | "normal" | "hard" | "brutal";
  followUp?: boolean;
}

export interface SessionAnswer {
  questionId: string;
  question: string;
  transcript: string;
  durationSeconds: number;
  score: number;
}

export interface PracticeConfig {
  role: string;
  company: string;
  type: InterviewType;
  difficulty: "easy" | "normal" | "hard" | "brutal";
  duration: number;
  focusAreas: string[];
  interviewerStyle: string;
}

export interface PracticeSession {
  id: string;
  status: "ready" | "active" | "processing" | "completed";
  config: PracticeConfig;
  questions: Question[];
  currentQuestionIndex: number;
  answers: SessionAnswer[];
  startedAt?: string;
}

export interface AnswerReview {
  question: string;
  answer: string;
  score: number;
  strengths: string[];
  missing: string[];
  betterStructure: string[];
}

export interface InterviewReport {
  id: string;
  sessionId: string;
  createdAt: string;
  overall: number;
  technical: number;
  communication: number;
  structure: number;
  clarity: number;
  relevance: number;
  depth: number;
  summary: string;
  speech: {
    averageWpm: number;
    fillerCount: number;
    fillers: Record<string, number>;
    longPauses: number;
    longestPause: number;
    averageAnswerSeconds: number;
  };
  weakTopics: string[];
  strengths: string[];
  recommendedActions: string[];
  answers: AnswerReview[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionHref?: string;
}

export interface ProductState {
  signedIn: boolean;
  onboardingCompleted: boolean;
  calendarConnected: boolean;
  calendarLastSync: string | null;
  userName: string;
  interviews: Interview[];
  selectedInterviewId: string;
  preparationTasks: PreparationTask[];
  resumeName: string | null;
  jobDescription: string;
  session: PracticeSession | null;
  reports: InterviewReport[];
  notifications: NotificationItem[];
}
