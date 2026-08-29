import { expect, test, type Page } from "@playwright/test";

/**
 * Covers the surfaces that were showing invented numbers, and the delete that
 * claimed more than it did. None of this is reachable from the interview-flow
 * spec: these are read paths and a destructive action, not the turn loop.
 *
 * Runs against the live stack (backend + Mongo already running), like
 * interview-flow.spec.ts.
 */

const API = process.env.E2E_API_URL ?? "http://localhost:8000/api/v1";
const AUTH = { Authorization: "Bearer demo-token" };

test.describe("analytics reflects real data", () => {
  test("the range tabs actually change what is requested", async ({ page }) => {
    const requestedRanges: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname.endsWith("/analytics/overview")) {
        requestedRanges.push(url.searchParams.get("range") ?? "(none)");
      }
    });

    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    const initial = requestedRanges.length;
    expect(initial).toBeGreaterThan(0);

    // Switching range must produce a *new* request with a different value —
    // the tab used to set React state that nothing ever read.
    await page.getByRole("tab", { name: "7 days" }).click();
    await expect
      .poll(() => requestedRanges.length, { timeout: 10_000 })
      .toBeGreaterThan(initial);
    expect(new Set(requestedRanges).size).toBeGreaterThan(1);
  });

  test("topic relevance renders as a label, never as a percentage", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    // `{topic.relevance}% relevance` rendered the enum verbatim: "high% relevance".
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\b(critical|high|normal)%/i);
  });

  test("no page claims a cohort standing", async ({ page }) => {
    // `top_percent` was `100 - overall`, rendered as "TOP 3%". There is no cohort.
    for (const path of ["/analytics", "/dashboard"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const body = await page.locator("body").innerText();
      expect(body, `on ${path}`).not.toMatch(/top\s+\d+%/i);
    }
  });
});

test.describe("deleting a session really deletes it", () => {
  async function apiJson(page: Page, path: string) {
    return page.evaluate(
      async ([url, headers]) => {
        const response = await fetch(url as string, {
          headers: headers as Record<string, string>,
        });
        return { status: response.status, body: response.ok ? await response.json() : null };
      },
      [`${API}${path}`, AUTH] as const,
    );
  }

  test("removes the report and its analysis, not just the log row", async ({ page }) => {
    await page.goto("/history");

    const history = await apiJson(page, "/history/sessions");
    expect(history.status).toBe(200);
    const rows = history.body as Array<{ id: string; reportId?: string }>;
    const target = rows.find((row) => row.reportId);
    test.skip(!target, "No completed session with a report to delete.");
    const reportId = target!.reportId!;

    // The report is reachable before the delete.
    expect((await apiJson(page, `/reports/${reportId}`)).status).toBe(200);

    const deleted = await page.evaluate(
      async ([url, headers]) => {
        const response = await fetch(url as string, {
          method: "DELETE",
          headers: headers as Record<string, string>,
        });
        return response.status;
      },
      [`${API}/history/sessions/${target!.id}`, AUTH] as const,
    );
    expect(deleted).toBeLessThan(300);

    // ...and genuinely gone after it. This used to stay 200: only the history
    // row was removed, while the dialog promised the analysis went with it.
    expect((await apiJson(page, `/reports/${reportId}`)).status).toBe(404);
    expect((await apiJson(page, `/reports/${reportId}/completion`)).status).toBe(404);
  });
});
