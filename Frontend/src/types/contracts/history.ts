import { z } from "zod";

export const historyMetricToneSchema = z.enum(["positive", "neutral", "caution", "critical"]);

export const historyStatusSchema = z.enum(["completed", "processing", "abandoned"]);

export const historyMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  tone: historyMetricToneSchema,
});

export const historySessionSchema = z.object({
  id: z.string(),
  code: z.string(),
  company: z.string(),
  role: z.string(),
  mode: z.string(),
  startedAt: z.string(),
  durationMinutes: z.number(),
  score: z.number(),
  status: historyStatusSchema,
  reportId: z.string().nullable(),
  metrics: z.array(historyMetricSchema),
});
