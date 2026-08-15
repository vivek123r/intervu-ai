"use client";

import {
  ArrowRight,
  Binary,
  BriefcaseBusiness,
  Braces,
  Gauge,
  MessageSquareText,
  Network,
  Sparkles,
  TimerReset,
  UserRound,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { ActionButton } from "@/components/ui/buttons";
import { AIOrb } from "@/components/ui/ai-orb";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";

import styles from "./practice.module.css";

const practiceModes = [
  { key: "technical", title: "Technical interview", copy: "Role-specific depth and adaptive follow-ups.", icon: Braces, duration: "30–45 min", tone: "gold" },
  { key: "behavioral", title: "Behavioral interview", copy: "Stories, ownership, trade-offs, and measurable results.", icon: MessageSquareText, duration: "20–30 min", tone: "violet" },
  { key: "resume", title: "Resume deep dive", copy: "Defend every decision and result on your resume.", icon: BriefcaseBusiness, duration: "20 min", tone: "blue" },
  { key: "rapid", title: "Rapid fire", copy: "Short questions, fast recall, no over-explaining.", icon: Gauge, duration: "10 min", tone: "orange" },
  { key: "system", title: "System design", copy: "Constraints, architecture, failure modes, and scale.", icon: Network, duration: "45 min", tone: "green" },
  { key: "sql", title: "SQL pressure test", copy: "Transactions, indexing, query plans, and correctness.", icon: Binary, duration: "15 min", tone: "gold" },
  { key: "hr", title: "HR interview", copy: "Motivation, expectations, and concise communication.", icon: UserRound, duration: "15–20 min", tone: "violet" },
  { key: "custom", title: "Custom interview", copy: "Choose the topics, difficulty, duration, and style.", icon: Sparkles, duration: "You decide", tone: "blue" },
];

export default function PracticePage() {
  return (
    <motion.div {...pageTransition} className={styles.practicePage}>
      <header className={styles.practiceHeading}>
        <div><span className="fine-label">Practice hub</span><h1>Choose the pressure you need.</h1><p>Every mode adapts to your role, evidence, and recent weak areas.</p></div>
        <div className={styles.practiceStat}><TimerReset size={18} /><strong className="mono">42m</strong><span>this week</span></div>
      </header>

      <section className={styles.featuredMock}>
        <div className={styles.featuredCopy}>
          <span className="gold-status"><i className="status-dot" /> Recommended next</span>
          <h2>Full mock interview</h2>
          <p>A realistic 45-minute sequence calibrated to your Northstar Labs system-design round.</p>
          <div className={styles.featuredSignals}><span>Resume context</span><i /><span>Adaptive follow-ups</span><i /><span>Full report</span></div>
          <ActionButton href="/practice/setup?mode=full">Configure interview <ArrowRight data-arrow size={17} /></ActionButton>
        </div>
        <div className={styles.featuredOrb}><AIOrb compact speaking /><span>AI interviewer ready</span></div>
        <div className={styles.featuredReadiness}><span>Estimated readiness gain</span><strong className="mono">+4—7</strong><small>points</small></div>
      </section>

      <section className={styles.modeSection}>
        <div className={styles.modeHeading}><h2>Focused practice</h2><p>Go narrow when one skill is holding the rest back.</p></div>
        <div className={styles.modeGrid}>
          {practiceModes.map((mode, index) => {
            const Icon = mode.icon;
            return (
              <Surface key={mode.key} interactive reveal className={styles.modeCard} data-tone={mode.tone}>
                <Link href={`/practice/setup?mode=${mode.key}`} aria-label={`Configure ${mode.title}`}>
                  <div className={styles.modeIcon}><Icon size={21} /></div>
                  <span className="mono">0{index + 1}</span>
                  <div><h3>{mode.title}</h3><p>{mode.copy}</p></div>
                  <footer><small>{mode.duration}</small><ArrowRight size={16} /></footer>
                </Link>
              </Surface>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}
