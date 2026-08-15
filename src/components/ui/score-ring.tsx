"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

export function ScoreRing({
  value,
  size = 148,
  label = "Readiness",
  className,
  compact = false,
}: {
  value: number;
  size?: number;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const stroke = compact ? 4 : 5;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, value));
  const style = { width: size, height: size } as CSSProperties;

  return (
    <div className={cn("score-ring", className)} style={style} aria-label={`${label}: ${value} out of 100`}>
      <svg viewBox="0 0 108 108" aria-hidden="true">
        <defs>
          <linearGradient id={`score-gold-${value}-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8a5a12" />
            <stop offset="0.45" stopColor="#f0b94c" />
            <stop offset="0.72" stopColor="#fff0b5" />
            <stop offset="1" stopColor="#b77a18" />
          </linearGradient>
          <filter id={`score-glow-${value}-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle className="score-track" cx="54" cy="54" r={radius} fill="none" strokeWidth={stroke} />
        <motion.circle
          cx="54"
          cy="54"
          r={radius}
          fill="none"
          stroke={`url(#score-gold-${value}-${size})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: circumference * (1 - progress / 100) }}
          viewport={{ once: true }}
          transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 54 54)"
          filter={`url(#score-glow-${value}-${size})`}
        />
      </svg>
      <span className="score-ring-value mono">{value}</span>
      {!compact && <span className="score-ring-unit">/100</span>}
    </div>
  );
}
