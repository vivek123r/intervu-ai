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

    const totalWords = session.answers.reduce(
      (sum, a) => sum + (a.transcript ? a.transcript.trim().split(/\s+/).filter(Boolean).length : 0),
      0,
    );
    const totalSeconds = session.answers.reduce((sum, a) => sum + (a.durationSeconds || 0), 0);
    const averageWpm = totalSeconds ? Math.round((totalWords / totalSeconds) * 60) : 0;
    const scores = session.answers.map((a) => a.score ?? 7.0);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 7.0;
    const overall = Math.round(avgScore * 10);

    const reportAnswers =
      session.answers.length > 0
        ? session.answers.map((a, idx) => ({
            question: a.question || `Question ${idx + 1}`,
            answer: a.transcript || "",
            score: Number((a.score ?? 7.0).toFixed(1)),
            strengths:
              (a.score ?? 7.0) >= 8.0
                ? ["Detailed and concrete explanation", "Addressed core architectural trade-offs"]
                : ["Addressed the prompt directly with relevant experience"],
            missing:
              (a.score ?? 7.0) >= 8.0
                ? ["Operational alerting and observability thresholds"]
                : ["Measurable impact metric", "Explicit scale considerations"],
            betterStructure: ["Context", "Decision", "Trade-off", "Measurable result"],
          }))
        : demoReport.answers;

    const report: InterviewReport = {
      id: nextId("report"),
      sessionId,
      createdAt: new Date().toISOString(),
      overall: session.answers.length > 0 ? overall : demoReport.overall,
      technical: session.answers.length > 0 ? overall : demoReport.technical,
      communication: session.answers.length > 0 ? Math.min(100, overall + 2) : demoReport.communication,
      structure: session.answers.length > 0 ? Math.max(0, overall - 5) : demoReport.structure,
      clarity: session.answers.length > 0 ? Math.min(100, overall + 4) : demoReport.clarity,
      relevance: session.answers.length > 0 ? overall : demoReport.relevance,
      depth: session.answers.length > 0 ? Math.max(0, overall - 3) : demoReport.depth,
      summary:
        session.answers.length > 0
          ? `Clear technical explanations across ${session.answers.length} answered question${session.answers.length === 1 ? "" : "s"}. State decisions and trade-offs explicitly upfront to improve readiness.`
          : demoReport.summary,
      speech: {
        averageWpm: session.answers.length > 0 ? averageWpm : demoReport.speech.averageWpm,
        fillerCount: session.answers.length > 0 ? Math.max(0, Math.round(totalWords / 45)) : demoReport.speech.fillerCount,
        fillers: demoReport.speech.fillers,
        longPauses: demoReport.speech.longPauses,
        longestPause: demoReport.speech.longestPause,
        averageAnswerSeconds:
          session.answers.length > 0
            ? Math.round(totalSeconds / session.answers.length)
            : demoReport.speech.averageAnswerSeconds,
      },
      weakTopics:
        session.config.focusAreas && session.config.focusAreas.length
          ? session.config.focusAreas
          : demoReport.weakTopics,
      strengths: demoReport.strengths,
      recommendedActions: demoReport.recommendedActions,
      answers: reportAnswers,
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
