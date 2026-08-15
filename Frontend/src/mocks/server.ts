import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";

/** Used by src/test/setup.ts so component tests exercise the real RTK Query + MSW path. */
export const server = setupServer(...handlers);
