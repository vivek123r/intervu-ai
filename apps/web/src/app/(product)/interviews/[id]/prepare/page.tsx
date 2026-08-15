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
import { interviewQuestions } from "@/lib/fixtures";
import { useProduct } from "@/lib/product-store";

import styles from "../../../product.module.css";

type QuestionCategory = "all" | "resume" | "technical" | "behavioral" | "system";

const questionTabs = [
  { value: "all", label: "All" },
  { value: "resume", label: "Resume" },
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "system", label: "System design" },
] as const;

const matrix = [
  ["Node.js", 90, 90],
  ["REST APIs", 92, 85],
  ["SQL", 68, 85],
  ["Docker", 55, 75],
  ["AWS", 42, 70],
] as const;

export default function PreparationPage() {
  const params = useParams<{ id: string }>();
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    state,
    selectedInterview,
    setResumeName,
    setJobDescription,
    toggleTask,
  } = useProduct();
  const interview = state.interviews.find((item) => item.id === params.id) ?? selectedInterview;
  const [category, setCategory] = useState<QuestionCategory>("all");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [jdDraft, setJdDraft] = useState(state.jobDescription);

  const completed = state.preparationTasks.filter((task) => task.status === "completed").length;
  const progress = Math.round((completed / state.preparationTasks.length) * 100);
  const filteredQuestions = useMemo(() => {
    if (category === "all") return interviewQuestions;
    return interviewQuestions.filter((question) =>
      category === "system"
        ? question.category.toLowerCase().includes("system")
        : question.category.toLowerCase().includes(category),
    );
  }, [category]);

  const analyze = () => {
    setJobDescription(jdDraft);
    setAnalyzing(true);
    setAnalysisReady(false);
    window.setTimeout(() => {
      setAnalyzing(false);
      setAnalysisReady(true);
    }, 1500);
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
                <div><strong>{state.resumeName ?? "Upload your resume"}</strong><p>PDF or DOCX · up to 10 MB</p></div>
                <input ref={fileRef} className="sr-only" type="file" accept=".pdf,.docx" onChange={(event) => setResumeName(event.target.files?.[0]?.name ?? null)} />
                <ActionButton variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={15} /> {state.resumeName ? "Replace" : "Upload"}</ActionButton>
                {state.resumeName && <span className={styles.documentReady}><FileCheck2 size={14} /> Parsed · 18 skills found</span>}
              </Surface>
              <Surface className={styles.jdPanel}>
                <div className={styles.jdHeading}><div className={styles.documentIcon}><Clipboard size={20} /></div><div><strong>Job description</strong><p>Paste the role requirements or upload a file.</p></div></div>
                <textarea className="text-area" value={jdDraft} onChange={(event) => setJdDraft(event.target.value)} aria-label="Job description" />
                <div><span>{jdDraft.length.toLocaleString()} characters</span><ActionButton onClick={analyze} disabled={!jdDraft.trim() || analyzing}>{analyzing ? "Analyzing…" : "Analyze role"} <Sparkles size={15} /></ActionButton></div>
              </Surface>
            </div>
          </section>

          <AnimatePresence mode="wait">
            {!analysisReady ? (
              <motion.div key="analysis-loading" className={styles.analysisLoading} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {[
                  "Reading required skills",
                  "Comparing resume evidence",
                  "Prioritizing interview topics",
                ].map((phase, index) => <div key={phase}><span className="skeleton" /><p>{phase}</p><i data-active={index === 1} /></div>)}
              </motion.div>
            ) : (
              <motion.section key="role-match" className={styles.roleMatchSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Surface gold className={styles.roleMatchScore}>
                  <div><span className="fine-label">Role match</span><h2>Your strongest evidence fits the core of this role.</h2><p>SQL depth and cloud operations are the highest-value gaps before the interview.</p></div>
                  <ScoreRing value={86} size={184} />
                </Surface>
                <Surface className={styles.skillMatrix}>
                  <div className={styles.matrixHeader}><span>Skill</span><span>You</span><span>Job</span><span>Gap</span></div>
                  {matrix.map(([skill, you, job]) => (
                    <div key={skill} className={styles.matrixRow}>
                      <strong>{skill}</strong>
                      <span className="mono">{you}</span>
                      <span className="mono">{job}</span>
                      <div className={styles.matrixBars} aria-label={`${skill}: your score ${you}, role needs ${job}`}>
                        <i style={{ width: `${job}%` }} /><b style={{ width: `${you}%` }} />
                      </div>
                    </div>
                  ))}
                </Surface>
              </motion.section>
            )}
          </AnimatePresence>

          <section className={styles.timelineSection}>
            <div className={styles.sectionHeadingInline}><div><span className="fine-label">Preparation timeline</span><h2>Four days, sequenced by leverage</h2></div><span>{completed} tasks complete</span></div>
            <div className={styles.preparationTimeline}>
              {[
                ["Day 1", "Foundation", true],
                ["Day 2", "Company + role", false],
                ["Day 3", "Core technical", false],
                ["Day 4", "Mock + weak areas", false],
                ["Interview", "Warm-up", false],
              ].map(([day, phase, active], index) => (
                <div key={String(day)} data-active={active} data-complete={index === 0}>
                  <span>{index === 0 ? <Check size={14} /> : index + 1}</span>
                  <strong>{day}</strong><small>{phase}</small>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.questionsSection}>
            <div className={styles.sectionHeadingInline}><div><span className="fine-label">Questions to prepare</span><h2>Generated from your evidence</h2></div><span>{interviewQuestions.length} prioritized</span></div>
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
            <div><span className="fine-label">Today’s focus</span><strong>SQL transactions</strong><p>2 / 4 tasks completed</p></div>
            <ProgressBar value={50} />
            <div className={styles.focusTaskList}>
              {state.preparationTasks.slice(0, 4).map((task) => (
                <button key={task.id} onClick={() => toggleTask(task.id)} data-complete={task.status === "completed"}>
                  <span>{task.status === "completed" && <Check size={13} />}</span>
                  <p>{task.title}</p>
                </button>
              ))}
            </div>
            <ActionButton href="/practice/setup?focus=SQL%20transactions">Continue <ArrowRight data-arrow size={16} /></ActionButton>
          </Surface>
        </aside>
      </section>
    </motion.div>
  );
}
