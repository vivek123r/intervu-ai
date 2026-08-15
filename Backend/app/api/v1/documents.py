from fastapi import APIRouter, Response, UploadFile

from app.dependencies import CurrentUser, DocumentServiceDep, InterviewServiceDep
from app.schemas.documents import AnalyzeJobDescriptionRequest, JobDescriptionAnalysis, Resume

router = APIRouter(tags=["documents"])


@router.post("/resumes", response_model=Resume, status_code=201)
async def upload_resume(
    current_user: CurrentUser,
    documents: DocumentServiceDep,
    file: UploadFile,
) -> Resume:
    content = await file.read()
    return await documents.upload_resume(current_user.id, file.filename or "resume", content)


@router.get("/resumes", response_model=Resume | None)
async def get_current_resume(
    current_user: CurrentUser, documents: DocumentServiceDep
) -> Resume | None:
    return await documents.get_current_resume(current_user.id)


@router.delete("/resumes/{resume_id}", status_code=204, response_class=Response)
async def delete_resume(
    resume_id: str, current_user: CurrentUser, documents: DocumentServiceDep
) -> Response:
    await documents.delete_resume(current_user.id, resume_id)
    return Response(status_code=204)


@router.post("/job-descriptions", response_model=JobDescriptionAnalysis, status_code=201)
async def analyze_job_description(
    body: AnalyzeJobDescriptionRequest, current_user: CurrentUser, documents: DocumentServiceDep
) -> JobDescriptionAnalysis:
    return await documents.analyze_job_description(current_user.id, body)


@router.get("/job-descriptions/{jd_id}", response_model=JobDescriptionAnalysis)
async def get_job_description(
    jd_id: str, current_user: CurrentUser, documents: DocumentServiceDep
) -> JobDescriptionAnalysis:
    return await documents.get_job_description(current_user.id, jd_id)


@router.get(
    "/interviews/{interview_id}/job-description", response_model=JobDescriptionAnalysis | None
)
async def get_job_description_for_interview(
    interview_id: str,
    current_user: CurrentUser,
    interviews: InterviewServiceDep,
    documents: DocumentServiceDep,
) -> JobDescriptionAnalysis | None:
    await interviews.get(current_user.id, interview_id)
    return await documents.get_job_description_for_interview(interview_id)
