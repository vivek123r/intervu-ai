import { setupWorker } from "msw/browser";

import { handlers } from "@/mocks/handlers";

export const worker = setupWorker(...handlers);

let startPromise: ReturnType<typeof worker.start> | undefined;

/**
 * Idempotent — React Strict Mode (on in dev, see next.config.ts's reactStrictMode) invokes
 * effects twice, and calling worker.start() a second time throws ("cannot configure an
 * already enabled network"). Callers all await the same in-flight/completed promise instead.
 */
export function startMocking() {
  startPromise ??= Promise.resolve(worker.start({ onUnhandledRequest: "bypass" })).then(() => undefined);
  return startPromise;
}
