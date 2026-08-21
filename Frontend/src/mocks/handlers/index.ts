import { analyticsHandlers } from "@/mocks/handlers/analytics";
import { calendarHandlers } from "@/mocks/handlers/calendar";
import { codingHandlers } from "@/mocks/handlers/coding";
import { documentHandlers } from "@/mocks/handlers/documents";
import { historyHandlers } from "@/mocks/handlers/history";
import { interviewHandlers } from "@/mocks/handlers/interviews";
import { practiceHandlers } from "@/mocks/handlers/practice";
import { preparationHandlers } from "@/mocks/handlers/preparation";
import { systemHandlers } from "@/mocks/handlers/system";

export const handlers = [
  ...interviewHandlers,
  ...preparationHandlers,
  ...practiceHandlers,
  ...analyticsHandlers,
  ...historyHandlers,
  ...calendarHandlers,
  ...documentHandlers,
  ...systemHandlers,
  ...codingHandlers,
];
