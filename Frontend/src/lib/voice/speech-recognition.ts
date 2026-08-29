"use client";

// Type declarations for the Web Speech API
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultInstance {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultListInstance {
  length: number;
  [index: number]: SpeechRecognitionResultInstance;
}

interface SpeechRecognitionEventInstance extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListInstance;
}

interface SpeechRecognitionErrorEventInstance extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventInstance) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventInstance) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export interface SpeechRecognitionOptions {
  lang?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: "idle" | "listening" | "stopped") => void;
  onPauseDetected?: (durationMs: number) => void;
}

// A gap this long between speech chunks counts as a "pause" for the report's
// behavioural metrics — matches `LONG_PAUSE_THRESHOLD_MS` in
// Backend/app/services/speech_metrics.py.
const LONG_PAUSE_THRESHOLD_MS = 2500;
// Chrome ends recognition on silence even in `continuous` mode; `onend` restarts
// it automatically. Any error other than a denied permission leaves that restart
// armed, so a persistently failing recognizer (e.g. no audio device) would spin
// in a tight error→end→start loop without this cap.
const MAX_CONSECUTIVE_RESTARTS = 6;
const RESTART_DELAY_MS = 250;
const SENTENCE_END_RE = /[.!?]["')\]]?\s*$/;

/** Picks the recognizer's own highest-confidence alternative instead of always
 * taking index 0 — `maxAlternatives` was previously hardcoded to 1, so this
 * ranking was never used even though the browser already computes it. */
function bestAlternative(
  result: SpeechRecognitionResultInstance,
): SpeechRecognitionResultItem {
  let best: SpeechRecognitionResultItem = result[0] ?? { transcript: "", confidence: 0 };
  for (let i = 1; i < result.length; i++) {
    const alt = result[i];
    if (alt && alt.confidence > best.confidence) {
      best = alt;
    }
  }
  return best;
}

export class SpeechRecognitionService {
  private recognition: ISpeechRecognition | null = null;
  private isListening = false;
  private shouldRestart = false;
  private finalTranscript = "";
  private interimTranscript = "";
  private lastSpeechTimestamp = 0;
  private pauseMarkers: number[] = [];
  private consecutiveRestarts = 0;
  private restartTimer: number | null = null;

  constructor(private readonly options: SpeechRecognitionOptions = {}) {}

  public isSupported(): boolean {
    return isSpeechRecognitionSupported();
  }

  public start(): boolean {
    if (!this.isSupported()) {
      this.options.onError?.("Speech recognition is not supported in this browser.");
      return false;
    }

    if (this.isListening) return true;

    try {
      const RecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!RecognitionClass) return false;

      this.recognition = new RecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.options.lang || "en-US";
      // Rank alternatives by confidence instead of always taking the recognizer's
      // first guess — see `bestAlternative`.
      this.recognition.maxAlternatives = 3;

      this.finalTranscript = "";
      this.interimTranscript = "";
      this.pauseMarkers = [];
      this.lastSpeechTimestamp = Date.now();
      this.consecutiveRestarts = 0;
      this.shouldRestart = true;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.consecutiveRestarts = 0;
        this.options.onStateChange?.("listening");
      };

      this.recognition.onresult = (event: SpeechRecognitionEventInstance) => {
        const now = Date.now();
        const pauseSinceLast = now - this.lastSpeechTimestamp;

        // Silence this long between speech chunks counts as a pause.
        if (pauseSinceLast > LONG_PAUSE_THRESHOLD_MS && this.lastSpeechTimestamp > 0) {
          this.pauseMarkers.push(pauseSinceLast);
          this.options.onPauseDetected?.(pauseSinceLast);
        }
        this.lastSpeechTimestamp = now;

        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result || !result[0]) continue;
          const alternative = bestAlternative(result);
          if (result.isFinal) {
            this.appendFinal(alternative.transcript);
          } else {
            interim += alternative.transcript;
          }
        }

        this.interimTranscript = interim;
        const fullTranscript = this.getCombinedTranscript();
        this.options.onTranscript?.(fullTranscript, interim.length === 0);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEventInstance) => {
        if (event.error === "no-speech") {
          // Ignore no-speech errors in continuous mode
          return;
        }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          this.shouldRestart = false;
          this.options.onError?.("Microphone permission was denied.");
        } else {
          this.options.onError?.(event.message || event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;

        // Chrome discards any non-finalized interim on this boundary — fold
        // whatever was pending into the final transcript instead of losing it
        // (or leaving it stuck as a stale interim until the next result arrives).
        if (this.interimTranscript.trim()) {
          this.appendFinal(this.interimTranscript);
          this.interimTranscript = "";
        }

        if (!this.shouldRestart) {
          this.options.onStateChange?.("stopped");
          return;
        }

        this.consecutiveRestarts += 1;
        if (this.consecutiveRestarts > MAX_CONSECUTIVE_RESTARTS) {
          this.shouldRestart = false;
          this.options.onError?.(
            "Speech recognition kept failing and was stopped.",
          );
          this.options.onStateChange?.("stopped");
          return;
        }

        if (this.restartTimer !== null) {
          window.clearTimeout(this.restartTimer);
        }
        this.restartTimer = window.setTimeout(() => {
          this.restartTimer = null;
          try {
            this.recognition?.start();
          } catch {
            this.stop();
          }
        }, RESTART_DELAY_MS);
      };

      this.recognition.start();
      return true;
    } catch (err) {
      this.isListening = false;
      this.options.onError?.(err instanceof Error ? err.message : "Failed to start speech recognition.");
      return false;
    }
  }

  public stop(): string {
    this.shouldRestart = false;
    this.isListening = false;
    this.clearRestartTimer();

    // A trailing silence before the user stops talking was never recorded —
    // `onresult` only records a pause retroactively, when speech resumes after
    // it. Record it here since speech is definitely not resuming now.
    const trailingPause = Date.now() - this.lastSpeechTimestamp;
    if (this.lastSpeechTimestamp > 0 && trailingPause > LONG_PAUSE_THRESHOLD_MS) {
      this.pauseMarkers.push(trailingPause);
      this.options.onPauseDetected?.(trailingPause);
    }

    // Fold any not-yet-finalized interim into the result rather than dropping it.
    if (this.interimTranscript.trim()) {
      this.appendFinal(this.interimTranscript);
      this.interimTranscript = "";
    }

    try {
      this.recognition?.stop();
    } catch {
      // Best-effort cleanup
    }

    const result = this.getFinalTranscript();
    this.options.onStateChange?.("stopped");
    return result;
  }

  public abort(): void {
    this.shouldRestart = false;
    this.isListening = false;
    this.clearRestartTimer();
    try {
      this.recognition?.abort();
    } catch {
      // Best-effort cleanup
    }
  }

  /** The polished, submission-ready transcript — capitalized and terminally
   * punctuated. Use `getCombinedTranscript()` for the live, still-growing
   * preview instead; forcing punctuation onto text the user is mid-sentence on
   * would look wrong. */
  public getFinalTranscript(): string {
    const text = this.finalTranscript.trim();
    if (!text) return text;
    return SENTENCE_END_RE.test(text) ? text : `${text}.`;
  }

  public getCombinedTranscript(): string {
    const combined = `${this.finalTranscript} ${this.interimTranscript}`.trim();
    return combined;
  }

  public getPauseMarkers(): number[] {
    return [...this.pauseMarkers];
  }

  public resetTranscript(initial = ""): void {
    this.finalTranscript = initial;
    this.interimTranscript = "";
  }

  /** Appends one finalized chunk with light polish: capitalizes the start of a
   * new sentence, and drops the 1-3 word overlap Chrome frequently repeats
   * across an auto-restart boundary (e.g. "...the cache" | "the cache will
   * invalidate..." -> "...the cache will invalidate..."). */
  private appendFinal(text: string): void {
    let chunk = text.trim();
    if (!chunk) return;

    if (!this.finalTranscript || SENTENCE_END_RE.test(this.finalTranscript)) {
      chunk = chunk.charAt(0).toUpperCase() + chunk.slice(1);
    }

    if (this.finalTranscript) {
      const prevWords = this.finalTranscript.split(/\s+/);
      const nextWords = chunk.split(/\s+/);
      const maxOverlap = Math.min(3, prevWords.length, nextWords.length);
      for (let n = maxOverlap; n > 0; n--) {
        const tail = prevWords.slice(-n).join(" ").toLowerCase();
        const head = nextWords.slice(0, n).join(" ").toLowerCase();
        if (tail === head) {
          chunk = nextWords.slice(n).join(" ");
          break;
        }
      }
    }

    if (!chunk) return;
    this.finalTranscript += (this.finalTranscript ? " " : "") + chunk;
  }

  private clearRestartTimer(): void {
    if (this.restartTimer !== null) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }
}
