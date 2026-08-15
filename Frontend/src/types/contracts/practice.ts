import { z } from "zod";

import { difficultySchema, interviewTypeSchema } from "@/types/contracts/common";

export const practiceConfigSchema = z.object({
  role: z.string(),
  company: z.string(),
  type: interviewTypeSchema,
  difficulty: difficultySchema,
  duration: z.number(),
  focusAreas: z.array(z.string()),
  interviewerStyle: z.string(),
});

export const questionRefSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.string(),
  topic: z.string(),
  difficulty: difficultySchema,
  followUp: z.boolean().optional(),
});

export const sessionAnswerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  transcript: z.string(),
  durationSeconds: z.number(),
  score: z.number(),
});

export const practiceSessionSchema = z.object({
  id: z.string(),
  status: z.enum(["ready", "active", "processing", "completed"]),
  config: practiceConfigSchema,
  questions: z.array(questionRefSchema),
  currentQuestionIndex: z.number(),
  answers: z.array(sessionAnswerSchema),
  startedAt: z.string().optional(),
});

export const answerReviewSchema = z.object({
  question: z.string(),
  answer: z.string(),
  score: z.number(),
  strengths: z.array(z.string()),
  missing: z.array(z.string()),
  betterStructure: z.array(z.string()),
});

export const interviewReportSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  createdAt: z.string(),
  overall: z.number(),
  technical: z.number(),
  communication: z.number(),
  structure: z.number(),
  clarity: z.number(),
  relevance: z.number(),
  depth: z.number(),
  summary: z.string(),
  speech: z.object({
    averageWpm: z.number(),
    fillerCount: z.number(),
    fillers: z.record(z.string(), z.number()),
    longPauses: z.number(),
    longestPause: z.number(),
    averageAnswerSeconds: z.number(),
  }),
  weakTopics: z.array(z.string()),
  strengths: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  answers: z.array(answerReviewSchema),
});
