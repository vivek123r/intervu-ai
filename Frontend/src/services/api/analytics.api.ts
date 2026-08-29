import { baseApi } from "@/services/api/base-api";
import { analyticsOverviewSchema } from "@/types/contracts/analytics";
import type { AnalyticsOverview } from "@/types/domain";

export type AnalyticsRange = "7d" | "30d" | "3m" | "all";

/** See docs/API-CONTRACT.md's Analytics section. */
export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query<AnalyticsOverview, AnalyticsRange | void>({
      query: (range) => ({ url: "/analytics/overview", params: { range: range ?? "all" } }),
      transformResponse: (response) => analyticsOverviewSchema.parse(response),
      providesTags: ["Analytics"],
    }),
  }),
});

export const { useGetAnalyticsOverviewQuery } = analyticsApi;
