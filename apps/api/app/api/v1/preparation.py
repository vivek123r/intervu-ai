from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from app.ai.orchestrator import AIOrchestrator
from app.dependencies import CurrentUser, DbSession, get_ai_orchestrator
from app.schemas.preparation import (
    PreparationPlanRead,
    PreparationTaskUpdate,
)
from app.services.preparation import PreparationService

router = APIRouter(tags=["Preparation"])


def service(
    session: DbSession, ai: AIOrchestrator = Depends(get_ai_orchestrator)
) -> PreparationService:
    return PreparationService(session=session, ai=ai)


@router.post("/interviews/{interview_id}/prepare", response_model=PreparationPlanRead)
async def generate_preparation(
    interview_id: UUID,
    user: CurrentUser,
    preparation_service: PreparationService = Depends(service),
) -> PreparationPlanRead:
    return await preparation_service.generate(user, interview_id)


@router.get("/interviews/{interview_id}/preparation", response_model=PreparationPlanRead)
async def get_preparation(
    interview_id: UUID,
    user: CurrentUser,
    preparation_service: PreparationService = Depends(service),
) -> PreparationPlanRead:
    return await preparation_service.get(user, interview_id)


@router.patch("/preparation/tasks/{task_id}", response_model=PreparationPlanRead)
async def update_preparation_task(
    task_id: UUID,
    payload: PreparationTaskUpdate,
    user: CurrentUser,
    preparation_service: PreparationService = Depends(service),
) -> PreparationPlanRead:
    return await preparation_service.update_task(user, task_id, payload.status.value)
