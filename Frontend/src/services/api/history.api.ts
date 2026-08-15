import { z } from "zod";

import { baseApi } from "@/services/api/base-api";
import { historySessionSchema } from "@/types/contracts/history";
import type { HistorySession } from "@/types/domain";

/** See docs/API-CONTRACT.md's History section. */
export const historyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHistorySessions: builder.query<HistorySession[], void>({
      query: () => "/history/sessions",
      transformResponse: (response) => z.array(historySessionSchema).parse(response),
      providesTags: ["History"],
    }),

    deleteHistorySession: builder.mutation<void, string>({
      query: (id) => ({ url: `/history/sessions/${id}`, method: "DELETE" }),
      invalidatesTags: ["History"],
    }),
  }),
});

export const { useGetHistorySessionsQuery, useDeleteHistorySessionMutation } = historyApi;
