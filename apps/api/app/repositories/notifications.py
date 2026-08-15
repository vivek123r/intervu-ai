from __future__ import annotations

from datetime import datetime
from typing import cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import Notification, ProcessingJob


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_user(self, user_id: UUID, *, limit: int = 30) -> list[Notification]:
        return list(
            await self.session.scalars(
                select(Notification)
                .where(Notification.user_id == user_id)
                .order_by(Notification.created_at.desc())
                .limit(limit)
            )
        )

    async def get_owned(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        return cast(
            Notification | None,
            await self.session.scalar(
                select(Notification).where(
                    Notification.id == notification_id, Notification.user_id == user_id
                )
            ),
        )

    async def mark_read(self, notification: Notification, read_at: datetime) -> Notification:
        notification.read_at = read_at
        await self.session.flush()
        return notification


class JobRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_owned(self, job_id: UUID, user_id: UUID) -> ProcessingJob | None:
        return cast(
            ProcessingJob | None,
            await self.session.scalar(
                select(ProcessingJob).where(
                    ProcessingJob.id == job_id, ProcessingJob.user_id == user_id
                )
            ),
        )

    async def get_by_idempotency_key(self, key: str) -> ProcessingJob | None:
        return cast(
            ProcessingJob | None,
            await self.session.scalar(
                select(ProcessingJob).where(ProcessingJob.idempotency_key == key)
            ),
        )

    async def create(self, job: ProcessingJob) -> ProcessingJob:
        self.session.add(job)
        await self.session.flush()
        return job
