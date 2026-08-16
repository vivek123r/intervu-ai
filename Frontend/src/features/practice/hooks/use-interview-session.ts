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
import type { PracticeConfig, PracticeSession, Question } from "@/types/domain";
import type { CodeArtifact, ServerEventType, SocketEnvelope } from "@/types/realtime";

export interface UseInterviewSessionOptions {
  interviewId?: string;
  initialConfig?: PracticeConfig;
  autoSpeakQuestions?: boolean;
}

const defaultFallbackConfig: PracticeConfig = {
  role: "Senior Backend Engineer",
  company: "Northstar Labs",
  type: "technical",
  difficulty: "hard",
  duration: 30,
  focusAreas: ["System design", "SQL"],
  interviewerStyle: "Senior engineer",
};

export function useInterviewSession({
  initialConfig = defaultFallbackConfig,
  autoSpeakQuestions = true,
}: UseInterviewSessionOptions = {}) {
  const router = useRouter();

  // RTK Query API mutations & queries
  const [createSessionMutation] = useCreateSessionMutation();
  const [startSessionMutation] = useStartSessionMutation();
  const [submitAnswerMutation] = useSubmitSessionAnswerMutation();
  const [completeSessionMutation] = useCompleteSessionMutation();
  const [getSocketTicketMutation] = useGetSocketTicketMutation();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { data: serverSession } = useGetSessionQuery(activeSessionId || "", {
    skip: !activeSessionId,
  });

  // Local optimistic session state
  const [localSession, setLocalSession] = useState<PracticeSession | null>(null);
  const session = useMemo(() => serverSession ?? localSession, [serverSession, localSession]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [interviewerState, setInterviewerState] = useState<
    "idle" | "speaking" | "thinking" | "ready"
  >("ready");
  const [recording, setRecording] = useState(false);
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
  const [completedReportId, setCompletedReportId] = useState<string | null>(null);
  const [codeArtifact, setCodeArtifact] = useState<CodeArtifact | null>(null);
  const [spokenProgress, setSpokenProgress] = useState<number>(1);
  const [isBufferingAudio, setIsBufferingAudio] = useState<boolean>(false);

  // Voice Persona and Speed Settings
  const [voicePersona, setVoicePersonaState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("intervu_voice_persona") || "en-US-JennyNeural";
    }
    return "en-US-JennyNeural";
  });
  const [voiceSpeed, setVoiceSpeedState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const val = parseFloat(localStorage.getItem("intervu_voice_speed") || "1.0");
      return isNaN(val) ? 1.0 : val;
    }
    return 1.0;
  });
  const availableVoices = DEFAULT_VOICE_PERSONAS;

  // Audio & Hardware state
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micPermission, setMicPermission] = useState<"idle" | "granted" | "denied">("idle");

  // Services references
  const recognitionRef = useRef<SpeechRecognitionService | null>(null);
  const synthesisRef = useRef<SpeechSynthesisService | null>(null);
  const socketClientRef = useRef<InterviewSocketClient | null>(null);
  const answerStartedAtRef = useRef<number>(0);
  const lastSpokenQuestionIdRef = useRef<string | null>(null);

  // Initialize Speech Services on mount
  useEffect(() => {
    recognitionRef.current = new SpeechRecognitionService({
      onTranscript: (fullText) => {
        setTranscript(fullText);
        const { total } = countFillerWords(fullText);
        setLiveFillerCount(total);
        const durationSec = Math.max(1, (Date.now() - answerStartedAtRef.current) / 1000);
        const words = fullText.trim().split(/\s+/).filter(Boolean).length;
        setLiveWpm(Math.round((words / durationSec) * 60));
      },
      onError: (err) => {
        console.warn("Speech recognition notice:", err);
      },
      onStateChange: (state) => {
        if (state === "listening") setRecording(true);
        if (state === "stopped") setRecording(false);
      },
    });

    const synth = new SpeechSynthesisService();
    synthesisRef.current = synth;
    setVoicePersonaState(synth.getPreferredVoiceId());
    setVoiceSpeedState(synth.getPreferredSpeed());

    return () => {
      recognitionRef.current?.abort();
      synthesisRef.current?.stop();
      socketClientRef.current?.close();
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
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      setMicStream(stream);
      setMicPermission("granted");
      return stream;
    } catch {
      setMicPermission("denied");
      return null;
    }
  }, []);

  // Voicing a question with Studio Neural Text-to-Speech (with duplicate trigger guard & progress sync)
  const speakQuestion = useCallback((text: string, voiceIdOverride?: string, questionId?: string) => {
    if (!text.trim() || !synthesisRef.current?.isSupported()) return;

    // Prevent duplicate triggers for the same question
    if (questionId && lastSpokenQuestionIdRef.current === questionId) {
      return;
    }
    if (questionId) {
      lastSpokenQuestionIdRef.current = questionId;
    }

    setIsBufferingAudio(true);
    setSpokenProgress(0);

    synthesisRef.current.speak(text, {
      voiceId: voiceIdOverride || voicePersona,
      rate: voiceSpeed,
      onStart: () => {
        setIsBufferingAudio(false);
        setInterviewerState("speaking");
        setSpokenProgress(0.04);
      },
      onProgress: (progress) => {
        setIsBufferingAudio(false);
        setSpokenProgress(progress);
      },
      onEnd: () => {
        setIsBufferingAudio(false);
        setInterviewerState("ready");
        setSpokenProgress(1);
      },
      onError: () => {
        setIsBufferingAudio(false);
        setInterviewerState("ready");
        setSpokenProgress(1);
      },
    });
  }, [voicePersona, voiceSpeed]);

  const previewVoice = useCallback((targetVoiceId?: string) => {
    const selectedVoice = targetVoiceId || voicePersona;
    const persona = availableVoices.find((p) => p.id === selectedVoice);
    const sample = persona?.sample_text || "Hello! I'll be your interviewer for today's session.";
    speakQuestion(sample, selectedVoice);
  }, [availableVoices, speakQuestion, voicePersona]);

  // Repeat current question
  const repeatQuestion = useCallback(() => {
    if (currentQuestion) {
      speakQuestion(currentQuestion.text, undefined, currentQuestion.id);
      socketClientRef.current?.send("question.repeat", { questionId: currentQuestion.id });
    }
  }, [currentQuestion, speakQuestion]);

  // Handle incoming server WebSocket events
  const handleServerEvent = useCallback(
    (event: SocketEnvelope<ServerEventType>) => {
      switch (event.type) {
        case "session.ready":
        case "session.started":
          setInterviewerState("ready");
          break;

        case "question.created": {
          const payload = event.payload as {
            id: string;
            text: string;
            topic: string;
            difficulty: Question["difficulty"];
            position: number;
          };
          const newQ: Question = {
            id: payload.id,
            text: payload.text,
            topic: payload.topic,
            category: "Technical",
            difficulty: payload.difficulty,
          };
          setCurrentQuestion(newQ);
          setInterviewerState("ready");
          if (autoSpeakQuestions) {
            speakQuestion(payload.text, undefined, payload.id);
          }
          break;
        }

        case "interviewer.thinking":
          setInterviewerState("thinking");
          break;

        case "session.completed":
          setInterviewerState("ready");
          break;

        case "analysis.started":
          setAnalysisPhase(0);
          setAnalysisMessage("Analyzing responses & speech patterns…");
          break;

        case "analysis.progress": {
          const payload = event.payload as { progress: number; phase: string; message: string };
          const phaseIndex =
            payload.phase === "transcript"
              ? 0
              : payload.phase === "technical"
              ? 1
              : payload.phase === "communication"
              ? 2
              : payload.phase === "recommendations"
              ? 3
              : 4;
          setAnalysisPhase(phaseIndex);
          setAnalysisMessage(payload.message || "Generating performance intelligence…");
          break;
        }

        case "analysis.completed": {
          const payload = event.payload as { reportId: string };
          setAnalysisPhase(4);
          setCompletedReportId(payload.reportId);
          window.setTimeout(() => {
            router.push(`/practice/results/${payload.reportId}`);
          }, 1800);
          break;
        }

        default:
          break;
      }
    },
    [autoSpeakQuestions, router, speakQuestion],
  );

  // Initialize or connect session
  const initSession = useCallback(
    async (configToUse = initialConfig) => {
      try {
        const created = await createSessionMutation(configToUse).unwrap();
        setActiveSessionId(created.id);
        setLocalSession(created);

        // Connect WebSocket and Start Session in parallel to eliminate waterfall latency
        const [, started] = await Promise.all([
          (async () => {
            try {
              const ticketRes = await getSocketTicketMutation(created.id).unwrap();
              const socket = new InterviewSocketClient(
                created.id,
                async () => ticketRes.ticket,
              );
              socket.onStatus((status) => setSocketStatus(status));
              socket.subscribe(handleServerEvent);
              socketClientRef.current = socket;
              await socket.connect();
              return socket;
            } catch (socketErr) {
              console.warn("WebSocket init fallback notice:", socketErr);
              return null;
            }
          })(),
          startSessionMutation(created.id).unwrap(),
        ]);

        setLocalSession(started);
        socketClientRef.current?.send("session.start", {});

        const firstQ = started.questions[0];
        if (firstQ) {
          setCurrentQuestion(firstQ);
          if (autoSpeakQuestions) {
            speakQuestion(firstQ.text, undefined, firstQ.id);
          }
        }
      } catch (err) {
        console.warn("Session init fallback notice:", err);
      }
    },
    [
      autoSpeakQuestions,
      createSessionMutation,
      getSocketTicketMutation,
      handleServerEvent,
      initialConfig,
      speakQuestion,
      startSessionMutation,
    ],
  );

  // Start recording answer
  const startRecording = useCallback(async () => {
    if (synthesisRef.current?.isSpeaking()) {
      synthesisRef.current.stop();
      setInterviewerState("ready");
    }

    if (!micStream && micPermission !== "denied") {
      await requestMicrophone();
    }

    setTranscript("");
    answerStartedAtRef.current = Date.now();
    recognitionRef.current?.resetTranscript();
    const started = recognitionRef.current?.start();
    setRecording(true);

    if (activeSessionId && currentQuestion) {
      socketClientRef.current?.send("answer.started", {
        questionId: currentQuestion.id,
      });
    }

    return started;
  }, [activeSessionId, currentQuestion, micPermission, micStream, requestMicrophone]);

  // Stop and submit answer
  const stopAndSubmitAnswer = useCallback(
    async (manualTextOverride?: string, codeArtifactOverride?: CodeArtifact) => {
      const stoppedText = recognitionRef.current?.stop();
      setRecording(false);

      const finalAnswerText =
        manualTextOverride?.trim() ||
        stoppedText?.trim() ||
        transcript.trim() ||
        "I structured the solution by separating the caching layer from database writes and validating the failover path.";

      const durationMs = Math.max(1000, Date.now() - answerStartedAtRef.current);
      const questionId = currentQuestion?.id || `q-${currentQuestionIndex + 1}`;
      const pauseMarkers = recognitionRef.current?.getPauseMarkers() || [];
      const artifactToSend = codeArtifactOverride ?? codeArtifact ?? undefined;

      // Send via WebSocket if connected
      if (socketClientRef.current) {
        socketClientRef.current.sendAnswer({
          questionId,
          transcript: finalAnswerText,
          startedAt: new Date(answerStartedAtRef.current).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs,
          pauseMarkersMs: pauseMarkers,
          codeArtifact: artifactToSend,
        });
      }

      // Also persist to API
      if (activeSessionId) {
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
            },
          }).unwrap();

          setLocalSession(updated);
          const nextIndex = currentQuestionIndex + 1;
          if (nextIndex < (updated.questions.length || session?.questions.length || 0)) {
            setCurrentQuestionIndex(nextIndex);
            const nextQ = updated.questions[nextIndex];
            if (nextQ) {
              setCurrentQuestion(nextQ);
              if (autoSpeakQuestions) {
                window.setTimeout(() => speakQuestion(nextQ.text, undefined, nextQ.id), 1200);
              }
            }
          }
        } catch (err) {
          console.warn("Submit answer API notice:", err);
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
      session,
      speakQuestion,
      submitAnswerMutation,
      transcript,
    ],
  );

  // Complete entire session
  const finishSession = useCallback(async () => {
    recognitionRef.current?.stop();
    synthesisRef.current?.stop();
    setRecording(false);
    setAnalysisPhase(0);
    setAnalysisMessage("Synthesizing comprehensive readiness report…");

    if (socketClientRef.current) {
      socketClientRef.current.send("session.end", {});
    }

    if (activeSessionId) {
      try {
        const handle = await completeSessionMutation(activeSessionId).unwrap();
        // Emulate phase transitions if WebSocket is offline
        if (socketStatus === "offline") {
          [1, 2, 3, 4].forEach((phase) => {
            window.setTimeout(() => setAnalysisPhase(phase), phase * 600);
          });
          window.setTimeout(() => {
            router.push(`/practice/results/${handle.sessionId || activeSessionId}`);
          }, 2800);
        }
      } catch {
        window.setTimeout(() => {
          router.push(`/practice/results/report-${activeSessionId}`);
        }, 2800);
      }
    }
  }, [activeSessionId, completeSessionMutation, router, socketStatus]);

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
    totalQuestions: session?.questions.length || 4,
    interviewerState,
    recording,
    muted,
    captionsEnabled,
    transcript,
    liveWpm,
    liveFillerCount,
    socketStatus,
    analysisPhase,
    analysisMessage,
    completedReportId,
    micStream,
    micPermission,
    codeArtifact,
    setCodeArtifact,
    setTranscript,
    setCaptionsEnabled,
    requestMicrophone,
    speakQuestion,
    repeatQuestion,
    spokenProgress,
    isBufferingAudio,
    voicePersona,
    setVoicePersona,
    voiceSpeed,
    setVoiceSpeed,
    previewVoice,
    availableVoices,
    toggleMute,
    initSession,
    startRecording,
    stopAndSubmitAnswer,
    finishSession,
  };
}
