from __future__ import annotations

from typing import cast
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.documents import JobDescription, Resume


class DocumentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_resumes(self, user_id: UUID) -> list[Resume]:
        return list(
            await self.session.scalars(
                select(Resume)
                .where(Resume.user_id == user_id)
                .order_by(Resume.is_primary.desc(), Resume.created_at.desc())
            )
        )

    async def get_resume(self, resume_id: UUID, user_id: UUID) -> Resume | None:
        return cast(
            Resume | None,
            await self.session.scalar(
                select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
            ),
        )

    async def get_resume_by_hash(self, user_id: UUID, content_hash: str) -> Resume | None:
        return cast(
            Resume | None,
            await self.session.scalar(
                select(Resume).where(Resume.user_id == user_id, Resume.content_hash == content_hash)
            ),
        )

    async def create_resume(self, resume: Resume) -> Resume:
        if resume.is_primary:
            await self.session.execute(
                update(Resume).where(Resume.user_id == resume.user_id).values(is_primary=False)
            )
        self.session.add(resume)
        await self.session.flush()
        return resume

    async def get_job_description(
        self, job_description_id: UUID, user_id: UUID
    ) -> JobDescription | None:
        return cast(
            JobDescription | None,
            await self.session.scalar(
                select(JobDescription).where(
                    JobDescription.id == job_description_id,
                    JobDescription.user_id == user_id,
                )
            ),
        )

    async def get_for_interview(self, interview_id: UUID, user_id: UUID) -> JobDescription | None:
        return cast(
            JobDescription | None,
            await self.session.scalar(
                select(JobDescription).where(
                    JobDescription.interview_id == interview_id,
                    JobDescription.user_id == user_id,
                )
            ),
        )

    async def create_job_description(self, job_description: JobDescription) -> JobDescription:
        self.session.add(job_description)
        await self.session.flush()
        return job_description
