"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/cn";

function buildPath(data: number[], width: number, height: number) {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const spread = Math.max(1, max - min);
  return data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / spread) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function Sparkline({
  data,
  width = 140,
  height = 42,
  className,
  muted = false,
  signalTrace,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  muted?: boolean;
  signalTrace?: string;
}) {
  const path = buildPath(data, width, height);
  const pathProps = {
    d: path,
    fill: "none",
    stroke: muted ? "rgba(255,255,255,.3)" : "#f0b94c",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      className={cn("sparkline", className)}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Trend from ${data[0] ?? 0} to ${data.at(-1) ?? 0}`}
    >
      {signalTrace ? (
        <path
          {...pathProps}
          data-signal-trace={signalTrace}
          style={{ opacity: 0 }}
        />
      ) : (
        <motion.path
          {...pathProps}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </svg>
  );
}
