from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import Response

from app.ai.orchestrator import AIOrchestrator
from app.config import Settings, get_settings
from app.dependencies import CurrentUser, DbSession, get_ai_orchestrator
from app.integrations.storage.local import LocalFileStorage
from app.repositories.documents import DocumentRepository
from app.schemas.documents import JobDescriptionCreate, JobDescriptionRead, ResumeRead
from app.services.documents import DocumentService

router = APIRouter(tags=["Documents"])


def storage(settings: Settings = Depends(get_settings)) -> LocalFileStorage:
    return LocalFileStorage(settings.local_storage_path)


def service(
    session: DbSession,
    settings: Settings = Depends(get_settings),
    file_storage: LocalFileStorage = Depends(storage),
    ai: AIOrchestrator = Depends(get_ai_orchestrator),
) -> DocumentService:
    return DocumentService(session=session, settings=settings, storage=file_storage, ai=ai)


@router.get("/resumes", response_model=list[ResumeRead])
async def list_resumes(user: CurrentUser, session: DbSession) -> list[ResumeRead]:
    resumes = await DocumentRepository(session).list_resumes(user.id)
    return [ResumeRead.model_validate(resume) for resume in resumes]


@router.post("/resumes", response_model=ResumeRead, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    user: CurrentUser,
    document_service: DocumentService = Depends(service),
    file: UploadFile = File(...),
    interview_id: UUID | None = Form(default=None),
    is_primary: bool = Form(default=True),
) -> ResumeRead:
    resume = await document_service.upload_resume(
        user=user, upload=file, interview_id=interview_id, is_primary=is_primary
    )
    return ResumeRead.model_validate(resume)


@router.delete("/resumes/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: UUID,
    user: CurrentUser,
    document_service: DocumentService = Depends(service),
) -> Response:
    await document_service.delete_resume(user, resume_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/job-descriptions", response_model=JobDescriptionRead, status_code=status.HTTP_201_CREATED
)
async def create_job_description(
    payload: JobDescriptionCreate,
    user: CurrentUser,
    document_service: DocumentService = Depends(service),
) -> JobDescriptionRead:
    job_description = await document_service.create_job_description(user, payload)
    return JobDescriptionRead.model_validate(job_description)


@router.get("/job-descriptions/{job_description_id}", response_model=JobDescriptionRead)
async def get_job_description(
    job_description_id: UUID, user: CurrentUser, session: DbSession
) -> JobDescriptionRead:
    job_description = await DocumentRepository(session).get_job_description(
        job_description_id, user.id
    )
    if job_description is None:
        from app.exceptions import InterviewNotFound

        raise InterviewNotFound("That job description could not be found.")
    return JobDescriptionRead.model_validate(job_description)
