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

export class SpeechRecognitionService {
  private recognition: ISpeechRecognition | null = null;
  private isListening = false;
  private shouldRestart = false;
  private finalTranscript = "";
  private interimTranscript = "";
  private lastSpeechTimestamp = 0;
  private pauseCheckInterval: number | null = null;
  private pauseMarkers: number[] = [];

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
      this.recognition.maxAlternatives = 1;

      this.finalTranscript = "";
      this.interimTranscript = "";
      this.pauseMarkers = [];
      this.lastSpeechTimestamp = Date.now();
      this.shouldRestart = true;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.options.onStateChange?.("listening");
        this.startPauseDetector();
      };

      this.recognition.onresult = (event: SpeechRecognitionEventInstance) => {
        const now = Date.now();
        const pauseSinceLast = now - this.lastSpeechTimestamp;

        // If silence > 2500ms between speech chunks, record a pause marker
        if (pauseSinceLast > 2500 && this.lastSpeechTimestamp > 0) {
          this.pauseMarkers.push(pauseSinceLast);
          this.options.onPauseDetected?.(pauseSinceLast);
        }
        this.lastSpeechTimestamp = now;

        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) {
            if (result.isFinal) {
              const text = result[0].transcript.trim();
              if (text) {
                this.finalTranscript += (this.finalTranscript ? " " : "") + text;
              }
            } else {
              interim += result[0].transcript;
            }
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
        if (this.shouldRestart) {
          try {
            this.recognition?.start();
          } catch {
            this.stop();
          }
        } else {
          this.stopPauseDetector();
          this.options.onStateChange?.("stopped");
        }
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
    this.stopPauseDetector();

    try {
      this.recognition?.stop();
    } catch {
      // Best-effort cleanup
    }

    const result = this.getCombinedTranscript();
    this.options.onStateChange?.("stopped");
    return result;
  }

  public abort(): void {
    this.shouldRestart = false;
    this.isListening = false;
    this.stopPauseDetector();
    try {
      this.recognition?.abort();
    } catch {
      // Best-effort cleanup
    }
  }

  public getFinalTranscript(): string {
    return this.finalTranscript.trim();
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

  private startPauseDetector(): void {
    this.stopPauseDetector();
    this.pauseCheckInterval = window.setInterval(() => {
      if (!this.isListening) return;
      const now = Date.now();
      const elapsed = now - this.lastSpeechTimestamp;
      if (elapsed > 2500 && this.lastSpeechTimestamp > 0) {
        // Active pause tracking
      }
    }, 1000);
  }

  private stopPauseDetector(): void {
    if (this.pauseCheckInterval !== null) {
      window.clearInterval(this.pauseCheckInterval);
      this.pauseCheckInterval = null;
    }
  }
}
