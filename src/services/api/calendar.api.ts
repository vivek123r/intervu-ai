import { baseApi } from "@/services/api/base-api";
import { calendarConnectionSchema } from "@/types/contracts/calendar";
import type { CalendarConnection } from "@/types/domain";

interface JobHandle {
  jobId: string;
  type: "calendar_sync";
}

/** See docs/API-CONTRACT.md's Calendar section. */
export const calendarApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCalendarConnection: builder.query<CalendarConnection, void>({
      query: () => "/calendar/connection",
      transformResponse: (response) => calendarConnectionSchema.parse(response),
      providesTags: ["Calendar"],
    }),

    connectCalendar: builder.mutation<{ authorizationUrl: string }, void>({
      query: () => ({ url: "/calendar/connect", method: "POST" }),
    }),

    syncCalendar: builder.mutation<JobHandle, void>({
      query: () => ({ url: "/calendar/sync", method: "POST" }),
      invalidatesTags: ["Calendar", "Interview"],
    }),

    disconnectCalendar: builder.mutation<void, void>({
      query: () => ({ url: "/calendar/connection", method: "DELETE" }),
      invalidatesTags: ["Calendar"],
    }),
  }),
});

export const {
  useGetCalendarConnectionQuery,
  useConnectCalendarMutation,
  useSyncCalendarMutation,
  useDisconnectCalendarMutation,
} = calendarApi;
