import { z } from "zod";

export const interviewTypeSchema = z.enum([
  "technical",
  "behavioral",
  "system_design",
  "hiring_manager",
  "recruiter",
]);

export const interviewStatusSchema = z.enum([
  "detected",
  "confirmed",
  "upcoming",
  "completed",
  "cancelled",
]);

export const difficultySchema = z.enum(["easy", "normal", "hard", "brutal"]);

export const experienceLevelSchema = z.enum(["early", "mid", "senior", "staff"]);

export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()),
    requestId: z.string().optional(),
  }),
});
