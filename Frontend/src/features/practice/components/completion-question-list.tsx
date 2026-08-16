"use client";

import { Check, ChevronDown, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { Surface } from "@/components/ui/surface";
import type { AnswerVerdict, CompletionQuestion } from "@/types/domain";

import styles from "@/app/(product)/practice/practice.module.css";

const verdictCopy: Record<AnswerVerdict, string> = {
  strong: "Strong answer",
  solid: "Solid, one gap",
  needs_work: "Needs another pass",
};

function duration(seconds: number) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Every question the interview asked, in order. The list is the resting state; opening a
 * row reveals what was actually said and the analysis of it. */
export function CompletionQuestionList({ questions }: { questions: CompletionQuestion[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Surface className={styles.questionPanel}>
      <div className={styles.panelHeading}>
        <span className="fine-label">Questions asked</span>
        <span className="mono">{questions.length}</span>
      </div>

      <ol className={styles.questionList}>
        {questions.map((question) => {
          const open = openId === question.id;
          return (
            <li key={question.id} data-verdict={question.verdict} data-open={open}>
              <button
                type="button"
                className={styles.questionTrigger}
                onClick={() => setOpenId(open ? null : question.id)}
                aria-expanded={open}
              >
                <span className="mono">{String(question.position).padStart(2, "0")}</span>
                <div>
                  <h3>{question.question}</h3>
                  <small>
                    {question.topic} · {duration(question.durationSeconds)} ·{" "}
                    {verdictCopy[question.verdict]}
                  </small>
                </div>
                <strong className="mono">
                  {question.score.toFixed(1)}
                  <small>/10</small>
                </strong>
                <motion.span animate={{ rotate: open ? 180 : 0 }} aria-hidden="true">
                  <ChevronDown size={16} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    className={styles.questionBody}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <blockquote>{question.answer}</blockquote>

                    <div className={styles.questionAnalysis}>
                      <div>
                        <h4>What worked</h4>
                        {question.strengths.map((item) => (
                          <p key={item}>
                            <Check size={13} aria-hidden="true" /> {item}
                          </p>
                        ))}
                      </div>
                      <div>
                        <h4>Missing</h4>
                        {question.missing.map((item) => (
                          <p key={item}>
                            <span aria-hidden="true">•</span> {item}
                          </p>
                        ))}
                      </div>
                      <div>
                        <h4>Better structure</h4>
                        {question.betterStructure.map((item, index) => (
                          <p key={item}>
                            <span className="mono" aria-hidden="true">
                              {index + 1}
                            </span>{" "}
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    <ActionButton
                      variant="ghost"
                      className={styles.compactAction}
                      href={`/practice/setup?focus=${encodeURIComponent(question.topic)}`}
                    >
                      Retry this answer <RotateCcw size={14} />
                    </ActionButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}

        {!questions.length && (
          <li className={styles.questionEmpty}>
            No answers were recorded in this session.
          </li>
        )}
      </ol>
    </Surface>
  );
}
