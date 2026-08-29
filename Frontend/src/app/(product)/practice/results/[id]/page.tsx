"use client";

import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { CompletionMetrics } from "@/features/practice/components/completion-metrics";
import { CompletionProtocols } from "@/features/practice/components/completion-protocols";
import { CompletionQuestionList } from "@/features/practice/components/completion-question-list";
import { CompletionScorePanel } from "@/features/practice/components/completion-score-panel";
import {
  ResultsChat,
  type ResultsChatSeed,
} from "@/features/practice/components/results-chat";
import {
  useGetReportCompletionQuery,
  useGetSessionCompletionQuery,
} from "@/services/api/practice.api";

import styles from "../../practice.module.css";

const completedFormat = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// The report may still be mid-analysis (scoring, or report generation) when this
// page is first opened straight off the completion redirect — poll briefly rather
// than immediately dead-ending, then give up.
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60_000;

/** The screen a finished interview lands on — supports both report ID and session ID lookups. */
export default function CompletionPage() {
  const params = useParams<{ id: string }>();
  const rawId = params.id || "";
  const isExplicitSessionId = Boolean(
    rawId && (rawId.startsWith("ses-") || rawId.startsWith("session-"))
  );

  const [keepPolling, setKeepPolling] = useState(true);
  const [chatSeed, setChatSeed] = useState<ResultsChatSeed | null>(null);
  const pollTimerArmedRef = useRef(false);

  const {
    data: reportCompletion,
    isLoading: isReportLoading,
    isError: isReportError,
  } = useGetReportCompletionQuery(rawId, {
    skip: isExplicitSessionId || !rawId,
    pollingInterval: !isExplicitSessionId && keepPolling ? POLL_INTERVAL_MS : 0,
  });

  const shouldTrySession = isExplicitSessionId || isReportError;
  const {
    data: sessionCompletion,
    isLoading: isSessionLoading,
    isError: isSessionError,
  } = useGetSessionCompletionQuery(rawId, {
    skip: !shouldTrySession || !rawId,
    pollingInterval: shouldTrySession && keepPolling ? POLL_INTERVAL_MS : 0,
  });

  const completion = isExplicitSessionId
    ? sessionCompletion
    : (reportCompletion ?? sessionCompletion);
  const isLoading = isExplicitSessionId
    ? isSessionLoading
    : (isReportLoading || (isReportError && isSessionLoading));
  const isError = isExplicitSessionId
    ? isSessionError
    : (isReportError && isSessionError);

  useEffect(() => {
    if (completion) {
      const timer = window.setTimeout(() => setKeepPolling(false), 0);
      return () => window.clearTimeout(timer);
    }
    if (isError && !pollTimerArmedRef.current) {
      pollTimerArmedRef.current = true;
      const timer = window.setTimeout(() => setKeepPolling(false), POLL_TIMEOUT_MS);
      return () => window.clearTimeout(timer);
    }
  }, [completion, isError]);

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
    if (keepPolling) {
      return (
        <motion.div {...pageTransition} className={styles.completionPage}>
          <div className={styles.completionLoading}>
            <span className="skeleton" />
            <p style={{ marginTop: "1rem", textAlign: "center" }}>
              Still finishing your analysis — hang tight, this can take a little
              longer for a longer interview.
            </p>
          </div>
        </motion.div>
      );
    }
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
          <CompletionQuestionList
            questions={completion.questions}
            onAsk={(questionId, message) => setChatSeed({ questionId, message })}
          />
          <ResultsChat
            reportId={completion.reportId}
            seed={chatSeed}
            onSeedConsumed={() => setChatSeed(null)}
          />
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
