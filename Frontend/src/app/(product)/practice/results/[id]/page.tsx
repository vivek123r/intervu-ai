"use client";

import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { CompletionMetrics } from "@/features/practice/components/completion-metrics";
import { CompletionProtocols } from "@/features/practice/components/completion-protocols";
import { CompletionQuestionList } from "@/features/practice/components/completion-question-list";
import { CompletionScorePanel } from "@/features/practice/components/completion-score-panel";
import { useGetReportCompletionQuery } from "@/services/api/practice.api";

import styles from "../../practice.module.css";

const completedFormat = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** The screen a finished interview lands on — see docs/API-CONTRACT.md's
 * `GET /reports/{id}/completion`, which backs all of it in one call. */
export default function CompletionPage() {
  const params = useParams<{ id: string }>();
  const { data: completion, isLoading, isError } = useGetReportCompletionQuery(params.id);

  if (isLoading) {
    return (
      <motion.div {...pageTransition} className={styles.completionPage}>
        <div className={styles.completionLoading}>
          <span className="skeleton" />
        </div>
      </motion.div>
    );
  }

  if (isError || !completion) {
    return (
      <motion.div {...pageTransition} className={styles.completionPage}>
        <Surface className={styles.completionMissing}>
          <span className="fine-label">Analysis unavailable</span>
          <h1>That analysis isn&apos;t ready.</h1>
          <p>
            The report for this session either hasn&apos;t finished processing or no longer
            exists. Your other sessions are still in your history.
          </p>
          <ActionButton href="/history">
            Open session history <ArrowRight data-arrow size={16} />
          </ActionButton>
        </Surface>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageTransition} className={styles.completionPage}>
      <Link href="/practice" className={styles.completionBack}>
        <ArrowLeft size={15} aria-hidden="true" /> Practice hub
      </Link>

      <header className={styles.completionHeader}>
        <div>
          <span className="gold-status">
            <Check size={13} aria-hidden="true" /> Interview complete
          </span>
          <h1>{completion.role} mock, analysed.</h1>
          <p>{completion.summary}</p>
          <dl className={styles.completionMeta}>
            <div>
              <dt>Session</dt>
              <dd className="mono">{completion.code}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{completion.company}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd className="mono">
                {completedFormat.format(new Date(completion.completedAt))}
              </dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd className="mono">
                {completion.durationMinutes} min · {completion.questionsAnswered} answers
              </dd>
            </div>
          </dl>
        </div>

        <div className={styles.completionActions}>
          <ActionButton href="/practice/setup?mode=targeted">
            <RotateCcw size={16} /> Practice weak answers
          </ActionButton>
          <ActionButton href="/analytics" variant="ghost">
            View analytics <ArrowRight data-arrow size={16} />
          </ActionButton>
        </div>
      </header>

      <div className={styles.completionGrid}>
        {/* Rail: the session's own evidence — how it scored, and everything it asked. */}
        <div className={styles.completionRail}>
          <CompletionScorePanel completion={completion} />
          <CompletionQuestionList questions={completion.questions} />
        </div>

        {/* Main: what the evidence means and what to do about it. */}
        <div className={styles.completionMain}>
          <CompletionMetrics metrics={completion.metrics} />
          <CompletionProtocols
            protocols={completion.protocols}
            strengths={completion.strengths}
          />
        </div>
      </div>
    </motion.div>
  );
}
