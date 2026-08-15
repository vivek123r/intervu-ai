"use client";

import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  UserRound,
  Video,
} from "lucide-react";

import { Countdown } from "@/components/product/countdown";
import { ActionButton } from "@/components/ui/buttons";
import { ScoreRing } from "@/components/ui/score-ring";
import { ProgressBar } from "@/components/ui/surface";
import type { Interview } from "@/lib/domain";

import styles from "@/app/(product)/product.module.css";

export function InterviewDetail({ interview, full = false }: { interview: Interview; full?: boolean }) {
  return (
    <div className={full ? styles.interviewDetailFull : styles.interviewDetail}>
      <div className={styles.detailIdentity}>
        <span className={styles.companyMark}>{interview.companyMark}</span>
        <div><span>{interview.company}</span><h2>{interview.role}</h2><p>{interview.round}</p></div>
      </div>
      <div className={styles.detailCountdown}>
        <span className="fine-label">Interview in</span>
        <Countdown target={interview.scheduledAt} compact />
      </div>

      <section className={styles.detailSection}>
        <h3>Meeting details</h3>
        <dl className={styles.detailList}>
          <div><dt><CalendarDays size={15} /> Date</dt><dd>{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date(interview.scheduledAt))}</dd></div>
          <div><dt><Clock3 size={15} /> Time</dt><dd className="mono">{new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(interview.scheduledAt))}</dd></div>
          <div><dt><Video size={15} /> Meeting</dt><dd>{interview.location}</dd></div>
          <div><dt><Mail size={15} /> Recruiter</dt><dd>{interview.recruiter ?? "Not added"}</dd></div>
          <div><dt><UserRound size={15} /> Interviewers</dt><dd>{interview.interviewers?.join(", ") ?? "Not listed"}</dd></div>
          <div><dt><MapPin size={15} /> Location</dt><dd>{interview.location}</dd></div>
        </dl>
        {interview.meetingUrl && <a className={styles.meetingLink} href={interview.meetingUrl} target="_blank" rel="noreferrer">Open meeting link <ExternalLink size={14} /></a>}
      </section>

      <section className={styles.detailSection}>
        <h3>Interview rounds</h3>
        <div className={styles.roundTimeline}>
          {interview.rounds.map((round) => (
            <div key={round.id} data-status={round.status}>
              <span>{round.status === "completed" ? <Check size={13} /> : ""}</span>
              <p>{round.name}</p>
              <small>{round.status}</small>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.detailReadiness}>
        <ScoreRing value={interview.readiness} size={116} compact />
        <div><span className="fine-label">Readiness</span><strong>{interview.readiness}/100</strong><p>Your SQL and system-design coverage are the strongest next levers.</p></div>
      </section>

      <section className={styles.detailSection}>
        <div className={styles.detailProgressHeading}><h3>Preparation progress</h3><span className="mono">{interview.preparationProgress}%</span></div>
        <ProgressBar value={interview.preparationProgress} />
        <div className={styles.prepBreakdown}>
          {[
            ["Resume analysis", 100],
            ["JD analysis", 100],
            ["SQL", 70],
            ["System design", 45],
            ["Behavioral", 80],
          ].map(([label, value]) => (
            <div key={String(label)}><span>{label}</span><b className="mono">{value === 100 ? "✓" : `${value}%`}</b></div>
          ))}
        </div>
      </section>

      <div className={styles.detailActions}>
        <ActionButton href={`/interviews/${interview.id}/prepare`}>Continue preparation <ArrowRight data-arrow size={16} /></ActionButton>
        <ActionButton href={`/interviews/${interview.id}/mock`} variant="ghost"><Video size={15} /> Start mock</ActionButton>
      </div>
    </div>
  );
}
