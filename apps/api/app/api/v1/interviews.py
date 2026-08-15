from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Query, status
from fastapi.responses import Response

from app.dependencies import CurrentUser, DbSession
from app.schemas.interviews import (
    DashboardOverview,
    InterviewConfirmation,
    InterviewCreate,
    InterviewRead,
    InterviewUpdate,
)
from app.services.interviews import InterviewService

router = APIRouter(prefix="/interviews", tags=["Interviews"])


@router.get("/dashboard/overview", response_model=DashboardOverview)
async def dashboard_overview(user: CurrentUser, session: DbSession) -> DashboardOverview:
    return await InterviewService(session).dashboard(user)


@router.get("", response_model=list[InterviewRead])
async def list_interviews(
    user: CurrentUser,
    session: DbSession,
    limit: int = Query(default=20, ge=1, le=100),
    after: datetime | None = Query(default=None),
) -> list[InterviewRead]:
    return await InterviewService(session).list_upcoming(user, limit=limit, after=after)


@router.post("", response_model=InterviewRead, status_code=status.HTTP_201_CREATED)
async def create_interview(
    payload: InterviewCreate, user: CurrentUser, session: DbSession
) -> InterviewRead:
    return await InterviewService(session).create(user, payload)


@router.get("/{interview_id}", response_model=InterviewRead)
async def get_interview(interview_id: UUID, user: CurrentUser, session: DbSession) -> InterviewRead:
    return await InterviewService(session).get(user, interview_id)


@router.patch("/{interview_id}", response_model=InterviewRead)
async def update_interview(
    interview_id: UUID,
    payload: InterviewUpdate,
    user: CurrentUser,
    session: DbSession,
) -> InterviewRead:
    return await InterviewService(session).update(user, interview_id, payload)


@router.post("/{interview_id}/confirm", response_model=InterviewRead)
async def confirm_interview(
    interview_id: UUID,
    payload: InterviewConfirmation,
    user: CurrentUser,
    session: DbSession,
) -> InterviewRead:
    return await InterviewService(session).confirm(user, interview_id, payload.confirmed)


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(interview_id: UUID, user: CurrentUser, session: DbSession) -> Response:
    await InterviewService(session).delete(user, interview_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
