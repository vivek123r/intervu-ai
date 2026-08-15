import { http, HttpResponse } from "msw";

import { db } from "@/mocks/db";

/** See docs/API-CONTRACT.md's History section. */
export const historyHandlers = [
  http.get("*/history/sessions", () =>
    HttpResponse.json(
      [...db.historySessions].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
    ),
  ),

  http.delete("*/history/sessions/:id", ({ params }) => {
    const exists = db.historySessions.some((session) => session.id === params.id);
    if (!exists) {
      return HttpResponse.json(
        { error: { code: "HISTORY_SESSION_NOT_FOUND", message: "That session is no longer in your history.", details: {} } },
        { status: 404 },
      );
    }
    db.historySessions = db.historySessions.filter((session) => session.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
