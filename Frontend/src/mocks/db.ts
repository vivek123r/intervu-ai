import {
  demoCalendarConnection,
  demoInterviews,
  demoJobDescriptionAnalysis,
  demoReport,
  demoTasks,
  demoUser,
  notifications as demoNotifications,
  preparationTimeline,
} from "@/mocks/fixtures";
import type {
  CalendarConnection,
  Interview,
  InterviewReport,
  JobDescriptionAnalysis,
  JobStatus,
  JobType,
  NotificationItem,
  PracticeSession,
  PreparationTask,
  Resume,
  User,
} from "@/types/domain";

export interface MockJob {
  id: string;
  type: JobType;
  resultId: string;
  createdAt: number;
}

/**
 * The in-memory "backend" MSW handlers read and mutate. Fresh per browser session (or per
 * Vitest module load) — this is a mock, not a persistence layer. Seeded from src/mocks/fixtures.ts
 * so it starts consistent with everything statically imported elsewhere during the migration.
 */
export const db = {
  interviews: demoInterviews.map((interview) => ({ ...interview })) as Interview[],
  tasks: demoTasks.map((task) => ({ ...task })) as PreparationTask[],
  notifications: demoNotifications.map((item) => ({ ...item })) as NotificationItem[],
  user: { ...demoUser } as User,
  calendarConnection: { ...demoCalendarConnection } as CalendarConnection,
  resume: null as Resume | null,
  jobDescriptionAnalyses: new Map<string, JobDescriptionAnalysis>([
    [demoJobDescriptionAnalysis.id, demoJobDescriptionAnalysis],
  ]),
  jobs: new Map<string, MockJob>(),
  preparationTimeline,
  sessions: new Map<string, PracticeSession>(),
  /** Keyed by sessionId, matching how GET /sessions/{id}/report is actually looked up. */
  reportsBySessionId: new Map<string, InterviewReport>([[demoReport.sessionId, demoReport]]),
};

export function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Jobs "process" for ~1.2s of wall-clock time so a real poller sees a processing state. */
const JOB_DURATION_MS = 1200;

export function createJob(type: JobType, resultId: string): MockJob {
  const job: MockJob = { id: nextId("job"), type, resultId, createdAt: Date.now() };
  db.jobs.set(job.id, job);
  return job;
}

export function readJobStatus(job: MockJob): { status: JobStatus; progress: number } {
  const elapsed = Date.now() - job.createdAt;
  const progress = Math.min(1, elapsed / JOB_DURATION_MS);
  return { status: progress >= 1 ? "completed" : "processing", progress };
}
