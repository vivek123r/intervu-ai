import { baseApi } from "@/services/api/base-api";
import {
  interviewReportSchema,
  practiceSessionSchema,
  reportChatResponseSchema,
  reportConversationSchema,
  sessionCompletionSchema,
} from "@/types/contracts/practice";
import type { AnswerCompletedPayload } from "@/types/realtime";
import type {
  InterviewReport,
  PracticeConfig,
  PracticeSession,
  ReportChatResponse,
  ReportConversation,
  SessionCompletion,
} from "@/types/domain";

interface JobHandle {
  jobId: string;
  type: "report_generation";
  sessionId: string;
}

interface SocketTicket {
  ticket: string;
  expiresAt: string;
}

/** See docs/API-CONTRACT.md's Practice sessions section. */
export const practiceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createSession: builder.mutation<PracticeSession, PracticeConfig>({
      query: (config) => ({ url: "/sessions", method: "POST", body: config }),
      transformResponse: (response) => practiceSessionSchema.parse(response),
      invalidatesTags: ["Session"],
    }),

    getSession: builder.query<PracticeSession, string>({
      query: (id) => `/sessions/${id}`,
      transformResponse: (response) => practiceSessionSchema.parse(response),
      providesTags: ["Session"],
    }),

    startSession: builder.mutation<PracticeSession, string>({
      query: (id) => ({ url: `/sessions/${id}/start`, method: "POST" }),
      transformResponse: (response) => practiceSessionSchema.parse(response),
      invalidatesTags: ["Session"],
    }),

    submitSessionAnswer: builder.mutation<
      PracticeSession,
      { sessionId: string; answer: AnswerCompletedPayload }
    >({
      query: ({ sessionId, answer }) => ({
        url: `/sessions/${sessionId}/answers`,
        method: "POST",
        body: answer,
      }),
      transformResponse: (response) => practiceSessionSchema.parse(response),
      invalidatesTags: ["Session"],
    }),

    completeSession: builder.mutation<JobHandle, string>({
      query: (id) => ({ url: `/sessions/${id}/complete`, method: "POST" }),
      invalidatesTags: ["Session"],
    }),

    getSessionReport: builder.query<InterviewReport, string>({
      query: (id) => `/sessions/${id}/report`,
      transformResponse: (response) => interviewReportSchema.parse(response),
      providesTags: ["Report"],
    }),

    // Keyed by report id — see docs/API-CONTRACT.md's `GET /reports/{id}` section.
    // analysis.completed and analyticsOverview.recentSessions[].reportId both link
    // here, not to a session id.
    getReport: builder.query<InterviewReport, string>({
      query: (id) => `/reports/${id}`,
      transformResponse: (response) => interviewReportSchema.parse(response),
      providesTags: ["Report"],
    }),

    // The completion screen's single call. Keyed by report id for the same reason
    // getReport is — that is the id every link into /practice/results carries.
    getReportCompletion: builder.query<SessionCompletion, string>({
      query: (id) => `/reports/${id}/completion`,
      transformResponse: (response) => sessionCompletionSchema.parse(response),
      providesTags: ["Report"],
    }),

    getSessionCompletion: builder.query<SessionCompletion, string>({
      query: (id) => `/sessions/${id}/completion`,
      transformResponse: (response) => sessionCompletionSchema.parse(response),
      providesTags: ["Report"],
    }),

    getSocketTicket: builder.mutation<SocketTicket, string>({
      query: (id) => ({ url: `/sessions/${id}/socket-ticket`, method: "POST" }),
    }),

    // Post-interview voice/text Q&A about a completed report — keyed by report id,
    // matching every other link into /practice/results.
    getReportChat: builder.query<ReportConversation, string>({
      query: (reportId) => `/reports/${reportId}/chat`,
      transformResponse: (response) => reportConversationSchema.parse(response),
      providesTags: ["Conversation"],
    }),

    postReportChat: builder.mutation<
      ReportChatResponse,
      { reportId: string; message: string; questionId?: string }
    >({
      query: ({ reportId, message, questionId }) => ({
        url: `/reports/${reportId}/chat`,
        method: "POST",
        body: { message, questionId },
      }),
      transformResponse: (response) => reportChatResponseSchema.parse(response),
      invalidatesTags: ["Conversation"],
      // Patches the thread query's cache directly with the response's full turn
      // list, so the panel reflects the new exchange the instant this resolves
      // rather than waiting on the invalidation-triggered refetch above.
      async onQueryStarted({ reportId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            practiceApi.util.updateQueryData("getReportChat", reportId, (draft) => {
              draft.turns = data.turns;
            }),
          );
        } catch {
          // Leave the cache as-is — the mutation's own error state handles this.
        }
      },
    }),
  }),
});

export const {
  useCreateSessionMutation,
  useGetSessionQuery,
  useStartSessionMutation,
  useSubmitSessionAnswerMutation,
  useCompleteSessionMutation,
  useGetSessionReportQuery,
  useGetReportQuery,
  useGetReportCompletionQuery,
  useGetSessionCompletionQuery,
  useGetSocketTicketMutation,
  useGetReportChatQuery,
  usePostReportChatMutation,
} = practiceApi;
