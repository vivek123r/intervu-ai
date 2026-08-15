import { http, HttpResponse } from "msw";

import { createJob, db } from "@/mocks/db";

/** See docs/API-CONTRACT.md's Calendar section. */
export const calendarHandlers = [
  http.get("*/calendar/connection", () => HttpResponse.json(db.calendarConnection)),

  http.post("*/calendar/connect", () => {
    db.calendarConnection = {
      connected: true,
      provider: "google",
      accountEmail: db.user.email,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      lastSyncAt: new Date().toISOString(),
      status: "healthy",
    };
    return HttpResponse.json({ authorizationUrl: "https://accounts.google.com/o/oauth2/mock" });
  }),

  http.post("*/calendar/sync", () => {
    db.calendarConnection = { ...db.calendarConnection, lastSyncAt: new Date().toISOString() };
    const job = createJob("calendar_sync", "sync-complete");
    return HttpResponse.json({ jobId: job.id, type: job.type }, { status: 202 });
  }),

  http.delete("*/calendar/connection", () => {
    db.calendarConnection = {
      connected: false,
      provider: null,
      accountEmail: null,
      scopes: [],
      lastSyncAt: null,
      status: null,
    };
    return new HttpResponse(null, { status: 204 });
  }),
];
