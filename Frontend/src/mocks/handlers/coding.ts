import { http, HttpResponse } from "msw";
import {
  MOCK_ALL_CODING_PROBLEMS,
  MOCK_TOPIC_COUNTS,
} from "@/mocks/coding-problems";
import type {
  CodingLanguage,
  CodingStats,
  CodingSubmission,
  DraftResponse,
  ProblemListResponse,
  RunCodeResponse,
  SaveDraftRequest,
  SubmitCodeRequest,
  SubmitCodeResponse,
} from "@/types/contracts/coding";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const mockDrafts = new Map<string, string>();
const mockSubmissions = new Map<string, CodingSubmission>();

export const codingHandlers = [
  http.get(`${API_BASE}/coding/problems`, ({ request }) => {
    const url = new URL(request.url);
    const difficulty = url.searchParams.get("difficulty");
    const search = url.searchParams.get("search")?.toLowerCase();
    const topic = url.searchParams.getAll("topic");
    const status = url.searchParams.get("status");

    let items = MOCK_ALL_CODING_PROBLEMS.map((p) => ({
      slug: p.slug,
      number: p.number,
      title: p.title,
      difficulty: p.difficulty,
      topics: p.topics,
      acceptanceRate: 64.5,
      status: p.userStatus,
    }));

    if (difficulty && difficulty !== "all") {
      items = items.filter((p) => p.difficulty === difficulty);
    }
    if (status && status !== "all") {
      items = items.filter((p) => p.status === status);
    }
    if (topic && topic.length > 0) {
      items = items.filter((p) => topic.every((t) => p.topics.includes(t)));
    }
    if (search) {
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.slug.toLowerCase().includes(search) ||
          String(p.number) === search ||
          p.topics.some((t) => t.toLowerCase().includes(search))
      );
    }

    const res: ProblemListResponse = {
      items,
      total: items.length,
    };
    return HttpResponse.json(res);
  }),

  http.get(`${API_BASE}/coding/topics`, () => {
    return HttpResponse.json(MOCK_TOPIC_COUNTS);
  }),

  http.get(`${API_BASE}/coding/problems/:slug`, ({ params }) => {
    const slug = params.slug as string;
    const problem = MOCK_ALL_CODING_PROBLEMS.find((p) => p.slug === slug);
    if (!problem) {
      return new HttpResponse(
        JSON.stringify({
          error: {
            code: "CODING_PROBLEM_NOT_FOUND",
            message: "Problem not found",
            details: {},
          },
        }),
        { status: 404 }
      );
    }
    return HttpResponse.json(problem);
  }),

  http.post(`${API_BASE}/coding/problems/:slug/run`, async ({ params }) => {
    const slug = params.slug as string;
    const problem = MOCK_ALL_CODING_PROBLEMS.find((p) => p.slug === slug);

    const res: RunCodeResponse = {
      results: (problem?.testCases || []).map((tc, idx) => ({
        index: idx,
        inputArgs: tc.inputArgs,
        expected: tc.expected,
        actual: tc.expected,
        passed: true,
        debugOutput: "Solution output validated.",
        runtimeMs: 4,
      })),
    };
    return HttpResponse.json(res);
  }),

  http.post(`${API_BASE}/coding/problems/:slug/submissions`, async ({ params, request }) => {
    const slug = params.slug as string;
    const body = (await request.json()) as SubmitCodeRequest;
    const submissionId = `mock-sub-${Date.now()}`;

    const submission: CodingSubmission = {
      id: submissionId,
      userId: "demo-user",
      problemSlug: slug,
      language: body.language,
      code: body.code,
      status: "accepted",
      passedCount: 8,
      totalCount: 8,
      runtimeMs: 12,
      createdAt: new Date().toISOString(),
    };

    mockSubmissions.set(submissionId, submission);

    // Update problem status to solved
    const p = MOCK_ALL_CODING_PROBLEMS.find((pr) => pr.slug === slug);
    if (p) p.userStatus = "solved";

    const res: SubmitCodeResponse = { submissionId };
    return HttpResponse.json(res);
  }),

  http.get(`${API_BASE}/coding/problems/:slug/submissions`, ({ params }) => {
    const slug = params.slug as string;
    const subs = Array.from(mockSubmissions.values())
      .filter((s) => s.problemSlug === slug)
      .map((s) => ({
        id: s.id,
        problemSlug: s.problemSlug,
        language: s.language,
        status: s.status,
        passedCount: s.passedCount,
        totalCount: s.totalCount,
        runtimeMs: s.runtimeMs,
        createdAt: s.createdAt,
      }));
    return HttpResponse.json(subs);
  }),

  http.get(`${API_BASE}/coding/submissions/:id`, ({ params }) => {
    const id = params.id as string;
    const submission = mockSubmissions.get(id) || {
      id,
      userId: "demo-user",
      problemSlug: "two-sum",
      language: "python" as const,
      code: "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]",
      status: "accepted" as const,
      passedCount: 8,
      totalCount: 8,
      runtimeMs: 8,
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json(submission);
  }),

  http.put(`${API_BASE}/coding/problems/:slug/draft`, async ({ params, request }) => {
    const slug = params.slug as string;
    const body = (await request.json()) as SaveDraftRequest;
    const key = `${slug}-${body.language}`;
    mockDrafts.set(key, body.code);

    const res: DraftResponse = {
      language: body.language,
      code: body.code,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(res);
  }),

  http.get(`${API_BASE}/coding/problems/:slug/draft`, ({ params, request }) => {
    const slug = params.slug as string;
    const url = new URL(request.url);
    const language = (url.searchParams.get("language") || "python") as CodingLanguage;
    const key = `${slug}-${language}`;
    const code =
      mockDrafts.get(key) ||
      MOCK_ALL_CODING_PROBLEMS.find((p) => p.slug === slug)?.starterCode[language] ||
      "";

    const res: DraftResponse = {
      language,
      code,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(res);
  }),

  http.get(`${API_BASE}/coding/stats`, () => {
    const stats: CodingStats = {
      totalSolved: 12,
      totalProblems: 30,
      easySolved: 6,
      easyTotal: 10,
      mediumSolved: 4,
      mediumTotal: 10,
      hardSolved: 2,
      hardTotal: 10,
      acceptanceRate: 75.0,
      topicStats: [
        { topic: "Array", solved: 5, total: 8 },
        { topic: "Hash Table", solved: 4, total: 6 },
        { topic: "Dynamic Programming", solved: 3, total: 6 },
        { topic: "Two Pointers", solved: 3, total: 4 },
        { topic: "Tree", solved: 2, total: 4 },
        { topic: "String", solved: 4, total: 6 },
      ],
      recentSubmissions: [
        {
          id: "sub-recent-1",
          problemSlug: "two-sum",
          problemTitle: "Two Sum",
          difficulty: "easy",
          status: "accepted",
          language: "python",
          createdAt: new Date().toISOString(),
        },
        {
          id: "sub-recent-2",
          problemSlug: "3sum",
          problemTitle: "3Sum",
          difficulty: "medium",
          status: "accepted",
          language: "javascript",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    };
    return HttpResponse.json(stats);
  }),
];
