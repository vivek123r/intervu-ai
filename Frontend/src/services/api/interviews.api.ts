import { z } from "zod";

import { baseApi } from "@/services/api/base-api";
import {
  createInterviewRequestSchema,
  dashboardOverviewSchema,
  interviewSchema,
  updateInterviewRequestSchema,
} from "@/types/contracts/interviews";
import type { DashboardOverview, Interview } from "@/types/domain";

type CreateInterviewRequest = z.infer<typeof createInterviewRequestSchema>;
type UpdateInterviewRequest = z.infer<typeof updateInterviewRequestSchema>;

/** See docs/API-CONTRACT.md's Interviews section for the full contract these implement. */
export const interviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardOverview: builder.query<DashboardOverview, void>({
      query: () => "/dashboard/overview",
      transformResponse: (response) => dashboardOverviewSchema.parse(response),
      providesTags: ["Interview", "Preparation"],
    }),

    getInterviews: builder.query<Interview[], void>({
      query: () => "/interviews",
      transformResponse: (response) => z.array(interviewSchema).parse(response),
      providesTags: ["Interview"],
    }),

    getInterview: builder.query<Interview, string>({
      query: (id) => `/interviews/${id}`,
      transformResponse: (response) => interviewSchema.parse(response),
      providesTags: ["Interview"],
    }),

    createInterview: builder.mutation<Interview, CreateInterviewRequest>({
      query: (body) => ({ url: "/interviews", method: "POST", body }),
      transformResponse: (response) => interviewSchema.parse(response),
      invalidatesTags: ["Interview"],
    }),

    updateInterview: builder.mutation<Interview, { id: string; body: UpdateInterviewRequest }>({
      query: ({ id, body }) => ({ url: `/interviews/${id}`, method: "PATCH", body }),
      transformResponse: (response) => interviewSchema.parse(response),
      invalidatesTags: ["Interview"],
    }),

    deleteInterview: builder.mutation<void, string>({
      query: (id) => ({ url: `/interviews/${id}`, method: "DELETE" }),
      invalidatesTags: ["Interview"],
    }),

    confirmInterview: builder.mutation<Interview, string>({
      query: (id) => ({ url: `/interviews/${id}/confirm`, method: "POST" }),
      transformResponse: (response) => interviewSchema.parse(response),
      invalidatesTags: ["Interview"],
    }),
  }),
});

export const {
  useGetDashboardOverviewQuery,
  useGetInterviewsQuery,
  useGetInterviewQuery,
  useCreateInterviewMutation,
  useUpdateInterviewMutation,
  useDeleteInterviewMutation,
  useConfirmInterviewMutation,
} = interviewsApi;
