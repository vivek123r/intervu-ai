import { expect, test, type Page } from "@playwright/test";

/**
 * Drives a full interview in a real browser against the live stack (backend +
 * Mongo already running locally). This is the only kind of test that can catch
 * the class of bug this file guards against: after the first question, the
 * screen froze on question 1 forever while the AI kept talking and the record
 * control stayed dead. That was a genuine browser-rendering/timing bug
 * (AnimatePresence latching a stale subtree, a cancelled TTS utterance never
 * settling its completion callback) invisible to both the Vitest unit suite
 * and the backend's own WebSocket contract tests, which never fail to send an
 * ack on time the way a real browser can.
 *
 * Two browser APIs can't run meaningfully headless, so both are stubbed at the
 * page level rather than mocked away entirely:
 *  - `SpeechRecognition` — replaced with a fake the test can trigger on demand,
 *    since headless Chromium has no real microphone input (and denies
 *    `getUserMedia` outright, which the app already handles as a normal
 *    "microphone unavailable, type instead" path).
 *  - The TTS audio itself is real (a real `<audio>` element, a real
 *    `voice/tts` request) except the response body, which is swapped for a
 *    short silent WAV so the test doesn't depend on network access to the
 *    real edge-tts backend and isn't at the mercy of its latency. Using an
 *    actual playable audio file (rather than stubbing the JS layer) keeps the
 *    real `onended`/cancel code path — the one the P0 fix touches — in play.
 *
 * Progress is tracked via `data-current-question-id` / `data-interviewer-state`
 * / `data-recording` on the room's root `<main>` (interview-room.tsx) rather
 * than by parsing visible text — the "Question X of Y" label renders from
 * default state before the first `question.created` event actually lands, so
 * matching on it produced false positives.
 */

const FAKE_RECOGNITION_INIT_SCRIPT = `
  class FakeSpeechRecognition {
    constructor() {
      this.continuous = false;
      this.interimResults = false;
      this.lang = "en-US";
      this.maxAlternatives = 1;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.onstart = null;
      window.__srInstance = this;
    }
    start() {
      setTimeout(() => this.onstart && this.onstart(), 0);
    }
    stop() {
      setTimeout(() => this.onend && this.onend(), 0);
    }
    abort() {
      setTimeout(() => this.onend && this.onend(), 0);
    }
  }
  window.SpeechRecognition = FakeSpeechRecognition;
  window.webkitSpeechRecognition = FakeSpeechRecognition;
  window.__emitFinalTranscript = (text) => {
    const inst = window.__srInstance;
    if (!inst || !inst.onresult) return;
    inst.onresult({
      resultIndex: 0,
      results: {
        length: 1,
        0: { isFinal: true, length: 1, 0: { transcript: text, confidence: 0.95 } },
      },
    });
  };
`;

/** A short (~1.5s), valid, silent WAV file — real enough for the browser to
 * decode and play through an <audio> element and fire real onended events. */
function silentWav(durationSeconds: number, sampleRate = 8000): Buffer {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const dataSize = numSamples * 2; // 16-bit mono PCM
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  // Remaining bytes are already zero (silence).
  return buffer;
}

const room = (page: Page) => page.locator("main#main-content");

async function currentQuestionId(page: Page): Promise<string | null> {
  return room(page).getAttribute("data-current-question-id");
}

/** Waits until the room reports a `currentQuestionId` different from `previousId`
 * (a real `question.created` landed) — or until the results page is reached,
 * whichever happens first (a very short/weak final answer can end the session
 * instead of asking another question). */
async function waitForNextQuestionOrResults(
  page: Page,
  previousId: string | null,
): Promise<"advanced" | "results"> {
  // A real LLM is in the loop for every step here (AI_PROVIDER=openrouter
  // locally): a routing decision is usually quick, but once the *last* answer
  // is in, the session moves straight to scoring every answer, generating the
  // wrap-up line, and synthesizing the full report — several more real LLM
  // calls back to back — before it ever navigates to /practice/results/. That
  // final wait needs much more headroom than an ordinary per-turn advance.
  return Promise.race([
    page
      .waitForFunction(
        (prevId) => {
          const el = document.querySelector("main#main-content");
          const id = el?.getAttribute("data-current-question-id");
          return Boolean(id) && id !== prevId;
        },
        previousId,
        { timeout: 150_000 },
      )
      .then(() => "advanced" as const),
    page.waitForURL(/\/practice\/results\//, { timeout: 150_000 }).then(() => "results" as const),
  ]);
}

async function waitUntilReadyToAnswer(page: Page): Promise<void> {
  await room(page).waitFor({ state: "attached" });
  await page.waitForFunction(
    () => document.querySelector("main#main-content")?.getAttribute("data-interviewer-state") ===
      "ready",
    undefined,
    { timeout: 30_000 },
  );
}

/** Headless Chromium denies `getUserMedia` outright, so `micPermission` never
 * reaches "granted" here — and auto-arm (use-interview-session.ts) deliberately
 * only fires once it has, exactly like a real candidate who declined the mic
 * prompt would need to. So every turn (bar the deliberate barge-in click on
 * turn 1) clicks "Begin answer" manually here, same as such a candidate would. */
async function submitAnswer(page: Page, text: string): Promise<void> {
  const beginButton = page.getByRole("button", { name: "Begin answer" });
  await beginButton.click({ timeout: 10_000 }).catch(() => {
    // Already recording (auto-armed) — fine either way.
  });

  const stopButton = page.getByRole("button", { name: /Stop (& submit|answer)/ });
  await expect(stopButton).toBeVisible({ timeout: 20_000 });
  await page.evaluate(
    (t) => (window as unknown as { __emitFinalTranscript: (t: string) => void }).__emitFinalTranscript(t),
    text,
  );
  await stopButton.click();
}

test.describe("full interview loop", () => {
  test.setTimeout(400_000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_RECOGNITION_INIT_SCRIPT);
    await page.route("**/api/v1/voice/tts", (route) =>
      route.fulfill({ status: 200, contentType: "audio/wav", body: silentWav(1.5) }),
    );
  });

  test("answers every question, barges in once, and reaches the results page", async ({
    page,
  }) => {
    // duration=10 -> max(3, 10 // 6) = 3 planned root questions, keeping this
    // bounded even with a real LLM in the loop (AI_PROVIDER=openrouter locally).
    await page.goto("/practice/setup?mode=rapid");
    await page.getByRole("button", { name: "Enter Interview Room" }).click();

    await expect(page).toHaveURL(/\/practice\/session/);

    // Wait for the FIRST real question, not the default placeholder state.
    await page.waitForFunction(
      () => Boolean(document.querySelector("main#main-content")?.getAttribute("data-current-question-id")),
      undefined,
      { timeout: 20_000 },
    );
    let questionId = await currentQuestionId(page);

    // Turn 1: barge in deliberately, mid-question-audio (no wait for the
    // question to finish speaking first) — this is the exact gesture that used
    // to wedge the turn loop for the rest of the session (stop() cancelling TTS
    // without ever settling its onEnd, so the server's speech-completed gate
    // stalled).
    await submitAnswer(
      page,
      "We cached the account summary in Redis and invalidated it synchronously on every write, which kept it correct under concurrent updates.",
    );

    // Every subsequent turn relies purely on auto-arm (no manual click at all) —
    // the regression this whole file exists for: the next question must
    // actually render, and the record control must actually come back to life.
    for (let turn = 0; turn < 6; turn++) {
      const outcome = await waitForNextQuestionOrResults(page, questionId);
      if (outcome === "results") break;

      questionId = await currentQuestionId(page);
      await waitUntilReadyToAnswer(page);
      await submitAnswer(
        page,
        "We handled that by isolating the failure to one dependency and rolling back the specific change, then adding an alert on the underlying metric.",
      );
    }

    await page.waitForURL(/\/practice\/results\//, { timeout: 150_000 });
    await expect(page.getByText(/Overall|Readiness|Performance/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
