"use client";

import { ArrowRight, Ellipsis, Video } from "lucide-react";
import Link from "next/link";

import { ActionButton, IconButton } from "@/components/ui/buttons";
import { ProgressBar, Surface } from "@/components/ui/surface";
import type { Interview } from "@/types/domain";

import styles from "@/app/(product)/product.module.css";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export function InterviewCard({ interview, compact = false }: { interview: Interview; compact?: boolean }) {
  const cardLabel = `${interview.company} — ${interview.role}, ${interview.round} round ${interview.roundNumber} of ${interview.totalRounds}, ${formatDate(interview.scheduledAt)}`;

  return (
    <Surface
      className={compact ? styles.interviewCardCompact : styles.interviewCard}
    >
      {/* display:contents keeps the anchor's children as direct participants
          in the surrounding grid, so wrapping the primary content in a real
          link doesn't touch the existing layout. */}
      <Link href={`/interviews/${interview.id}`} className={styles.cardLink} aria-label={cardLabel}>
        <div className={styles.interviewIdentity}>
          <span className={styles.companyMark} style={{ color: interview.accent, borderColor: `${interview.accent}55` }}>
            {interview.companyMark}
          </span>
          <div>
            <strong>{interview.company}</strong>
            <p>{interview.role}</p>
          </div>
          <span className={styles.interviewStatus}>{interview.status}</span>
        </div>
        <div className={styles.interviewSchedule}>
          <time className="mono" dateTime={interview.scheduledAt}>{formatDate(interview.scheduledAt)}</time>
          <span>{interview.round} · Round {interview.roundNumber}/{interview.totalRounds}</span>
        </div>
        {!compact && (
          <>
            <div className={styles.readinessLine}>
              <span>Readiness <strong className="mono">{interview.readiness}</strong></span>
              <span>{interview.preparationProgress}% prepared</span>
            </div>
            <ProgressBar value={interview.preparationProgress} />
          </>
        )}
      </Link>
      {!compact && (
        <div className={styles.interviewActions}>
          <ActionButton href={`/interviews/${interview.id}/prepare`} variant="ghost">Prepare <ArrowRight data-arrow size={15} /></ActionButton>
          <ActionButton href={`/interviews/${interview.id}/mock`}><Video size={15} /> Mock interview</ActionButton>
          <IconButton ariaLabel={`More actions for ${interview.company}`}><Ellipsis size={17} /></IconButton>
        </div>
      )}
    </Surface>
  );
}
