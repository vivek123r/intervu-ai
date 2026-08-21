import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs } from "@reduxjs/toolkit/query/react";

import { getIdToken } from "@/lib/firebase/client";
import { apiErrorEnvelopeSchema } from "@/types/contracts/common";
import type { ApiErrorEnvelope } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function resolveToken(): Promise<string | null> {
  // Prefer a real Firebase ID token whenever the user is signed in.
  // This ensures Google sign-in provisions a distinct backend user,
  // while "Try Out Interview" (no Firebase session) still falls back
  // to demo-token via the dev fallback below.
  try {
    const firebaseToken = await getIdToken();
    if (firebaseToken) return firebaseToken;
  } catch {
    // getIdToken can throw if Firebase isn't initialized; fall through
    // to demo-token handling rather than failing the request silently.
  }

  if (process.env.NEXT_PUBLIC_AUTH_MODE === "mock") return "demo-token";
  // Fall back to demo-token in development if not logged into Firebase
  if (process.env.NODE_ENV !== "production" || !process.env.NEXT_PUBLIC_AUTH_MODE) {
    return "demo-token";
  }
  return null;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: async (headers) => {
    const token = await resolveToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("X-Request-ID", crypto.randomUUID());
    return headers;
  },
});

const FALLBACK_ERROR: ApiErrorEnvelope["error"] = {
  code: "REQUEST_FAILED",
  message: "Intervu could not complete that request.",
  details: {},
};

/**
 * Normalizes every failure — network errors, non-JSON bodies, and real backend/MSW error
 * envelopes alike — to the same `ApiErrorEnvelope["error"]` shape, so every endpoint's
 * `error` is safe to read without a per-call try/catch. See docs/API-CONTRACT.md's error
 * envelope convention and docs/STATE-MANAGEMENT.md's RTK Query conventions.
 */
const baseQueryWithNormalizedErrors: BaseQueryFn<
  string | FetchArgs,
  unknown,
  ApiErrorEnvelope["error"]
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (!result.error) return { data: result.data, meta: result.meta };

  const parsed = apiErrorEnvelopeSchema.safeParse(result.error.data);
  return { error: parsed.success ? parsed.data.error : FALLBACK_ERROR, meta: result.meta };
};

/**
 * One API slice for the whole app — every domain file (interviews.api.ts, practice.api.ts, ...)
 * calls `injectEndpoints` on this instead of creating its own `createApi`, so there is a single
 * cache and a single tag registry. See docs/STATE-MANAGEMENT.md.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithNormalizedErrors,
  tagTypes: [
    "Interview",
    "Preparation",
    "Session",
    "Report",
    "Analytics",
    "History",
    "Calendar",
    "Document",
    "Notification",
    "User",
    "Job",
    "CodingProblems",
    "CodingProblem",
    "CodingSubmissions",
    "CodingStats",
    "CodingDraft",
  ],
  endpoints: () => ({}),
});
