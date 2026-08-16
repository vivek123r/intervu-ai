"use client";

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
    sample_text: "Hello, I'm Jenny. Let's begin our technical interview session today.",
    is_default: true,
  },
  {
    id: "en-US-GuyNeural",
    name: "Guy",
    gender: "male",
    accent: "US English",
    style: "Calm & Technical Lead",
    sample_text: "Hi there, I'm Guy. I'll be walking through your systems architecture questions.",
    is_default: false,
  },
  {
    id: "en-US-AriaNeural",
    name: "Aria",
    gender: "female",
    accent: "US English",
    style: "Articulate & Executive",
    sample_text: "Welcome. I'm Aria, and we will focus on problem-solving clarity and trade-offs.",
    is_default: false,
  },
  {
    id: "en-US-ChristopherNeural",
    name: "Christopher",
    gender: "male",
    accent: "US English",
    style: "Senior Staff & Authoritative",
    sample_text: "Hello. I'm Christopher. Let's dive into your engineering experience and design choices.",
    is_default: false,
  },
  {
    id: "en-US-EricNeural",
    name: "Eric",
    gender: "male",
    accent: "US English",
    style: "Conversational & Modern",
    sample_text: "Hey! I'm Eric. We'll explore hands-on problem solving and algorithmic reasoning.",
    is_default: false,
  },
  {
    id: "en-GB-SoniaNeural",
    name: "Sonia",
    gender: "female",
    accent: "British English",
    style: "Crisp & Composed",
    sample_text: "Good day. I am Sonia, and I will be guiding our technical evaluation today.",
    is_default: false,
  },
  {
    id: "en-GB-RyanNeural",
    name: "Ryan",
    gender: "male",
    accent: "British English",
    style: "Methodical & Clear",
    sample_text: "Hello. I'm Ryan. Let's review how you structure scalable distributed systems.",
    is_default: false,
  },
  {
    id: "en-IN-NeerjaNeural",
    name: "Neerja",
    gender: "female",
    accent: "Indian English",
    style: "Polished & Encouraging",
    sample_text: "Namaste and welcome. I am Neerja, and I look forward to our discussion.",
    is_default: false,
  },
  {
    id: "en-IN-PrabhatNeural",
    name: "Prabhat",
    gender: "male",
    accent: "Indian English",
    style: "Sharp & Professional",
    sample_text: "Hello, I am Prabhat. Let's analyze the technical challenge and discuss your approach.",
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
  onStart?: () => void;
  onProgress?: (progress: number, currentTime: number, duration: number) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/**
 * High-fidelity Studio AI Interviewer Audio Engine.
 * Combines ultra-natural neural AI voice synthesis (via backend Edge-TTS / Neural audio)
 * with audio caching, prefetching, and seamless Web Speech API browser fallback.
 */
export class SpeechSynthesisService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private audioCache = new Map<string, string>(); // key -> Blob URL
  private isAudioPlaying = false;
  private backendBaseUrl: string;
  private playSequence = 0;
  private abortController: AbortController | null = null;

  constructor() {
    this.backendBaseUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

    if (isSpeechSynthesisSupported()) {
      this.initBrowserVoices();
    }
  }

  public isSupported(): boolean {
    return true;
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

  /**
   * Pre-fetches neural audio in the background for zero-latency playback.
   */
  public async preload(text: string, voiceId?: string): Promise<void> {
    if (!text.trim()) return;
    const selectedVoice = voiceId || this.getPreferredVoiceId();
    const rateStr = "+0%";
    const key = this.getCacheKey(text, selectedVoice, rateStr);

    if (this.audioCache.has(key)) return;

    try {
      const response = await fetch(`${this.backendBaseUrl}/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), voice: selectedVoice, rate: rateStr }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        this.audioCache.set(key, url);
      }
    } catch {
      // Best-effort preload ignore error
    }
  }

  /**
   * Speaks the given text using high-fidelity studio-grade neural voice,
   * falling back smoothly to browser speech synthesis if offline.
   */
  public speak(text: string, options: SynthesisOptions = {}): boolean {
    const cleanText = text.trim();
    if (!cleanText) {
      options.onError?.("Empty text.");
      return false;
    }

    // Strictly terminate any previous playback & cancel in-flight network calls
    this.stop();

    const currentSeq = ++this.playSequence;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const voiceId = options.voiceId || this.getPreferredVoiceId();
    const speed = options.rate ?? this.getPreferredSpeed();
    const ratePercent = Math.round((speed - 1.0) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
    const cacheKey = this.getCacheKey(cleanText, voiceId, rateStr);

    // Attempt 1: Check in-memory audio Blob cache
    if (this.audioCache.has(cacheKey)) {
      const url = this.audioCache.get(cacheKey)!;
      return this.playAudioUrl(url, options, currentSeq);
    }

    // Attempt 2: Fetch neural audio from Backend API
    this.fetchAndPlayNeuralAudio(cleanText, voiceId, rateStr, cacheKey, options, currentSeq, signal).catch((err) => {
      // If superseded by a newer speak call or stopped, do not trigger fallback!
      if (currentSeq !== this.playSequence || signal.aborted) {
        return;
      }
      console.warn("Neural TTS fetch failed, falling back to browser speech synthesis:", err);
      this.speakWithBrowserFallback(cleanText, options, currentSeq);
    });

    return true;
  }

  private async fetchAndPlayNeuralAudio(
    text: string,
    voiceId: string,
    rateStr: string,
    cacheKey: string,
    options: SynthesisOptions,
    seq: number,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await fetch(`${this.backendBaseUrl}/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: voiceId, rate: rateStr }),
      signal,
    });

    if (seq !== this.playSequence || signal.aborted) {
      return;
    }

    if (!response.ok) {
      throw new Error(`TTS API error: status ${response.status}`);
    }

    const blob = await response.blob();
    if (seq !== this.playSequence || signal.aborted) {
      return;
    }

    const url = URL.createObjectURL(blob);
    this.audioCache.set(cacheKey, url);
    this.playAudioUrl(url, options, seq);
  }

  private playAudioUrl(url: string, options: SynthesisOptions, seq: number): boolean {
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

      audio.onplay = () => {
        if (seq === this.playSequence) {
          options.onStart?.();
        }
      };

      audio.ontimeupdate = () => {
        if (seq === this.playSequence && audio.duration && !isNaN(audio.duration)) {
          const progress = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
          options.onProgress?.(progress, audio.currentTime, audio.duration);
        }
      };

      audio.onended = () => {
        if (seq === this.playSequence) {
          this.isAudioPlaying = false;
          this.currentAudio = null;
          options.onProgress?.(1, audio.duration || 0, audio.duration || 0);
          options.onEnd?.();
        }
      };

      audio.onerror = (e) => {
        if (seq === this.playSequence) {
          this.isAudioPlaying = false;
          this.currentAudio = null;
          options.onError?.(typeof e === "string" ? e : "Audio playback error");
          options.onEnd?.();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (seq === this.playSequence) {
            this.isAudioPlaying = false;
            this.currentAudio = null;
            options.onError?.(err instanceof Error ? err.message : "Audio play failed");
            options.onEnd?.();
          }
        });
      }
      return true;
    } catch (err) {
      if (seq === this.playSequence) {
        this.isAudioPlaying = false;
        this.currentAudio = null;
        options.onError?.(err instanceof Error ? err.message : "Audio initialization failed");
        options.onEnd?.();
      }
      return false;
    }
  }

  /**
   * Fallback to Web Speech API with tuned parameters and natural voice selection.
   */
  private speakWithBrowserFallback(text: string, options: SynthesisOptions, seq: number): boolean {
    if (seq !== this.playSequence) {
      return false;
    }

    if (!isSpeechSynthesisSupported()) {
      options.onError?.("Speech synthesis not supported.");
      options.onEnd?.();
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
        options.onStart?.();
      };

      utterance.onboundary = (event) => {
        if (seq === this.playSequence && text.length > 0) {
          const progress = Math.max(0, Math.min(1, (event.charIndex || 0) / text.length));
          options.onProgress?.(progress, 0, 0);
        }
      };

      utterance.onend = () => {
        this.isAudioPlaying = false;
        this.currentUtterance = null;
        options.onProgress?.(1, 0, 0);
        options.onEnd?.();
      };

      utterance.onerror = (event) => {
        this.isAudioPlaying = false;
        this.currentUtterance = null;
        if (event.error !== "canceled" && event.error !== "interrupted") {
          options.onError?.(event.error);
        }
        options.onEnd?.();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      this.isAudioPlaying = false;
      options.onError?.(err instanceof Error ? err.message : "Browser synthesis failed.");
      options.onEnd?.();
      return false;
    }
  }

  private getPreferredBrowserVoice(preferredName?: string): SpeechSynthesisVoice | null {
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
      "natural",
      "en-us",
    ];

    for (const keyword of preferredKeywords) {
      const match = englishVoices.find(
        (v) =>
          v.name.toLowerCase().includes(keyword) ||
          v.lang.toLowerCase().includes(keyword),
      );
      if (match) return match;
    }

    return englishVoices[0] || null;
  }

  public stop(): void {
    this.playSequence++;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = "";
        this.currentAudio = null;
      } catch {
        // ignore
      }
    }
    this.isAudioPlaying = false;

    if (isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
        this.currentUtterance = null;
      } catch {
        // ignore
      }
    }
  }

  public pause(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
      } catch {
        // ignore
      }
    } else if (isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // ignore
      }
    }
    this.isAudioPlaying = false;
  }

  public resume(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.play();
        this.isAudioPlaying = true;
      } catch {
        // ignore
      }
    } else if (isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.resume();
        this.isAudioPlaying = true;
      } catch {
        // ignore
      }
    }
  }

  public isSpeaking(): boolean {
    if (this.isAudioPlaying) return true;
    if (this.currentAudio && !this.currentAudio.paused) return true;
    if (isSpeechSynthesisSupported()) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }
}
