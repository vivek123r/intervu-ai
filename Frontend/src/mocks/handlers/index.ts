import { analyticsHandlers } from "@/mocks/handlers/analytics";
import { calendarHandlers } from "@/mocks/handlers/calendar";
import { documentHandlers } from "@/mocks/handlers/documents";
import { historyHandlers } from "@/mocks/handlers/history";
import { interviewHandlers } from "@/mocks/handlers/interviews";
import { practiceHandlers } from "@/mocks/handlers/practice";
import { preparationHandlers } from "@/mocks/handlers/preparation";
import { systemHandlers } from "@/mocks/handlers/system";

// The WebSocket contract in docs/API-CONTRACT.md has no mock handler yet — the realtime
// session client isn't wired into any component until docs/IMPLEMENTATION-PLAN.md's Phase 3.
export const handlers = [
  ...interviewHandlers,
  ...preparationHandlers,
  ...practiceHandlers,
  ...analyticsHandlers,
  ...historyHandlers,
  ...calendarHandlers,
  ...documentHandlers,
  ...systemHandlers,
];
