import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError, IntervuApiClient } from "@/lib/api/client";

describe("IntervuApiClient", () => {
  afterEach(() => vi.restoreAllMocks());

  it("attaches the resolved Firebase token and parses typed responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "user-1" }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    const client = new IntervuApiClient("http://api.test", async () => "firebase-token");
    await expect(client.get<{ id: string }>("/users/me")).resolves.toEqual({ id: "user-1" });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer firebase-token");
    expect(headers.get("X-Request-ID")).toBeTruthy();
  });

  it("normalizes the backend error contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "CALENDAR_AUTH_EXPIRED", message: "Reconnect calendar", details: {} } }), { status: 401 }),
    );
    const client = new IntervuApiClient("http://api.test", async () => null);
    const error = await client.get("/calendar/sync").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      code: "CALENDAR_AUTH_EXPIRED",
      status: 401,
      message: "Reconnect calendar",
    });
  });
});
