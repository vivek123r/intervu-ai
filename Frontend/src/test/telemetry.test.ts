import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  onDegradation,
  recentDegradations,
  reportDegradation,
  resetDegradations,
} from "@/lib/telemetry";

describe("degradation reporting", () => {
  beforeEach(() => {
    resetDegradations();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("records what degraded so a recovered failure is still observable", () => {
    // Every one of these paths recovers, so nothing reaches the candidate — which
    // is exactly why they need to be recorded somewhere.
    reportDegradation("tts_fetch_failed", { stage: "play_rejected" });

    const events = recentDegradations();
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("tts_fetch_failed");
    expect(events[0]?.detail).toEqual({ stage: "play_rejected" });
  });

  it("notifies listeners", () => {
    const seen: string[] = [];
    onDegradation((event) => seen.push(event.kind));

    reportDegradation("socket_connect_failed");
    reportDegradation("rest_fallback_used");

    expect(seen).toEqual(["socket_connect_failed", "rest_fallback_used"]);
  });

  it("a broken listener cannot take down the interview it observes", () => {
    onDegradation(() => {
      throw new Error("listener blew up");
    });

    expect(() => reportDegradation("recognition_error")).not.toThrow();
    expect(recentDegradations()).toHaveLength(1);
  });

  it("bounds what it retains", () => {
    for (let i = 0; i < 80; i++) reportDegradation("turn_error", { i });

    // A session that keeps failing must not grow this without limit.
    expect(recentDegradations().length).toBeLessThanOrEqual(50);
    // The most recent are the ones kept.
    expect(recentDegradations().at(-1)?.detail).toEqual({ i: 79 });
  });
});
