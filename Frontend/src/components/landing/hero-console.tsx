"use client";

import { ArrowUpRight, CalendarDays, Check, Database, Radio, Sparkles } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { PointerEvent } from "react";

import { ScoreRing } from "@/components/ui/score-ring";
import { Surface } from "@/components/ui/surface";
import { Waveform } from "@/components/ui/waveform";

import styles from "@/app/landing.module.css";

export function HeroConsole() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 120, damping: 24 });
  const springY = useSpring(y, { stiffness: 120, damping: 24 });
  const farX = useTransform(springX, [-1, 1], [-5, 5]);
  const farY = useTransform(springY, [-1, 1], [-4, 4]);
  const nearX = useTransform(springX, [-1, 1], [-9, 9]);
  const nearY = useTransform(springY, [-1, 1], [-7, 7]);

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
    y.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 2);
  };

  return (
    <div
      className={styles.heroConsole}
      onPointerMove={handleMove}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <svg className={styles.consoleRoutes} viewBox="0 0 760 650" aria-hidden="true">
        <path d="M30 510C170 410 115 205 300 232s210 110 430-80" />
        <path d="M-10 562C190 460 210 360 384 390s206 82 400-56" />
        <circle cx="302" cy="232" r="4" />
        <circle cx="384" cy="390" r="4" />
      </svg>

      <motion.div className={styles.nextInterview} style={{ x: farX, y: farY }}>
        <Surface gold className={styles.consolePanel}>
          <div className={styles.panelTopline}>
            <span>Next interview</span>
            <span className={styles.liveSignal}>In 2d 14h</span>
          </div>
          <div className={styles.companyRow}>
            <span className={styles.companyMark}>N</span>
            <div>
              <strong>Senior Backend Engineer</strong>
              <span>Northstar Labs</span>
            </div>
          </div>
          <div className={styles.dateRail}>
            <span className="mono">18 AUG</span>
            <strong className="mono">10:30</strong>
            <span>System design · Round 3</span>
          </div>
          <button className={styles.openPlan}>
            Open preparation plan <ArrowUpRight size={15} />
          </button>
        </Surface>
      </motion.div>

      <motion.div
        className={styles.readiness}
        style={{ x: nearX, y: nearY }}
      >
        <Surface className={styles.readinessPanel}>
          <div className={styles.panelTopline}>
            <span>Readiness</span>
            <Sparkles size={14} />
          </div>
          <ScoreRing value={85} size={154} compact />
          <p><span>+11</span> after three focused sessions</p>
        </Surface>
      </motion.div>

      <motion.div className={styles.calendarCard} style={{ x: farX, y: nearY }}>
        <Surface className={styles.calendarPanel}>
          <div className={styles.panelTopline}>
            <span>August</span>
            <CalendarDays size={14} />
          </div>
          <div className={styles.miniCalendar} aria-label="August calendar preview">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <span key={`${day}-${index}`} className={styles.calendarDayName}>{day}</span>
            ))}
            {Array.from({ length: 21 }, (_, index) => index + 5).map((day) => (
              <span
                key={day}
                className={day === 18 ? styles.interviewDay : day === 24 ? styles.secondaryDay : ""}
              >
                {day}
              </span>
            ))}
          </div>
        </Surface>
      </motion.div>

      <motion.div className={styles.voiceCard} style={{ x: nearX, y: farY }}>
        <Surface className={styles.voicePanel}>
          <div className={styles.panelTopline}>
            <span>AI interview</span>
            <span className={styles.liveSignal}><Radio size={12} /> Live</span>
          </div>
          <div className={styles.waveformBox}>
            <Waveform active />
          </div>
          <p>“What changes when Redis becomes unavailable?”</p>
        </Surface>
      </motion.div>

      <motion.div className={styles.weakChip} style={{ x: nearX, y: nearY }}>
        <Database size={15} />
        <span><strong>SQL transactions</strong> Needs practice</span>
      </motion.div>

      <div className={styles.consoleProof}>
        <span><Check size={13} /> Calendar connected</span>
        <span><Check size={13} /> Resume understood</span>
      </div>
    </div>
  );
}
