import { z } from "zod";

import { difficultySchema } from "@/types/contracts/common";

export const preparationTaskSchema = z.object({
  id: z.string(),
  day: z.number(),
  dateLabel: z.string(),
  phase: z.string(),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedMinutes: z.number(),
  status: z.enum(["pending", "in_progress", "completed"]),
  priority: z.enum(["high", "normal"]),
});

export const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.string(),
  topic: z.string(),
  difficulty: difficultySchema,
  followUp: z.boolean().optional(),
});

export const preparationTimelineStepSchema = z.object({
  day: z.number(),
  label: z.string(),
  phase: z.string(),
  status: z.enum(["complete", "active", "upcoming"]),
});

export const preparationPlanSchema = z.object({
  tasks: z.array(preparationTaskSchema),
  questions: z.array(questionSchema),
  timeline: z.array(preparationTimelineStepSchema),
});
