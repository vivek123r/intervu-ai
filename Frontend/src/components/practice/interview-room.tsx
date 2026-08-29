"use client";

import {
  Captions,
  Check,
  Code2,
  Flame,
  Mic,
  MicOff,
  PhoneOff,
  Repeat2,
  Sparkles,
  Square,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { AIOrb } from "@/components/ui/ai-orb";
import { Brand } from "@/components/ui/brand";
import { ActionButton, IconButton } from "@/components/ui/buttons";
import { Modal } from "@/components/ui/modal";
import { Waveform } from "@/components/ui/waveform";
import { ScratchpadStudio } from "@/components/scratchpad/scratchpad-studio";
import { SESSION_COMPLETION_PHASES } from "@/lib/interview-options";
import { useInterviewSession } from "@/features/practice/hooks/use-interview-session";

import styles from "@/app/(product)/practice/practice.module.css";

function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(
      () => setSeconds((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [active]);
  const label = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return { label, seconds };
}

export function InterviewRoom({ interviewId }: { interviewId?: string }) {
  const {
    session,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    lastInterviewerLine,
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
    analysisStalled,
    viewResultsNow,
    micStream,
    micPermission,
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
    retryInitSession,
    initSession,
    startRecording,
    stopAndSubmitAnswer,
    finishSession,
  } = useInterviewSession({ interviewId });

  const [confirmEnd, setConfirmEnd] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const elapsed = useElapsed(Boolean(session && analysisPhase < 0));
  const prepElapsed = useElapsed(!session || !currentQuestion);

  // Initialize session on mount once — but wait for a selected interview's real
  // role/company to resolve first (when one was requested at all; `interviewLoading`
  // is simply false when it wasn't). Firing before it resolves used to seed the
  // session from the generic fallback config instead of the interview's own data.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && !interviewLoading) {
      initializedRef.current = true;
      void initSession();
    }
  }, [initSession, interviewLoading]);

  // Keyboard shortcut to toggle Scratchpad Studio (⌘ + E / Ctrl + E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setStudioOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mirrors the two phases the server actually reports — see
  // Backend/app/realtime/connection.py's _finish and use-interview-session.ts's
  // analysis.progress handling.

  if (preparationPhase !== "ready") {
    const isError = preparationPhase === "error";
    return (
      <main
        className={styles.interviewRoom}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 50% 30%, #141312, #080807)",
        }}
      >
        <div style={{ transform: "scale(1.25)", marginBottom: "0.5rem" }}>
          <AIOrb speaking={false} listening={false} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.4rem",
            textAlign: "center",
            maxWidth: "420px",
          }}
        >
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: 550,
              color: "#fff",
              margin: 0,
            }}
          >
            {isError
              ? "Interview Setup Interrupted"
              : "Preparing the Interview Room"}
          </h2>
          <p
            style={{
              fontSize: "0.88rem",
              color: isError ? "#ff6b6b" : "#aaa7a0",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {isError
              ? preparationError ||
                "Unable to establish interview session. Please verify backend connection."
              : preparationPhase === "connecting"
                ? "Connecting to real-time interview chamber…"
                : preparationPhase === "calibrating"
                  ? "Generating role-specific questions & calibrating interviewer…"
                  : "Finalizing interview environment…"}
          </p>
          {!isError && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "#666",
                marginTop: "0.25rem",
                fontFamily: "var(--font-geist-mono, monospace)",
              }}
            >
              Elapsed: {prepElapsed.label}
            </span>
          )}
        </div>
        {(isError || prepElapsed.seconds >= 6) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}
          >
            <ActionButton onClick={() => retryInitSession()}>
              {isError ? "Retry Connection" : "Start Session Now"}
            </ActionButton>
          </motion.div>
        )}
      </main>
    );
  }

  const isSpeaking = interviewerState === "speaking";
  const isThinking = interviewerState === "thinking";
  const isSpeakingIntro = activeCaptionKind === "intro" && Boolean(activeCaptionText);
  const isSpeakingTransition = activeCaptionKind === "transition" && Boolean(activeCaptionText);
  const isSpeakingWrapUp = activeCaptionKind === "wrap_up" && Boolean(activeCaptionText);
  const isSpeakingQuestion = activeCaptionKind === "question" && isSpeaking;
  const isIntroPhase = isSpeakingIntro || (!currentQuestion && Boolean(activeCaptionText));
  const isTransitionPhase = isSpeakingTransition;
  const isWrapUpPhase = isSpeakingWrapUp;
  const isDialoguePhase =
    isIntroPhase || isTransitionPhase || isWrapUpPhase || !currentQuestion;
  const activePersona =
    availableVoices.find((p) => p.id === voicePersona) || availableVoices[0];

  // While the AI is speaking, the headline ALWAYS matches the audio being voiced word-for-word.
  // While it's thinking (between answer.completed and the next TTS actually starting), show a
  // neutral state instead of falling through to the stale `currentQuestion` — otherwise the
  // just-answered question visibly "sticks" on screen until the next one starts playing.
  const activeHeadlineText = isSpeaking
    ? activeCaptionText || currentQuestion?.text || "Welcome to the interview session."
    : isThinking
      ? "Evaluating your answer…"
      : isDialoguePhase
        ? activeCaptionText || lastInterviewerLine || "Welcome to the interview session."
        : currentQuestion?.text || "Welcome to the interview session.";

  const headlineWords = activeHeadlineText.split(" ").filter(Boolean);
  const revealedCount = isSpeaking
    ? Math.max(
        1,
        Math.min(
          headlineWords.length,
          Math.ceil(spokenProgress * headlineWords.length),
        ),
      )
    : headlineWords.length;

  const stateLabel = isIntroPhase
    ? "Interviewer opening session…"
    : isTransitionPhase
      ? "Interviewer transition…"
      : isWrapUpPhase
        ? "Interviewer concluding…"
        : isSpeakingQuestion
          ? "Interviewer asking question…"
          : isSpeaking
            ? "Interviewer speaking…"
            : isThinking
              ? "Interviewer evaluating…"
              : recording
                ? "Listening to your answer…"
                : "Ready for your answer";

  return (
    <main
      id="main-content"
      className={styles.interviewRoom}
      data-interview-id={interviewId}
      data-current-question-id={currentQuestion?.id}
      data-interviewer-state={interviewerState}
      data-recording={recording}
      onClick={speechBlocked ? unlockSpeech : undefined}
    >
      <header className={styles.roomHeader}>
        <Brand />
        <div className={styles.roomContext}>
          <span>{session?.config?.company ?? "Practice Interview"}</span>
          <i />
          <span>{session?.config?.role ?? "Candidate"}</span>
        </div>
        <div className={styles.roomStatus}>
          <Wifi size={14} />
          <span>
            {socketStatus === "connected"
              ? "Live"
              : socketStatus === "reconnecting"
                ? "Reconnecting"
                : "Stable"}
          </span>
          <time className="mono">{elapsed.label}</time>
          <button
            type="button"
            className={styles.voiceSettingsButton}
            onClick={() => setVoiceSettingsOpen(true)}
            title="Interviewer Voice Persona & Studio Audio Settings"
          >
            <Volume2 size={13} />
            <span>Voice: {activePersona ? activePersona.name : "Jenny"}</span>
          </button>
          <button
            type="button"
            className={`${styles.studioTabButton} ${studioOpen ? styles.scratchpadToggleActive : ""}`}
            style={{
              padding: "0.3rem 0.6rem",
              border: "1px solid rgba(240, 185, 76, 0.25)",
            }}
            onClick={() => setStudioOpen(!studioOpen)}
            title="Toggle Live Scratchpad & Code Studio (⌘ + E)"
          >
            <Code2 size={14} />
            <span>{studioOpen ? "Hide Scratchpad" : "Scratchpad (⌘E)"}</span>
          </button>
          <IconButton
            ariaLabel="End interview"
            onClick={() => setConfirmEnd(true)}
          >
            <X size={17} />
          </IconButton>
        </div>
      </header>

      {speechBlocked && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.permissionPrompt}
          style={{
            margin: "0.5rem auto",
            maxWidth: "600px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
          onClick={unlockSpeech}
        >
          <Volume2 size={16} />
          <span>Audio autoplay was paused. Tap anywhere to hear the interviewer.</span>
        </motion.div>
      )}

      {/* No `mode="wait"` — none of these sections declare an `exit` animation, so
          "wait" only ever creates a window where AnimatePresence can latch onto an
          old subtree until it decides an exit completed that was never going to
          run. See the stable "voice-stage" key below for why that mattered here. */}
      <AnimatePresence>
        {analysisPhase >= 0 ? (
          <motion.section
            key="analysis"
            className={styles.analysisTransition}
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
          >
            <motion.div
              className={styles.analysisGlyph}
              initial={{ rotate: -7, y: 8, opacity: 0 }}
              animate={{ rotate: 0, y: 0, opacity: 1 }}
            >
              <svg viewBox="0 0 80 80">
                <motion.path
                  d="M19 41 33 55 62 25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7 }}
                />
              </svg>
            </motion.div>
            <div>
              <span className="fine-label">Interview complete</span>
              <h1>Turning the conversation into your next advantage.</h1>
              {analysisMessage && (
                <p
                  className="gold-text"
                  style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}
                >
                  {analysisMessage}
                </p>
              )}
            </div>
            <div className={styles.analysisPhases}>
              {SESSION_COMPLETION_PHASES.map((phase, index) => (
                <div key={phase} data-active={index <= analysisPhase}>
                  <span>
                    {index < analysisPhase ? <Check size={13} /> : index + 1}
                  </span>
                  <p>{phase}</p>
                </div>
              ))}
            </div>
            {analysisStalled && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: "0.5rem" }}
              >
                <ActionButton onClick={() => viewResultsNow()}>
                  View results now
                </ActionButton>
              </motion.div>
            )}
          </motion.section>
        ) : studioOpen ? (
          /* Split Studio Mode: AI Interviewer on Left, Scratchpad Studio on Right */
          <motion.section
            key="split-stage"
            className={styles.splitStudioStage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.leftChamber}>
              <div className={styles.questionProgress}>
                <span className="fine-label">
                  {isIntroPhase
                    ? "Opening Introduction"
                    : `Question ${currentQuestionIndex + 1} of ${totalQuestions}`}
                </span>
                <div>
                  {Array.from({ length: totalQuestions }).map((_, index) => (
                    <i
                      key={index}
                      data-state={
                        isIntroPhase
                          ? "future"
                          : index < currentQuestionIndex
                            ? "done"
                            : index === currentQuestionIndex
                              ? "current"
                              : "future"
                      }
                    />
                  ))}
                </div>
              </div>

              <div
                className={styles.interviewerField}
                style={{ gridRow: "auto", minHeight: "180px" }}
              >
                <AIOrb speaking={isSpeaking} listening={recording} />
                <div className={styles.interviewerState}>
                  <span className="status-dot" /> {stateLabel}
                </div>
              </div>

              <article
                className={styles.liveQuestion}
                style={{ padding: "0.5rem 0", gap: "0.6rem" }}
              >
                <div className={styles.questionTags}>
                  {isDialoguePhase ? (
                    <>
                      <span>
                        {isIntroPhase
                          ? "Opening"
                          : isWrapUpPhase
                            ? "Wrap-up"
                            : "Interviewer"}
                      </span>
                      <span>{session?.config?.company ?? "Practice Interview"}</span>
                      <span>{session?.config?.role ?? "Candidate"}</span>
                    </>
                  ) : (
                    <>
                      <span>{currentQuestion.category}</span>
                      <span>{currentQuestion.topic}</span>
                      {currentQuestion.followUp && <span>Follow-up</span>}
                      <span>{currentQuestion.difficulty}</span>
                    </>
                  )}
                  {isBufferingAudio && (
                    <span className={styles.captionBuffering}>
                      <span className="status-dot" /> Preparing audio…
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: "1.3rem", margin: 0, lineHeight: 1.25 }}>
                  {headlineWords.map((word: string, idx: number) => {
                    const isRevealed = idx < revealedCount;
                    const isCurrent = isSpeaking && idx === revealedCount - 1;
                    return (
                      <span
                        key={`${word}-${idx}`}
                        style={{
                          opacity: isSpeaking ? (isRevealed ? 1 : 0.6) : 1,
                          color: isCurrent
                            ? "#ffd976"
                            : isRevealed
                              ? "#f7f5f0"
                              : "rgba(247, 245, 240, 0.45)",
                          transition: "opacity 0.12s ease, color 0.12s ease",
                          display: "inline-block",
                          marginRight: "0.26em",
                        }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </h2>
              </article>

              {captionsEnabled && (
                <label
                  className={styles.transcriptField}
                  style={{ paddingInline: 0 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "0.72rem" }}>
                      Live transcript{" "}
                      <small>
                        {micPermission === "denied"
                          ? "Typed fallback"
                          : recording
                            ? "Listening active"
                            : "Ready"}
                      </small>
                    </span>
                    {recording && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.6rem",
                          fontSize: "0.7rem",
                          color: "#ffd976",
                        }}
                      >
                        <span>
                          <Volume2 size={12} style={{ display: "inline" }} />{" "}
                          {liveWpm} WPM
                        </span>
                        <span>
                          <Flame size={12} style={{ display: "inline" }} />{" "}
                          {liveFillerCount} fillers
                        </span>
                      </div>
                    )}
                  </div>
                  <textarea
                    style={{ minHeight: "80px" }}
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    placeholder={
                      recording
                        ? "Speaking..."
                        : "Start answer or write code on the right..."
                    }
                  />
                </label>
              )}

              <div className={styles.roomAudio}>
                <Waveform
                  stream={micStream}
                  active={recording || isSpeaking}
                  label="Live microphone waveform"
                />
              </div>

              <div className={styles.roomControls}>
                <button
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                >
                  <span>
                    {muted ? <MicOff size={18} /> : <Mic size={18} />}
                  </span>
                  <small>{muted ? "Unmute" : "Mute"}</small>
                </button>

                <button
                  onClick={() => setCaptionsEnabled(!captionsEnabled)}
                  aria-pressed={captionsEnabled}
                >
                  <span>
                    <Captions size={18} />
                  </span>
                  <small>Captions</small>
                </button>

                {!recording ? (
                  <button
                    className={styles.primaryRoomControl}
                    onClick={() => void startRecording()}
                  >
                    <span>
                      <Mic size={18} />
                    </span>
                    <small>Begin answer</small>
                  </button>
                ) : (
                  <button
                    className={styles.primaryRoomControl}
                    onClick={() => void stopAndSubmitAnswer()}
                    disabled={isThinking}
                  >
                    <span>
                      <Square size={17} />
                    </span>
                    <small>{isThinking ? "Evaluating..." : "Stop & submit"}</small>
                  </button>
                )}

                <button
                  onClick={repeatQuestion}
                  aria-label="Repeat question aloud"
                >
                  <span>
                    <Repeat2 size={18} />
                  </span>
                  <small>Repeat</small>
                </button>

                <button onClick={() => setConfirmEnd(true)}>
                  <span>
                    <PhoneOff size={18} />
                  </span>
                  <small>End</small>
                </button>
              </div>
              {turnError && (
                <p className={styles.permissionError} role="alert">
                  {turnError}
                </p>
              )}
            </div>

            <div className={styles.rightStudio}>
              <ScratchpadStudio
                questionTopic={currentQuestion?.topic || "Technical Design"}
                onArtifactChange={setCodeArtifact}
              />
            </div>
          </motion.section>
        ) : (
          /* Ambient Voice Mode: Focused stage — one stable key for the whole
             session. This used to key off the phase/question and flip twice per
             turn (question id -> "dialogue-phase" -> next question id), which
             under AnimatePresence's old `mode="wait"` could latch the DOM on a
             stale question while state had already moved on. The content inside
             already reacts to phase/question changes on its own. */
          <motion.section
            key="voice-stage"
            className={styles.roomStage}
            initial={{ opacity: 0, y: 8, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          >
            <div className={styles.questionProgress}>
              <span className="fine-label">
                {isIntroPhase
                  ? "Opening Introduction"
                  : `Question ${currentQuestionIndex + 1} of ${totalQuestions}`}
              </span>
              <div>
                {Array.from({ length: totalQuestions }).map((_, index) => (
                  <i
                    key={index}
                    data-state={
                      isIntroPhase
                        ? "future"
                        : index < currentQuestionIndex
                          ? "done"
                          : index === currentQuestionIndex
                            ? "current"
                            : "future"
                    }
                  />
                ))}
              </div>
            </div>

            <div className={styles.interviewerField}>
              <AIOrb speaking={isSpeaking} listening={recording} />
              <div className={styles.interviewerState}>
                <span className="status-dot" /> {stateLabel}
              </div>
            </div>

            <article className={styles.liveQuestion}>
              <div className={styles.questionTags}>
                {isDialoguePhase ? (
                  <>
                    <span>
                      {isIntroPhase
                        ? "Opening"
                        : isWrapUpPhase
                          ? "Wrap-up"
                          : "Interviewer"}
                    </span>
                    <span>{session?.config?.company ?? "Practice Interview"}</span>
                    <span>{session?.config?.role ?? "Candidate"}</span>
                  </>
                ) : (
                  <>
                    <span>{currentQuestion.category}</span>
                    <span>{currentQuestion.topic}</span>
                    {currentQuestion.followUp && <span>Follow-up</span>}
                    <span>{currentQuestion.difficulty}</span>
                  </>
                )}
                {isBufferingAudio && (
                  <span className={styles.captionBuffering}>
                    <span className="status-dot" /> Preparing audio…
                  </span>
                )}
              </div>
              <h1>
                {headlineWords.map((word: string, idx: number) => {
                  const isRevealed = idx < revealedCount;
                  const isCurrent = isSpeaking && idx === revealedCount - 1;
                  return (
                    <span
                      key={`${word}-${idx}`}
                      style={{
                        opacity: isSpeaking ? (isRevealed ? 1 : 0.6) : 1,
                        color: isCurrent
                          ? "#ffd976"
                          : isRevealed
                            ? "#f7f5f0"
                            : "rgba(247, 245, 240, 0.45)",
                        transition: "opacity 0.12s ease, color 0.12s ease",
                        display: "inline-block",
                        marginRight: "0.28em",
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </h1>
            </article>

            {captionsEnabled && (
              <label className={styles.transcriptField}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    Live transcript{" "}
                    <small>
                      {micPermission === "denied"
                        ? "Type your answer — microphone access was denied"
                        : recording
                          ? "Live speech recognition active"
                          : "Ready"}
                    </small>
                  </span>
                  {recording && (
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        fontSize: "0.75rem",
                        color: "#ffd976",
                      }}
                    >
                      <span>
                        <Volume2
                          size={13}
                          style={{ display: "inline", verticalAlign: "middle" }}
                        />{" "}
                        {liveWpm} WPM
                      </span>
                      <span>
                        <Flame
                          size={13}
                          style={{ display: "inline", verticalAlign: "middle" }}
                        />{" "}
                        {liveFillerCount} fillers
                      </span>
                    </div>
                  )}
                </div>
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder={
                    recording
                      ? "Speak naturally into your microphone, or type your answer here…"
                      : "Start your answer when you’re ready…"
                  }
                />
              </label>
            )}

            <div className={styles.roomAudio}>
              <Waveform
                stream={micStream}
                active={recording || isSpeaking}
                label="Live microphone waveform"
              />
            </div>

            <div className={styles.roomControls}>
              <button
                onClick={toggleMute}
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              >
                <span>{muted ? <MicOff size={19} /> : <Mic size={19} />}</span>
                <small>{muted ? "Unmute" : "Mute"}</small>
              </button>

              <button
                onClick={() => setCaptionsEnabled(!captionsEnabled)}
                aria-pressed={captionsEnabled}
              >
                <span>
                  <Captions size={19} />
                </span>
                <small>Captions</small>
              </button>

              {!recording ? (
                <button
                  className={styles.primaryRoomControl}
                  onClick={() => void startRecording()}
                >
                  <span>
                    <Mic size={20} />
                  </span>
                  <small>Begin answer</small>
                </button>
              ) : (
                <button
                  className={styles.primaryRoomControl}
                  onClick={() => void stopAndSubmitAnswer()}
                  disabled={isThinking}
                >
                  <span>
                    <Square size={18} />
                  </span>
                  <small>{isThinking ? "Evaluating..." : "Stop answer"}</small>
                </button>
              )}

              <button
                onClick={() => setStudioOpen(true)}
                title="Open Code & System Architecture Scratchpad (⌘ + E)"
              >
                <span>
                  <Code2 size={19} />
                </span>
                <small>Scratchpad</small>
              </button>

              <button
                onClick={repeatQuestion}
                aria-label="Repeat question aloud"
              >
                <span>
                  <Repeat2 size={19} />
                </span>
                <small>Repeat</small>
              </button>

              <button onClick={() => setConfirmEnd(true)}>
                <span>
                  <PhoneOff size={19} />
                </span>
                <small>End</small>
              </button>
            </div>

            {micPermission === "idle" && (
              <button
                className={styles.permissionPrompt}
                onClick={() => void requestMicrophone()}
              >
                <Mic size={14} /> Enable microphone for live voice
                speech-to-text
              </button>
            )}
            {micPermission === "denied" && (
              <p className={styles.permissionError} role="alert">
                Microphone unavailable. The interview room remains fully usable
                with typed transcripts.
              </p>
            )}
            {turnError && (
              <p className={styles.permissionError} role="alert">
                {turnError}
              </p>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End this interview?"
      >
        <div className={styles.endDialog}>
          <p>
            Your answers, written code, and speech patterns are already
            recorded. Intervu will analyze the completed portion and generate
            your readiness report.
          </p>
          <div>
            <ActionButton variant="ghost" onClick={() => setConfirmEnd(false)}>
              Continue interview
            </ActionButton>
            <ActionButton onClick={() => void finishSession()}>
              <Sparkles size={15} /> End and analyze
            </ActionButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={voiceSettingsOpen}
        onClose={() => setVoiceSettingsOpen(false)}
        title="Interviewer Neural Voice Settings"
      >
        <div className={styles.voiceSettingsDialog}>
          <div className={styles.voiceSettingsSection}>
            <label>Voice Persona</label>
            <div className={styles.voicePersonaGrid}>
              {availableVoices.map((voice) => {
                const isSelected = voice.id === voicePersona;
                return (
                  <div
                    key={voice.id}
                    className={styles.voicePersonaCard}
                    data-active={isSelected}
                    onClick={() => setVoicePersona(voice.id)}
                  >
                    <div>
                      <div className={styles.voicePersonaHeader}>
                        <strong>{voice.name}</strong>
                        <div className={styles.voicePersonaBadges}>
                          <span
                            className={styles.voiceBadge}
                            data-accent={voice.accent.includes("US")}
                          >
                            {voice.accent}
                          </span>
                          <span className={styles.voiceBadge}>
                            {voice.gender}
                          </span>
                        </div>
                      </div>
                      <p className={styles.voicePersonaStyle}>{voice.style}</p>
                    </div>

                    <div className={styles.voicePersonaActions}>
                      <button
                        type="button"
                        className={styles.voicePreviewButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          previewVoice(voice.id);
                        }}
                        title={`Preview ${voice.name}'s voice`}
                      >
                        <Volume2 size={12} />
                        <span>Preview</span>
                      </button>

                      {isSelected ? (
                        <span className={styles.voiceSelectedIndicator}>
                          <Check size={13} /> Selected
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "#888888" }}>
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.voiceSettingsSection}>
            <label>Interviewer Speech Pace</label>
            <div className={styles.voiceSpeedGroup}>
              {[
                { label: "0.85x (Calm)", value: 0.85 },
                { label: "0.95x (Natural)", value: 0.95 },
                { label: "1.0x (Standard)", value: 1.0 },
                { label: "1.1x (Brisk)", value: 1.1 },
              ].map((speedOpt) => (
                <button
                  key={speedOpt.value}
                  type="button"
                  className={styles.voiceSpeedPill}
                  data-active={voiceSpeed === speedOpt.value}
                  onClick={() => setVoiceSpeed(speedOpt.value)}
                >
                  {speedOpt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </main>
  );
}
