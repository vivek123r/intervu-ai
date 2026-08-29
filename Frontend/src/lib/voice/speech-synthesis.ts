"use client";

import { resolveToken } from "@/services/api/base-api";

export interface VoicePersona {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  accent: string;
  style: string;
  sample_text: string;
  is_default?: boolean;
}

export const DEFAULT_VOICE_PERSONAS: VoicePersona[] = [
  {
    id: "en-US-JennyNeural",
    name: "Jenny",
    gender: "female",
    accent: "US English",
    style: "Warm & Professional",
    sample_text:
      "Hello, I'm Jenny. Let's begin our technical interview session today.",
    is_default: true,
  },
  {
    id: "en-US-GuyNeural",
    name: "Guy",
    gender: "male",
    accent: "US English",
    style: "Calm & Technical Lead",
    sample_text:
      "Hi there, I'm Guy. I'll be walking through your systems architecture questions.",
    is_default: false,
  },
  {
    id: "en-US-AriaNeural",
    name: "Aria",
    gender: "female",
    accent: "US English",
    style: "Articulate & Executive",
    sample_text:
      "Welcome. I'm Aria, and we will focus on problem-solving clarity and trade-offs.",
    is_default: false,
  },
  {
    id: "en-US-ChristopherNeural",
    name: "Christopher",
    gender: "male",
    accent: "US English",
    style: "Senior Staff & Authoritative",
    sample_text:
      "Hello. I'm Christopher. Let's dive into your engineering experience and design choices.",
    is_default: false,
  },
  {
    id: "en-US-EricNeural",
    name: "Eric",
    gender: "male",
    accent: "US English",
    style: "Conversational & Modern",
    sample_text:
      "Hey! I'm Eric. We'll explore hands-on problem solving and algorithmic reasoning.",
    is_default: false,
  },
  {
    id: "en-GB-SoniaNeural",
    name: "Sonia",
    gender: "female",
    accent: "British English",
    style: "Crisp & Composed",
    sample_text:
      "Good day. I am Sonia, and I will be guiding our technical evaluation today.",
    is_default: false,
  },
  {
    id: "en-GB-RyanNeural",
    name: "Ryan",
    gender: "male",
    accent: "British English",
    style: "Methodical & Clear",
    sample_text:
      "Hello. I'm Ryan. Let's review how you structure scalable distributed systems.",
    is_default: false,
  },
  {
    id: "en-IN-NeerjaNeural",
    name: "Neerja",
    gender: "female",
    accent: "Indian English",
    style: "Polished & Encouraging",
    sample_text:
      "Namaste and welcome. I am Neerja, and I look forward to our discussion.",
    is_default: false,
  },
  {
    id: "en-IN-PrabhatNeural",
    name: "Prabhat",
    gender: "male",
    accent: "Indian English",
    style: "Sharp & Professional",
    sample_text:
      "Hello, I am Prabhat. Let's analyze the technical challenge and discuss your approach.",
    is_default: false,
  },
];

const STORAGE_VOICE_KEY = "intervu_voice_persona";
const STORAGE_SPEED_KEY = "intervu_voice_speed";

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export interface SynthesisOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  voiceName?: string;
  voiceId?: string;
  tag?: string;
  onStart?: () => void;
  onProgress?: (
    progress: number,
    currentTime: number,
    duration: number,
  ) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onBlocked?: () => void;
}

interface QueueItem {
  text: string;
  options: SynthesisOptions;
  settled?: boolean;
}

/**
 * High-fidelity Studio AI Interviewer Audio Engine with robust queue sequencing,
 * pre-fetching, browser autoplay handling, and fallback capabilities.
 */
export class SpeechSynthesisService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private audioCache = new Map<string, string>(); // key -> Blob URL
  private static readonly MAX_CACHE_SIZE = 60;
  private isAudioPlaying = false;
  private isProcessing = false;
  private backendBaseUrl: string;
  private playSequence = 0;
  private abortController: AbortController | null = null;
  private queue: QueueItem[] = [];
  // The item currently playing/being fetched, if any — tracked separately from
  // `queue` so `stop()` can settle it (fire its `onEnd` exactly once) even when
  // it's cancelled mid-flight, instead of relying on a seq-guarded callback that
  // will never run once `stop()` bumps `playSequence`.
  private currentItem: QueueItem | null = null;
  private unlocked = false;
  private autoplayBlocked = false;
  private pendingAutoplayItem: QueueItem | null = null;
  private removeUnlockListeners: () => void = () => {};

  constructor() {
    this.backendBaseUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

    if (isSpeechSynthesisSupported()) {
      this.initBrowserVoices();
    }

    if (typeof window !== "undefined") {
      const unlock = () => {
        this.unlockAudio();
        this.removeUnlockListeners();
      };
      // Held so `dispose()` can detach them too — a service whose user never
      // clicked, typed or tapped would otherwise leak all three closures.
      this.removeUnlockListeners = () => {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
      };
      window.addEventListener("pointerdown", unlock, { passive: true });
      window.addEventListener("keydown", unlock, { passive: true });
      window.addEventListener("touchstart", unlock, { passive: true });
    }
  }

  public isSupported(): boolean {
    // True whenever either the primary path (backend neural TTS played through
    // <audio>) or the browser fallback (native SpeechSynthesis) is available —
    // false only in an environment with neither, where callers should fall back
    // to captions-only.
    return (
      typeof window !== "undefined" &&
      (typeof window.Audio !== "undefined" || isSpeechSynthesisSupported())
    );
  }

  public isAutoplayBlocked(): boolean {
    return this.autoplayBlocked;
  }

  public unlockAudio(): void {
    if (typeof window === "undefined") return;
    this.unlocked = true;

    try {
      if (window.speechSynthesis && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // Ignore
    }

    if (this.autoplayBlocked && this.pendingAutoplayItem) {
      const item = this.pendingAutoplayItem;
      this.autoplayBlocked = false;
      this.pendingAutoplayItem = null;
      this.playItem(item);
    }
  }

  private initBrowserVoices(): void {
    if (!isSpeechSynthesisSupported()) return;

    const load = () => {
      this.voices = window.speechSynthesis.getVoices();
    };

    load();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  public getVoicePersonas(): VoicePersona[] {
    return DEFAULT_VOICE_PERSONAS;
  }

  public getPreferredVoiceId(): string {
    if (typeof window === "undefined") return "en-US-JennyNeural";
    return localStorage.getItem(STORAGE_VOICE_KEY) || "en-US-JennyNeural";
  }

  public setPreferredVoiceId(voiceId: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_VOICE_KEY, voiceId);
    }
  }

  public getPreferredSpeed(): number {
    if (typeof window === "undefined") return 1.0;
    const val = parseFloat(localStorage.getItem(STORAGE_SPEED_KEY) || "1.0");
    return isNaN(val) ? 1.0 : Math.max(0.7, Math.min(1.4, val));
  }

  public setPreferredSpeed(speed: number): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_SPEED_KEY, speed.toString());
    }
  }

  private getCacheKey(text: string, voiceId: string, rate: string): string {
    return `${voiceId}:${rate}:${text.trim()}`;
  }

  /** Bounded cache insert — evicts (and revokes) the oldest blob URL past the cap,
   * so a long interview doesn't leak one blob per distinct line spoken. */
  private cacheAudioUrl(key: string, url: string): void {
    // `preload()` and `playItem()` race to cache the same key on every question —
    // revoke whichever blob is being overwritten, and delete-then-set so the key
    // moves to the back of insertion order (Map.set on an existing key doesn't).
    const existing = this.audioCache.get(key);
    if (existing && existing !== url) {
      URL.revokeObjectURL(existing);
    }
    this.audioCache.delete(key);
    this.audioCache.set(key, url);
    while (this.audioCache.size > SpeechSynthesisService.MAX_CACHE_SIZE) {
      const oldestKey = this.audioCache.keys().next().value;
      if (oldestKey === undefined) break;
      const oldestUrl = this.audioCache.get(oldestKey);
      this.audioCache.delete(oldestKey);
      if (oldestUrl) URL.revokeObjectURL(oldestUrl);
    }
  }

  /** Fires an item's `onEnd` exactly once, however it finishes — naturally, on
   * error, or cancelled mid-flight by `stop()`. Without this, a cancelled item's
   * caller (e.g. `queueSpeech`'s `onCompleted`, which sends `speech.completed`
   * over the socket) never learns it ended, and the server-side gate in
   * `connection.py`'s `_speak()` stalls for its full timeout. */
  private settleItem(item: QueueItem): void {
    if (item.settled) return;
    item.settled = true;
    if (this.currentItem === item) {
      this.currentItem = null;
    }
    item.options.onEnd?.();
  }

  /** Revokes every cached blob URL — call on unmount, not between utterances
   * (`stop()` intentionally keeps the cache so a repeated line replays instantly). */
  public dispose(): void {
    this.stop();
    this.removeUnlockListeners();
    this.inFlightAudio.clear();
    for (const url of this.audioCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.audioCache.clear();
  }

  /** One in-flight `/voice/tts` request per cache key.
   *
   * `question.created` calls `preload(text)` and then immediately queues the same
   * line for playback; the play path's own cache lookup misses because the
   * preload hasn't resolved yet, so both fired a request for identical audio and
   * `cacheAudioUrl` revoked whichever lost. That doubled TTS cost and latency on
   * every single utterance.
   *
   * Deliberately not abort-linked: the request is shared, so one caller backing
   * out (a barge-in) must not cancel it out from under the other.
   */
  private inFlightAudio = new Map<string, Promise<string | null>>();

  private fetchAudioUrl(
    text: string,
    voiceId: string,
    rateStr: string,
    cacheKey: string,
  ): Promise<string | null> {
    const cached = this.audioCache.get(cacheKey);
    if (cached) return Promise.resolve(cached);

    const existing = this.inFlightAudio.get(cacheKey);
    if (existing) return existing;

    const request = (async (): Promise<string | null> => {
      const response = await fetch(`${this.backendBaseUrl}/voice/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await this.authHeaders()),
        },
        body: JSON.stringify({ text, voice: voiceId, rate: rateStr }),
      });
      if (!response.ok) {
        throw new Error(`TTS API error: status ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      this.cacheAudioUrl(cacheKey, url);
      return url;
    })();

    this.inFlightAudio.set(cacheKey, request);
    void request.finally(() => {
      this.inFlightAudio.delete(cacheKey);
    });
    return request;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await resolveToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  public isSpeaking(): boolean {
    return this.isAudioPlaying || this.isProcessing || this.queue.length > 0;
  }

  /**
   * Pre-fetches neural audio in the background for zero-latency playback.
   */
  public async preload(
    text: string,
    voiceId?: string,
    rate?: number,
  ): Promise<void> {
    if (!text.trim()) return;
    const selectedVoice = voiceId || this.getPreferredVoiceId();
    const speed = rate ?? this.getPreferredSpeed();
    const ratePercent = Math.round((speed - 1.0) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
    const key = this.getCacheKey(text, selectedVoice, rateStr);

    if (this.audioCache.has(key)) return;

    try {
      await this.fetchAudioUrl(text.trim(), selectedVoice, rateStr, key);
    } catch {
      // Best-effort — playback will retry (and fall back to browser synthesis).
    }
  }

  /**
   * Speaks the given text using high-fidelity studio-grade neural voice.
   * If `queue` is true (default), enqueues speech to play sequentially after
   * the current utterance finishes instead of abruptly cutting off.
   */
  public speak(
    text: string,
    options: SynthesisOptions = {},
    queue = true,
  ): boolean {
    const cleanText = text.trim();
    if (!cleanText) {
      options.onError?.("Empty text.");
      options.onEnd?.();
      return false;
    }

    if (queue && (this.isAudioPlaying || this.isProcessing)) {
      this.queue.push({ text: cleanText, options });
      return true;
    }

    if (!queue) {
      this.stop();
    }

    return this.playItem({ text: cleanText, options });
  }

  private playItem(item: QueueItem): boolean {
    const { text, options } = item;
    this.isProcessing = true;
    this.currentItem = item;

    const currentSeq = ++this.playSequence;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const voiceId = options.voiceId || this.getPreferredVoiceId();
    const speed = options.rate ?? this.getPreferredSpeed();
    const ratePercent = Math.round((speed - 1.0) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
    const cacheKey = this.getCacheKey(text, voiceId, rateStr);

    // Attempt 1: Check in-memory audio Blob cache
    if (this.audioCache.has(cacheKey)) {
      const url = this.audioCache.get(cacheKey)!;
      return this.playAudioUrl(url, item, currentSeq);
    }

    // Attempt 2: Fetch neural audio from Backend API
    this.fetchAndPlayNeuralAudio(
      text,
      voiceId,
      rateStr,
      cacheKey,
      item,
      currentSeq,
      signal,
    ).catch((err) => {
      if (currentSeq !== this.playSequence || signal.aborted) {
        // A newer item (or `stop()`) has already superseded this one — it was
        // already settled there, so there's nothing left to clean up here.
        return;
      }
      console.warn(
        "Neural TTS fetch notice, using browser synthesis fallback:",
        err,
      );
      this.speakWithBrowserFallback(item, currentSeq);
    });

    return true;
  }

  private async fetchAndPlayNeuralAudio(
    text: string,
    voiceId: string,
    rateStr: string,
    cacheKey: string,
    item: QueueItem,
    seq: number,
    signal: AbortSignal,
  ): Promise<void> {
    const url = await this.fetchAudioUrl(text, voiceId, rateStr, cacheKey);

    // A newer item (or `stop()`) took over while the audio was in flight. The
    // blob still goes in the cache above, so a repeat of this line replays
    // instantly — there is just nothing to play right now.
    if (url === null || seq !== this.playSequence || signal.aborted) {
      return;
    }

    this.playAudioUrl(url, item, seq);
  }

  private playAudioUrl(url: string, item: QueueItem, seq: number): boolean {
    const { options } = item;
    // A stale seq here means a *newer* item has already taken over (or `stop()`
    // ran) — this item was already settled wherever that happened, so just bail
    // on starting playback rather than touching shared state again.
    if (seq !== this.playSequence) {
      return false;
    }

    try {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.src = "";
        this.currentAudio = null;
      }

      const audio = new Audio(url);
      this.currentAudio = audio;
      this.isAudioPlaying = true;
      this.isProcessing = false;

      audio.onplay = () => {
        if (seq === this.playSequence) {
          options.onStart?.();
        }
      };

      audio.ontimeupdate = () => {
        if (
          seq === this.playSequence &&
          audio.duration &&
          !isNaN(audio.duration)
        ) {
          const progress = Math.max(
            0,
            Math.min(1, audio.currentTime / audio.duration),
          );
          options.onProgress?.(progress, audio.currentTime, audio.duration);
        }
      };

      audio.onended = () => {
        if (seq === this.playSequence) {
          this.isAudioPlaying = false;
          this.currentAudio = null;
          options.onProgress?.(1, audio.duration || 0, audio.duration || 0);
          this.settleItem(item);
          this.playNextInQueue();
        }
      };

      audio.onerror = (e) => {
        if (seq === this.playSequence) {
          this.isAudioPlaying = false;
          this.currentAudio = null;
          options.onError?.(typeof e === "string" ? e : "Audio playback error");
          this.settleItem(item);
          this.playNextInQueue();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: unknown) => {
          if (seq === this.playSequence) {
            const errName = err instanceof Error ? err.name : "";
            if (errName === "NotAllowedError") {
              this.isAudioPlaying = false;
              this.currentAudio = null;
              this.autoplayBlocked = true;
              this.pendingAutoplayItem = item;
              options.onBlocked?.();
              return;
            }
            console.warn(
              "Audio element play rejected, falling back to Web Speech API:",
              err,
            );
            this.speakWithBrowserFallback(item, seq);
          }
        });
      }
      return true;
    } catch (err) {
      if (seq === this.playSequence) {
        console.warn(
          "playAudioUrl exception, fallback to browser speech:",
          err,
        );
        this.speakWithBrowserFallback(item, seq);
      }
      return false;
    }
  }

  /**
   * Fallback to Web Speech API with tuned parameters and natural voice selection.
   */
  private speakWithBrowserFallback(item: QueueItem, seq: number): boolean {
    const { text, options } = item;
    if (seq !== this.playSequence) {
      return false;
    }

    if (!isSpeechSynthesisSupported()) {
      this.isProcessing = false;
      this.isAudioPlaying = false;
      options.onError?.("Speech synthesis not supported.");
      this.settleItem(item);
      this.playNextInQueue();
      return false;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 0.95;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;
      utterance.lang = options.lang ?? "en-US";

      const selectedVoice = this.getPreferredBrowserVoice(options.voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        this.isAudioPlaying = true;
        this.isProcessing = false;
        options.onStart?.();
      };

      utterance.onboundary = (event) => {
        if (seq === this.playSequence && text.length > 0) {
          const progress = Math.max(
            0,
            Math.min(1, (event.charIndex || 0) / text.length),
          );
          options.onProgress?.(progress, 0, 0);
        }
      };

      utterance.onend = () => {
        if (seq === this.playSequence) {
          this.isAudioPlaying = false;
          this.currentUtterance = null;
          options.onProgress?.(1, 0, 0);
          this.settleItem(item);
          this.playNextInQueue();
        }
      };

      utterance.onerror = (event) => {
        if (seq === this.playSequence) {
          this.isAudioPlaying = false;
          this.currentUtterance = null;
          if (event.error === "not-allowed") {
            this.autoplayBlocked = true;
            this.pendingAutoplayItem = item;
            options.onBlocked?.();
            return;
          }
          if (event.error !== "canceled" && event.error !== "interrupted") {
            options.onError?.(event.error);
          }
          this.settleItem(item);
          this.playNextInQueue();
        }
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      this.isProcessing = false;
      this.isAudioPlaying = false;
      options.onError?.(
        err instanceof Error ? err.message : "Browser synthesis failed.",
      );
      this.settleItem(item);
      this.playNextInQueue();
      return false;
    }
  }

  private playNextInQueue(): void {
    if (this.queue.length > 0) {
      const nextItem = this.queue.shift()!;
      this.playItem(nextItem);
    } else {
      this.isAudioPlaying = false;
      this.isProcessing = false;
    }
  }

  private getPreferredBrowserVoice(
    preferredName?: string,
  ): SpeechSynthesisVoice | null {
    if (!this.voices.length && isSpeechSynthesisSupported()) {
      this.voices = window.speechSynthesis.getVoices();
    }
    const englishVoices = this.voices.filter((v) =>
      v.lang.toLowerCase().startsWith("en"),
    );
    if (!englishVoices.length) return null;

    if (preferredName) {
      const match = englishVoices.find((v) =>
        v.name.toLowerCase().includes(preferredName.toLowerCase()),
      );
      if (match) return match;
    }

    const preferredKeywords = [
      "google us english",
      "google uk english female",
      "samantha",
      "daniel",
      "karen",
      "serena",
      "oliver",
      "natural",
      "premium",
    ];

    for (const keyword of preferredKeywords) {
      const found = englishVoices.find((v) =>
        v.name.toLowerCase().includes(keyword),
      );
      if (found) return found;
    }

    return englishVoices[0] ?? null;
  }

  /**
   * Immediately terminates any active speech and flushes the playback queue.
   */
  public stop(): void {
    // Settle whatever was in flight *before* bumping playSequence — every
    // seq-guarded callback above is about to stop firing for these items, so
    // this is the only place their `onEnd` (and whatever it triggers, like
    // sending `speech.completed` over the socket) still gets to run.
    if (this.currentItem) {
      this.settleItem(this.currentItem);
    }
    for (const queued of this.queue) {
      this.settleItem(queued);
    }

    this.playSequence++;
    this.queue = [];
    this.isAudioPlaying = false;
    this.isProcessing = false;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = "";
      } catch {
        // Ignore
      }
      this.currentAudio = null;
    }

    if (isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
      this.currentUtterance = null;
    }
  }
}
