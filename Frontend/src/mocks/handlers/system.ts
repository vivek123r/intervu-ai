import { http, HttpResponse } from "msw";

import { db, readJobStatus } from "@/mocks/db";
import type { User } from "@/types/domain";

/** See docs/API-CONTRACT.md's Auth & profile and Notifications & background jobs sections. */
export const systemHandlers = [
  http.get("*/me", () => HttpResponse.json(db.user)),

  http.patch("*/me", async ({ request }) => {
    const body = (await request.json()) as Partial<User>;
    db.user = { ...db.user, ...body };
    return HttpResponse.json(db.user);
  }),

  http.get("*/notifications", () => HttpResponse.json(db.notifications)),

  http.post("*/notifications/:id/read", ({ params }) => {
    const index = db.notifications.findIndex((item) => item.id === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { error: { code: "NOTIFICATION_NOT_FOUND", message: "That notification could not be found.", details: {} } },
        { status: 404 },
      );
    }
    const updated = { ...db.notifications[index]!, read: true };
    db.notifications = db.notifications.map((item, itemIndex) => (itemIndex === index ? updated : item));
    return HttpResponse.json(updated);
  }),

  http.get("*/jobs/:id", ({ params }) => {
    const job = db.jobs.get(String(params.id));
    if (!job) {
      return HttpResponse.json(
        { error: { code: "JOB_NOT_FOUND", message: "That job could not be found.", details: {} } },
        { status: 404 },
      );
    }
    const { status, progress } = readJobStatus(job);
    return HttpResponse.json({
      id: job.id,
      type: job.type,
      status,
      progress,
      resultId: status === "completed" ? job.resultId : null,
      error: null,
    });
  }),
];
