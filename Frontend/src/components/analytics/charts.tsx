"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalyticsRecentSession, CompletionSignatureAxis, TopicMetric } from "@/types/domain";

const tooltipStyle = {
  background: "rgba(11,11,12,.96)",
  border: "1px solid rgba(240,185,76,.25)",
  borderRadius: "10px",
  color: "#f7f5f0",
  fontSize: "12px",
};

/**
 * `recentSessions` is ordered newest-first while the trend arrays are chronological
 * (oldest-first), so labels are pulled from the tail of the sessions list working
 * backwards. Sessions and trend points aren't guaranteed to line up 1:1 (the trend
 * window can be wider than the session history the API returns), so any point past
 * the available dates falls back to a plain sequence label.
 */
function buildTrendLabels(length: number, sessions: AnalyticsRecentSession[]) {
  const chronological = [...sessions].reverse();
  return Array.from({ length }, (_, index) => {
    const session = chronological[chronological.length - length + index];
    if (session) {
      return new Date(session.completedAt).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
    }
    return `Session ${index + 1}`;
  });
}

export function PerformanceTrendChart({
  scoreTrend,
  readinessTrend,
  recentSessions = [],
}: {
  scoreTrend: number[];
  readinessTrend: number[];
  recentSessions?: AnalyticsRecentSession[];
}) {
  if (scoreTrend.length === 0 && readinessTrend.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", padding: "1.5rem", color: "#74716b", fontSize: "0.78rem", textAlign: "center" }}>
        <p style={{ margin: 0 }}>Your interview trend will appear here after your first completed mock session.</p>
      </div>
    );
  }

  const length = Math.max(scoreTrend.length, readinessTrend.length);
  const labels = buildTrendLabels(length, recentSessions);
  const data = labels.map((label, index) => ({
    label,
    overall: scoreTrend[index] ?? null,
    readiness: readinessTrend[index] ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#74716b", fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: "#56534e", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(240,185,76,.18)" }} />
        <Line type="monotone" dataKey="readiness" stroke="#f0b94c" strokeWidth={2.4} dot={false} activeDot={{ r: 4, fill: "#fff0b5", stroke: "#8a5a12" }} connectNulls />
        <Line type="monotone" dataKey="overall" stroke="rgba(247,245,240,.42)" strokeWidth={1.6} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * One session's six dimensions against their targets — unlike the two charts here, this
 * one reads its data from the completion payload rather than a fixed demo series. The
 * radius axis is pinned to 0–100 so two sessions' shapes are comparable by eye.
 */
export function SignatureRadarChart({ data }: { data: CompletionSignatureAxis[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="rgba(255,255,255,.08)" />
        <PolarAngleAxis dataKey="label" tick={{ fill: "#74716b", fontSize: 9.5 }} />
        <Radar name="Target" dataKey="benchmark" stroke="rgba(255,255,255,.18)" fill="rgba(255,255,255,.02)" />
        <Radar name="This session" dataKey="value" stroke="#f0b94c" strokeWidth={2} fill="rgba(240,185,76,.16)" />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/**
 * The overview endpoint has no per-skill target/previous-month breakdown — only
 * per-topic score — so this renders a single "you" series over topics rather than
 * inventing target/previous values the way the old hardcoded demo series did.
 */
export function SkillRadarChart({ topics }: { topics: TopicMetric[] }) {
  if (topics.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", padding: "1.5rem", color: "#74716b", fontSize: "0.78rem", textAlign: "center" }}>
        <p style={{ margin: 0 }}>Skill breakdown appears after your first completed mock session.</p>
      </div>
    );
  }

  const data = topics.map((topic) => ({ skill: topic.topic, you: topic.score }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="68%">
        <PolarGrid stroke="rgba(255,255,255,.09)" />
        <PolarAngleAxis dataKey="skill" tick={{ fill: "#74716b", fontSize: 10 }} />
        <Radar name="You" dataKey="you" stroke="#f0b94c" strokeWidth={2} fill="rgba(240,185,76,.15)" />
        <Legend iconType="line" wrapperStyle={{ fontSize: 10, color: "#74716b" }} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
