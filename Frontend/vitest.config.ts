import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    // Playwright's own specs (./e2e) look like Vitest test files by name but
    // must only ever run through `pnpm e2e` (playwright test), never Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
