from __future__ import annotations

import asyncio
import hashlib
import io
from pathlib import Path
from uuid import UUID, uuid4

from docx import Document
from fastapi import UploadFile
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.orchestrator import AIOrchestrator
from app.analytics.scoring import deterministic_role_match
from app.config import Settings
from app.exceptions import DomainError, InterviewNotFound, InvalidUpload, ResumeParseError
from app.integrations.storage.base import FileStorage
from app.models.documents import JobDescription, Resume
from app.models.user import User
from app.repositories.documents import DocumentRepository
from app.repositories.interviews import InterviewRepository
from app.schemas.documents import JobDescriptionCreate

ALLOWED_FILES = {
    ".pdf": {"application/pdf", "application/octet-stream"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",
    },
}


class DocumentService:
    def __init__(
        self,
        *,
        session: AsyncSession,
        settings: Settings,
        storage: FileStorage,
        ai: AIOrchestrator,
    ) -> None:
        self.session = session
        self.settings = settings
        self.storage = storage
        self.ai = ai
        self.documents = DocumentRepository(session)
        self.interviews = InterviewRepository(session)

    async def upload_resume(
        self,
        *,
        user: User,
        upload: UploadFile,
        interview_id: UUID | None,
        is_primary: bool,
    ) -> Resume:
        extension = Path(upload.filename or "").suffix.casefold()
        if extension not in ALLOWED_FILES or upload.content_type not in ALLOWED_FILES[extension]:
            raise InvalidUpload("Upload a PDF or DOCX resume.")
        content = await upload.read(self.settings.max_upload_mb * 1024 * 1024 + 1)
        if not content or len(content) > self.settings.max_upload_mb * 1024 * 1024:
            raise InvalidUpload(f"Resume files must be under {self.settings.max_upload_mb} MB.")
        content_hash = hashlib.sha256(content).hexdigest()
        duplicate = await self.documents.get_resume_by_hash(user.id, content_hash)
        if duplicate:
            if interview_id:
                await self._attach_resume(user, interview_id, duplicate.id)
                await self.session.commit()
            return duplicate
        storage_key = f"users/{user.id}/resumes/{uuid4()}{extension}"
        await self.storage.put(key=storage_key, content=content)
        resume = Resume(
            user_id=user.id,
            file_name=upload.filename or f"resume{extension}",
            file_type=upload.content_type or "application/octet-stream",
            storage_key=storage_key,
            content_hash=content_hash,
            is_primary=is_primary,
            parse_status="processing",
        )
        await self.documents.create_resume(resume)
        try:
            raw_text = await asyncio.to_thread(self._extract_text, content, extension)
            parsed = await self.ai.analyze_resume(raw_text)
        except DomainError:
            resume.parse_status = "failed"
            await self.session.commit()
            raise
        except Exception as exc:
            resume.parse_status = "failed"
            await self.session.commit()
            raise ResumeParseError() from exc
        resume.raw_text = raw_text
        resume.parsed_data = parsed.model_dump(mode="json")
        resume.parse_status = "completed"
        if interview_id:
            await self._attach_resume(user, interview_id, resume.id)
        await self.session.commit()
        await self.session.refresh(resume)
        return resume

    async def create_job_description(
        self, user: User, payload: JobDescriptionCreate
    ) -> JobDescription:
        if payload.interview_id:
            interview = await self.interviews.get_owned(payload.interview_id, user.id)
            if interview is None:
                raise InterviewNotFound()
        analysis = await self.ai.analyze_job_description(payload.raw_text)
        job_description = JobDescription(
            user_id=user.id,
            interview_id=payload.interview_id,
            raw_text=payload.raw_text,
            company_name=payload.company_name,
            role_title=payload.role_title,
            parsed_data=analysis.model_dump(mode="json"),
            parse_status="completed",
        )
        primary_resume = next(
            (resume for resume in await self.documents.list_resumes(user.id) if resume.is_primary),
            None,
        )
        if primary_resume and primary_resume.parsed_data:
            raw_skills = primary_resume.parsed_data.get("skills", [])
            resume_skills = (
                [str(skill) for skill in raw_skills] if isinstance(raw_skills, list) else []
            )
            job_description.role_match_data = deterministic_role_match(
                resume_skills=resume_skills,
                required_skills=analysis.required_skills,
                preferred_skills=analysis.preferred_skills,
                experience_fit=82,
                project_relevance=86,
            )
        await self.documents.create_job_description(job_description)
        if payload.interview_id:
            interview = await self.interviews.get_owned(payload.interview_id, user.id)
            if interview:
                interview.job_description_id = job_description.id
        await self.session.commit()
        await self.session.refresh(job_description)
        return job_description

    async def delete_resume(self, user: User, resume_id: UUID) -> None:
        resume = await self.documents.get_resume(resume_id, user.id)
        if resume is None:
            raise InvalidUpload("That resume could not be found.")
        await self.storage.delete(resume.storage_key)
        await self.session.delete(resume)
        await self.session.commit()

    async def _attach_resume(self, user: User, interview_id: UUID, resume_id: UUID) -> None:
        interview = await self.interviews.get_owned(interview_id, user.id)
        if interview is None:
            raise InterviewNotFound()
        interview.resume_id = resume_id

    @staticmethod
    def _extract_text(content: bytes, extension: str) -> str:
        if extension == ".pdf":
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif extension == ".docx":
            document = Document(io.BytesIO(content))
            text = "\n".join(paragraph.text for paragraph in document.paragraphs)
        else:
            raise InvalidUpload()
        normalized = "\n".join(line.strip() for line in text.splitlines() if line.strip())
        if len(normalized) < 40:
            raise ResumeParseError("The resume did not contain enough readable text.")
        return normalized[:120_000]
