import { z } from "zod";

import { difficultySchema, interviewTypeSchema } from "@/types/contracts/common";
import { historyMetricToneSchema } from "@/types/contracts/history";

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
  // Scoring runs in the background (see Backend/app/services/analysis.py) — score
  // is omitted from the wire entirely while analysisStatus is "pending".
  analysisStatus: z.enum(["pending", "complete", "failed"]),
  score: z.number().optional(),
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
  aiComment: z.string().optional(),
  strengths: z.array(z.string()),
  missing: z.array(z.string()),
  betterStructure: z.array(z.string()),
});

const speechMetricsSchema = z.object({
  averageWpm: z.number(),
  fillerCount: z.number(),
  fillers: z.record(z.string(), z.number()),
  longPauses: z.number(),
  longestPause: z.number(),
  averageAnswerSeconds: z.number(),
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
  speech: speechMetricsSchema,
  weakTopics: z.array(z.string()),
  strengths: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  answers: z.array(answerReviewSchema),
});

export const completionSignatureAxisSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  benchmark: z.number(),
});

export const completionMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  band: z.string(),
  tone: historyMetricToneSchema,
  delta: z.string().nullable(),
});

export const growthProtocolSchema = z.object({
  id: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  title: z.string(),
  detail: z.string(),
  focusArea: z.string(),
});

export const completionQuestionSchema = z.object({
  id: z.string(),
  position: z.number(),
  question: z.string(),
  topic: z.string(),
  category: z.string(),
  difficulty: difficultySchema,
  score: z.number(),
  durationSeconds: z.number(),
  verdict: z.enum(["strong", "solid", "needs_work"]),
  answer: z.string(),
  aiComment: z.string().optional(),
  strengths: z.array(z.string()),
  missing: z.array(z.string()),
  betterStructure: z.array(z.string()),
});

/** The whole completion screen in one payload — see docs/API-CONTRACT.md's
 * `GET /reports/{id}/completion`. */
export const sessionCompletionSchema = z.object({
  reportId: z.string(),
  sessionId: z.string(),
  code: z.string(),
  role: z.string(),
  company: z.string(),
  mode: z.string(),
  completedAt: z.string(),
  durationMinutes: z.number(),
  questionsAnswered: z.number(),
  overall: z.object({
    score: z.number(),
    band: z.string(),
    topPercent: z.number(),
    deltaFromPrevious: z.number(),
    caption: z.string(),
  }),
  summary: z.string(),
  signature: z.array(completionSignatureAxisSchema),
  metrics: z.array(completionMetricSchema),
  speech: speechMetricsSchema,
  strengths: z.array(z.string()),
  protocols: z.array(growthProtocolSchema),
  questions: z.array(completionQuestionSchema),
});

export const conversationTurnSchema = z.object({
  speaker: z.enum(["candidate", "assistant"]),
  text: z.string(),
  questionId: z.string().optional(),
  createdAt: z.string(),
});

export const reportConversationSchema = z.object({
  reportId: z.string(),
  turns: z.array(conversationTurnSchema),
});

export const reportChatResponseSchema = z.object({
  reply: conversationTurnSchema,
  turns: z.array(conversationTurnSchema),
});
