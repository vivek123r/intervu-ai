"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clipboard,
  FileCheck2,
  FileText,
  Lightbulb,
  Sparkles,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { ScoreRing } from "@/components/ui/score-ring";
import { ProgressBar, Surface } from "@/components/ui/surface";
import { Tabs } from "@/components/ui/tabs";
import { useGetInterviewQuery } from "@/services/api/interviews.api";
import {
  useAnalyzeJobDescriptionMutation,
  useGetJobDescriptionForInterviewQuery,
  useGetResumeQuery,
  useUploadResumeMutation,
} from "@/services/api/documents.api";
import { useGetPreparationQuery, useUpdatePreparationTaskMutation } from "@/services/api/preparation.api";
import type { Interview, PreparationPlan } from "@/types/domain";

import styles from "../../../product.module.css";

type QuestionCategory = "all" | "resume" | "technical" | "behavioral" | "system";

const questionTabs = [
  { value: "all", label: "All" },
  { value: "resume", label: "Resume" },
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "system", label: "System design" },
] as const;

export default function PreparationPage() {
  const params = useParams<{ id: string }>();
  const { data: interview, isLoading: interviewLoading } = useGetInterviewQuery(params.id);
  const { data: plan, isLoading: planLoading } = useGetPreparationQuery(params.id);

  if (interviewLoading || planLoading || !interview || !plan) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <div className={styles.chartSkeleton}><span className="skeleton" /></div>
      </motion.div>
    );
  }

  return <PreparationView interviewId={params.id} interview={interview} plan={plan} />;
}

function PreparationView({
  interviewId,
  interview,
  plan,
}: {
  interviewId: string;
  interview: Interview;
  plan: PreparationPlan;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: resume } = useGetResumeQuery();
  const { data: jdAnalysis } = useGetJobDescriptionForInterviewQuery(interviewId);
  const [uploadResume] = useUploadResumeMutation();
  const [analyzeJobDescription, { isLoading: analyzing }] = useAnalyzeJobDescriptionMutation();
  const [updateTask] = useUpdatePreparationTaskMutation();

  const [category, setCategory] = useState<QuestionCategory>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [jdDraft, setJdDraft] = useState("");

  const completed = plan.tasks.filter((task) => task.status === "completed").length;
  const progress = plan.tasks.length ? Math.round((completed / plan.tasks.length) * 100) : 0;
  const filteredQuestions = useMemo(() => {
    if (category === "all") return plan.questions;
    return plan.questions.filter((question) =>
      category === "system"
        ? question.category.toLowerCase().includes("system")
        : question.category.toLowerCase().includes(category),
    );
  }, [category, plan.questions]);

  const analyze = async () => {
    if (!jdDraft.trim()) return;
    await analyzeJobDescription({ interviewId, text: jdDraft });
  };

  const toggleTask = (taskId: string, status: string) => {
    void updateTask({ id: taskId, status: status === "completed" ? "pending" : "completed" });
  };

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <Link href={`/interviews/${interview.id}`} className={styles.backRow}><ArrowLeft size={15} /> {interview.company} interview</Link>
      <header className={styles.preparationHeader}>
        <div>
          <span className="fine-label">Preparation plan</span>
          <h1>{interview.role}</h1>
          <p>{interview.company} · {interview.round} · <span className="gold-text">3 days remaining</span></p>
        </div>
        <div className={styles.preparationMeter}>
          <div><strong className="mono">{progress}%</strong><span>prepared</span></div>
          <ProgressBar value={progress} />
          <ActionButton href={`/interviews/${interview.id}/mock`}>Start mock <ArrowRight data-arrow size={16} /></ActionButton>
        </div>
      </header>

      <section className={styles.prepWorkspace}>
        <div className={styles.prepMain}>
          <section className={styles.documentIntelligence}>
            <div className={styles.sectionHeadingInline}><div><span className="fine-label">Resume + JD intelligence</span><h2>Build the role model</h2></div><span>Stored once · reused safely</span></div>
            <div className={styles.documentGrid}>
              <Surface className={styles.resumePanel}>
                <div className={styles.documentIcon}><FileText size={21} /></div>
                <div><strong>{resume?.fileName ?? "Upload your resume"}</strong><p>PDF or DOCX · up to 10 MB</p></div>
                <input ref={fileRef} className="sr-only" type="file" accept=".pdf,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadResume(file); }} />
                <ActionButton variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={15} /> {resume ? "Replace" : "Upload"}</ActionButton>
                {resume && <span className={styles.documentReady}><FileCheck2 size={14} /> Parsed · {resume.parsedSkills.length} skills found</span>}
              </Surface>
              <Surface className={styles.jdPanel}>
                <div className={styles.jdHeading}><div className={styles.documentIcon}><Clipboard size={20} /></div><div><strong>Job description</strong><p>Paste the role requirements or upload a file.</p></div></div>
                <textarea className="text-area" value={jdDraft} onChange={(event) => setJdDraft(event.target.value)} aria-label="Job description" />
                <div><span>{jdDraft.length.toLocaleString()} characters</span><ActionButton onClick={analyze} disabled={!jdDraft.trim() || analyzing}>{analyzing ? "Analyzing…" : "Analyze role"} <Sparkles size={15} /></ActionButton></div>
              </Surface>
            </div>
          </section>

          <AnimatePresence mode="wait">
            {analyzing ? (
              <motion.div key="analysis-loading" className={styles.analysisLoading} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {[
                  "Reading required skills",
                  "Comparing resume evidence",
                  "Prioritizing interview topics",
                ].map((phase, index) => <div key={phase}><span className="skeleton" /><p>{phase}</p><i data-active={index === 1} /></div>)}
              </motion.div>
            ) : jdAnalysis ? (
              <motion.section key="role-match" className={styles.roleMatchSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Surface gold className={styles.roleMatchScore}>
                  <div><span className="fine-label">Role match</span><h2>{jdAnalysis.summary}</h2></div>
                  <ScoreRing value={jdAnalysis.overallMatch} size={184} />
                </Surface>
                <Surface className={styles.skillMatrix}>
                  <div className={styles.matrixHeader}><span>Skill</span><span>You</span><span>Job</span><span>Gap</span></div>
                  {jdAnalysis.skillMatrix.map((entry) => (
                    <div key={entry.skill} className={styles.matrixRow}>
                      <strong>{entry.skill}</strong>
                      <span className="mono">{entry.candidateScore}</span>
                      <span className="mono">{entry.roleScore}</span>
                      <div className={styles.matrixBars} aria-label={`${entry.skill}: your score ${entry.candidateScore}, role needs ${entry.roleScore}`}>
                        <i style={{ width: `${entry.roleScore}%` }} /><b style={{ width: `${entry.candidateScore}%` }} />
                      </div>
                    </div>
                  ))}
                </Surface>
              </motion.section>
            ) : null}
          </AnimatePresence>

          <section className={styles.timelineSection}>
            <div className={styles.sectionHeadingInline}><div><span className="fine-label">Preparation timeline</span><h2>Sequenced by leverage</h2></div><span>{completed} tasks complete</span></div>
            <div className={styles.preparationTimeline}>
              {plan.timeline.map((step, index) => (
                <div key={step.label} data-active={step.status === "active"} data-complete={step.status === "complete"}>
                  <span>{step.status === "complete" ? <Check size={14} /> : index + 1}</span>
                  <strong>{step.label}</strong><small>{step.phase}</small>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.questionsSection}>
            <div className={styles.sectionHeadingInline}><div><span className="fine-label">Questions to prepare</span><h2>Generated from your evidence</h2></div><span>{plan.questions.length} prioritized</span></div>
            <Tabs items={questionTabs} value={category} onChange={setCategory} ariaLabel="Question categories" className={styles.questionTabs} />
            <div className={styles.questionList}>
              {filteredQuestions.map((question, index) => (
                <Surface key={question.id} interactive className={styles.questionCard}>
                  <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                  <div><div><span>{question.category}</span><span>{question.difficulty}</span>{question.followUp && <span>Follow-up</span>}</div><h3>{question.text}</h3></div>
                  <ActionButton href={`/practice/setup?focus=${encodeURIComponent(question.topic)}`} variant="ghost">Practice <ChevronRight size={15} /></ActionButton>
                </Surface>
              ))}
            </div>
          </section>

          <section className={styles.askInterviewerSection}>
            <div className={styles.sectionHeadingInline}><div><span className="fine-label">Questions for the interviewer</span><h2>Leave with better information</h2></div><Lightbulb size={19} /></div>
            <div className={styles.interviewerQuestions}>
              {[
                "What would success look like during the first 90 days?",
                "Which technical constraint creates the most leverage for this team right now?",
                "How does the team decide when reliability work outranks feature delivery?",
              ].map((question) => (
                <button key={question} onClick={() => { void navigator.clipboard?.writeText(question); setCopied(question); window.setTimeout(() => setCopied(null), 1200); }}>
                  <span>{question}</span><small>{copied === question ? "Copied" : "Copy"}</small>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.todayFocus}>
          <Surface gold className={styles.focusCardSticky}>
            <div><span className="fine-label">Today’s focus</span><strong>{plan.tasks[0]?.category ?? "Today"}</strong><p>{completed} / {plan.tasks.length} tasks completed</p></div>
            <ProgressBar value={progress} />
            <div className={styles.focusTaskList}>
              {plan.tasks.slice(0, 4).map((task) => (
                <button key={task.id} onClick={() => toggleTask(task.id, task.status)} data-complete={task.status === "completed"}>
                  <span>{task.status === "completed" && <Check size={13} />}</span>
                  <p>{task.title}</p>
                </button>
              ))}
            </div>
            <ActionButton href="/practice/setup">Continue <ArrowRight data-arrow size={16} /></ActionButton>
          </Surface>
        </aside>
      </section>
    </motion.div>
  );
}
