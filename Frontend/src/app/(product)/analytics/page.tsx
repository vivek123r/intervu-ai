"use client";

import {
  ArrowRight,
  ChevronRight,
  Clock3,
  Flame,
  MessageSquareText,
  Pause,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { ActionButton } from "@/components/ui/buttons";
import { AnimatedNumber, pageTransition } from "@/components/ui/motion";
import { Sparkline } from "@/components/ui/sparkline";
import { Surface } from "@/components/ui/surface";
import { Tabs } from "@/components/ui/tabs";
import { useGetAnalyticsOverviewQuery } from "@/services/api/analytics.api";

import styles from "../product.module.css";

const PerformanceTrendChart = dynamic(() => import("@/components/analytics/charts").then((module) => module.PerformanceTrendChart), { ssr: false, loading: () => <div className={styles.chartSkeleton}><span className="skeleton" /></div> });
const SkillRadarChart = dynamic(() => import("@/components/analytics/charts").then((module) => module.SkillRadarChart), { ssr: false, loading: () => <div className={styles.chartSkeleton}><span className="skeleton" /></div> });

type Range = "7d" | "30d" | "3m" | "all";
const ranges = [{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "3m", label: "3 months" }, { value: "all", label: "All time" }] as const;

const microMetricIcons: Record<string, LucideIcon> = {
  technical: Target,
  structure: MessageSquareText,
  pace: Timer,
  fillers: Pause,
  practiceTime: Clock3,
};

const relevanceLabels: Record<string, string> = {
  critical: "Critical focus",
  high: "High priority",
  normal: "Normal relevance",
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const { data: overview, isLoading } = useGetAnalyticsOverviewQuery(range);

  if (isLoading || !overview) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <div className={styles.chartSkeleton}><span className="skeleton" /></div>
      </motion.div>
    );
  }

  const toplineMetrics: Array<{ label: string; value: number; note: string; icon: LucideIcon }> = [
    { label: "Overall", value: overview.overallScore, note: "score", icon: Target },
    { label: "Readiness", value: overview.readinessScore, note: "next interview", icon: Sparkles },
    { label: "Streak", value: overview.streakDays, note: "days", icon: Flame },
    { label: "Improvement", value: overview.improvementPercent, note: "% in 30 days", icon: ArrowRight },
  ];

  const sessionCount = overview.recentSessions?.length ?? 0;
  const statusText = sessionCount > 0 ? `Evidence from ${sessionCount} session${sessionCount === 1 ? "" : "s"}` : "Awaiting first practice session";

  // Trend heading: compare readiness's movement against overall score's movement rather
  // than asserting a fixed narrative, so a declining or flat user doesn't get told a
  // story that only ever matched the old demo series.
  const firstReadiness = overview.readinessTrend[0];
  const lastReadiness = overview.readinessTrend.at(-1);
  const firstScore = overview.scoreTrend[0];
  const lastScore = overview.scoreTrend.at(-1);
  let trendHeading = "Your interview trend";
  if (overview.readinessTrend.length >= 2 && overview.scoreTrend.length >= 2 && firstReadiness !== undefined && lastReadiness !== undefined && firstScore !== undefined && lastScore !== undefined) {
    const readinessDelta = lastReadiness - firstReadiness;
    const scoreDelta = lastScore - firstScore;
    if (readinessDelta > scoreDelta) trendHeading = "Readiness is now catching performance.";
    else if (scoreDelta > readinessDelta) trendHeading = "Performance is outpacing readiness.";
    else trendHeading = "Readiness and performance are moving together.";
  }

  // Radar heading/copy: name the genuinely lowest topic instead of a hardcoded "structure" claim.
  const sortedTopics = [...overview.topicPerformance].sort((a, b) => a.score - b.score);
  const weakestTopic = sortedTopics[0];
  const strongestTopic = sortedTopics.at(-1);
  const radarHeading = weakestTopic ? `${weakestTopic.topic} is the constraint.` : "Skill breakdown";
  const radarCopy =
    weakestTopic && strongestTopic && strongestTopic.topic !== weakestTopic.topic
      ? `Your ${strongestTopic.topic.toLowerCase()} is strongest. ${weakestTopic.topic} trails by ${strongestTopic.score - weakestTopic.score} points.`
      : weakestTopic
        ? `${weakestTopic.topic} is your only scored topic so far.`
        : "Complete a mock session to see your per-topic breakdown.";

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.systemStatus}><i /> {statusText}</span>
          <h1>Performance intelligence</h1>
          <p>See what is improving, where readiness is fragile, and exactly what to practice next.</p>
        </div>
        <ActionButton href="/practice/setup"><Sparkles size={16} /> Start focused practice</ActionButton>
      </header>

      {sessionCount === 0 && overview.overallScore === 0 && (
        <Surface className={styles.analyticsEmptyBanner}>
          <Sparkles size={24} />
          <div>
            <h3>Unlock full performance intelligence</h3>
            <p>Complete your first AI mock interview to generate speech pace diagnostics, answer structure radar charts, and readiness score trends.</p>
          </div>
          <ActionButton href="/practice/setup">
            Start first mock interview <ArrowRight data-arrow size={16} />
          </ActionButton>
        </Surface>
      )}

      <section className={styles.analyticsTopline}>
        {toplineMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
          <div key={metric.label} className={styles.analyticsMetric} data-primary={index === 1}>
            <div><span>{metric.label}</span><Icon size={16} /></div>
            <strong className="mono"><AnimatedNumber value={metric.value} suffix={metric.label === "Improvement" ? "%" : ""} /></strong>
            <small>{metric.note}</small>
          </div>
          );
        })}
      </section>

      <section className={styles.analyticsMain}>
        <Surface className={styles.trendChartPanel}>
          <div className={styles.analyticsPanelHeading}><div><span className="fine-label">Interview trend</span><h2>{trendHeading}</h2></div><Tabs items={ranges} value={range} onChange={setRange} ariaLabel="Analytics range" /></div>
          <div className={styles.chartLegend}><span><i /> Readiness</span><span><i /> Overall score</span></div>
          <div className={styles.chartStage}><PerformanceTrendChart scoreTrend={overview.scoreTrend} readinessTrend={overview.readinessTrend} recentSessions={overview.recentSessions} /></div>
        </Surface>
        <Surface className={styles.radarPanel}>
          <div className={styles.analyticsPanelHeading}><div><span className="fine-label">Skill radar</span><h2>{radarHeading}</h2></div></div>
          <div className={styles.radarStage}><SkillRadarChart topics={overview.topicPerformance} /></div>
          <p>{radarCopy}</p>
        </Surface>
      </section>

      <section className={styles.microMetrics}>
        {overview.microMetrics.map((metric) => {
          const Icon = microMetricIcons[metric.key] ?? Target;
          return (
          <Surface key={metric.key} className={styles.microMetricCard}>
            <div><Icon size={16} /><span>{metric.label}</span></div><strong className="mono">{metric.value}</strong><small>{metric.delta}</small><Sparkline data={metric.trend} width={120} height={36} />
          </Surface>
          );
        })}
      </section>

      <section className={styles.analyticsBottom}>
        <Surface className={styles.topicPerformancePanel}>
          <div className={styles.analyticsPanelHeading}><div><span className="fine-label">Topic performance</span><h2>Prioritized by weakness × role relevance × urgency</h2></div></div>
          <div className={styles.topicPerformanceList}>
            {overview.topicPerformance.map((topic, index) => (
              <Link key={topic.topic} href={`/practice/setup?focus=${encodeURIComponent(topic.topic)}`} className={styles.topicPerformanceRow}>
                <span className="mono">0{index + 1}</span>
                <div><strong>{topic.topic}</strong><small>{relevanceLabels[topic.relevance] ?? topic.relevance}</small></div>
                <div className={styles.topicTrend}><strong className="mono">{topic.score}%</strong><span>{topic.trend >= 0 ? `+${topic.trend}%` : `${topic.trend}%`}</span></div>
                <ChevronRight size={16} />
              </Link>
            ))}
            {overview.topicPerformance.length === 0 && (
              <div style={{ padding: "1.5rem 0", color: "#74716b", fontSize: "0.78rem", textAlign: "center" }}>
                Topic competency breakdowns will appear here after your first completed mock round.
              </div>
            )}
          </div>
        </Surface>
        <Surface gold className={styles.historyPanel}>
          <div className={styles.analyticsPanelHeading}><div><span className="fine-label">Interview history</span><h2>Recent sessions</h2></div><Link href="/practice">All sessions</Link></div>
          <div className={styles.historyList}>
            {overview.recentSessions.map((session) => (
              <Link key={session.reportId} href={`/practice/results/${session.reportId}`}>
                <span>{session.company.slice(0, 1)}</span>
                <div><strong>{session.company}</strong><small>{session.mode} · {new Date(session.completedAt).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}</small></div>
                <b className="mono">{session.score}</b>
                <ChevronRight size={15} />
              </Link>
            ))}
            {overview.recentSessions.length === 0 && (
              <div style={{ padding: "1.5rem 0", color: "#74716b", fontSize: "0.78rem", textAlign: "center" }}>
                Completed sessions will show up here.
              </div>
            )}
          </div>
        </Surface>
      </section>
    </motion.div>
  );
}
