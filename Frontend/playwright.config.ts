import { defineConfig } from "@playwright/test";

/**
 * Runs against the live dev stack (`pnpm dev` on :3000, the FastAPI backend on
 * :8000, Mongo on :27017) — this app no longer supports MSW in the browser
 * (that mode was removed; MSW here is Vitest-only), so an in-browser mock
 * mode isn't an option. `webServer` reuses an already-running dev server
 * instead of starting a second one when developing locally.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
