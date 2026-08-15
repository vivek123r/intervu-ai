from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DbSession
from app.exceptions import PermissionDenied
from app.repositories.notifications import JobRepository, NotificationRepository
from app.schemas.system import NotificationRead, ProcessingJobRead

router = APIRouter(tags=["System"])


@router.get("/notifications", response_model=list[NotificationRead])
async def list_notifications(
    user: CurrentUser,
    session: DbSession,
    limit: int = Query(default=30, ge=1, le=100),
) -> list[NotificationRead]:
    records = await NotificationRepository(session).list_for_user(user.id, limit=limit)
    return [NotificationRead.model_validate(item) for item in records]


@router.post("/notifications/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: UUID, user: CurrentUser, session: DbSession
) -> NotificationRead:
    repository = NotificationRepository(session)
    notification = await repository.get_owned(notification_id, user.id)
    if notification is None:
        raise PermissionDenied("That notification could not be found.")
    await repository.mark_read(notification, datetime.now(UTC))
    await session.commit()
    return NotificationRead.model_validate(notification)


@router.get("/jobs/{job_id}", response_model=ProcessingJobRead)
async def get_job(job_id: UUID, user: CurrentUser, session: DbSession) -> ProcessingJobRead:
    job = await JobRepository(session).get_owned(job_id, user.id)
    if job is None:
        raise PermissionDenied("That processing job could not be found.")
    return ProcessingJobRead.model_validate(job)
