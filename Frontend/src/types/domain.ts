import type { CodeArtifact } from "@/types/realtime";

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
  codeArtifact?: CodeArtifact;
}

export interface PracticeConfig {
  role: string;
  company: string;
  type: InterviewType;
  difficulty: "easy" | "normal" | "hard" | "brutal";
  duration: number;
  focusAreas: string[];
  interviewerStyle: string;
  resumeId?: string;
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

/**
 * Client-only state that has no server representation — everything else (interviews,
 * preparation tasks, reports, notifications) lives in the RTK Query cache instead. See
 * docs/STATE-MANAGEMENT.md. This type still backs the pre-migration `product-store.tsx`
 * Context for features not yet moved over.
 */
export interface ProductState {
  signedIn: boolean;
  onboardingCompleted: boolean;
  calendarConnected: boolean;
  calendarLastSync: string | null;
  userName: string;
  userEmail: string | null;
  userPhotoUrl: string | null;
  preparationTasks: PreparationTask[];
  resumeName: string | null;
  jobDescription: string;
  session: PracticeSession | null;
  reports: InterviewReport[];
  notifications: NotificationItem[];
}

// --- Types beyond the original product-store model, backing the RTK Query API layer ---
// See docs/API-CONTRACT.md for the endpoints that return these shapes.

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  targetRole: string;
  experienceLevel: "early" | "mid" | "senior" | "staff";
  preferredLanguage: string;
  skills: string[];
  onboardingCompleted: boolean;
  createdAt: string;
}

export type CalendarConnectionStatus = "healthy" | "expired" | "error";

export interface CalendarConnection {
  connected: boolean;
  provider: "google" | null;
  accountEmail: string | null;
  scopes: string[];
  lastSyncAt: string | null;
  status: CalendarConnectionStatus | null;
}

export interface Resume {
  id: string;
  fileName: string;
  parsedSkills: string[];
  uploadedAt: string;
  summary?: string | null;
  keyHighlights?: string[];
  experiencePoints?: string[];
  domainStrengths?: string[];
  education?: string[];
  certifications?: string[];
  projects?: string[];
  rawText?: string | null;
}

export interface SkillMatrixEntry {
  skill: string;
  candidateScore: number;
  roleScore: number;
}

export interface JobDescriptionAnalysis {
  id: string;
  overallMatch: number;
  summary: string;
  skillMatrix: SkillMatrixEntry[];
  createdAt: string;
}

export interface PreparationTimelineStep {
  day: number;
  label: string;
  phase: string;
  status: "complete" | "active" | "upcoming";
}

export interface PreparationPlan {
  tasks: PreparationTask[];
  questions: Question[];
  timeline: PreparationTimelineStep[];
}

export type JobType =
  | "calendar_sync"
  | "preparation_generation"
  | "report_generation"
  | "resume_parsing";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface ProcessingJob {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  resultId: string | null;
  error: string | null;
}

export interface DashboardOverview {
  nextInterview: Interview | null;
  upcomingInterviews: Interview[];
  todayTasks: PreparationTask[];
  weakTopics: TopicMetric[];
  streakDays: number;
  scoreTrend: number[];
  readinessDeltaThisWeek: number;
}

export interface AnalyticsMicroMetric {
  key: string;
  label: string;
  value: number;
  delta: string;
  trend: number[];
}

export interface AnalyticsRecentSession {
  reportId: string;
  company: string;
  mode: string;
  score: number;
  completedAt: string;
}

/** How a history metric reads at a glance — drives its colour, not its value. */
export type HistoryMetricTone = "positive" | "neutral" | "caution" | "critical";

export interface HistoryMetric {
  key: string;
  label: string;
  /** Already display-ready ("High", "94%", "Stable") — the scale differs per metric. */
  value: string;
  tone: HistoryMetricTone;
}

export type HistoryStatus = "completed" | "processing" | "abandoned";

export interface HistorySession {
  id: string;
  code: string;
  company: string;
  role: string;
  mode: string;
  startedAt: string;
  durationMinutes: number;
  score: number;
  status: HistoryStatus;
  /** null while the session is still processing — there is no report to open yet. */
  reportId: string | null;
  metrics: HistoryMetric[];
}

export interface AnalyticsOverview {
  overallScore: number;
  readinessScore: number;
  streakDays: number;
  improvementPercent: number;
  scoreTrend: number[];
  readinessTrend: number[];
  microMetrics: AnalyticsMicroMetric[];
  topicPerformance: TopicMetric[];
  recentSessions: AnalyticsRecentSession[];
}
