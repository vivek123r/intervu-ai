import { http, HttpResponse } from "msw";

import { buildCompletion, demoCompletion, demoReport, interviewQuestions } from "@/mocks/fixtures";
import { createJob, db, findReportById, nextId } from "@/mocks/db";
import type { AnswerCompletedPayload } from "@/types/realtime";
import type {
  InterviewReport,
  PracticeConfig,
  PracticeSession,
  SessionAnswer,
} from "@/types/domain";

function sessionNotFound() {
  return HttpResponse.json(
    { error: { code: "SESSION_NOT_FOUND", message: "That session could not be found.", details: {} } },
    { status: 404 },
  );
}

function reportNotFound() {
  return HttpResponse.json(
    { error: { code: "REPORT_NOT_FOUND", message: "That report is not ready yet.", details: {} } },
    { status: 404 },
  );
}

/** The demo report has an authored completion; anything finished live is derived, exactly
 * as Backend/'s completion service decides between the two. */
function completionFor(report: InterviewReport) {
  return report.id === demoCompletion.reportId
    ? demoCompletion
    : buildCompletion(report, db.sessions.get(report.sessionId));
}

function scoreFor(transcript: string) {
  return Math.min(9.2, 6.4 + transcript.trim().split(/\s+/).length / 45);
}

/** See docs/API-CONTRACT.md's Practice sessions and WebSocket contract sections. */
export const practiceHandlers = [
  http.post("*/sessions", async ({ request }) => {
    const config = (await request.json()) as PracticeConfig;
    const session: PracticeSession = {
      id: nextId("session"),
      status: "ready",
      config,
      questions: [],
      currentQuestionIndex: 0,
      answers: [],
    };
    db.sessions.set(session.id, session);
    return HttpResponse.json(session, { status: 201 });
  }),

  http.get("*/sessions/:id", ({ params }) => {
    const session = db.sessions.get(String(params.id));
    return session ? HttpResponse.json(session) : sessionNotFound();
  }),

  http.post("*/sessions/:id/start", ({ params }) => {
    const session = db.sessions.get(String(params.id));
    if (!session) return sessionNotFound();
    const started: PracticeSession = {
      ...session,
      status: "active",
      questions: interviewQuestions,
      startedAt: new Date().toISOString(),
    };
    db.sessions.set(started.id, started);
    return HttpResponse.json(started);
  }),

  http.post("*/sessions/:id/answers", async ({ params, request }) => {
    const session = db.sessions.get(String(params.id));
    if (!session) return sessionNotFound();
    const payload = (await request.json()) as AnswerCompletedPayload;
    const question = session.questions[session.currentQuestionIndex];
    if (!question) return HttpResponse.json(session);

    const durationSeconds = Math.max(1, Math.round(payload.durationMs / 1000));
    const answer: SessionAnswer = {
      questionId: question.id,
      question: question.text,
      transcript: payload.transcript,
      durationSeconds,
      score: scoreFor(payload.transcript),
    };
    const updated: PracticeSession = {
      ...session,
      currentQuestionIndex: Math.min(session.currentQuestionIndex + 1, session.questions.length - 1),
      answers: [...session.answers, answer],
    };
    db.sessions.set(updated.id, updated);
    return HttpResponse.json(updated);
  }),

  http.post("*/sessions/:id/complete", ({ params }) => {
    const sessionId = String(params.id);
    const session = db.sessions.get(sessionId);
    if (!session) return sessionNotFound();

    db.sessions.set(sessionId, { ...session, status: "completed" });
    const report = {
      ...demoReport,
      id: nextId("report"),
      sessionId,
      createdAt: new Date().toISOString(),
    };
    db.reportsBySessionId.set(sessionId, report);
    const job = createJob("report_generation", report.id);
    return HttpResponse.json({ jobId: job.id, type: job.type, sessionId }, { status: 202 });
  }),

  http.get("*/sessions/:id/report", ({ params }) => {
    const report = db.reportsBySessionId.get(String(params.id));
    return report ? HttpResponse.json(report) : reportNotFound();
  }),

  // Keyed by report id, unlike the session-scoped endpoint above — see
  // docs/API-CONTRACT.md's `GET /reports/{id}` section.
  http.get("*/reports/:id", ({ params }) => {
    const report = findReportById(String(params.id));
    return report ? HttpResponse.json(report) : reportNotFound();
  }),

  // The completion screen — see docs/API-CONTRACT.md's `GET /reports/{id}/completion`.
  http.get("*/reports/:id/completion", ({ params }) => {
    const report = findReportById(String(params.id));
    return report ? HttpResponse.json(completionFor(report)) : reportNotFound();
  }),

  http.get("*/sessions/:id/completion", ({ params }) => {
    const report = db.reportsBySessionId.get(String(params.id));
    return report ? HttpResponse.json(completionFor(report)) : reportNotFound();
  }),

  http.post("*/sessions/:id/socket-ticket", ({ params }) => {
    if (!db.sessions.has(String(params.id))) return sessionNotFound();
    return HttpResponse.json({
      ticket: nextId("ticket"),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
  }),
];
