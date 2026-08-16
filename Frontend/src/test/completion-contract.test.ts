import { describe, expect, it } from "vitest";

import { sessionCompletionSchema } from "@/types/contracts/practice";
import type { PracticeConfig } from "@/types/domain";

/**
 * The completion screen reads one endpoint, so the mock's payload and the contract's zod
 * schema agreeing is the whole safety net between MSW mode and the real backend — see
 * docs/API-CONTRACT.md's `GET /reports/{id}/completion`.
 */
const API = "http://localhost:8000/api/v1";

const DIMENSION_KEYS = ["quality", "relevance", "structure", "depth", "communication", "clarity"];

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

  await fetch(`${API}/sessions/${session.id}/answers`, {
    method: "POST",
    body: JSON.stringify({
      questionId: started.questions[0].id,
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
  return report.id as string;
}

describe("GET /reports/{id}/completion", () => {
  it("serves the demo completion in the documented shape", async () => {
    const response = await fetch(`${API}/reports/report-demo-01/completion`);
    expect(response.status).toBe(200);

    const completion = sessionCompletionSchema.parse(await response.json());

    expect(completion.code).toBe("IVU-7429-A");
    expect(completion.mode).toBe("System design mock");
    expect(completion.overall).toMatchObject({ score: 82, band: "Interview ready", topPercent: 12 });
    expect(completion.metrics.map((metric) => metric.key)).toEqual(DIMENSION_KEYS);
    expect(completion.signature.map((axis) => axis.key)).toEqual(DIMENSION_KEYS);
    expect(completion.questions.map((question) => question.verdict)).toEqual([
      "strong",
      "solid",
    ]);
  });

  it("renders the same payload whether keyed by report or by session", async () => {
    const byReport = await fetch(`${API}/reports/report-demo-01/completion`).then((response) =>
      response.json(),
    );
    const bySession = await fetch(`${API}/sessions/session-demo-01/completion`).then((response) =>
      response.json(),
    );

    expect(bySession).toEqual(byReport);
  });

  it("derives a completion for a session that just finished, inventing no deltas", async () => {
    const reportId = await completeALiveSession();

    const completion = sessionCompletionSchema.parse(
      await fetch(`${API}/reports/${reportId}/completion`).then((response) => response.json()),
    );

    expect(completion.overall.deltaFromPrevious).toBe(0);
    expect(completion.metrics.every((metric) => metric.delta === null)).toBe(true);
    expect(completion.role).toBe(config.role);
    // Each answer review is joined to the question the live session asked in that
    // position, so the topic comes off the session rather than the fallback.
    expect(completion.questions[0]).toMatchObject({ id: "q-cache", topic: "Caching" });
  });

  it("404s with REPORT_NOT_FOUND for a report that does not exist", async () => {
    const response = await fetch(`${API}/reports/report-nope/completion`);

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("REPORT_NOT_FOUND");
  });
});
