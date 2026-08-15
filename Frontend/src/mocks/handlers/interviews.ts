import { http, HttpResponse } from "msw";

import { buildDashboardOverview } from "@/mocks/fixtures";
import { db, nextId } from "@/mocks/db";
import type { Interview, InterviewRound } from "@/types/domain";

function notFound(requestId?: string) {
  return HttpResponse.json(
    {
      error: {
        code: "INTERVIEW_NOT_FOUND",
        message: "That interview could not be found.",
        details: {},
        requestId,
      },
    },
    { status: 404 },
  );
}

/** See docs/API-CONTRACT.md's Interviews section. */
export const interviewHandlers = [
  http.get("*/dashboard/overview", () => HttpResponse.json(buildDashboardOverview(db.interviews))),

  http.get("*/interviews", () => HttpResponse.json(db.interviews)),

  http.get("*/interviews/:id", ({ params }) => {
    const interview = db.interviews.find((item) => item.id === params.id);
    return interview ? HttpResponse.json(interview) : notFound();
  }),

  http.post("*/interviews", async ({ request }) => {
    const body = (await request.json()) as Pick<
      Interview,
      "company" | "role" | "type" | "scheduledAt" | "timezone"
    >;
    const round: InterviewRound = {
      id: nextId("round"),
      name: "Current round",
      type: body.type,
      status: "current",
    };
    const interview: Interview = {
      id: nextId("interview"),
      company: body.company,
      companyMark: body.company.slice(0, 1).toUpperCase(),
      role: body.role,
      type: body.type,
      round: round.name,
      roundNumber: 1,
      totalRounds: 1,
      scheduledAt: body.scheduledAt,
      timezone: body.timezone,
      durationMinutes: 60,
      status: "upcoming",
      readiness: 0,
      preparationProgress: 0,
      location: "Not added",
      accent: "#f0b94c",
      rounds: [round],
    };
    db.interviews = [interview, ...db.interviews];
    return HttpResponse.json(interview, { status: 201 });
  }),

  http.patch("*/interviews/:id", async ({ params, request }) => {
    const index = db.interviews.findIndex((item) => item.id === params.id);
    const current = db.interviews[index];
    if (!current) return notFound();
    const body = (await request.json()) as Partial<Interview>;
    const updated: Interview = { ...current, ...body, id: current.id };
    db.interviews = db.interviews.map((item, itemIndex) => (itemIndex === index ? updated : item));
    return HttpResponse.json(updated);
  }),

  http.delete("*/interviews/:id", ({ params }) => {
    const exists = db.interviews.some((item) => item.id === params.id);
    if (!exists) return notFound();
    db.interviews = db.interviews.filter((item) => item.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/interviews/:id/confirm", ({ params }) => {
    const index = db.interviews.findIndex((item) => item.id === params.id);
    if (index === -1) return notFound();
    const updated: Interview = { ...db.interviews[index]!, status: "confirmed" };
    db.interviews = db.interviews.map((item, itemIndex) => (itemIndex === index ? updated : item));
    return HttpResponse.json(updated);
  }),
];
