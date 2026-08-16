"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  Plus,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { Countdown } from "@/components/ui/countdown";
import { ActionButton } from "@/components/ui/buttons";
import { AnimatedNumber, pageTransition } from "@/components/ui/motion";
import { ScoreRing } from "@/components/ui/score-ring";
import { Sparkline } from "@/components/ui/sparkline";
import { ProgressBar, Surface } from "@/components/ui/surface";
import { AddInterviewModal } from "@/features/interviews/components/add-interview-modal";
import { useGetDashboardOverviewQuery } from "@/services/api/interviews.api";
import { useUpdatePreparationTaskMutation } from "@/services/api/preparation.api";
import { useGetResumeQuery } from "@/services/api/documents.api";
import { useGetMeQuery } from "@/services/api/system.api";
import { useProduct } from "@/lib/product-store";

import styles from "../product.module.css";

export default function DashboardPage() {
  const { data: overview, isLoading } = useGetDashboardOverviewQuery();
  const { data: user } = useGetMeQuery();
  const { data: resume } = useGetResumeQuery();
  const [updateTask] = useUpdatePreparationTaskMutation();
  const { state } = useProduct();
  const [addModalOpen, setAddModalOpen] = useState(false);

  if (isLoading) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <div className={styles.chartSkeleton}><span className="skeleton" /></div>
      </motion.div>
    );
  }

  const nextInterview = overview?.nextInterview;
  const firstName =
    user?.displayName?.trim().split(/\s+/)[0] ||
    state.userName?.trim().split(/\s+/)[0] ||
    "Candidate";

  // New user / 0 interview state
  if (!nextInterview) {
    const hasRole = Boolean(user?.targetRole && user.targetRole.trim());
    const hasResume = Boolean(resume?.fileName || state.resumeName);
    const hasInterview = Boolean(overview?.upcomingInterviews && overview.upcomingInterviews.length > 0);
    const completedSteps = (hasRole ? 1 : 0) + (hasResume ? 1 : 0) + (hasInterview ? 1 : 0);

    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <section className={styles.dashboardHeading}>
          <div>
            <span className={styles.systemStatus}><i /> Personalized workspace</span>
            <h1>Welcome, {firstName}.</h1>
            <p>Set up your preparation workspace to unlock tailored questions and readiness predictions.</p>
          </div>
          <div className={styles.headingStreak}>
            <Flame size={16} />
            <strong>{overview?.streakDays ?? 0}</strong>
            <span>day streak</span>
          </div>
        </section>

        {/* Guided Quickstart Setup Checklist */}
        <Surface className={styles.setupChecklistCard}>
          <div className={styles.setupChecklistHeader}>
            <div>
              <h2>Quickstart setup</h2>
              <p>Adding your details helps the AI interviewer calibrate difficulty and role expectations.</p>
            </div>
            <div className={styles.setupProgressBadge}>
              <strong>{completedSteps}/3</strong> completed
            </div>
          </div>
          <ProgressBar value={(completedSteps / 3) * 100} />

          <div className={styles.setupStepsList}>
            <div className={styles.setupStepItem} data-complete={hasRole}>
              <div className={styles.setupStepIcon}>
                <BriefcaseBusiness size={18} />
              </div>
              <div className={styles.setupStepContent}>
                <strong>Target role</strong>
                <span>{hasRole ? user?.targetRole : "Configure your target role and seniority"}</span>
              </div>
              <ActionButton href="/profile" variant="ghost" className="mono">
                {hasRole ? "Edit" : "Set role"}
              </ActionButton>
            </div>

            <div className={styles.setupStepItem} data-complete={hasResume}>
              <div className={styles.setupStepIcon}>
                <FileText size={18} />
              </div>
              <div className={styles.setupStepContent}>
                <strong>Resume & skills</strong>
                <span>{hasResume ? (resume?.fileName ?? "Resume uploaded ✓") : "Upload your resume for project-specific questions"}</span>
              </div>
              <ActionButton href="/profile" variant="ghost" className="mono">
                {hasResume ? "Manage" : "Upload"}
              </ActionButton>
            </div>

            <div className={styles.setupStepItem} data-complete={hasInterview}>
              <div className={styles.setupStepIcon}>
                <CalendarDays size={18} />
              </div>
              <div className={styles.setupStepContent}>
                <strong>Interview tracking</strong>
                <span>{hasInterview ? "Interview active" : "Add an upcoming round or connect calendar"}</span>
              </div>
              <ActionButton onClick={() => setAddModalOpen(true)} variant="ghost" className="mono">
                {hasInterview ? "View" : "+ Add"}
              </ActionButton>
            </div>
          </div>
        </Surface>

        {/* Hero Quick-Action Panels */}
        <section className={styles.dashboardEmptyHero}>
          <Surface gold className={styles.emptyHeroMain}>
            <div className={styles.emptyHeroCopy}>
              <span className="fine-label">Get started</span>
              <h2>Start your interview preparation</h2>
              <p>
                Whether you have an interview next week or are proactively sharpening your skills,
                Intervu provides realistic AI-driven mock interviews and adaptive follow-ups.
              </p>
            </div>

            <div className={styles.quickActionGrid}>
              <button
                type="button"
                className={styles.quickActionCard}
                onClick={() => setAddModalOpen(true)}
              >
                <Plus size={20} />
                <strong>Add upcoming interview</strong>
                <span>Enter company and round to get an automated countdown and daily study plan.</span>
              </button>

              <Link href="/interviews" className={styles.quickActionCard}>
                <CalendarCheck size={20} />
                <strong>Connect Google Calendar</strong>
                <span>Automatically sync scheduled interview invites from your calendar.</span>
              </Link>

              <Link href="/practice" className={styles.quickActionCard}>
                <Zap size={20} />
                <strong>Freeform mock practice</strong>
                <span>Jump straight into a 15-minute technical or behavioral pressure test.</span>
              </Link>
            </div>
          </Surface>

          <Surface className={styles.readinessExplainer}>
            <div>
              <span className="fine-label">Readiness Framework</span>
              <h3>How your score is calculated</h3>
            </div>
            <ul className={styles.readinessSignalsList}>
              <li><Sparkles size={14} /> <strong>Technical depth</strong> — Correctness, edge cases & trade-offs</li>
              <li><Sparkles size={14} /> <strong>Answer structure</strong> — STAR framework & logical framing</li>
              <li><Sparkles size={14} /> <strong>Communication clarity</strong> — Concise delivery & articulation</li>
              <li><Sparkles size={14} /> <strong>Speaking pace</strong> — 120–150 WPM & minimal filler words</li>
              <li><Sparkles size={14} /> <strong>Relevance</strong> — Direct answers without tangential drift</li>
            </ul>
            <ActionButton href="/practice/setup?mode=technical">
              Start first practice drill <ArrowRight data-arrow size={16} />
            </ActionButton>
          </Surface>
        </section>

        <AddInterviewModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      </motion.div>
    );
  }

  // Active user with upcoming interviews
  const { upcomingInterviews, todayTasks, weakTopics, streakDays, scoreTrend, readinessDeltaThisWeek } = overview;
  const completed = todayTasks.filter((task) => task.status === "completed").length;

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <section className={styles.dashboardHeading}>
        <div>
          <span className={styles.systemStatus}><i /> Live Workspace · {nextInterview.company}</span>
          <h1>Good evening, {firstName}.</h1>
          <p>Your next interview is close. Today’s work is already prioritized.</p>
        </div>
        <div className={styles.headingStreak}>
          <Flame size={16} />
          <strong>{streakDays}</strong>
          <span>day streak</span>
        </div>
      </section>

      <section className={styles.dashboardHero}>
        <Surface gold className={styles.nextPanel}>
          <div className={styles.nextTopline}>
            <span className="fine-label">Next interview</span>
            <span className={styles.liveCountdown}><i /> Live countdown</span>
          </div>
          <div className={styles.nextCompany}>
            <span className={styles.companyMark}>{nextInterview.companyMark}</span>
            <div>
              <span>{nextInterview.company}</span>
              <h2>{nextInterview.role}</h2>
              <p>{nextInterview.round} · Round {nextInterview.roundNumber} of {nextInterview.totalRounds}</p>
            </div>
          </div>
          <Countdown target={nextInterview.scheduledAt} />
          <div className={styles.nextPanelFooter}>
            <span><CalendarClock size={15} /> {new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(nextInterview.scheduledAt))}</span>
            <div>
              <ActionButton href={`/interviews/${nextInterview.id}/prepare`} variant="ghost">Continue preparation</ActionButton>
              <ActionButton href={`/interviews/${nextInterview.id}/mock`}>Start mock <ArrowRight data-arrow size={16} /></ActionButton>
            </div>
          </div>
        </Surface>

        <Surface className={styles.readinessPanel}>
          <div>
            <span className="fine-label">Readiness</span>
            <p>Role-specific confidence from five evidence signals.</p>
          </div>
          <ScoreRing value={nextInterview.readiness} size={178} />
          <div className={styles.readinessDelta}>
            <Sparkles size={15} />
            <span><strong>+{readinessDeltaThisWeek} points</strong> this week</span>
          </div>
        </Surface>
      </section>

      <section className={styles.dashboardGrid}>
        <Surface className={styles.todayPanel}>
          <div className={styles.panelHeading}>
            <div><span className="fine-label">Today’s plan</span><h2>Prioritized actions</h2></div>
            <div className={styles.planProgress}><strong className="mono">{completed}/{todayTasks.length}</strong><span>complete</span></div>
          </div>
          <ProgressBar value={todayTasks.length > 0 ? (completed / todayTasks.length) * 100 : 0} />
          <div className={styles.taskList}>
            {todayTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => void updateTask({ id: task.id, status: task.status === "completed" ? "pending" : "completed" })}
                className={styles.taskRow}
                data-complete={task.status === "completed"}
              >
                <span className={styles.taskCheck}>{task.status === "completed" && <Check size={14} />}</span>
                <span><strong>{task.title}</strong><small>{task.category} · {task.estimatedMinutes} min</small></span>
                <ChevronRight size={16} />
              </button>
            ))}
            {todayTasks.length === 0 && (
              <div style={{ padding: "1.5rem 0", color: "#74716b", fontSize: "0.78rem", textAlign: "center" }}>
                No tasks scheduled for today. You are caught up!
              </div>
            )}
          </div>
        </Surface>

        <Surface className={styles.focusPanel} warm>
          <div className={styles.panelHeading}>
            <div><span className="fine-label">Weak topics</span><h2>Highest leverage today</h2></div>
            <Target size={18} />
          </div>
          <div className={styles.topicStack}>
            {weakTopics.map((topic, index) => (
              <Link key={topic.topic} href={`/practice/setup?focus=${encodeURIComponent(topic.topic)}`}>
                <span className="mono">0{index + 1}</span>
                <div><strong>{topic.topic}</strong><small>{topic.relevance} role relevance</small></div>
                <b className="mono">{topic.score}%</b>
                <ChevronRight size={15} />
              </Link>
            ))}
            {weakTopics.length === 0 && (
              <div style={{ padding: "1.5rem 0", color: "#74716b", fontSize: "0.78rem", textAlign: "center" }}>
                Complete more mock sessions to identify topic focus areas.
              </div>
            )}
          </div>
          <ActionButton href="/practice/setup?mode=targeted" variant="ghost" className={styles.fullButton}>
            Practice weakest topic <ArrowRight data-arrow size={15} />
          </ActionButton>
        </Surface>

        <Surface className={styles.dailyPractice}>
          <div className={styles.practiceDial}>
            <Clock3 size={20} />
            <strong className="mono">12</strong>
            <span>min</span>
          </div>
          <div><span className="fine-label">Daily practice</span><h2>A short pressure test is enough.</h2><p>Adaptive drill · {nextInterview.round}</p></div>
          <ActionButton href="/practice/setup">Start <ArrowRight data-arrow size={15} /></ActionButton>
        </Surface>
      </section>

      <section className={styles.dashboardBottom}>
        <Surface className={styles.upcomingPanel}>
          <div className={styles.panelHeading}>
            <div><span className="fine-label">Upcoming</span><h2>Interview timeline</h2></div>
            <Link href="/interviews">View calendar <ArrowRight size={14} /></Link>
          </div>
          <div className={styles.upcomingTimeline}>
            {upcomingInterviews.map((interview, index) => (
              <Link key={interview.id} href={`/interviews/${interview.id}`}>
                <span className={styles.timelineNode} data-primary={index === 0} />
                <time className="mono">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(interview.scheduledAt))}</time>
                <div><strong>{interview.company}</strong><small>{interview.role} · {interview.round}</small></div>
                <span className="mono">{interview.readiness}</span>
              </Link>
            ))}
          </div>
        </Surface>

        <Surface className={styles.improvementPanel}>
          <div className={styles.panelHeading}>
            <div><span className="fine-label">Improvement</span><h2>Practice is compounding</h2></div>
            {scoreTrend.length > 1 && scoreTrend[0] !== undefined && scoreTrend[scoreTrend.length - 1] !== undefined && (
              <span className={styles.positiveDelta}>
                +{Math.max(0, (scoreTrend[scoreTrend.length - 1] ?? 0) - (scoreTrend[0] ?? 0))}%
              </span>
            )}
          </div>
          <div className={styles.improvementMetric}>
            <div>
              <AnimatedNumber value={scoreTrend[scoreTrend.length - 1] ?? 80} className="metric-number" />
              <small>recent score</small>
            </div>
            {scoreTrend.length > 0 && <Sparkline data={scoreTrend} width={320} height={100} />}
          </div>
          {scoreTrend.length > 1 && scoreTrend[0] !== undefined && scoreTrend[scoreTrend.length - 1] !== undefined && (
            <div className={styles.trendFoot}>
              <span>Previous <b>{scoreTrend[0]}</b></span>
              <span>Now <b>{scoreTrend[scoreTrend.length - 1]}</b></span>
            </div>
          )}
        </Surface>
      </section>

      <AddInterviewModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </motion.div>
  );
}

