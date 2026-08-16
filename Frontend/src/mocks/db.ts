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

function loadInitialInterviews(): Interview[] {
  if (typeof window === "undefined") {
    return demoInterviews.map((interview) => ({ ...interview }));
  }
  try {
    const raw = window.localStorage.getItem("intervu_google_calendar_interviews");
    if (raw) {
      const parsed = JSON.parse(raw) as Interview[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback to demo
  }
  return demoInterviews.map((interview) => ({ ...interview }));
}

function loadInitialCalendarConnection(): CalendarConnection {
  if (typeof window === "undefined") return { ...demoCalendarConnection };
  try {
    const email = window.localStorage.getItem("intervu_google_calendar_email");
    const token = window.localStorage.getItem("intervu_google_calendar_token");
    const lastSync = window.localStorage.getItem("intervu_google_calendar_last_sync");
    if (token && email) {
      return {
        connected: true,
        provider: "google",
        accountEmail: email,
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        lastSyncAt: lastSync || new Date().toISOString(),
        status: "healthy",
      };
    }
  } catch {
    // fallback
  }
  return { ...demoCalendarConnection };
}

/**
 * The in-memory "backend" MSW handlers read and mutate. Fresh per browser session (or per
 * Vitest module load) — this is a mock, not a persistence layer. Seeded from src/mocks/fixtures.ts
 * or real Google Calendar data stored in localStorage.
 */
export const db = {
  interviews: loadInitialInterviews(),
  tasks: demoTasks.map((task) => ({ ...task })) as PreparationTask[],
  notifications: demoNotifications.map((item) => ({ ...item })) as NotificationItem[],
  user: { ...demoUser } as User,
  calendarConnection: loadInitialCalendarConnection(),
  resume: null as Resume | null,
  jobDescriptionAnalyses: new Map<string, JobDescriptionAnalysis>([
    [demoJobDescriptionAnalysis.id, demoJobDescriptionAnalysis],
  ]),
  /** Latest analysis per interview — mirrors Backend/'s job_descriptions.interview_id. */
  jobDescriptionAnalysesByInterview: new Map<string, JobDescriptionAnalysis>([
    ["interview-northstar", demoJobDescriptionAnalysis],
  ]),
  jobs: new Map<string, MockJob>(),
  preparationTimeline,
  sessions: new Map<string, PracticeSession>(),
  /** Keyed by sessionId, matching how GET /sessions/{id}/report is actually looked up. */
  reportsBySessionId: new Map<string, InterviewReport>([[demoReport.sessionId, demoReport]]),
};

export function syncDbFromGoogleCalendar(email: string, interviews: Interview[]) {
  db.calendarConnection = {
    connected: true,
    provider: "google",
    accountEmail: email,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    lastSyncAt: new Date().toISOString(),
    status: "healthy",
  };
  if (interviews.length > 0) {
    db.interviews = [...interviews];
  }
}

export function resetDbCalendarToDemo() {
  db.calendarConnection = { ...demoCalendarConnection };
  db.interviews = demoInterviews.map((interview) => ({ ...interview }));
}

export function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** GET /reports/{id} looks up by report id, unlike reportsBySessionId's session-id key. */
export function findReportById(reportId: string): InterviewReport | undefined {
  return [...db.reportsBySessionId.values()].find((report) => report.id === reportId);
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
