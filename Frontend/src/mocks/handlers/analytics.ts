import { http, HttpResponse } from "msw";

import { demoAnalyticsOverview } from "@/mocks/fixtures";

/** See docs/API-CONTRACT.md's Analytics section. */
export const analyticsHandlers = [
  http.get("*/analytics/overview", () => HttpResponse.json(demoAnalyticsOverview)),
];
