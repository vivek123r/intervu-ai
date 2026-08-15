import { http, HttpResponse } from "msw";

import { interviewQuestions } from "@/mocks/fixtures";
import { createJob, db } from "@/mocks/db";

/** See docs/API-CONTRACT.md's Preparation section. */
export const preparationHandlers = [
  http.post("*/interviews/:id/prepare", ({ params }) => {
    const job = createJob("preparation_generation", String(params.id));
    return HttpResponse.json({ jobId: job.id, type: job.type }, { status: 202 });
  }),

  http.get("*/interviews/:id/preparation", () =>
    HttpResponse.json({
      tasks: db.tasks,
      questions: interviewQuestions,
      timeline: db.preparationTimeline,
    }),
  ),

  http.patch("*/preparation/tasks/:id", async ({ params, request }) => {
    const index = db.tasks.findIndex((task) => task.id === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { error: { code: "TASK_NOT_FOUND", message: "That task could not be found.", details: {} } },
        { status: 404 },
      );
    }
    const { status } = (await request.json()) as { status: (typeof db.tasks)[number]["status"] };
    const updated = { ...db.tasks[index]!, status };
    db.tasks = db.tasks.map((task, taskIndex) => (taskIndex === index ? updated : task));
    return HttpResponse.json(updated);
  }),
];
