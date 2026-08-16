"use client";

import { Aperture, BadgeCheck, Gauge, Layers, ListTree, MessageSquareText, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AnimatedNumber } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import type { CompletionMetric } from "@/types/domain";

import styles from "@/app/(product)/practice/practice.module.css";

/** Metric key -> icon. An unknown key falls back to the neutral gauge rather than
 * disappearing, so a dimension the backend appends later still renders. */
const metricIcons: Record<string, LucideIcon> = {
  quality: BadgeCheck,
  relevance: Target,
  structure: ListTree,
  depth: Layers,
  communication: MessageSquareText,
  clarity: Aperture,
};

export function CompletionMetrics({ metrics }: { metrics: CompletionMetric[] }) {
  return (
    <section className={styles.metricGrid} aria-label="Session metrics">
      {metrics.map((metric) => {
        const Icon = metricIcons[metric.key] ?? Gauge;
        return (
          <Surface key={metric.key} className={styles.metricTile} data-tone={metric.tone}>
            <span className={styles.metricAccent} aria-hidden="true" />
            <div className={styles.metricLabel}>
              <span>{metric.label}</span>
              <Icon size={15} aria-hidden="true" />
            </div>
            <strong>
              <AnimatedNumber value={metric.value} />
            </strong>
            <div className={styles.metricFooter}>
              <span className={styles.metricBand}>{metric.band}</span>
              {metric.delta && <small className="mono">{metric.delta}</small>}
            </div>
            <i aria-hidden="true">
              <b style={{ width: `${metric.value}%` }} />
            </i>
          </Surface>
        );
      })}
    </section>
  );
}
