import { http, HttpResponse } from "msw";

import { demoJobDescriptionAnalysis } from "@/mocks/fixtures";
import { db, nextId } from "@/mocks/db";
import type { Resume } from "@/types/domain";

/** See docs/API-CONTRACT.md's Documents section. */
export const documentHandlers = [
  http.post("*/resumes", async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get("file");
    const fileName = file instanceof File ? file.name : "resume.pdf";
    const resume: Resume = {
      id: nextId("resume"),
      fileName,
      parsedSkills: ["Node.js", "PostgreSQL", "Redis", "Docker", "AWS"],
      uploadedAt: new Date().toISOString(),
    };
    db.resume = resume;
    return HttpResponse.json(resume, { status: 201 });
  }),

  http.get("*/resumes", () => HttpResponse.json(db.resume)),

  http.delete("*/resumes/:id", () => {
    db.resume = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/job-descriptions", async ({ request }) => {
    const { interviewId, text } = (await request.json()) as { interviewId: string; text: string };
    const analysis = {
      ...demoJobDescriptionAnalysis,
      id: nextId("jd"),
      createdAt: new Date().toISOString(),
      summary: text.trim().length
        ? demoJobDescriptionAnalysis.summary
        : "Paste a job description to see your role match.",
      skillMatrix: text.trim().length ? demoJobDescriptionAnalysis.skillMatrix : [],
      overallMatch: text.trim().length ? demoJobDescriptionAnalysis.overallMatch : 0,
    };
    db.jobDescriptionAnalyses.set(analysis.id, analysis);
    db.jobDescriptionAnalysesByInterview.set(interviewId, analysis);
    return HttpResponse.json(analysis, { status: 201 });
  }),

  http.get("*/job-descriptions/:id", ({ params }) => {
    const analysis = db.jobDescriptionAnalyses.get(String(params.id));
    if (!analysis) {
      return HttpResponse.json(
        { error: { code: "ANALYSIS_NOT_FOUND", message: "That analysis could not be found.", details: {} } },
        { status: 404 },
      );
    }
    return HttpResponse.json(analysis);
  }),

  http.get("*/interviews/:interviewId/job-description", ({ params }) => {
    const analysis = db.jobDescriptionAnalysesByInterview.get(String(params.interviewId));
    return HttpResponse.json(analysis ?? null);
  }),
];
