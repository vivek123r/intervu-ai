import { afterEach, describe, expect, it, vi } from "vitest";

import { SpeechSynthesisService } from "@/lib/voice/speech-synthesis";

/** A fetch that never resolves on its own, but rejects with an AbortError the
 * instant its signal is aborted — mirrors what a real `fetch` does under
 * `AbortController.abort()`, without making a real network call in tests. */
function neverResolvingFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  });
}

describe("SpeechSynthesisService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("settles a cancelled item's onEnd when stop() is called mid-flight (barge-in)", () => {
    vi.stubGlobal("fetch", neverResolvingFetch());

    const service = new SpeechSynthesisService();
    const onEnd = vi.fn();

    // No cached audio and a fetch that never resolves on its own — this item is
    // still "in flight" (isProcessing) when stop() runs below, exactly like a
    // user barging in ("Begin answer") while the interviewer is still speaking.
    service.speak("Let's move to the next question.", { onEnd }, false);
    expect(onEnd).not.toHaveBeenCalled();

    service.stop();

    // Without settling on cancel, this onEnd would never fire, and whatever it
    // triggers (e.g. sending `speech.completed` over the socket) never happens —
    // stalling the server's speech-gate for its full timeout.
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(service.isSpeaking()).toBe(false);
  });

  it("settles an onEnd exactly once even if it is somehow triggered twice", () => {
    vi.stubGlobal("fetch", neverResolvingFetch());

    const service = new SpeechSynthesisService();
    const onEnd = vi.fn();

    service.speak("Some interviewer line.", { onEnd }, false);
    service.stop();
    service.stop();

    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("settles every still-queued item, not just the one currently playing", () => {
    vi.stubGlobal("fetch", neverResolvingFetch());

    const service = new SpeechSynthesisService();
    const firstEnd = vi.fn();
    const secondEnd = vi.fn();

    service.speak("First line.", { onEnd: firstEnd }, false);
    // Queued behind the first — `isProcessing` is already true, so this goes
    // straight into the internal queue rather than starting immediately.
    service.speak("Second line.", { onEnd: secondEnd });

    service.stop();

    expect(firstEnd).toHaveBeenCalledTimes(1);
    expect(secondEnd).toHaveBeenCalledTimes(1);
  });
});
