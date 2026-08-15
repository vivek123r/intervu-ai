import { baseApi } from "@/services/api/base-api";
import { preparationPlanSchema, preparationTaskSchema } from "@/types/contracts/preparation";
import type { PreparationPlan, PreparationTask } from "@/types/domain";

interface JobHandle {
  jobId: string;
  type: "preparation_generation";
}

/** See docs/API-CONTRACT.md's Preparation section. */
export const preparationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generatePreparationPlan: builder.mutation<JobHandle, string>({
      query: (interviewId) => ({ url: `/interviews/${interviewId}/prepare`, method: "POST" }),
      invalidatesTags: ["Preparation"],
    }),

    getPreparation: builder.query<PreparationPlan, string>({
      query: (interviewId) => `/interviews/${interviewId}/preparation`,
      transformResponse: (response) => preparationPlanSchema.parse(response),
      providesTags: ["Preparation"],
    }),

    updatePreparationTask: builder.mutation<
      PreparationTask,
      { id: string; status: PreparationTask["status"] }
    >({
      query: ({ id, status }) => ({
        url: `/preparation/tasks/${id}`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response) => preparationTaskSchema.parse(response),
      invalidatesTags: ["Preparation"],
    }),
  }),
});

export const {
  useGeneratePreparationPlanMutation,
  useGetPreparationQuery,
  useUpdatePreparationTaskMutation,
} = preparationApi;
