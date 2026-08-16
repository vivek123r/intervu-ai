"use client";

import { Clock3, MessageSquareText, Pause, Radar, Volume2 } from "lucide-react";
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
 * signature behind it, and the speech evidence measured alongside it. */
export function CompletionScorePanel({ completion }: { completion: SessionCompletion }) {
  const { overall, signature, speech } = completion;

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
        </div>
      </div>

      <dl className={styles.scoreStanding}>
        <div>
          <dt>Standing</dt>
          <dd className="mono">Top {overall.topPercent}%</dd>
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

      <section className={styles.signatureSection}>
        <div className={styles.panelHeading}>
          <span className="fine-label">Signature</span>
          <Radar size={15} aria-hidden="true" />
        </div>
        <div className={styles.signatureChart}>
          <SignatureRadarChart data={signature} />
        </div>
      </section>

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
