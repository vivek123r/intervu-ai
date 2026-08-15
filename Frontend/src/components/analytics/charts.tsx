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

const trendData = [
  { label: "Jul 18", overall: 64, readiness: 51 },
  { label: "Jul 22", overall: 67, readiness: 56 },
  { label: "Jul 26", overall: 71, readiness: 61 },
  { label: "Jul 30", overall: 70, readiness: 66 },
  { label: "Aug 03", overall: 76, readiness: 71 },
  { label: "Aug 07", overall: 79, readiness: 76 },
  { label: "Aug 11", overall: 82, readiness: 81 },
  { label: "Aug 15", overall: 87, readiness: 85 },
];

const radarData = [
  { skill: "Technical", you: 84, previous: 76, target: 90 },
  { skill: "Communication", you: 81, previous: 75, target: 88 },
  { skill: "Problem solving", you: 86, previous: 78, target: 90 },
  { skill: "Structure", you: 76, previous: 68, target: 86 },
  { skill: "Clarity", you: 88, previous: 80, target: 90 },
  { skill: "Pace", you: 79, previous: 72, target: 84 },
];

const tooltipStyle = {
  background: "rgba(11,11,12,.96)",
  border: "1px solid rgba(240,185,76,.25)",
  borderRadius: "10px",
  color: "#f7f5f0",
  fontSize: "12px",
};

export function PerformanceTrendChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={trendData} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#74716b", fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[40, 100]} tick={{ fill: "#56534e", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(240,185,76,.18)" }} />
        <Line type="monotone" dataKey="readiness" stroke="#f0b94c" strokeWidth={2.4} dot={false} activeDot={{ r: 4, fill: "#fff0b5", stroke: "#8a5a12" }} />
        <Line type="monotone" dataKey="overall" stroke="rgba(247,245,240,.42)" strokeWidth={1.6} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SkillRadarChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={radarData} outerRadius="68%">
        <PolarGrid stroke="rgba(255,255,255,.09)" />
        <PolarAngleAxis dataKey="skill" tick={{ fill: "#74716b", fontSize: 10 }} />
        <Radar name="Target" dataKey="target" stroke="rgba(255,255,255,.18)" fill="rgba(255,255,255,.025)" />
        <Radar name="Previous month" dataKey="previous" stroke="rgba(247,245,240,.35)" fill="rgba(247,245,240,.025)" />
        <Radar name="You" dataKey="you" stroke="#f0b94c" strokeWidth={2} fill="rgba(240,185,76,.15)" />
        <Legend iconType="line" wrapperStyle={{ fontSize: 10, color: "#74716b" }} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
