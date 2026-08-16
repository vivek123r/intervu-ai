export const COMMON_FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "actually",
  "basically",
  "literally",
  "sort of",
  "kind of",
  "i mean",
] as const;

export interface SpeechMetrics {
  wordCount: number;
  wpm: number;
  durationSeconds: number;
  fillerCount: number;
  fillerBreakdown: Record<string, number>;
  pauseCount: number;
  longestPauseSeconds: number;
}

/**
 * Counts occurrences of filler words in a transcript.
 */
export function countFillerWords(
  transcript: string,
  fillerList: readonly string[] = COMMON_FILLER_WORDS,
): { total: number; breakdown: Record<string, number> } {
  if (!transcript || !transcript.trim()) {
    return { total: 0, breakdown: {} };
  }

  const normalized = transcript.toLowerCase();
  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const filler of fillerList) {
    // Match whole words or phrases using regex word boundaries where appropriate
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = normalized.match(regex);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      breakdown[filler] = count;
      total += count;
    }
  }

  return { total, breakdown };
}

/**
 * Calculates words per minute (WPM).
 */
export function calculateWpm(wordCount: number, durationSeconds: number): number {
  if (durationSeconds <= 0 || wordCount <= 0) return 0;
  return Math.round((wordCount / durationSeconds) * 60);
}

/**
 * Extracts overall speech metrics for an answer.
 */
export function analyzeSpeech(
  transcript: string,
  durationSeconds: number,
  pauseMarkersMs: number[] = [],
): SpeechMetrics {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const wpm = calculateWpm(wordCount, durationSeconds);
  const { total: fillerCount, breakdown: fillerBreakdown } = countFillerWords(transcript);

  const pauseCount = pauseMarkersMs.length;
  const longestPauseMs = pauseMarkersMs.length > 0 ? Math.max(...pauseMarkersMs) : 0;
  const longestPauseSeconds = Number((longestPauseMs / 1000).toFixed(1));

  return {
    wordCount,
    wpm,
    durationSeconds: Math.max(1, Math.round(durationSeconds)),
    fillerCount,
    fillerBreakdown,
    pauseCount,
    longestPauseSeconds,
  };
}
