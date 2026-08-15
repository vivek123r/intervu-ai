import { z } from "zod";

export const resumeSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  parsedSkills: z.array(z.string()),
  uploadedAt: z.string(),
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
