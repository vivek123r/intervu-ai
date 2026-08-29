import { describe, expect, it } from "vitest";

import { reportChatResponseSchema, reportConversationSchema } from "@/types/contracts/practice";
import type { PracticeConfig } from "@/types/domain";

/**
 * Post-interview voice/text Q&A about a completed report — see
 * docs/API-CONTRACT.md's Practice sessions section.
 */
const API = "http://localhost:8000/api/v1";

const config: PracticeConfig = {
  role: "Senior Backend Engineer",
  company: "Northstar Labs",
  type: "system_design",
  difficulty: "hard",
  duration: 30,
  focusAreas: ["System design"],
  interviewerStyle: "Senior engineer",
};

async function completeALiveSession() {
  const session = await fetch(`${API}/sessions`, {
    method: "POST",
    body: JSON.stringify(config),
  }).then((response) => response.json());

  const started = await fetch(`${API}/sessions/${session.id}/start`, { method: "POST" }).then(
    (response) => response.json(),
  );
  const questionId = started.questions[0].id as string;

  await fetch(`${API}/sessions/${session.id}/answers`, {
    method: "POST",
    body: JSON.stringify({
      questionId,
      transcript: "We cached the account summary and invalidated it on writes.",
      startedAt: "2026-08-15T02:00:00.000Z",
      endedAt: "2026-08-15T02:01:30.000Z",
      durationMs: 90_000,
    }),
  });

  await fetch(`${API}/sessions/${session.id}/complete`, { method: "POST" });
  const report = await fetch(`${API}/sessions/${session.id}/report`).then((response) =>
    response.json(),
  );
  return { reportId: report.id as string, questionId };
}

describe("GET/POST /reports/{id}/chat", () => {
  it("starts with an empty thread", async () => {
    const { reportId } = await completeALiveSession();

    const thread = reportConversationSchema.parse(
      await fetch(`${API}/reports/${reportId}/chat`).then((response) => response.json()),
    );
    expect(thread.reportId).toBe(reportId);
    expect(thread.turns).toEqual([]);
  });

  it("answers a message and persists both turns", async () => {
    const { reportId } = await completeALiveSession();

    const response = await fetch(`${API}/reports/${reportId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message: "Why did I get this score?" }),
    });
    expect(response.status).toBe(200);

    const body = reportChatResponseSchema.parse(await response.json());
    expect(body.reply.speaker).toBe("assistant");
    expect(body.reply.text.length).toBeGreaterThan(0);
    expect(body.turns).toHaveLength(2);
    expect(body.turns[0]).toMatchObject({
      speaker: "candidate",
      text: "Why did I get this score?",
    });

    const thread = reportConversationSchema.parse(
      await fetch(`${API}/reports/${reportId}/chat`).then((res) => res.json()),
    );
    expect(thread.turns).toHaveLength(2);
  });

  it("carries the question id through when grounded in a specific question", async () => {
    const { reportId, questionId } = await completeALiveSession();

    const body = await fetch(`${API}/reports/${reportId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message: "Why this score?", questionId }),
    }).then((response) => response.json());

    expect(body.turns[0].questionId).toBe(questionId);
    expect(body.reply.questionId).toBe(questionId);
  });

  it("404s with REPORT_NOT_FOUND for a report that does not exist", async () => {
    const response = await fetch(`${API}/reports/report-nope/chat`);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("REPORT_NOT_FOUND");
  });
});
