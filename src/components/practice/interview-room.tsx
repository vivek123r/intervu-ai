"use client";

import {
  Captions,
  Check,
  Mic,
  MicOff,
  PhoneOff,
  Repeat2,
  Sparkles,
  Square,
  Wifi,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AIOrb } from "@/components/ui/ai-orb";
import { Brand } from "@/components/ui/brand";
import { ActionButton, IconButton } from "@/components/ui/buttons";
import { Modal } from "@/components/ui/modal";
import { Waveform } from "@/components/ui/waveform";
import type { PracticeConfig, SessionAnswer } from "@/types/domain";
import { useProduct } from "@/lib/product-store";

import styles from "@/app/(product)/practice/practice.module.css";

const fallbackConfig: PracticeConfig = {
  role: "Senior Backend Engineer",
  company: "Northstar Labs",
  type: "technical",
  difficulty: "hard",
  duration: 30,
  focusAreas: ["System design", "SQL"],
  interviewerStyle: "Senior engineer",
};

function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function InterviewRoom({ interviewId }: { interviewId?: string }) {
  const router = useRouter();
  const { state, startSession, submitAnswer, completeSession } = useProduct();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permission, setPermission] = useState<"idle" | "granted" | "denied">("idle");
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState(-1);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const answerStartedRef = useRef<number>(0);

  useEffect(() => {
    if (!state.session) startSession(fallbackConfig);
  }, [startSession, state.session]);

  const session = state.session;
  const question = session?.questions[session.currentQuestionIndex];
  const elapsed = useElapsed(Boolean(session && analysisPhase < 0));

  useEffect(() => {
    const timer = window.setTimeout(() => setSpeaking(false), 1600);
    return () => window.clearTimeout(timer);
  }, [question?.id]);

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  const requestMicrophone = async () => {
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      setStream(nextStream);
      setPermission("granted");
    } catch {
      setPermission("denied");
    }
  };

  const startRecording = async () => {
    if (!stream && permission !== "denied") await requestMicrophone();
    if (stream && typeof MediaRecorder !== "undefined") {
      recorderRef.current = new MediaRecorder(stream);
      recorderRef.current.start();
    }
    answerStartedRef.current = Date.now();
    setRecording(true);
  };

  const runAnalysis = useCallback((pendingAnswer?: SessionAnswer) => {
    setRecording(false);
    setAnalysisPhase(0);
    const report = completeSession(pendingAnswer);
    [1, 2, 3, 4].forEach((phase) => {
      window.setTimeout(() => setAnalysisPhase(phase), phase * 560);
    });
    window.setTimeout(() => {
      router.push(`/practice/results/${report.id}`);
    }, 2900);
  }, [completeSession, router]);

  const stopAnswer = () => {
    recorderRef.current?.stop();
    const duration = Math.max(12, Math.round((Date.now() - answerStartedRef.current) / 1000));
    const answer = transcript.trim() || "We cached the account summary because it was read-heavy. The write path owned invalidation, a short TTL limited stale data, and the service bypassed Redis when health checks failed. I would add request coalescing to prevent a cache stampede during recovery.";
    const isLast = Boolean(session && session.currentQuestionIndex >= session.questions.length - 1);
    const pendingAnswer: SessionAnswer | undefined = question
      ? {
          questionId: question.id,
          question: question.text,
          transcript: answer,
          durationSeconds: duration,
          score: Math.min(9.2, 6.4 + answer.trim().split(/\s+/).length / 45),
        }
      : undefined;
    submitAnswer(answer, duration);
    setTranscript("");
    setRecording(false);
    if (isLast) runAnalysis(pendingAnswer);
    else {
      setSpeaking(true);
      window.setTimeout(() => setSpeaking(false), 1500);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    stream?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };

  const phases = [
    "Transcript processed",
    "Technical depth reviewed",
    "Communication patterns measured",
    "Weak topics prioritized",
    "Recommendations ready",
  ];

  if (!session || !question) return <div className={styles.roomLoading}>Preparing the interview room…</div>;

  return (
    <main id="main-content" className={styles.interviewRoom} data-interview-id={interviewId}>
      <header className={styles.roomHeader}>
        <Brand />
        <div className={styles.roomContext}><span>{session.config.company}</span><i /><span>{session.config.role}</span></div>
        <div className={styles.roomStatus}><Wifi size={14} /><span>Stable</span><time className="mono">{elapsed}</time><IconButton ariaLabel="End interview" onClick={() => setConfirmEnd(true)}><X size={17} /></IconButton></div>
      </header>

      <AnimatePresence mode="wait">
        {analysisPhase >= 0 ? (
          <motion.section key="analysis" className={styles.analysisTransition} initial={{ opacity: 0, filter: "blur(10px)" }} animate={{ opacity: 1, filter: "blur(0px)" }}>
            <motion.div className={styles.analysisGlyph} initial={{ rotate: -7, y: 8, opacity: 0 }} animate={{ rotate: 0, y: 0, opacity: 1 }}>
              <svg viewBox="0 0 80 80"><motion.path d="M19 41 33 55 62 25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }} /></svg>
            </motion.div>
            <div><span className="fine-label">Interview complete</span><h1>Turning the conversation into your next advantage.</h1></div>
            <div className={styles.analysisPhases}>
              {phases.map((phase, index) => <div key={phase} data-active={index <= analysisPhase}><span>{index < analysisPhase ? <Check size={13} /> : index + 1}</span><p>{phase}</p></div>)}
            </div>
          </motion.section>
        ) : (
          <motion.section key={question.id} className={styles.roomStage} initial={{ opacity: 0, y: 8, filter: "blur(5px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}>
            <div className={styles.questionProgress}>
              <span className="fine-label">Question {session.currentQuestionIndex + 1} of {session.questions.length}</span>
              <div>{session.questions.map((item, index) => <i key={item.id} data-state={index < session.currentQuestionIndex ? "done" : index === session.currentQuestionIndex ? "current" : "future"} />)}</div>
            </div>

            <div className={styles.interviewerField}>
              <AIOrb speaking={speaking} listening={recording} />
              <div className={styles.interviewerState}><span className="status-dot" /> {speaking ? "Interviewer speaking" : recording ? "Listening" : "Ready for your answer"}</div>
            </div>

            <article className={styles.liveQuestion}>
              <div className={styles.questionTags}><span>{question.category}</span><span>{question.topic}</span>{question.followUp && <span>Follow-up</span>}<span>{question.difficulty}</span></div>
              <h1>{question.text}</h1>
            </article>

            {captions && (
              <label className={styles.transcriptField}>
                <span>Live transcript <small>{permission === "denied" ? "Type your answer—microphone access was denied" : "Speech provider mock mode"}</small></span>
                <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder={recording ? "Speak naturally, or type the transcript here…" : "Start your answer when you’re ready…"} />
              </label>
            )}

            <div className={styles.roomAudio}>
              <Waveform stream={stream} active={recording || speaking} label="Live microphone waveform" />
            </div>

            <div className={styles.roomControls}>
              <button onClick={toggleMute} aria-label={muted ? "Unmute microphone" : "Mute microphone"}><span>{muted ? <MicOff size={19} /> : <Mic size={19} />}</span><small>{muted ? "Unmute" : "Mute"}</small></button>
              <button onClick={() => setCaptions((value) => !value)} aria-pressed={captions}><span><Captions size={19} /></span><small>Captions</small></button>
              {!recording ? (
                <button className={styles.primaryRoomControl} onClick={() => void startRecording()}><span><Mic size={20} /></span><small>Begin answer</small></button>
              ) : (
                <button className={styles.primaryRoomControl} onClick={stopAnswer}><span><Square size={18} /></span><small>Stop answer</small></button>
              )}
              <button onClick={() => { setSpeaking(true); window.setTimeout(() => setSpeaking(false), 1500); }}><span><Repeat2 size={19} /></span><small>Repeat</small></button>
              <button onClick={() => setConfirmEnd(true)}><span><PhoneOff size={19} /></span><small>End</small></button>
            </div>

            {permission === "idle" && <button className={styles.permissionPrompt} onClick={() => void requestMicrophone()}><Mic size={14} /> Enable microphone for a responsive waveform</button>}
            {permission === "denied" && <p className={styles.permissionError} role="alert">Microphone unavailable. The interview remains fully usable with typed transcripts.</p>}
          </motion.section>
        )}
      </AnimatePresence>

      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} title="End this interview?">
        <div className={styles.endDialog}><p>Your answers are already saved. Intervu will analyze the completed portion and preserve the session.</p><div><ActionButton variant="ghost" onClick={() => setConfirmEnd(false)}>Continue interview</ActionButton><ActionButton onClick={() => runAnalysis()}><Sparkles size={15} /> End and analyze</ActionButton></div></div>
      </Modal>
    </main>
  );
}
