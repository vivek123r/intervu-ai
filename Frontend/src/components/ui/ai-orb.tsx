"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { PointerEvent } from "react";

import { cn } from "@/lib/cn";

export function AIOrb({
  speaking = false,
  listening = false,
  compact = false,
  className,
}: {
  speaking?: boolean;
  listening?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 150, damping: 22 });
  const smoothY = useSpring(y, { stiffness: 150, damping: 22 });
  const rotateX = useTransform(smoothY, [-1, 1], [4, -4]);
  const rotateY = useTransform(smoothX, [-1, 1], [-4, 4]);

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
    y.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 2);
  };

  return (
    <motion.div
      className={cn("ai-orb-stage", compact && "ai-orb-compact", className)}
      onPointerMove={handleMove}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      aria-label={
        speaking
          ? "AI interviewer speaking"
          : listening
            ? "AI interviewer listening"
            : "AI interviewer ready"
      }
    >
      <div className="ai-orb-halo" aria-hidden="true" />
      <motion.div
        className="ai-orb-core"
        animate={{
          scale: speaking ? [1, 1.035, 1] : listening ? [1, 1.018, 1] : 1,
        }}
        transition={{
          duration: speaking ? 1.3 : 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="ai-orb-reflection" />
        <div className="ai-orb-symbol" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </motion.div>
      <div className="ai-orb-floor" aria-hidden="true" />
    </motion.div>
  );
}
