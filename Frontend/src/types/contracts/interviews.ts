import { z } from "zod";

import { topicMetricSchema } from "@/types/contracts/analytics";
import { interviewStatusSchema, interviewTypeSchema } from "@/types/contracts/common";
import { preparationTaskSchema } from "@/types/contracts/preparation";

export const interviewRoundSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: interviewTypeSchema,
  status: z.enum(["completed", "current", "pending"]),
});

export const interviewSchema = z.object({
  id: z.string(),
  company: z.string(),
  companyMark: z.string(),
  role: z.string(),
  type: interviewTypeSchema,
  round: z.string(),
  roundNumber: z.number(),
  totalRounds: z.number(),
  scheduledAt: z.string(),
  timezone: z.string(),
  durationMinutes: z.number(),
  meetingUrl: z.string().optional(),
  recruiter: z.string().optional(),
  interviewers: z.array(z.string()).optional(),
  status: interviewStatusSchema,
  readiness: z.number(),
  preparationProgress: z.number(),
  location: z.string(),
  accent: z.string(),
  rounds: z.array(interviewRoundSchema),
});

export const dashboardOverviewSchema = z.object({
  nextInterview: interviewSchema.nullable(),
  upcomingInterviews: z.array(interviewSchema),
  todayTasks: z.array(preparationTaskSchema),
  weakTopics: z.array(topicMetricSchema),
  streakDays: z.number(),
  scoreTrend: z.array(z.number()),
  readinessDeltaThisWeek: z.number(),
});

export const createInterviewRequestSchema = z.object({
  company: z.string(),
  role: z.string(),
  type: interviewTypeSchema,
  scheduledAt: z.string(),
  timezone: z.string(),
});

export const updateInterviewRequestSchema = createInterviewRequestSchema
  .partial()
  .extend({
    meetingUrl: z.string().optional(),
    recruiter: z.string().optional(),
    interviewers: z.array(z.string()).optional(),
  });
