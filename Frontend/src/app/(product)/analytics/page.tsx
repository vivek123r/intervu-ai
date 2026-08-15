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

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const { data: overview, isLoading } = useGetAnalyticsOverviewQuery();

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

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <header className={styles.pageHeading}>
        <div><span className={styles.systemStatus}><i /> Evidence from 12 sessions</span><h1>Performance intelligence</h1><p>See what is improving, where readiness is fragile, and exactly what to practice next.</p></div>
        <ActionButton href="/practice/setup"><Sparkles size={16} /> Start focused practice</ActionButton>
      </header>

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
          <div className={styles.analyticsPanelHeading}><div><span className="fine-label">Interview trend</span><h2>Readiness is now catching performance.</h2></div><Tabs items={ranges} value={range} onChange={setRange} ariaLabel="Analytics range" /></div>
          <div className={styles.chartLegend}><span><i /> Readiness</span><span><i /> Overall score</span></div>
          <div className={styles.chartStage}><PerformanceTrendChart /></div>
        </Surface>
        <Surface className={styles.radarPanel}>
          <div className={styles.analyticsPanelHeading}><div><span className="fine-label">Skill radar</span><h2>Structure is the constraint.</h2></div></div>
          <div className={styles.radarStage}><SkillRadarChart /></div>
          <p>Your technical and clarity dimensions are near target. Answer structure trails by 10 points.</p>
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
              <div key={topic.topic}>
                <span className="mono">{String(index + 1).padStart(2, "0")}</span><strong>{topic.topic}</strong><i><b style={{ width: `${topic.score}%` }} /></i><span className="mono">{topic.score}%</span><small data-down={topic.trend < 0}>{topic.trend > 0 ? "+" : ""}{topic.trend}</small>{topic.score < 70 && <Link href={`/practice/setup?focus=${encodeURIComponent(topic.topic)}`}>Practice <ChevronRight size={14} /></Link>}
              </div>
            ))}
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
          </div>
        </Surface>
      </section>
    </motion.div>
  );
}
