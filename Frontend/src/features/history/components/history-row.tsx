"use client";

import { Blend, Brain, Gauge, ScanSearch, Smile, Star, Target, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ActionButton, IconButton } from "@/components/ui/buttons";
import { ScoreRing } from "@/components/ui/score-ring";
import { Surface } from "@/components/ui/surface";
import type { HistorySession, HistoryStatus } from "@/types/domain";

import styles from "@/app/(product)/product.module.css";

/** Metric key -> icon. Unknown keys fall back to the neutral target glyph rather than
 * disappearing, so a metric the backend adds later still renders. */
const metricIcons: Record<string, LucideIcon> = {
  quality: Star,
  confidence: Gauge,
  behavior: Brain,
  accuracy: Target,
  vagueness: Blend,
  sentiment: Smile,
};

const statusCopy: Record<HistoryStatus, string> = {
  completed: "Completed",
  processing: "Processing",
  abandoned: "Abandoned",
};

const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false });

export function HistoryRow({
  session,
  onDelete,
  deleting = false,
}: {
  session: HistorySession;
  onDelete: (session: HistorySession) => void;
  deleting?: boolean;
}) {
  const startedAt = new Date(session.startedAt);

  return (
    <Surface className={styles.historyRow} data-status={session.status} data-deleting={deleting}>
      <span className={styles.historyRowAccent} aria-hidden="true" />

      <div className={styles.historyIdentity}>
        <span className="mono">{session.code}</span>
        <h3>{session.role}</h3>
        <small>
          {session.company} · {dateFormat.format(startedAt)} {timeFormat.format(startedAt)} ·{" "}
          {session.durationMinutes} min
        </small>
      </div>

      <div className={styles.historyScore}>
        <ScoreRing value={session.score} size={46} compact label={`${session.mode} score`} />
      </div>

      <dl className={styles.historyMetrics}>
        {session.metrics.map((metric) => {
          const Icon = metricIcons[metric.key] ?? Target;
          return (
            <div key={metric.key} data-tone={metric.tone} title={metric.label}>
              <dt>
                <Icon size={15} aria-hidden="true" />
                <span>{metric.label}</span>
              </dt>
              <dd className="mono">{metric.value}</dd>
            </div>
          );
        })}
      </dl>

      <p className={styles.historyStatus}>
        <i aria-hidden="true" />
        {statusCopy[session.status]}
      </p>

      <div className={styles.historyRowActions}>
        {session.reportId ? (
          <ActionButton href={`/practice/results/${session.reportId}`} className={styles.historyAnalyze}>
            <ScanSearch size={14} /> Analyze
          </ActionButton>
        ) : (
          <ActionButton
            variant="ghost"
            href={session.status === "abandoned" ? "/practice/setup" : undefined}
            disabled={session.status === "processing"}
            className={styles.historyAnalyze}
          >
            <ScanSearch size={14} /> {session.status === "processing" ? "Analyzing" : "Retry"}
          </ActionButton>
        )}
        <IconButton
          ariaLabel={`Delete ${session.role} session from ${session.company}`}
          className={styles.historyDelete}
          onClick={() => onDelete(session)}
          disabled={deleting}
        >
          <Trash2 size={14} />
        </IconButton>
      </div>
    </Surface>
  );
}
