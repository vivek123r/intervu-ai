"use client";

import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Sparkles,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { Countdown } from "@/components/ui/countdown";
import { ActionButton } from "@/components/ui/buttons";
import { AnimatedNumber, pageTransition } from "@/components/ui/motion";
import { ScoreRing } from "@/components/ui/score-ring";
import { Sparkline } from "@/components/ui/sparkline";
import { ProgressBar, Surface } from "@/components/ui/surface";
import { useGetDashboardOverviewQuery } from "@/services/api/interviews.api";
import { useUpdatePreparationTaskMutation } from "@/services/api/preparation.api";
import { useProduct } from "@/lib/product-store";

import styles from "../product.module.css";

export default function DashboardPage() {
  const { data: overview, isLoading } = useGetDashboardOverviewQuery();
  const [updateTask] = useUpdatePreparationTaskMutation();
  const { state } = useProduct();

  if (isLoading || !overview || !overview.nextInterview) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <div className={styles.chartSkeleton}><span className="skeleton" /></div>
      </motion.div>
    );
  }

  const { nextInterview, upcomingInterviews, todayTasks, weakTopics, streakDays, scoreTrend, readinessDeltaThisWeek } = overview;
  const completed = todayTasks.filter((task) => task.status === "completed").length;
  const firstName = state.userName.trim().split(/\s+/)[0] || "Candidate";

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <section className={styles.dashboardHeading}>
        <div>
          <span className={styles.systemStatus}><i /> Workspace calibrated · Demo data</span>
          <h1>Good evening, {firstName}.</h1>
          <p>Your next interview is close. Today’s work is already prioritized.</p>
        </div>
        <div className={styles.headingStreak}><Flame size={16} /><strong>{streakDays}</strong><span>day streak</span></div>
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
            <div><span className="fine-label">Today’s plan</span><h2>Five actions. One focused hour.</h2></div>
            <div className={styles.planProgress}><strong className="mono">{completed}/{todayTasks.length}</strong><span>complete</span></div>
          </div>
          <ProgressBar value={(completed / todayTasks.length) * 100} />
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
          <div><span className="fine-label">Daily practice</span><h2>A short pressure test is enough.</h2><p>Hard · SQL + caching</p></div>
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
            <span className={styles.positiveDelta}>+23%</span>
          </div>
          <div className={styles.improvementMetric}>
            <div><AnimatedNumber value={87} className="metric-number" /><small>current average</small></div>
            <Sparkline data={scoreTrend} width={320} height={100} />
          </div>
          <div className={styles.trendFoot}><span>10 sessions ago <b>{scoreTrend[0]}</b></span><span>Now <b>{scoreTrend[scoreTrend.length - 1]}</b></span></div>
        </Surface>
      </section>
    </motion.div>
  );
}
