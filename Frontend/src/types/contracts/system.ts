import { z } from "zod";

import { experienceLevelSchema } from "@/types/contracts/common";

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  timezone: z.string(),
  targetRole: z.string(),
  experienceLevel: experienceLevelSchema,
  preferredLanguage: z.string(),
  skills: z.array(z.string()),
  onboardingCompleted: z.boolean(),
  createdAt: z.string(),
});

export const notificationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  createdAt: z.string(),
  read: z.boolean(),
  actionHref: z.string().optional(),
});

export const processingJobSchema = z.object({
  id: z.string(),
  type: z.enum(["calendar_sync", "preparation_generation", "report_generation", "resume_parsing"]),
  status: z.enum(["queued", "processing", "completed", "failed"]),
  progress: z.number(),
  resultId: z.string().nullable(),
  error: z.string().nullable(),
});
