import { afterEach, describe, expect, it, vi } from "vitest";

import { SpeechRecognitionService } from "@/lib/voice/speech-recognition";

interface FakeResultItem {
  transcript: string;
  confidence: number;
}

class FakeRecognition {
  continuous = false;
  interimResults = false;
  lang = "en-US";
  maxAlternatives = 1;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  start = vi.fn(() => {
    this.onstart?.();
  });
  stop = vi.fn(() => {
    this.onend?.();
  });
  abort = vi.fn();
}

function finalResult(transcript: string, confidence = 0.9): FakeResultItem & { isFinal: true; length: number } {
  return { transcript, confidence, isFinal: true, length: 1, 0: { transcript, confidence } } as never;
}

function interimResult(transcript: string): { isFinal: false; length: number } {
  return { isFinal: false, length: 1, 0: { transcript, confidence: 0 } } as never;
}

// `event.results` is the full cumulative results list for the session; `resultIndex`
// marks where the *new* entries in this event start, so the list itself must be at
// least `resultIndex + results.length` long — matching the real Web Speech API shape.
function resultEvent(resultIndex: number, ...results: unknown[]) {
  const list: Record<number, unknown> & { length: number } = {
    length: resultIndex + results.length,
  };
  results.forEach((r, i) => {
    list[resultIndex + i] = r;
  });
  return { resultIndex, results: list };
}

describe("SpeechRecognitionService", () => {
  let instance: FakeRecognition | null = null;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    instance = null;
  });

  function startService(): SpeechRecognitionService {
    vi.stubGlobal(
      "SpeechRecognition",
      vi.fn(() => {
        instance = new FakeRecognition();
        return instance;
      }),
    );
    const service = new SpeechRecognitionService();
    service.start();
    return service;
  }

  it("drops the word-overlap Chrome repeats across a restart boundary", () => {
    const service = startService();
    instance!.onresult!(resultEvent(0, finalResult("we cached the account summary")));
    instance!.onresult!(resultEvent(0, finalResult("account summary and invalidated it on writes")));

    expect(service.getFinalTranscript()).toBe(
      "We cached the account summary and invalidated it on writes.",
    );
  });

  it("folds a pending interim into the final transcript on auto-restart instead of losing it", () => {
    vi.useFakeTimers();
    const service = startService();
    instance!.onresult!(resultEvent(0, finalResult("first part")));
    instance!.onresult!(resultEvent(1, interimResult("second part")));

    // Chrome ends recognition on silence; onend must not discard the pending interim.
    instance!.onend!();

    expect(service.getFinalTranscript()).toBe("First part second part.");
  });

  it("stops restarting after too many consecutive failures instead of looping forever", () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    vi.stubGlobal(
      "SpeechRecognition",
      vi.fn(() => {
        instance = new FakeRecognition();
        // The restart path (`this.recognition?.start()`, called from the
        // scheduled setTimeout) must not itself succeed here — a real `onstart`
        // would reset the failure counter, which is exactly what this test is
        // asserting doesn't happen indefinitely.
        instance.start = vi.fn();
        return instance;
      }),
    );
    const service = new SpeechRecognitionService({ onError });
    service.start();
    instance!.onstart!();

    for (let i = 0; i < 8; i++) {
      instance!.onend!();
      vi.advanceTimersByTime(1000);
    }

    expect(onError).toHaveBeenCalledWith(
      "Speech recognition kept failing and was stopped.",
    );
  });

  it("records a trailing pause on stop() instead of only detecting pauses retroactively", () => {
    const onPauseDetected = vi.fn();
    vi.stubGlobal(
      "SpeechRecognition",
      vi.fn(() => {
        instance = new FakeRecognition();
        return instance;
      }),
    );
    const service = new SpeechRecognitionService({ onPauseDetected });
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    service.start();
    instance!.onresult!(resultEvent(0, finalResult("hello")));

    vi.setSystemTime(5000);
    service.stop();

    expect(onPauseDetected).toHaveBeenCalledWith(4000);
    expect(service.getPauseMarkers()).toEqual([4000]);
  });
});
