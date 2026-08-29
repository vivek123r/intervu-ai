"use client";

import { Clock3, CloudOff, MessageSquareText, Pause, Radar, Volume2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SignatureRadarChart } from "@/components/analytics/charts";
import { ScoreRing } from "@/components/ui/score-ring";
import { Surface } from "@/components/ui/surface";
import type { SessionCompletion } from "@/types/domain";

import styles from "@/app/(product)/practice/practice.module.css";

const speechMetrics: Array<{
  label: string;
  key: "averageWpm" | "fillerCount" | "longPauses" | "averageAnswerSeconds";
  unit: string;
  icon: LucideIcon;
}> = [
  { label: "Pace", key: "averageWpm", unit: "WPM", icon: Volume2 },
  { label: "Fillers", key: "fillerCount", unit: "total", icon: MessageSquareText },
  { label: "Long pauses", key: "longPauses", unit: "over 2.5s", icon: Pause },
  { label: "Avg answer", key: "averageAnswerSeconds", unit: "seconds", icon: Clock3 },
];

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

/** The completion view's headline instrument: one score, what it means, the six-axis
 * signature behind it (when it's a genuine assessment), and the speech evidence
 * measured alongside it. */
export function CompletionScorePanel({ completion }: { completion: SessionCompletion }) {
  const { overall, signature, speech } = completion;
  const unscoredCount = completion.unscoredAnswerCount ?? 0;
  const scoredCount = completion.scoredAnswerCount ?? completion.questionsAnswered;

  return (
    <Surface gold className={styles.scorePanel}>
      <div className={styles.panelHeading}>
        <span className="fine-label">Overall efficiency</span>
        <span className="mono">{completion.mode}</span>
      </div>

      <div className={styles.scoreReadout}>
        <ScoreRing value={overall.score} size={168} label="Overall score" />
        <div>
          <strong>{overall.band}</strong>
          <p>{overall.caption}</p>
          {completion.generatedOffline && (
            <span
              data-testid="generated-offline-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                marginTop: "0.4rem",
                padding: "0.15rem 0.5rem",
                borderRadius: 999,
                border: "1px solid rgba(240,185,76,.35)",
                fontSize: "0.7rem",
                opacity: 0.8,
                width: "fit-content",
              }}
            >
              <CloudOff size={12} aria-hidden="true" /> Generated offline
            </span>
          )}
        </div>
      </div>

      {unscoredCount > 0 && (
        <p
          data-testid="unscored-answers-notice"
          style={{ fontSize: "0.8rem", opacity: 0.85, margin: "0 0 0.75rem" }}
        >
          This score reflects {scoredCount} of {scoredCount + unscoredCount} answers —{" "}
          {unscoredCount} couldn&apos;t be scored.
        </p>
      )}

      <dl className={styles.scoreStanding}>
        <div>
          <dt>Questions answered</dt>
          <dd className="mono">{completion.questionsAnswered}</dd>
        </div>
        <div>
          <dt>vs previous session</dt>
          <dd
            className="mono"
            data-direction={
              overall.deltaFromPrevious === 0
                ? "flat"
                : overall.deltaFromPrevious > 0
                  ? "up"
                  : "down"
            }
          >
            {overall.deltaFromPrevious === 0 ? "No comparison" : signed(overall.deltaFromPrevious)}
          </dd>
        </div>
      </dl>

      {completion.generatedOffline ? (
        <section className={styles.signatureSection}>
          <div className={styles.panelHeading}>
            <span className="fine-label">Signature</span>
            <Radar size={15} aria-hidden="true" />
          </div>
          <p style={{ fontSize: "0.8rem", opacity: 0.75, margin: 0 }}>
            This report was generated offline, so its per-dimension breakdown is
            derived from the overall score rather than measured independently — only
            the overall score above is shown.
          </p>
        </section>
      ) : (
        <section className={styles.signatureSection}>
          <div className={styles.panelHeading}>
            <span className="fine-label">Signature</span>
            <Radar size={15} aria-hidden="true" />
          </div>
          <div className={styles.signatureChart}>
            <SignatureRadarChart data={signature} />
          </div>
        </section>
      )}

      <dl className={styles.speechStrip}>
        {speechMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.key}>
              <dt>
                <Icon size={13} aria-hidden="true" /> {metric.label}
              </dt>
              <dd>
                <strong className="mono">{speech[metric.key]}</strong>
                <small>{metric.unit}</small>
              </dd>
            </div>
          );
        })}
      </dl>
    </Surface>
  );
}
