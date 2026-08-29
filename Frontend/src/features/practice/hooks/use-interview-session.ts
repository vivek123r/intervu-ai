"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useCompleteSessionMutation,
  useCreateSessionMutation,
  useGetSessionQuery,
  useGetSocketTicketMutation,
  useStartSessionMutation,
  useSubmitSessionAnswerMutation,
} from "@/services/api/practice.api";
import { InterviewSocketClient } from "@/services/socket/interview-socket";
import { SpeechRecognitionService } from "@/lib/voice/speech-recognition";
import {
  DEFAULT_VOICE_PERSONAS,
  SpeechSynthesisService,
} from "@/lib/voice/speech-synthesis";
import { countFillerWords } from "@/lib/voice/speech-metrics";
import { reportDegradation } from "@/lib/telemetry";
import { useProduct } from "@/lib/product-store";
import { useGetInterviewQuery } from "@/services/api/interviews.api";
import type { PracticeConfig, PracticeSession, Question } from "@/types/domain";
import type {
  CodeArtifact,
  InterviewerResponsePayload,
  QuestionCreatedPayload,
  ServerEventType,
  SocketEnvelope,
} from "@/types/realtime";

// How long the analysis screen waits before offering a manual way out, and
// before taking it automatically. The report is already known to exist by then;
// these only bound how long a missing `analysis.completed` can strand someone.
const ANALYSIS_STALL_MS = 8000;
const ANALYSIS_ESCAPE_MS = 15000;
// How long to wait for the server's next question before falling back to REST.
const SOCKET_START_FALLBACK_MS = 12000;
// Grace period for a turn that never comes back, before offering a retry.
const TURN_WATCHDOG_MS = 45000;

export interface ConversationItem {
  speaker: "interviewer" | "candidate";
  kind: "intro" | "question" | "answer" | "transition" | "wrap_up";
  text: string;
  questionId?: string;
}

export interface UseInterviewSessionOptions {
  interviewId?: string;
  initialConfig?: PracticeConfig;
  autoSpeakQuestions?: boolean;
}

// No invented role/company — an empty config is never usable on its own (the
// backend rejects role/company below its min-length validation), so callers
// must resolve a real config (from the interview being practiced, or from
// /practice/setup) before a session can start. See the `!hasUsableConfig`
// guard in `initSession` below.
const defaultFallbackConfig: PracticeConfig = {
  role: "",
  company: "",
  type: "technical",
  difficulty: "normal",
  duration: 30,
  focusAreas: ["System design", "SQL & Data Modeling"],
  interviewerStyle: "Senior engineer",
};

export function useInterviewSession({
  interviewId,
  initialConfig = defaultFallbackConfig,
  autoSpeakQuestions = true,
}: UseInterviewSessionOptions = {}) {
  const router = useRouter();
  const { state: productState, clearSession } = useProduct();
  const { data: interviewData, isLoading: interviewLoading } = useGetInterviewQuery(
    interviewId || "",
    { skip: !interviewId },
  );

  // RTK Query API mutations & queries
  const [createSessionMutation] = useCreateSessionMutation();
  const [startSessionMutation] = useStartSessionMutation();
  const [submitAnswerMutation] = useSubmitSessionAnswerMutation();
  const [completeSessionMutation] = useCompleteSessionMutation();
  const [getSocketTicketMutation] = useGetSocketTicketMutation();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  // `handleServerEvent` is memoised without `activeSessionId` in its deps, so it
  // reads the current id through this ref rather than closing over a stale one.
  const activeSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);
  const { data: serverSession } = useGetSessionQuery(activeSessionId || "", {
    skip: !activeSessionId,
  });

  // Local optimistic session state
  const [localSession, setLocalSession] = useState<PracticeSession | null>(
    null,
  );
  const session = useMemo(
    () => serverSession ?? localSession,
    [serverSession, localSession],
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState<number>(4);
  const [conversationLog, setConversationLog] = useState<ConversationItem[]>(
    [],
  );
  const [lastInterviewerLine, setLastInterviewerLine] = useState<string>("");
  const [activeSpokenQuestionId, setActiveSpokenQuestionId] = useState<
    string | null
  >(null);
  const [activeCaptionText, setActiveCaptionText] = useState<string>("");
  const [activeCaptionKind, setActiveCaptionKind] = useState<
    "intro" | "question" | "answer" | "transition" | "wrap_up" | null
  >(null);

  const [preparationPhase, setPreparationPhase] = useState<
    "connecting" | "calibrating" | "ready" | "error"
  >("connecting");
  const [preparationError, setPreparationError] = useState<string | null>(null);
  // Set on a mid-interview `error` frame from the socket (a turn handler threw
  // server-side) — surfaced so the candidate isn't left staring at a screen that
  // looks frozen with no feedback about what happened.
  const [turnError, setTurnError] = useState<string | null>(null);

  const currentQuestionRef = useRef<Question | null>(null);
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);
  const fallbackTimerRef = useRef<number | null>(null);
  // Every `window.setTimeout` this hook schedules, so unmounting the room can't
  // leave one to fire against a component that no longer exists (navigating
  // mid-analysis used to leave up to four of them pending).
  const timersRef = useRef<Set<number>>(new Set());
  const scheduleTimer = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, delayMs);
    timersRef.current.add(id);
    return id;
  }, []);
  const initializingRef = useRef(false);
  const hasNavigatedToResultsRef = useRef(false);
  const analysisEscapeTimerRef = useRef<number | null>(null);
  // `startRecording` is defined further down (it needs `queueSpeech` and other
  // callbacks in scope), but `handleServerEvent` needs to auto-arm the mic the
  // moment a question finishes being spoken — a "latest callback" ref sidesteps
  // the declaration order instead of hoisting the whole definition.
  const startRecordingRef = useRef<(() => void) | null>(null);
  // Cleared by whichever frame resolves the turn the watchdog is guarding.
  const turnWatchdogRef = useRef<number | null>(null);
  const clearTurnWatchdog = useCallback(() => {
    if (turnWatchdogRef.current) {
      window.clearTimeout(turnWatchdogRef.current);
      turnWatchdogRef.current = null;
    }
  }, []);

  const [interviewerState, setInterviewerState] = useState<
    "idle" | "speaking" | "thinking" | "ready"
  >("ready");
  const [recording, setRecording] = useState(false);
  // Mirrors `recording`, but updated synchronously. `startRecording` can
  // re-enter itself within a single tick (see the guard there), which React
  // state cannot express.
  const recordingRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveFillerCount, setLiveFillerCount] = useState(0);
  const [socketStatus, setSocketStatus] = useState<
    "connecting" | "connected" | "reconnecting" | "offline"
  >("offline");
  const [analysisPhase, setAnalysisPhase] = useState<number>(-1);
  const [analysisMessage, setAnalysisMessage] = useState<string>("");
  // The real 0-1 fraction the server reports — see `analysis.progress`'s payload.
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [completedReportId, setCompletedReportId] = useState<string | null>(
    null,
  );
  // True once the analysis screen has waited long enough that we offer a manual
  // escape — the automatic navigate-on-timeout below fires shortly after.
  const [analysisStalled, setAnalysisStalled] = useState(false);
  const [codeArtifact, setCodeArtifact] = useState<CodeArtifact | null>(null);
  const [spokenProgress, setSpokenProgress] = useState<number>(1);
  const [isBufferingAudio, setIsBufferingAudio] = useState<boolean>(false);
  const [speechBlocked, setSpeechBlocked] = useState(false);

  const unlockSpeech = useCallback(() => {
    synthesisRef.current?.unlockAudio();
    setSpeechBlocked(false);
  }, []);

  // Voice Persona and Speed Settings
  const [voicePersona, setVoicePersonaState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("intervu_voice_persona") || "en-US-JennyNeural"
      );
    }
    return "en-US-JennyNeural";
  });
  const [voiceSpeed, setVoiceSpeedState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const val = parseFloat(
        localStorage.getItem("intervu_voice_speed") || "1.0",
      );
      return isNaN(val) ? 1.0 : val;
    }
    return 1.0;
  });
  const availableVoices = DEFAULT_VOICE_PERSONAS;

  // Audio & Hardware state
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  // Mirrored into a ref so the unmount cleanup can stop the tracks without
  // taking `micStream` as a dependency (which would re-run the whole
  // service-construction effect every time permission resolves).
  const micStreamRef = useRef<MediaStream | null>(null);
  const [micPermission, setMicPermission] = useState<
    "idle" | "granted" | "denied"
  >("idle");

  // Services references
  const recognitionRef = useRef<SpeechRecognitionService | null>(null);
  const synthesisRef = useRef<SpeechSynthesisService | null>(null);
  const socketClientRef = useRef<InterviewSocketClient | null>(null);
  const answerStartedAtRef = useRef<number>(0);
  const lastSocketStatusRef = useRef<
    "connecting" | "connected" | "reconnecting" | "offline" | null
  >(null);

  // Initialize Speech Services on mount
  useEffect(() => {
    recognitionRef.current = new SpeechRecognitionService({
      onTranscript: (fullText) => {
        setTranscript(fullText);
        const { total } = countFillerWords(fullText);
        setLiveFillerCount(total);
        const durationSec = Math.max(
          1,
          (Date.now() - answerStartedAtRef.current) / 1000,
        );
        const words = fullText.trim().split(/\s+/).filter(Boolean).length;
        setLiveWpm(Math.round((words / durationSec) * 60));
      },
      onError: (err) => {
        reportDegradation("recognition_error", { message: String(err) });
      },
      onStateChange: (state) => {
        if (state === "listening") {
          recordingRef.current = true;
          setRecording(true);
        }
        if (state === "stopped") {
          recordingRef.current = false;
          setRecording(false);
        }
      },
    });

    synthesisRef.current = new SpeechSynthesisService();

    // Captured now so the cleanup clears the set this effect owns, rather than
    // whatever the ref points at by the time it runs.
    const timers = timersRef.current;

    return () => {
      recognitionRef.current?.abort();
      synthesisRef.current?.dispose();
      socketClientRef.current?.close();
      // Without this the browser's recording indicator stays lit after leaving
      // the interview — the tracks were only ever toggled for mute, never
      // stopped.
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (analysisEscapeTimerRef.current) {
        window.clearTimeout(analysisEscapeTimerRef.current);
        analysisEscapeTimerRef.current = null;
      }
    };
  }, []);

  const setVoicePersona = useCallback((voiceId: string) => {
    setVoicePersonaState(voiceId);
    synthesisRef.current?.setPreferredVoiceId(voiceId);
  }, []);

  const setVoiceSpeed = useCallback((speed: number) => {
    setVoiceSpeedState(speed);
    synthesisRef.current?.setPreferredSpeed(speed);
  }, []);

  // Request Microphone Stream
  const requestMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      micStreamRef.current = stream;
      setMicStream(stream);
      setMicPermission("granted");
      return stream;
    } catch {
      setMicPermission("denied");
      return null;
    }
  }, []);

  // Voicing text with sequential speech queue
  const queueSpeech = useCallback(
    (
      text: string,
      kind: "intro" | "transition" | "question" | "wrap_up",
      questionId?: string,
      forceImmediate = false,
      onCompleted?: () => void,
    ) => {
      if (!text.trim()) {
        onCompleted?.();
        return;
      }

      if (!synthesisRef.current?.isSupported()) {
        setActiveCaptionText(text);
        setActiveCaptionKind(kind);
        onCompleted?.();
        return;
      }

      if (!forceImmediate) {
        setIsBufferingAudio(true);
      }

      synthesisRef.current.speak(
        text,
        {
          voiceId: voicePersona,
          rate: voiceSpeed,
          onStart: () => {
            setIsBufferingAudio(false);
            setSpeechBlocked(false);
            setInterviewerState("speaking");
            setActiveCaptionText(text);
            setActiveCaptionKind(kind);
            if (kind === "question" && questionId) {
              setActiveSpokenQuestionId(questionId);
            } else {
              setActiveSpokenQuestionId(null);
            }
            setSpokenProgress(0.04);
          },
          onProgress: (progress) => {
            setIsBufferingAudio(false);
            setSpokenProgress(progress);
          },
          onEnd: () => {
            setIsBufferingAudio(false);
            setSpokenProgress(1);
            if (!synthesisRef.current?.isSpeaking()) {
              setInterviewerState("ready");
              setActiveSpokenQuestionId(null);
              setActiveCaptionKind(null);
              setActiveCaptionText("");
            }
            onCompleted?.();
          },
          onError: () => {
            setIsBufferingAudio(false);
            setSpokenProgress(1);
            if (!synthesisRef.current?.isSpeaking()) {
              setInterviewerState("ready");
              setActiveSpokenQuestionId(null);
              setActiveCaptionKind(null);
              setActiveCaptionText("");
            }
            onCompleted?.();
          },
          onBlocked: () => {
            setIsBufferingAudio(false);
            setSpeechBlocked(true);
          },
        },
        !forceImmediate,
      );
    },
    [voicePersona, voiceSpeed],
  );

  const previewVoice = useCallback(
    (targetVoiceId?: string) => {
      const selectedVoice = targetVoiceId || voicePersona;
      const persona = availableVoices.find((p) => p.id === selectedVoice);
      const sample =
        persona?.sample_text ||
        "Hello! I'll be your interviewer for today's session.";
      synthesisRef.current?.speak(
        sample,
        { voiceId: selectedVoice, rate: voiceSpeed },
        false,
      );
    },
    [availableVoices, voicePersona, voiceSpeed],
  );

  // Repeat current question (immediate)
  const repeatQuestion = useCallback(() => {
    if (currentQuestion) {
      queueSpeech(
        currentQuestion.text,
        "question",
        currentQuestion.id,
        true,
        () => {
          socketClientRef.current?.sendSpeechCompleted(
            "question_repeat_finished",
          );
        },
      );
      socketClientRef.current?.send("question.repeat", {
        questionId: currentQuestion.id,
      });
    }
  }, [currentQuestion, queueSpeech]);

  // Guards against double-navigation between the WS analysis.completed handler,
  // the escape-hatch timeout, and the manual "view results" action below.
  const navigateToResults = useCallback(
    (reportOrSessionId: string) => {
      if (hasNavigatedToResultsRef.current) return;
      hasNavigatedToResultsRef.current = true;
      if (analysisEscapeTimerRef.current) {
        window.clearTimeout(analysisEscapeTimerRef.current);
        analysisEscapeTimerRef.current = null;
      }
      // Otherwise this config persists in localStorage (product-store.tsx) and
      // gets silently reused by any later direct visit to /practice/session.
      clearSession();
      router.push(`/practice/results/${reportOrSessionId}`);
    },
    [clearSession, router],
  );

  // Manual escape: lets the candidate leave the analysis screen immediately
  // instead of waiting on the WS event or the timeout below.
  const viewResultsNow = useCallback(() => {
    if (completedReportId) {
      navigateToResults(completedReportId);
    } else if (activeSessionId) {
      navigateToResults(activeSessionId);
    }
  }, [activeSessionId, completedReportId, navigateToResults]);

  // Handle incoming server WebSocket events
  const handleServerEvent = useCallback(
    (event: SocketEnvelope<ServerEventType>) => {
      switch (event.type) {
        case "session.ready":
        case "session.started":
          if (fallbackTimerRef.current) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          setPreparationPhase("ready");
          break;

        case "interviewer.response": {
          const payload =
            event.payload as unknown as InterviewerResponsePayload;
          if (fallbackTimerRef.current) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          setPreparationPhase("ready");
          if (payload?.text) {
            setLastInterviewerLine(payload.text);
            const kind: "intro" | "transition" | "wrap_up" =
              payload.kind === "intro"
                ? "intro"
                : payload.kind === "wrap_up"
                  ? "wrap_up"
                  : "transition";
            setConversationLog((prev) => [
              ...prev,
              {
                speaker: "interviewer",
                kind,
                text: payload.text,
              },
            ]);
            void synthesisRef.current?.preload(
              payload.text,
              voicePersona,
              voiceSpeed,
            );
            if (autoSpeakQuestions && synthesisRef.current?.isSupported()) {
              queueSpeech(payload.text, kind, undefined, false, () => {
                socketClientRef.current?.sendSpeechCompleted(
                  "transition_finished",
                );
              });
            } else {
              setActiveCaptionText(payload.text);
              setActiveCaptionKind(kind);
              socketClientRef.current?.sendSpeechCompleted(
                "transition_displayed",
              );
            }
          }
          break;
        }

        case "question.created": {
          // The normal resolution of a turn.
          clearTurnWatchdog();
          const payload = event.payload as unknown as QuestionCreatedPayload;
          const newQ: Question = {
            id: payload.id,
            text: payload.text,
            topic: payload.topic,
            category: "Technical",
            difficulty: payload.difficulty,
            followUp: payload.isFollowUp,
          };
          if (fallbackTimerRef.current) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          if (!payload.isFollowUp) {
            setCodeArtifact(null);
          }
          currentQuestionRef.current = newQ;
          setCurrentQuestion(newQ);
          setPreparationPhase("ready");
          if (payload.position) {
            setCurrentQuestionIndex(payload.position - 1);
          }
          if (payload.totalPlanned) {
            setTotalQuestionsCount(payload.totalPlanned);
          }
          setConversationLog((prev) => [
            ...prev,
            {
              speaker: "interviewer",
              kind: "question",
              text: payload.text,
              questionId: payload.id,
            },
          ]);
          void synthesisRef.current?.preload(
            payload.text,
            voicePersona,
            voiceSpeed,
          );
          if (autoSpeakQuestions && synthesisRef.current?.isSupported()) {
            queueSpeech(payload.text, "question", payload.id, false, () => {
              socketClientRef.current?.sendSpeechCompleted("question_finished");
              // Auto-arm the mic the instant the question finishes — a real
              // conversation shouldn't need a click every turn. "Begin answer"
              // remains available as a manual barge-in override.
              startRecordingRef.current?.();
            });
          } else {
            setActiveCaptionText(payload.text);
            setActiveCaptionKind("question");
            startRecordingRef.current?.();
          }
          break;
        }

        case "interviewer.thinking":
          setTurnError(null);
          setInterviewerState("thinking");
          setActiveCaptionText("");
          setActiveCaptionKind(null);
          // A hung turn (a stalled LLM call plus the server's own ack gate) would
          // otherwise leave "Evaluating your answer…" on screen with the submit
          // control disabled and nothing to recover it — only an explicit `error`
          // frame ever unstuck it, and a hang produces no frame at all.
          if (turnWatchdogRef.current) {
            window.clearTimeout(turnWatchdogRef.current);
          }
          turnWatchdogRef.current = scheduleTimer(() => {
            reportDegradation("turn_watchdog_fired", { afterMs: TURN_WATCHDOG_MS });
            setInterviewerState("ready");
            setTurnError(
              "That answer is taking longer than expected. You can try submitting again.",
            );
          }, TURN_WATCHDOG_MS);
          break;

        case "session.completed":
          break;

        // A turn handler threw server-side (see connection.py's _run_turn) — without
        // this, the socket just goes quiet: interviewerState stays "thinking" forever,
        // the record button stays disabled, and no next question ever arrives.
        case "error": {
          clearTurnWatchdog();
          const payload = event.payload as {
            code?: string;
            message?: string;
          };
          reportDegradation("turn_error", { code: payload?.code });
          setTurnError(
            payload?.message ||
              "Something went wrong processing that. Please try again.",
          );
          setInterviewerState("ready");
          setActiveCaptionText("");
          setActiveCaptionKind(null);
          break;
        }

        case "analysis.started":
          clearTurnWatchdog();
          setAnalysisPhase(0);
          setAnalysisProgress(0);
          setAnalysisMessage("Analyzing responses & speech patterns…");
          // The interview can end without the candidate pressing anything — the
          // server ends it once every planned question is answered. That path
          // never set up the stall escape (it only existed inside
          // `finishSession`), so if `analysis.completed` never arrived the
          // candidate sat on this screen with no way out. It also never stopped
          // the recogniser, leaving the microphone live through the wrap-up.
          recognitionRef.current?.stop();
          recordingRef.current = false;
          setRecording(false);
          setAnalysisStalled(false);
          if (analysisEscapeTimerRef.current) {
            window.clearTimeout(analysisEscapeTimerRef.current);
          }
          scheduleTimer(() => setAnalysisStalled(true), ANALYSIS_STALL_MS);
          analysisEscapeTimerRef.current = scheduleTimer(() => {
            if (activeSessionIdRef.current) {
              navigateToResults(activeSessionIdRef.current);
            }
          }, ANALYSIS_ESCAPE_MS);
          break;

        case "analysis.progress": {
          const payload = event.payload as {
            progress: number;
            phase: string;
            message: string;
          };
          // Only two phases are ever real right now: "transcript" (once per answer
          // scored) and "recommendations" (once, while the report itself is being
          // generated) — see Backend/app/realtime/connection.py's _finish. An
          // unrecognized phase leaves the index where it was rather than jumping
          // ahead to "done".
          setAnalysisPhase((current) =>
            payload.phase === "transcript"
              ? 0
              : payload.phase === "recommendations"
                ? 1
                : current,
          );
          setAnalysisProgress(payload.progress);
          setAnalysisMessage(
            payload.message || "Generating performance intelligence…",
          );
          break;
        }

        case "analysis.completed": {
          const payload = event.payload as { reportId: string };
          setAnalysisPhase(1);
          setAnalysisProgress(1);
          setCompletedReportId(payload.reportId);
          scheduleTimer(() => {
            navigateToResults(payload.reportId);
          }, 1800);
          break;
        }

        default:
          break;
      }
    },
    [
      autoSpeakQuestions,
      clearTurnWatchdog,
      navigateToResults,
      queueSpeech,
      scheduleTimer,
      voicePersona,
      voiceSpeed,
    ],
  );

  // Initialize session cleanly: WebSocket drives flow, REST acts as pure fallback
  const initSession = useCallback(
    async (configOverride?: PracticeConfig) => {
      // Reset on every completed attempt (see the `finally` at the end of this
      // function). Without that, `initializingRef` stayed true forever after the
      // first success and the "Start Session Now" retry button — which calls this
      // with no override — silently did nothing.
      if (initializingRef.current && !configOverride) {
        return;
      }
      initializingRef.current = true;

      const baseConfig = interviewData
        ? {
            ...initialConfig,
            role: interviewData.role,
            company: interviewData.company,
            type:
              (interviewData.type as PracticeConfig["type"]) ||
              initialConfig.type,
          }
        : initialConfig;
      // A specific interview's real role/company must win over whatever config
      // happened to be persisted from a previous, unrelated setup run — otherwise
      // a stale localStorage config (product-store.tsx) permanently overrides the
      // interview actually selected this time.
      const configToUse =
        configOverride ||
        (interviewData ? baseConfig : productState.session?.config) ||
        baseConfig;

      // The backend rejects role/company under its min-length validation — rather
      // than send a config nobody actually chose, surface an error state telling
      // the candidate to configure the session (see `turnError` surfacing in
      // interview-room.tsx).
      if (!configToUse.role.trim() || !configToUse.company.trim()) {
        initializingRef.current = false;
        setPreparationPhase("error");
        setPreparationError(
          "No session configuration found. Please configure the session in /practice/setup before starting.",
        );
        return;
      }

      setPreparationPhase("connecting");
      setPreparationError(null);

      try {
        const created = await createSessionMutation(configToUse).unwrap();
        setActiveSessionId(created.id);
        setLocalSession(created);
        setPreparationPhase("calibrating");

        let socketConnected = false;
        try {
          // Close any client from a previous attempt before replacing it.
          // Overwriting the ref left the old one alive with its heartbeat
          // interval, its reconnect loop and its `subscribe(handleServerEvent)`
          // still attached — so every server event was handled twice, producing
          // doubled TTS and a double auto-arm.
          socketClientRef.current?.close();
          socketClientRef.current = null;

          const socket = new InterviewSocketClient(
            created.id,
            async () =>
              (await getSocketTicketMutation(created.id).unwrap()).ticket,
          );
          lastSocketStatusRef.current = null;
          socket.onStatus((status) => {
            if (
              status === "connected" &&
              lastSocketStatusRef.current === "reconnecting"
            ) {
              socket.resumeSession();
            }
            lastSocketStatusRef.current = status;
            setSocketStatus(status);
          });
          socket.subscribe(handleServerEvent);
          socketClientRef.current = socket;
          await socket.connect();
          socketConnected = true;
        } catch (socketErr) {
          reportDegradation("socket_connect_failed", { message: String(socketErr) });
        }

        if (socketConnected && socketClientRef.current) {
          // Trigger session start through WebSocket: server pushes intro and question 1
          socketClientRef.current.send("session.start", {});

          // Safety fallback timer: if questions are not received within 12s, fetch via REST
          if (fallbackTimerRef.current) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          if (!currentQuestionRef.current) {
            fallbackTimerRef.current = window.setTimeout(async () => {
              if (!currentQuestionRef.current) {
                console.info(
                  "WebSocket response taking longer than expected, triggering REST fallback...",
                );
                try {
                  const started = await startSessionMutation(created.id).unwrap();
                  setLocalSession(started);
                  if (started.questions?.length && !currentQuestionRef.current) {
                    setTotalQuestionsCount(started.questions.length);
                    const firstQ = started.questions[0];
                    if (firstQ) {
                      setCurrentQuestion(firstQ);
                      setPreparationPhase("ready");
                      setConversationLog((prev) =>
                        prev.length === 0
                          ? [
                              {
                                speaker: "interviewer",
                                kind: "question",
                                text: firstQ.text,
                                questionId: firstQ.id,
                              },
                            ]
                          : prev,
                      );
                      if (autoSpeakQuestions) {
                        queueSpeech(firstQ.text, "question", firstQ.id);
                      }
                    }
                  }
                } catch (fallbackErr) {
                  reportDegradation("rest_fallback_used", {
                    stage: "start",
                    message: String(fallbackErr),
                  });
                }
              }
            }, SOCKET_START_FALLBACK_MS);
          }
        } else {
          // Offline REST fallback
          const started = await startSessionMutation(created.id).unwrap();
          setLocalSession(started);
          const introEntry = started.interviewerLog?.find(
            (l) => l.kind === "intro",
          );
          if (started.questions?.length) {
            setTotalQuestionsCount(
              started.plannedQuestionCount || started.questions.length,
            );
            const firstQ = started.questions[0];
            if (firstQ) {
              setCurrentQuestion(firstQ);
              setPreparationPhase("ready");

              if (introEntry?.text) {
                setActiveCaptionText(introEntry.text);
                setActiveCaptionKind("intro");
                setConversationLog([
                  {
                    speaker: "interviewer",
                    kind: "intro",
                    text: introEntry.text,
                  },
                  {
                    speaker: "interviewer",
                    kind: "question",
                    text: firstQ.text,
                    questionId: firstQ.id,
                  },
                ]);
                if (autoSpeakQuestions) {
                  queueSpeech(
                    introEntry.text,
                    "intro",
                    undefined,
                    false,
                    () => {
                      setActiveCaptionText(firstQ.text);
                      setActiveCaptionKind("question");
                      queueSpeech(firstQ.text, "question", firstQ.id);
                    },
                  );
                }
              } else {
                setActiveCaptionText(firstQ.text);
                setActiveCaptionKind("question");
                setConversationLog([
                  {
                    speaker: "interviewer",
                    kind: "question",
                    text: firstQ.text,
                    questionId: firstQ.id,
                  },
                ]);
                if (autoSpeakQuestions) {
                  queueSpeech(firstQ.text, "question", firstQ.id);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Session init error:", err);
        setPreparationPhase("error");
        setPreparationError(
          err instanceof Error
            ? err.message
            : "Failed to initialize interview room.",
        );
      } finally {
        initializingRef.current = false;
      }
    },
    [
      autoSpeakQuestions,
      createSessionMutation,
      getSocketTicketMutation,
      handleServerEvent,
      initialConfig,
      interviewData,
      productState.session?.config,
      queueSpeech,
      startSessionMutation,
    ],
  );

  // Start recording answer
  const startRecording = useCallback(
    async (auto = false) => {
      // Guarded on a ref, not on `recording` state, because this function can
      // re-enter itself *synchronously*: `synthesis.stop()` below settles the
      // cancelled utterance, and a question's settle callback calls
      // `startRecordingRef.current()`. React state is still `false` at that
      // point, so a state-based check let both calls through and each built a
      // fresh recognizer — the first was orphaned but still listening, producing
      // duplicated transcript chunks and two `answer.started` frames.
      if (recordingRef.current || recording) return false;

      // Auto-arm only when the mic is already granted — it must never silently
      // no-op-forever if permission hasn't been asked yet; the existing "Enable
      // microphone" prompt stays the way to grant it. A manual click always
      // attempts (and can prompt for permission).
      if (auto && micPermission !== "granted") return false;

      recordingRef.current = true;
      try {
        // Stop any playing TTS immediately — this is deliberately safe to call
        // even mid-utterance (barge-in): SpeechSynthesisService.stop() settles
        // the cancelled item's onEnd itself, so nothing waiting on that ack
        // (e.g. the server's speech-completed gate) is left hanging.
        synthesisRef.current?.stop();
        setInterviewerState("ready");
        setActiveSpokenQuestionId(null);

        if (!micStream && micPermission !== "denied") {
          await requestMicrophone();
        }

        setTranscript("");
        answerStartedAtRef.current = Date.now();
        recognitionRef.current?.resetTranscript();
        const started = recognitionRef.current?.start();
        if (started) {
          setRecording(true);
        } else {
          recordingRef.current = false;
        }

        if (started && activeSessionId && currentQuestion) {
          socketClientRef.current?.send("answer.started", {
            questionId: currentQuestion.id,
          });
        }

        return started;
      } catch (error) {
        recordingRef.current = false;
        throw error;
      }
    },
    [
      activeSessionId,
      currentQuestion,
      micPermission,
      micStream,
      recording,
      requestMicrophone,
    ],
  );

  useEffect(() => {
    startRecordingRef.current = () => void startRecording(true);
  }, [startRecording]);

  // Stop and submit answer
  const stopAndSubmitAnswer = useCallback(
    async (
      manualTextOverride?: string,
      codeArtifactOverride?: CodeArtifact,
    ) => {
      if (interviewerState === "thinking") {
        return;
      }

      const stoppedText = recognitionRef.current?.stop();
      recordingRef.current = false;
      setRecording(false);
      setInterviewerState("thinking");

      const resolvedSpeechText = transcript.trim() || stoppedText?.trim() || "";
      const finalAnswerText =
        manualTextOverride?.trim() ||
        resolvedSpeechText ||
        "(No speech detected)";

      const durationMs = Math.max(
        1000,
        Date.now() - answerStartedAtRef.current,
      );
      const questionId = currentQuestion?.id || `q-${currentQuestionIndex + 1}`;
      const pauseMarkers = recognitionRef.current?.getPauseMarkers() || [];
      const artifactToSend = codeArtifactOverride ?? codeArtifact ?? undefined;

      // Add candidate answer to conversation ribbon
      setConversationLog((prev) => [
        ...prev,
        {
          speaker: "candidate",
          kind: "answer",
          text: finalAnswerText,
          questionId,
        },
      ]);

      const isSocketConnected =
        socketStatus === "connected" && socketClientRef.current !== null;

      if (isSocketConnected) {
        socketClientRef.current?.sendAnswer({
          questionId,
          transcript: finalAnswerText,
          startedAt: new Date(answerStartedAtRef.current).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs,
          pauseMarkersMs: pauseMarkers,
          codeArtifact: artifactToSend,
        });
      } else if (activeSessionId) {
        // Fallback to REST only when offline
        try {
          const updated = await submitAnswerMutation({
            sessionId: activeSessionId,
            answer: {
              questionId,
              transcript: finalAnswerText,
              startedAt: new Date(answerStartedAtRef.current).toISOString(),
              endedAt: new Date().toISOString(),
              durationMs,
              pauseMarkersMs: pauseMarkers,
              codeArtifact: artifactToSend,
            },
          }).unwrap();

          setLocalSession(updated);
          const targetIndex =
            updated.currentQuestionIndex ?? currentQuestionIndex + 1;
          const nextQ = updated.questions?.[targetIndex];
          const lastTransition = updated.interviewerLog
            ?.filter((l) => l.kind === "transition")
            ?.slice(-1)[0];

          if (nextQ) {
            setCurrentQuestionIndex(targetIndex);
            setCurrentQuestion(nextQ);
            if (lastTransition?.text) {
              setConversationLog((prev) => [
                ...prev,
                {
                  speaker: "interviewer",
                  kind: "transition",
                  text: lastTransition.text,
                },
                {
                  speaker: "interviewer",
                  kind: "question",
                  text: nextQ.text,
                  questionId: nextQ.id,
                },
              ]);
              if (autoSpeakQuestions && synthesisRef.current?.isSupported()) {
                queueSpeech(
                  lastTransition.text,
                  "transition",
                  undefined,
                  false,
                  () => {
                    queueSpeech(nextQ.text, "question", nextQ.id, false, () => {
                      startRecordingRef.current?.();
                    });
                  },
                );
              } else {
                setActiveCaptionText(nextQ.text);
                setActiveCaptionKind("question");
                startRecordingRef.current?.();
              }
            } else {
              setConversationLog((prev) => [
                ...prev,
                {
                  speaker: "interviewer",
                  kind: "question",
                  text: nextQ.text,
                  questionId: nextQ.id,
                },
              ]);
              if (autoSpeakQuestions && synthesisRef.current?.isSupported()) {
                queueSpeech(nextQ.text, "question", nextQ.id, false, () => {
                  startRecordingRef.current?.();
                });
              } else {
                setActiveCaptionText(nextQ.text);
                setActiveCaptionKind("question");
                startRecordingRef.current?.();
              }
            }
          }
        } catch (err) {
          reportDegradation("rest_fallback_used", {
          stage: "submit_answer",
          message: String(err),
        });
        }
      }

      setTranscript("");
      setLiveWpm(0);
      setLiveFillerCount(0);
    },
    [
      activeSessionId,
      autoSpeakQuestions,
      codeArtifact,
      currentQuestion?.id,
      currentQuestionIndex,
      interviewerState,
      queueSpeech,
      socketStatus,
      submitAnswerMutation,
      transcript,
    ],
  );

  // Complete entire session
  const finishSession = useCallback(async () => {
    recognitionRef.current?.stop();
    synthesisRef.current?.stop();
    recordingRef.current = false;
    setRecording(false);
    setAnalysisPhase(0);
    setAnalysisProgress(0);
    setAnalysisMessage("Synthesizing comprehensive readiness report…");
    setAnalysisStalled(false);
    hasNavigatedToResultsRef.current = false;

    if (socketClientRef.current) {
      socketClientRef.current.send("session.end", {});
    }

    if (activeSessionId) {
      try {
        // The REST endpoint only returns once scoring, the wrap-up line, and the
        // report have all actually finished server-side — there's nothing left to
        // wait for by the time this resolves, so no further staged fake delay here.
        const handle = await completeSessionMutation(activeSessionId).unwrap();
        const fallbackTarget = handle.sessionId || activeSessionId;

        if (socketStatus === "offline") {
          setAnalysisPhase(1);
          setAnalysisProgress(1);
          scheduleTimer(() => navigateToResults(fallbackTarget), 900);
        } else {
          // The socket-connected path normally navigates off the WS
          // analysis.completed event — but if that never arrives (a dropped
          // connection, a server bug), the candidate would otherwise be stuck on
          // this screen forever. The REST call above already proves the report
          // exists, so give the WS event a bounded grace period, surface a manual
          // escape partway through, then force the navigation.
          scheduleTimer(() => setAnalysisStalled(true), 8000);
          analysisEscapeTimerRef.current = scheduleTimer(() => {
            navigateToResults(fallbackTarget);
          }, 15000);
        }
      } catch {
        scheduleTimer(() => navigateToResults(activeSessionId), 900);
      }
    }
  }, [
    activeSessionId,
    completeSessionMutation,
    navigateToResults,
    scheduleTimer,
    socketStatus,
  ]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    const next = !muted;
    micStream?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [micStream, muted]);

  return {
    session,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: totalQuestionsCount || session?.questions?.length || 4,
    conversationLog,
    lastInterviewerLine,
    activeSpokenQuestionId,
    activeCaptionText,
    activeCaptionKind,
    interviewerState,
    recording,
    muted,
    captionsEnabled,
    transcript,
    liveWpm,
    liveFillerCount,
    socketStatus,
    analysisPhase,
    analysisProgress,
    analysisMessage,
    analysisStalled,
    viewResultsNow,
    completedReportId,
    micStream,
    micPermission,
    codeArtifact,
    setCodeArtifact,
    setTranscript,
    setCaptionsEnabled,
    requestMicrophone,
    repeatQuestion,
    spokenProgress,
    isBufferingAudio,
    speechBlocked,
    unlockSpeech,
    voicePersona,
    setVoicePersona,
    voiceSpeed,
    setVoiceSpeed,
    previewVoice,
    availableVoices,
    toggleMute,
    preparationPhase,
    preparationError,
    turnError,
    interviewLoading,
    retryInitSession: initSession,
    initSession,
    startRecording,
    stopAndSubmitAnswer,
    finishSession,
  };
}
