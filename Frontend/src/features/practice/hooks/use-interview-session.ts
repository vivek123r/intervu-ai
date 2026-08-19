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
  interviewId,
  initialConfig = defaultFallbackConfig,
  autoSpeakQuestions = true,
}: UseInterviewSessionOptions = {}) {
  const router = useRouter();
  const { state: productState } = useProduct();
  const { data: interviewData } = useGetInterviewQuery(interviewId || "", {
    skip: !interviewId,
  });

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
  const [totalQuestionsCount, setTotalQuestionsCount] = useState<number>(4);
  const [conversationLog, setConversationLog] = useState<ConversationItem[]>([]);
  const [lastInterviewerLine, setLastInterviewerLine] = useState<string>("");
  const [activeSpokenQuestionId, setActiveSpokenQuestionId] = useState<string | null>(null);
  const [activeCaptionText, setActiveCaptionText] = useState<string>("");
  const [activeCaptionKind, setActiveCaptionKind] = useState<
    "intro" | "question" | "answer" | "transition" | "wrap_up" | null
  >(null);

  const [preparationPhase, setPreparationPhase] = useState<
    "connecting" | "calibrating" | "ready" | "error"
  >("connecting");
  const [preparationError, setPreparationError] = useState<string | null>(null);

  const currentQuestionRef = useRef<Question | null>(null);
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);
  const fallbackTimerRef = useRef<number | null>(null);

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

    synthesisRef.current = new SpeechSynthesisService();

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

  // Voicing text with sequential speech queue
  const queueSpeech = useCallback(
    (
      text: string,
      isQuestion = false,
      questionId?: string,
      forceImmediate = false,
      onCompleted?: () => void,
    ) => {
      if (!text.trim()) {
        onCompleted?.();
        return;
      }

      if (!synthesisRef.current?.isSupported()) {
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
            setInterviewerState("speaking");
            if (isQuestion && questionId) {
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
            }
            onCompleted?.();
          },
          onError: () => {
            setIsBufferingAudio(false);
            setSpokenProgress(1);
            if (!synthesisRef.current?.isSpeaking()) {
              setInterviewerState("ready");
              setActiveSpokenQuestionId(null);
            }
            onCompleted?.();
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
      const sample = persona?.sample_text || "Hello! I'll be your interviewer for today's session.";
      synthesisRef.current?.speak(sample, { voiceId: selectedVoice, rate: voiceSpeed }, false);
    },
    [availableVoices, voicePersona, voiceSpeed],
  );

  // Repeat current question (immediate)
  const repeatQuestion = useCallback(() => {
    if (currentQuestion) {
      setActiveCaptionText(currentQuestion.text);
      setActiveCaptionKind("question");
      queueSpeech(currentQuestion.text, true, currentQuestion.id, true, () => {
        socketClientRef.current?.sendSpeechCompleted("question_repeat_finished");
      });
      socketClientRef.current?.send("question.repeat", { questionId: currentQuestion.id });
    }
  }, [currentQuestion, queueSpeech]);

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
          const payload = event.payload as unknown as InterviewerResponsePayload;
          if (fallbackTimerRef.current) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          setPreparationPhase("ready");
          if (payload?.text) {
            setLastInterviewerLine(payload.text);
            setActiveCaptionText(payload.text);
            const kind = payload.kind || "transition";
            setActiveCaptionKind(kind);
            setConversationLog((prev) => [
              ...prev,
              {
                speaker: "interviewer",
                kind,
                text: payload.text,
              },
            ]);
            if (autoSpeakQuestions) {
              queueSpeech(payload.text, false, undefined, false, () => {
                // Acknowledge transition speech to server so it can advance to next question
                socketClientRef.current?.sendSpeechCompleted("transition_finished");
              });
            } else {
              socketClientRef.current?.sendSpeechCompleted("transition_displayed");
            }
          }
          break;
        }

        case "question.created": {
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
          setCurrentQuestion(newQ);
          setActiveCaptionText(payload.text);
          setActiveCaptionKind("question");
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
          if (autoSpeakQuestions) {
            queueSpeech(payload.text, true, payload.id, false, () => {
              socketClientRef.current?.sendSpeechCompleted("question_finished");
            });
          }
          break;
        }

        case "interviewer.thinking":
          setInterviewerState("thinking");
          setActiveCaptionText("");
          setActiveCaptionKind(null);
          break;

        case "session.completed":
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
    [autoSpeakQuestions, queueSpeech, router],
  );

  // Initialize session cleanly: WebSocket drives flow, REST acts as pure fallback
  const initSession = useCallback(
    async (configOverride?: PracticeConfig) => {
      const baseConfig = interviewData
        ? {
            ...initialConfig,
            role: interviewData.role,
            company: interviewData.company,
            type: (interviewData.type as PracticeConfig["type"]) || initialConfig.type,
          }
        : initialConfig;
      const configToUse = configOverride || productState.session?.config || baseConfig;
      setPreparationPhase("connecting");
      setPreparationError(null);

      try {
        const created = await createSessionMutation(configToUse).unwrap();
        setActiveSessionId(created.id);
        setLocalSession(created);
        setPreparationPhase("calibrating");

        let socketConnected = false;
        try {
          const ticketRes = await getSocketTicketMutation(created.id).unwrap();
          const socket = new InterviewSocketClient(
            created.id,
            async () => ticketRes.ticket,
          );
          socket.onStatus((status) => {
            setSocketStatus(status);
          });
          socket.subscribe(handleServerEvent);
          socketClientRef.current = socket;
          await socket.connect();
          socketConnected = true;
        } catch (socketErr) {
          console.warn("WebSocket init fallback notice:", socketErr);
        }

        if (socketConnected && socketClientRef.current) {
          // Trigger session start through WebSocket: server pushes intro and question 1
          socketClientRef.current.send("session.start", {});

          // Safety fallback timer: if questions are not received within 6s, fetch via REST
          if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = window.setTimeout(async () => {
            if (!currentQuestionRef.current) {
              console.info("WebSocket response taking longer than expected, triggering REST fallback...");
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
                      queueSpeech(firstQ.text, true, firstQ.id);
                    }
                  }
                }
              } catch (fallbackErr) {
                console.warn("Fallback REST start notice:", fallbackErr);
              }
            }
          }, 6000);
        } else {
          // Offline REST fallback
          const started = await startSessionMutation(created.id).unwrap();
          setLocalSession(started);
          const introEntry = started.interviewerLog?.find((l) => l.kind === "intro");
          if (started.questions?.length) {
            setTotalQuestionsCount(started.questions.length);
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
                  queueSpeech(introEntry.text, false, undefined, false, () => {
                    setActiveCaptionText(firstQ.text);
                    setActiveCaptionKind("question");
                    queueSpeech(firstQ.text, true, firstQ.id);
                  });
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
                  queueSpeech(firstQ.text, true, firstQ.id);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Session init error:", err);
        setPreparationPhase("error");
        setPreparationError(err instanceof Error ? err.message : "Failed to initialize interview room.");
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
  const startRecording = useCallback(async () => {
    // Stop any playing TTS immediately
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
      setInterviewerState("thinking");

      const finalAnswerText =
        manualTextOverride?.trim() ||
        stoppedText?.trim() ||
        transcript.trim() ||
        "(No speech detected)";

      const durationMs = Math.max(1000, Date.now() - answerStartedAtRef.current);
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
            },
          }).unwrap();

          setLocalSession(updated);
          const nextIndex = currentQuestionIndex + 1;
          if (nextIndex < (updated.questions?.length || session?.questions?.length || 0)) {
            setCurrentQuestionIndex(nextIndex);
            const nextQ = updated.questions[nextIndex];
            if (nextQ) {
              setCurrentQuestion(nextQ);
              setConversationLog((prev) => [
                ...prev,
                {
                  speaker: "interviewer",
                  kind: "question",
                  text: nextQ.text,
                  questionId: nextQ.id,
                },
              ]);
              if (autoSpeakQuestions) {
                queueSpeech(nextQ.text, true, nextQ.id);
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
      queueSpeech,
      session,
      socketStatus,
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
    analysisMessage,
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
    voicePersona,
    setVoicePersona,
    voiceSpeed,
    setVoiceSpeed,
    previewVoice,
    availableVoices,
    toggleMute,
    preparationPhase,
    preparationError,
    retryInitSession: initSession,
    initSession,
    startRecording,
    stopAndSubmitAnswer,
    finishSession,
  };
}
