import { z } from "zod";

export const topicMetricSchema = z.object({
  topic: z.string(),
  score: z.number(),
  trend: z.number(),
  relevance: z.enum(["critical", "high", "normal"]),
});

export const analyticsMicroMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  delta: z.string(),
  trend: z.array(z.number()),
});

export const analyticsRecentSessionSchema = z.object({
  reportId: z.string(),
  company: z.string(),
  mode: z.string(),
  score: z.number(),
  completedAt: z.string(),
});

export const analyticsOverviewSchema = z.object({
  overallScore: z.number(),
  readinessScore: z.number(),
  streakDays: z.number(),
  improvementPercent: z.number(),
  scoreTrend: z.array(z.number()),
  readinessTrend: z.array(z.number()),
  microMetrics: z.array(analyticsMicroMetricSchema),
  topicPerformance: z.array(topicMetricSchema),
  recentSessions: z.array(analyticsRecentSessionSchema),
});
