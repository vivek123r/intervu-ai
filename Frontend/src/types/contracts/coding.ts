import { z } from "zod";

export const codingDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type CodingDifficulty = z.infer<typeof codingDifficultySchema>;

export const codingLanguageSchema = z.enum(["python", "javascript"]);
export type CodingLanguage = z.infer<typeof codingLanguageSchema>;

export const submissionStatusSchema = z.enum([
  "judging",
  "accepted",
  "wrong_answer",
  "time_limit_exceeded",
  "runtime_error",
  "compile_error",
]);
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

export const paramTypeSchema = z.enum([
  "int",
  "float",
  "string",
  "boolean",
  "list_int",
  "list_float",
  "list_string",
  "list_boolean",
  "list_list_int",
  "list_list_string",
  "list_node",
  "tree_node",
  "list_list_node_nullable",
]);
export type ParamType = z.infer<typeof paramTypeSchema>;

export const testCaseSchema = z.object({
  inputArgs: z.array(z.any()),
  expected: z.any().optional(),
  isExample: z.boolean().optional(),
});
export type TestCase = z.infer<typeof testCaseSchema>;

export const functionParamSchema = z.object({
  name: z.string(),
  type: paramTypeSchema,
});
export type FunctionParam = z.infer<typeof functionParamSchema>;

export const problemExampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string().optional(),
});
export type ProblemExample = z.infer<typeof problemExampleSchema>;

export const problemSummarySchema = z.object({
  slug: z.string(),
  number: z.number(),
  title: z.string(),
  difficulty: codingDifficultySchema,
  topics: z.array(z.string()),
  acceptanceRate: z.number(),
  status: z.enum(["solved", "attempted", "todo"]),
});
export type ProblemSummary = z.infer<typeof problemSummarySchema>;

export const problemDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  number: z.number(),
  title: z.string(),
  difficulty: codingDifficultySchema,
  topics: z.array(z.string()),
  descriptionMd: z.string(),
  examples: z.array(problemExampleSchema),
  constraintsMd: z.string(),
  functionName: z.string(),
  params: z.array(functionParamSchema),
  returnType: paramTypeSchema,
  returnIndex: z.number().nullable().optional(),
  starterCode: z.record(z.string(), z.string()),
  testCases: z.array(testCaseSchema),
  timeLimitMs: z.number(),
  editorialMd: z.string(),
  userStatus: z.enum(["solved", "attempted", "todo"]),
});
export type ProblemDetail = z.infer<typeof problemDetailSchema>;

export const problemListResponseSchema = z.object({
  items: z.array(problemSummarySchema),
  total: z.number(),
});
export type ProblemListResponse = z.infer<typeof problemListResponseSchema>;

export const topicCountSchema = z.object({
  name: z.string(),
  count: z.number(),
});
export type TopicCount = z.infer<typeof topicCountSchema>;

export const firstFailureDetailSchema = z.object({
  inputArgs: z.array(z.any()),
  expected: z.any(),
  actual: z.any().optional(),
  debugOutput: z.string().optional(),
  error: z.string().optional(),
});
export type FirstFailureDetail = z.infer<typeof firstFailureDetailSchema>;

export const codingSubmissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  problemSlug: z.string(),
  language: codingLanguageSchema,
  code: z.string(),
  status: submissionStatusSchema,
  passedCount: z.number(),
  totalCount: z.number(),
  runtimeMs: z.number().nullable().optional(),
  compileStderr: z.string().nullable().optional(),
  firstFailure: firstFailureDetailSchema.nullable().optional(),
  createdAt: z.string(),
});
export type CodingSubmission = z.infer<typeof codingSubmissionSchema>;

export const codingSubmissionSummarySchema = z.object({
  id: z.string(),
  problemSlug: z.string(),
  language: codingLanguageSchema,
  status: submissionStatusSchema,
  passedCount: z.number(),
  totalCount: z.number(),
  runtimeMs: z.number().nullable().optional(),
  createdAt: z.string(),
});
export type CodingSubmissionSummary = z.infer<typeof codingSubmissionSummarySchema>;

export const runTestCaseInputSchema = z.object({
  inputArgs: z.array(z.any()),
});
export type RunTestCaseInput = z.infer<typeof runTestCaseInputSchema>;

export const runCodeRequestSchema = z.object({
  language: codingLanguageSchema,
  code: z.string(),
  testCases: z.array(runTestCaseInputSchema).optional(),
});
export type RunCodeRequest = z.infer<typeof runCodeRequestSchema>;

export const runResultItemSchema = z.object({
  index: z.number(),
  inputArgs: z.array(z.any()),
  expected: z.any().optional(),
  actual: z.any().optional(),
  passed: z.boolean(),
  debugOutput: z.string(),
  error: z.string().nullable().optional(),
  runtimeMs: z.number().nullable().optional(),
});
export type RunResultItem = z.infer<typeof runResultItemSchema>;

export const runCodeResponseSchema = z.object({
  results: z.array(runResultItemSchema),
  compileError: z.string().nullable().optional(),
});
export type RunCodeResponse = z.infer<typeof runCodeResponseSchema>;

export const submitCodeRequestSchema = z.object({
  language: codingLanguageSchema,
  code: z.string(),
});
export type SubmitCodeRequest = z.infer<typeof submitCodeRequestSchema>;

export const submitCodeResponseSchema = z.object({
  submissionId: z.string(),
});
export type SubmitCodeResponse = z.infer<typeof submitCodeResponseSchema>;

export const saveDraftRequestSchema = z.object({
  language: codingLanguageSchema,
  code: z.string(),
});
export type SaveDraftRequest = z.infer<typeof saveDraftRequestSchema>;

export const draftResponseSchema = z.object({
  language: codingLanguageSchema,
  code: z.string(),
  updatedAt: z.string().nullable().optional(),
});
export type DraftResponse = z.infer<typeof draftResponseSchema>;

export const topicStatSchema = z.object({
  topic: z.string(),
  solved: z.number(),
  total: z.number(),
});
export type TopicStat = z.infer<typeof topicStatSchema>;

export const recentSubmissionStatSchema = z.object({
  id: z.string(),
  problemSlug: z.string(),
  problemTitle: z.string(),
  difficulty: codingDifficultySchema,
  status: submissionStatusSchema,
  language: codingLanguageSchema,
  createdAt: z.string(),
});
export type RecentSubmissionStat = z.infer<typeof recentSubmissionStatSchema>;

export const codingStatsSchema = z.object({
  totalSolved: z.number(),
  totalProblems: z.number(),
  easySolved: z.number(),
  easyTotal: z.number(),
  mediumSolved: z.number(),
  mediumTotal: z.number(),
  hardSolved: z.number(),
  hardTotal: z.number(),
  acceptanceRate: z.number(),
  topicStats: z.array(topicStatSchema),
  recentSubmissions: z.array(recentSubmissionStatSchema),
});
export type CodingStats = z.infer<typeof codingStatsSchema>;
