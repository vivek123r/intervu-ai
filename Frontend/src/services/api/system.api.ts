import { z } from "zod";

import { baseApi } from "@/services/api/base-api";
import { notificationItemSchema, processingJobSchema, userSchema } from "@/types/contracts/system";
import type { NotificationItem, ProcessingJob, User } from "@/types/domain";

/**
 * See docs/API-CONTRACT.md's Auth & profile and Notifications & background jobs sections.
 * `getJob` is a polling endpoint — pass `{ pollingInterval: 2000 }` at the call site while a
 * job is in flight, per the contract's "poll on an interval (recommend 1.5–2s)" guidance.
 */
export const systemApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<User, void>({
      query: () => "/me",
      transformResponse: (response) => userSchema.parse(response),
      providesTags: ["User"],
    }),

    updateMe: builder.mutation<User, Partial<Pick<User, "displayName" | "timezone" | "targetRole" | "experienceLevel" | "preferredLanguage" | "skills" | "onboardingCompleted">>>({
      query: (body) => ({ url: "/me", method: "PATCH", body }),
      transformResponse: (response) => userSchema.parse(response),
      invalidatesTags: ["User"],
    }),

    getNotifications: builder.query<NotificationItem[], void>({
      query: () => "/notifications",
      transformResponse: (response) => z.array(notificationItemSchema).parse(response),
      providesTags: ["Notification"],
    }),

    markNotificationRead: builder.mutation<NotificationItem, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "POST" }),
      transformResponse: (response) => notificationItemSchema.parse(response),
      invalidatesTags: ["Notification"],
    }),

    getJob: builder.query<ProcessingJob, string>({
      query: (id) => `/jobs/${id}`,
      transformResponse: (response) => processingJobSchema.parse(response),
      providesTags: ["Job"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useUpdateMeMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useGetJobQuery,
} = systemApi;
