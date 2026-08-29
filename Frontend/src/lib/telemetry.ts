/**
 * A single place the interview room reports degradations it recovered from.
 *
 * These paths all *work* — the socket falls back to REST, TTS falls back to
 * browser synthesis, recognition restarts — so none of them surface to the
 * candidate, and each previously reached only a bare `console.warn`. That makes
 * them invisible in production: a dead TTS backend or a broken WebSocket upgrade
 * looks exactly like a healthy session from the outside.
 *
 * This is deliberately a seam, not a reporting service. There is no error
 * backend wired up yet; `onDegradation` is the hook a real one plugs into.
 */

export type DegradationKind =
  | "socket_connect_failed"
  | "socket_reconnect_exhausted"
  | "rest_fallback_used"
  | "tts_fetch_failed"
  | "tts_autoplay_blocked"
  | "recognition_error"
  | "recognition_restart_capped"
  | "turn_error"
  | "turn_watchdog_fired";

export interface Degradation {
  kind: DegradationKind;
  /** Free-form context. Must not contain transcript text or anything a candidate said. */
  detail?: Record<string, unknown>;
  at: string;
}

type DegradationListener = (event: Degradation) => void;

const listeners = new Set<DegradationListener>();

/** Recent events, so a support view or a test can inspect what degraded. Bounded
 * because an interview that keeps failing would otherwise grow this forever. */
const MAX_RETAINED = 50;
const recent: Degradation[] = [];

export function reportDegradation(
  kind: DegradationKind,
  detail?: Record<string, unknown>,
): void {
  const event: Degradation = { kind, detail, at: new Date().toISOString() };

  recent.push(event);
  if (recent.length > MAX_RETAINED) recent.shift();

  // Still logged: without a reporting backend this is the only place anyone sees
  // it, and a developer with the console open should not have to opt in.
  console.warn(`[intervu:degraded] ${kind}`, detail ?? {});

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // A broken listener must not take down the interview it is observing.
    }
  }
}

export function onDegradation(listener: DegradationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recentDegradations(): readonly Degradation[] {
  return recent;
}

/** Test-only. */
export function resetDegradations(): void {
  recent.length = 0;
  listeners.clear();
}
