"use client";

import { motion } from "motion/react";
import { useId } from "react";

import { cn } from "@/lib/cn";

function buildPath(data: number[], width: number, height: number) {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const spread = Math.max(1, max - min);
  return data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / spread) * (height - 16) - 8;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(data: number[], width: number, height: number) {
  if (data.length < 2) return "";
  const linePath = buildPath(data, width, height);
  return `${linePath} L ${width} ${height} L 0 ${height} Z`;
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
  const gradientId = useId();
  const isSparse = data.length < 2;

  if (isSparse) {
    const singleVal = data[0] ?? 75;
    const yPos = height / 2;

    return (
      <svg
        className={cn("sparkline", className)}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Baseline score ${singleVal}`}
      >
        <defs>
          <linearGradient id={`grad-sparse-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f0b94c" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#f0b94c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f0b94c" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {/* Subtle baseline track */}
        <line
          x1="0"
          y1={yPos}
          x2={width}
          y2={yPos}
          stroke="rgba(240, 185, 76, 0.22)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        {/* Glow halo & single point */}
        <circle cx={width / 2} cy={yPos} r="7" fill="rgba(240, 185, 76, 0.15)" />
        <circle cx={width / 2} cy={yPos} r="3.5" fill="#f0b94c" />
      </svg>
    );
  }

  const path = buildPath(data, width, height);
  const areaPath = buildAreaPath(data, width, height);

  const pathProps = {
    d: path,
    fill: "none",
    stroke: muted ? "rgba(255,255,255,.3)" : "#f0b94c",
    strokeWidth: 2.2,
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
      <defs>
        <linearGradient id={`sparkline-grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0b94c" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f0b94c" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Area Fill under the curve */}
      {areaPath && (
        <path d={areaPath} fill={`url(#sparkline-grad-${gradientId})`} />
      )}

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
