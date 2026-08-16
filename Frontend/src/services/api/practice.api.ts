import { baseApi } from "@/services/api/base-api";
import {
  interviewReportSchema,
  practiceSessionSchema,
  sessionCompletionSchema,
} from "@/types/contracts/practice";
import type { AnswerCompletedPayload } from "@/types/realtime";
import type {
  InterviewReport,
  PracticeConfig,
  PracticeSession,
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
} = practiceApi;
