from fastapi import APIRouter, Response, UploadFile

from app.dependencies import CurrentUser, DocumentServiceDep, InterviewServiceDep
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.schemas.documents import (
    AnalyzeJobDescriptionRequest,
    JobDescriptionAnalysis,
    Resume,
    UpdateResumeRequest,
)

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


@router.get("/resumes/all", response_model=list[Resume])
async def list_resumes(current_user: CurrentUser, documents: DocumentServiceDep) -> list[Resume]:
    return await documents.list_resumes(current_user.id)


@router.get("/resumes/{resume_id}", response_model=Resume)
async def get_resume_by_id(
    resume_id: str, current_user: CurrentUser, documents: DocumentServiceDep
) -> Resume:
    resume = await documents.get_resume(current_user.id, resume_id)
    if resume is None:
        raise NotFoundError(ErrorCode.RESUME_NOT_FOUND, "That resume could not be found.")
    return resume


@router.patch("/resumes/{resume_id}", response_model=Resume)
async def update_resume(
    resume_id: str,
    body: UpdateResumeRequest,
    current_user: CurrentUser,
    documents: DocumentServiceDep,
) -> Resume:
    return await documents.update_resume(current_user.id, resume_id, body)


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
