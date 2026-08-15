import { baseApi } from "@/services/api/base-api";
import { analyticsOverviewSchema } from "@/types/contracts/analytics";
import type { AnalyticsOverview } from "@/types/domain";

/** See docs/API-CONTRACT.md's Analytics section. */
export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query<AnalyticsOverview, void>({
      query: () => "/analytics/overview",
      transformResponse: (response) => analyticsOverviewSchema.parse(response),
      providesTags: ["Analytics"],
    }),
  }),
});

export const { useGetAnalyticsOverviewQuery } = analyticsApi;
