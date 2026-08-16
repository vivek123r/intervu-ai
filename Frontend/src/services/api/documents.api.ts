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

    getResume: builder.query<Resume | null, void>({
      query: () => "/resumes",
      transformResponse: (response) => resumeSchema.nullable().parse(response),
      providesTags: ["Document"],
    }),

    listResumes: builder.query<Resume[], void>({
      query: () => "/resumes/all",
      transformResponse: (response) => (response as Resume[]),
      providesTags: ["Document"],
    }),

    deleteResume: builder.mutation<void, string>({
      query: (id) => ({ url: `/resumes/${id}`, method: "DELETE" }),
      invalidatesTags: ["Document"],
    }),

    updateResume: builder.mutation<Resume, { id: string; updates: Partial<Resume> }>({
      query: ({ id, updates }) => ({
        url: `/resumes/${id}`,
        method: "PATCH",
        body: updates,
      }),
      transformResponse: (response) => resumeSchema.parse(response),
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

    // Added so the prepare page's role-match panel survives a reload without
    // remembering the analysis id itself — see docs/API-CONTRACT.md's
    // `GET /interviews/{id}/job-description` section.
    getJobDescriptionForInterview: builder.query<JobDescriptionAnalysis | null, string>({
      query: (interviewId) => `/interviews/${interviewId}/job-description`,
      transformResponse: (response) => jobDescriptionAnalysisSchema.nullable().parse(response),
      providesTags: ["Document"],
    }),
  }),
});

export const {
  useUploadResumeMutation,
  useGetResumeQuery,
  useListResumesQuery,
  useUpdateResumeMutation,
  useDeleteResumeMutation,
  useAnalyzeJobDescriptionMutation,
  useGetJobDescriptionAnalysisQuery,
  useGetJobDescriptionForInterviewQuery,
} = documentsApi;
