import { baseApi } from "@/services/api/base-api";
import type {
  CodingLanguage,
  CodingStats,
  CodingSubmission,
  CodingSubmissionSummary,
  DraftResponse,
  ProblemDetail,
  ProblemListResponse,
  RunCodeRequest,
  RunCodeResponse,
  SaveDraftRequest,
  SubmitCodeRequest,
  SubmitCodeResponse,
  TopicCount,
} from "@/types/contracts/coding";

export interface GetProblemsParams {
  difficulty?: string;
  topic?: string[];
  status?: "solved" | "attempted" | "todo";
  search?: string;
  sortBy?: "number" | "difficulty" | "title";
  sortDir?: 1 | -1;
  limit?: number;
  offset?: number;
}

export const codingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCodingProblems: build.query<ProblemListResponse, GetProblemsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.difficulty) queryParams.set("difficulty", params.difficulty);
        if (params?.status) queryParams.set("status", params.status);
        if (params?.search) queryParams.set("search", params.search);
        if (params?.sortBy) queryParams.set("sort_by", params.sortBy);
        if (params?.sortDir) queryParams.set("sort_dir", String(params.sortDir));
        if (params?.limit) queryParams.set("limit", String(params.limit));
        if (params?.offset) queryParams.set("offset", String(params.offset));
        if (params?.topic && params.topic.length > 0) {
          params.topic.forEach((t) => queryParams.append("topic", t));
        }
        const qs = queryParams.toString();
        return `/coding/problems${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["CodingProblems"],
    }),

    getCodingTopics: build.query<TopicCount[], void>({
      query: () => "/coding/topics",
    }),

    getCodingProblem: build.query<ProblemDetail, string>({
      query: (slug) => `/coding/problems/${slug}`,
      providesTags: (_result, _err, slug) => [{ type: "CodingProblem", id: slug }],
    }),

    runCode: build.mutation<RunCodeResponse, { slug: string; body: RunCodeRequest }>({
      query: ({ slug, body }) => ({
        url: `/coding/problems/${slug}/run`,
        method: "POST",
        body,
      }),
    }),

    submitCode: build.mutation<SubmitCodeResponse, { slug: string; body: SubmitCodeRequest }>({
      query: ({ slug, body }) => ({
        url: `/coding/problems/${slug}/submissions`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, { slug }) => [
        { type: "CodingProblem", id: slug },
        "CodingProblems",
        "CodingSubmissions",
        "CodingStats",
      ],
    }),

    getProblemSubmissions: build.query<CodingSubmissionSummary[], string>({
      query: (slug) => `/coding/problems/${slug}/submissions`,
      providesTags: ["CodingSubmissions"],
    }),

    getSubmission: build.query<CodingSubmission, string>({
      query: (id) => `/coding/submissions/${id}`,
      providesTags: (_res, _err, id) => [{ type: "CodingSubmissions", id }],
    }),

    getCodingStats: build.query<CodingStats, void>({
      query: () => "/coding/stats",
      providesTags: ["CodingStats"],
    }),

    saveDraft: build.mutation<DraftResponse, { slug: string; body: SaveDraftRequest }>({
      query: ({ slug, body }) => ({
        url: `/coding/problems/${slug}/draft`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, { slug, body }) => [
        { type: "CodingDraft", id: `${slug}-${body.language}` },
      ],
    }),

    getDraft: build.query<DraftResponse, { slug: string; language: CodingLanguage }>({
      query: ({ slug, language }) => `/coding/problems/${slug}/draft?language=${language}`,
      providesTags: (_res, _err, { slug, language }) => [
        { type: "CodingDraft", id: `${slug}-${language}` },
      ],
    }),
  }),
});

export const {
  useGetCodingProblemsQuery,
  useGetCodingTopicsQuery,
  useGetCodingProblemQuery,
  useRunCodeMutation,
  useSubmitCodeMutation,
  useGetProblemSubmissionsQuery,
  useGetSubmissionQuery,
  useGetCodingStatsQuery,
  useSaveDraftMutation,
  useGetDraftQuery,
} = codingApi;

export function useSubmissionPolling(submissionId: string | null) {
  const { data: submission, isLoading, isError } = useGetSubmissionQuery(
    submissionId ?? "",
    {
      skip: !submissionId,
      pollingInterval: 1000,
    }
  );

  const isTerminal = Boolean(submission && submission.status !== "judging");

  return {
    submission,
    isLoading: isLoading || (Boolean(submissionId) && !isTerminal),
    isError,
    isTerminal,
  };
}
