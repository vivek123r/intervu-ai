import { describe, expect, it } from "vitest";
import {
  analyzeSpeech,
  calculateWpm,
  countFillerWords,
} from "@/lib/voice/speech-metrics";

describe("speech-metrics", () => {
  it("detects filler words correctly with regex word boundaries", () => {
    const transcript =
      "Um, I think that like, basically we used Redis because, you know, actually it reduced database load.";
    const result = countFillerWords(transcript);

    expect(result.total).toBe(5);
    expect(result.breakdown["um"]).toBe(1);
    expect(result.breakdown["like"]).toBe(1);
    expect(result.breakdown["basically"]).toBe(1);
    expect(result.breakdown["you know"]).toBe(1);
    expect(result.breakdown["actually"]).toBe(1);
  });

  it("calculates WPM accurately based on duration", () => {
    // 60 words in 30 seconds = 120 WPM
    expect(calculateWpm(60, 30)).toBe(120);
    // 0 duration or 0 words should return 0
    expect(calculateWpm(0, 30)).toBe(0);
    expect(calculateWpm(50, 0)).toBe(0);
  });

  it("analyzes overall speech metrics with pause markers", () => {
    const transcript =
      "We implemented optimistic locking using a version column in PostgreSQL. Um, this prevented dirty writes without deadlocks.";
    const durationSeconds = 15;
    const pauseMarkersMs = [2600, 3100]; // 2 pauses > 2.5s

    const metrics = analyzeSpeech(transcript, durationSeconds, pauseMarkersMs);

    expect(metrics.wordCount).toBe(17);
    expect(metrics.wpm).toBe(68);
    expect(metrics.fillerCount).toBe(1);
    expect(metrics.pauseCount).toBe(2);
    expect(metrics.longestPauseSeconds).toBe(3.1);
  });
});
