import { z } from "zod";

export const resumeSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  parsedSkills: z.array(z.string()),
  uploadedAt: z.string(),
  summary: z.string().optional().nullable(),
  keyHighlights: z.array(z.string()).optional(),
  experiencePoints: z.array(z.string()).optional(),
  domainStrengths: z.array(z.string()).optional(),
  education: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  rawText: z.string().optional().nullable(),
});

export const skillMatrixEntrySchema = z.object({
  skill: z.string(),
  candidateScore: z.number(),
  roleScore: z.number(),
});

export const jobDescriptionAnalysisSchema = z.object({
  id: z.string(),
  overallMatch: z.number(),
  summary: z.string(),
  skillMatrix: z.array(skillMatrixEntrySchema),
  createdAt: z.string(),
});
