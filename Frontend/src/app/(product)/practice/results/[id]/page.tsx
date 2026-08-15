"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  MessageSquareText,
  Pause,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { ActionButton } from "@/components/ui/buttons";
import { AnimatedNumber, pageTransition } from "@/components/ui/motion";
import { ScoreRing } from "@/components/ui/score-ring";
import { Surface } from "@/components/ui/surface";
import { useGetReportQuery } from "@/services/api/practice.api";

import styles from "../../practice.module.css";

const metricLabels = [
  ["Technical", "technical"],
  ["Communication", "communication"],
  ["Answer structure", "structure"],
  ["Clarity", "clarity"],
  ["Relevance", "relevance"],
  ["Depth", "depth"],
] as const;

const speechMetricDefinitions: Array<{
  label: string;
  key: "averageWpm" | "fillerCount" | "longPauses" | "longestPause";
  unit: string;
  icon: LucideIcon;
}> = [
  { label: "Average pace", key: "averageWpm", unit: "WPM", icon: Volume2 },
  { label: "Filler words", key: "fillerCount", unit: "total", icon: MessageSquareText },
  { label: "Long pauses", key: "longPauses", unit: "over 2.5s", icon: Pause },
  { label: "Longest pause", key: "longestPause", unit: "seconds", icon: Clock3 },
];

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const { data: report, isLoading } = useGetReportQuery(params.id);
  const [openAnswer, setOpenAnswer] = useState(0);

  if (isLoading || !report) {
    return (
      <motion.div {...pageTransition} className={styles.reportPage}>
        <div className={styles.chartSkeleton}><span className="skeleton" /></div>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageTransition} className={styles.reportPage}>
      <Link href="/practice" className={styles.reportBack}><ArrowLeft size={15} /> Practice hub</Link>
      <header className={styles.reportHero}>
        <div className={styles.reportTitle}>
          <span className="gold-status"><Check size={13} /> Interview complete</span>
          <h1>A strong interview with one clear next gain.</h1>
          <p>{report.summary}</p>
          <div className={styles.reportActions}><ActionButton href="/practice/setup?mode=targeted"><RotateCcw size={16} /> Practice weak answers</ActionButton><ActionButton href="/analytics" variant="ghost">View analytics <ArrowRight data-arrow size={16} /></ActionButton></div>
        </div>
        <Surface gold className={styles.overallScore}>
          <ScoreRing value={report.overall} size={220} />
          <div><span>Overall</span><strong>{report.overall >= 80 ? "Interview ready" : "Building readiness"}</strong><small>+4 from your previous mock</small></div>
        </Surface>
      </header>

      <section className={styles.reportMetrics}>
        {metricLabels.map(([label, key]) => {
          const score = report[key];
          return <div key={key}><span>{label}</span><strong className="mono"><AnimatedNumber value={score} /></strong><i><b style={{ width: `${score}%` }} /></i></div>;
        })}
      </section>

      <section className={styles.reportNarrative}>
        <Surface className={styles.strengthPanel}>
          <div className={styles.reportSectionHeading}><span className="fine-label">What worked</span><Sparkles size={18} /></div>
          <ul>{report.strengths.map((strength) => <li key={strength}><Check size={15} /><span>{strength}</span></li>)}</ul>
        </Surface>
        <Surface gold className={styles.nextGainPanel}>
          <div className={styles.reportSectionHeading}><span className="fine-label">Highest-leverage change</span><Target size={18} /></div>
          <h2>Lead with the decision, then name its cost.</h2>
          <p>You often reveal the right trade-off after implementation detail. Moving it to the first 20 seconds will make your answers feel more senior and easier to follow.</p>
          <ActionButton href="/practice/setup?focus=Answer%20structure" variant="ghost">Practice structure <ArrowRight data-arrow size={15} /></ActionButton>
        </Surface>
      </section>

      <section className={styles.speechSection}>
        <div className={styles.reportSectionTitle}><div><span className="fine-label">Speech evidence</span><h2>Observable communication patterns</h2></div><p>No confidence diagnosis—only pace, pauses, clarity, and language you can act on.</p></div>
        <div className={styles.speechGrid}>
          {speechMetricDefinitions.map((metric) => {
            const Icon = metric.icon;
            return (
            <Surface key={metric.label} className={styles.speechMetric}>
              <Icon size={18} />
              <span>{metric.label}</span>
              <strong className="mono">{report.speech[metric.key]}</strong>
              <small>{metric.unit}</small>
            </Surface>
            );
          })}
        </div>
        <Surface className={styles.fillerPanel}>
          <div><span className="fine-label">Filler distribution</span><p>18 total · 5 fewer than your previous session</p></div>
          <div className={styles.fillerBars}>
            {Object.entries(report.speech.fillers).map(([filler, count]) => <div key={filler}><span>{filler}</span><i><b style={{ width: `${(count / report.speech.fillerCount) * 100}%` }} /></i><strong className="mono">{count}</strong></div>)}
          </div>
        </Surface>
      </section>

      <section className={styles.answerSection}>
        <div className={styles.reportSectionTitle}><div><span className="fine-label">Answer-by-answer</span><h2>Evidence, missing depth, better structure</h2></div><p>{report.answers.length} answers analyzed individually</p></div>
        <div className={styles.answerAccordion}>
          {report.answers.map((answer, index) => (
            <Surface key={answer.question} className={styles.answerItem}>
              <button className={styles.answerTrigger} onClick={() => setOpenAnswer(openAnswer === index ? -1 : index)} aria-expanded={openAnswer === index}>
                <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{answer.question}</h3><p>{answer.score >= 8 ? "Strong answer" : "Needs one more pass"}</p></div>
                <strong className="mono">{answer.score}<small>/10</small></strong>
                <motion.span animate={{ rotate: openAnswer === index ? 180 : 0 }}><ChevronDown size={17} /></motion.span>
              </button>
              <AnimatePresence initial={false}>
                {openAnswer === index && (
                  <motion.div className={styles.answerBody} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <blockquote>{answer.answer}</blockquote>
                    <div className={styles.answerAnalysisGrid}>
                      <div><h4>What went well</h4>{answer.strengths.map((item) => <p key={item}><Check size={14} /> {item}</p>)}</div>
                      <div><h4>Missing</h4>{answer.missing.map((item) => <p key={item}><span>•</span> {item}</p>)}</div>
                      <div><h4>Better structure</h4>{answer.betterStructure.map((item, itemIndex) => <p key={item}><span className="mono">{itemIndex + 1}</span> {item}</p>)}</div>
                    </div>
                    {index === 1 && <div className={styles.starAnalysis}><span>Situation <b>✓</b></span><span>Task <b>✓</b></span><span>Action <b>✓✓</b></span><span>Result <b data-missing>×</b></span><p>You explained the diagnostic pivot well, but never quantified recovery time or user impact.</p></div>}
                    <ActionButton href={`/practice/setup?focus=${encodeURIComponent(answer.question)}`} variant="ghost">Retry this answer <RotateCcw size={15} /></ActionButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </Surface>
          ))}
        </div>
      </section>

      <section className={styles.weakAnswerCta}>
        <div><span className="fine-label">Targeted retry</span><h2>{report.weakTopics.length + 3} answers need improvement.</h2><p>A focused session will include only weak questions and their missing follow-ups.</p></div>
        <ActionButton href="/practice/setup?mode=targeted">Practice weak answers <ArrowRight data-arrow size={17} /></ActionButton>
      </section>
    </motion.div>
  );
}
