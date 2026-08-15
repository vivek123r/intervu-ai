"use client";

import { ArrowLeft, ArrowRight, Check, Clock3, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import type { InterviewType, PracticeConfig } from "@/lib/domain";
import { useProduct } from "@/lib/product-store";

import styles from "../practice.module.css";

const focusOptions = ["System design", "SQL", "Caching", "Node.js", "Behavioral results", "Communication"];
const stylesList = ["Friendly recruiter", "Neutral interviewer", "Strict technical lead", "Senior engineer", "Hiring manager"];

export default function PracticeSetupPage() {
  const router = useRouter();
  const { selectedInterview, startSession } = useProduct();
  const [config, setConfig] = useState<PracticeConfig>({
    role: selectedInterview.role,
    company: selectedInterview.company,
    type: "technical",
    difficulty: "hard",
    duration: 30,
    focusAreas: ["System design", "SQL"],
    interviewerStyle: "Senior engineer",
  });

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    const focus = new URLSearchParams(window.location.search).get("focus");
    const timer = window.setTimeout(() => {
      setConfig((current) => {
        const next = { ...current };
        if (mode === "behavioral") next.type = "behavioral";
        if (mode === "system") { next.type = "system_design"; next.duration = 45; }
        if (mode === "hr") { next.type = "recruiter"; next.duration = 20; }
        if (focus) next.focusAreas = [focus];
        return next;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleFocus = (focus: string) => {
    setConfig((current) => ({
      ...current,
      focusAreas: current.focusAreas.includes(focus)
        ? current.focusAreas.filter((item) => item !== focus)
        : [...current.focusAreas, focus],
    }));
  };

  const begin = () => {
    startSession(config);
    router.push("/practice/session");
  };

  return (
    <motion.div {...pageTransition} className={styles.setupPage}>
      <button className={styles.practiceBack} onClick={() => router.back()}><ArrowLeft size={15} /> Practice hub</button>
      <header className={styles.setupHeading}>
        <span className="fine-label">Interview setup</span>
        <h1>Set the conditions. Then forget the controls.</h1>
        <p>Once the interview starts, Intervu removes configuration and keeps only what a real conversation needs.</p>
      </header>
      <div className={styles.setupGrid}>
        <Surface className={styles.setupForm}>
          <div className={styles.setupSection}>
            <div><SlidersHorizontal size={18} /><span><strong>Interview context</strong><small>What should the interviewer optimize for?</small></span></div>
            <div className={styles.formGrid}>
              <label className="field-label">Role<input className="field" value={config.role} onChange={(event) => setConfig({ ...config, role: event.target.value })} /></label>
              <label className="field-label">Company<input className="field" value={config.company} onChange={(event) => setConfig({ ...config, company: event.target.value })} /></label>
              <label className="field-label">Interview type<select className="select-field" value={config.type} onChange={(event) => setConfig({ ...config, type: event.target.value as InterviewType })}><option value="technical">Technical</option><option value="system_design">System design</option><option value="behavioral">Behavioral</option><option value="recruiter">HR / recruiter</option><option value="hiring_manager">Hiring manager</option></select></label>
              <label className="field-label">Duration<select className="select-field" value={config.duration} onChange={(event) => setConfig({ ...config, duration: Number(event.target.value) })}><option value={10}>10 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></label>
            </div>
          </div>

          <div className={styles.setupSection}>
            <div><Sparkles size={18} /><span><strong>Difficulty</strong><small>Changes probing depth, not just vocabulary.</small></span></div>
            <div className="pill-row">
              {(["easy", "normal", "hard", "brutal"] as const).map((difficulty) => <button key={difficulty} className="choice-pill" data-selected={config.difficulty === difficulty} onClick={() => setConfig({ ...config, difficulty })}>{difficulty}</button>)}
            </div>
          </div>

          <div className={styles.setupSection}>
            <div><Clock3 size={18} /><span><strong>Focus areas</strong><small>Select up to four high-value topics.</small></span></div>
            <div className="pill-row">
              {focusOptions.map((focus) => <button key={focus} className="choice-pill" data-selected={config.focusAreas.includes(focus)} onClick={() => toggleFocus(focus)}>{config.focusAreas.includes(focus) && <Check size={13} />} {focus}</button>)}
            </div>
          </div>

          <div className={styles.setupSection}>
            <div><UserRound size={18} /><span><strong>Interviewer style</strong><small>Professional behavior, never a cartoon persona.</small></span></div>
            <div className={styles.styleChoices}>
              {stylesList.map((style) => <button key={style} data-selected={config.interviewerStyle === style} onClick={() => setConfig({ ...config, interviewerStyle: style })}><span>{style}</span>{config.interviewerStyle === style && <Check size={14} />}</button>)}
            </div>
          </div>
        </Surface>

        <aside className={styles.setupSummary}>
          <Surface gold>
            <span className="fine-label">Session brief</span>
            <h2>{config.role}</h2>
            <p>{config.company}</p>
            <dl>
              <div><dt>Mode</dt><dd>{config.type.replace("_", " ")}</dd></div>
              <div><dt>Difficulty</dt><dd>{config.difficulty}</dd></div>
              <div><dt>Duration</dt><dd>{config.duration} min</dd></div>
              <div><dt>Interviewer</dt><dd>{config.interviewerStyle}</dd></div>
            </dl>
            <div className={styles.summaryFocus}>{config.focusAreas.map((focus) => <span key={focus}>{focus}</span>)}</div>
            <ActionButton onClick={begin} disabled={!config.role.trim() || !config.focusAreas.length}>Enter interview room <ArrowRight data-arrow size={16} /></ActionButton>
            <small>Microphone permission is requested inside the room.</small>
          </Surface>
        </aside>
      </div>
    </motion.div>
  );
}
