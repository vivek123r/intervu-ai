import { baseApi } from "@/services/api/base-api";
import { jobDescriptionAnalysisSchema, resumeSchema } from "@/types/contracts/documents";
import type { JobDescriptionAnalysis, Resume } from "@/types/domain";

/** See docs/API-CONTRACT.md's Documents section. */
export const documentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadResume: builder.mutation<Resume, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return { url: "/resumes", method: "POST", body: formData };
      },
      transformResponse: (response) => resumeSchema.parse(response),
      invalidatesTags: ["Document"],
    }),

    deleteResume: builder.mutation<void, string>({
      query: (id) => ({ url: `/resumes/${id}`, method: "DELETE" }),
      invalidatesTags: ["Document"],
    }),

    analyzeJobDescription: builder.mutation<
      JobDescriptionAnalysis,
      { interviewId: string; text: string }
    >({
      query: (body) => ({ url: "/job-descriptions", method: "POST", body }),
      transformResponse: (response) => jobDescriptionAnalysisSchema.parse(response),
      invalidatesTags: ["Document"],
    }),

    getJobDescriptionAnalysis: builder.query<JobDescriptionAnalysis, string>({
      query: (id) => `/job-descriptions/${id}`,
      transformResponse: (response) => jobDescriptionAnalysisSchema.parse(response),
      providesTags: ["Document"],
    }),
  }),
});

export const {
  useUploadResumeMutation,
  useDeleteResumeMutation,
  useAnalyzeJobDescriptionMutation,
  useGetJobDescriptionAnalysisQuery,
} = documentsApi;
