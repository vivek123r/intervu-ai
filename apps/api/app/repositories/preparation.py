from __future__ import annotations

from typing import cast
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.preparation import PreparationPlan, PreparationTask


class PreparationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_for_interview(self, interview_id: UUID, user_id: UUID) -> PreparationPlan | None:
        return cast(
            PreparationPlan | None,
            await self.session.scalar(
                select(PreparationPlan).where(
                    PreparationPlan.interview_id == interview_id,
                    PreparationPlan.user_id == user_id,
                )
            ),
        )

    async def get_owned(self, plan_id: UUID, user_id: UUID) -> PreparationPlan | None:
        return cast(
            PreparationPlan | None,
            await self.session.scalar(
                select(PreparationPlan).where(
                    PreparationPlan.id == plan_id, PreparationPlan.user_id == user_id
                )
            ),
        )

    async def list_tasks(self, plan_id: UUID) -> list[PreparationTask]:
        return list(
            await self.session.scalars(
                select(PreparationTask)
                .where(PreparationTask.plan_id == plan_id)
                .order_by(PreparationTask.date, PreparationTask.position)
            )
        )

    async def replace_tasks(
        self, plan: PreparationPlan, tasks: list[PreparationTask]
    ) -> PreparationPlan:
        await self.session.execute(
            delete(PreparationTask).where(PreparationTask.plan_id == plan.id)
        )
        self.session.add_all(tasks)
        await self.session.flush()
        return plan

    async def create(self, plan: PreparationPlan, tasks: list[PreparationTask]) -> PreparationPlan:
        self.session.add(plan)
        await self.session.flush()
        for task in tasks:
            task.plan_id = plan.id
        self.session.add_all(tasks)
        await self.session.flush()
        return plan

    async def get_task_owned(self, task_id: UUID, user_id: UUID) -> PreparationTask | None:
        return cast(
            PreparationTask | None,
            await self.session.scalar(
                select(PreparationTask)
                .join(PreparationPlan, PreparationPlan.id == PreparationTask.plan_id)
                .where(PreparationTask.id == task_id, PreparationPlan.user_id == user_id)
            ),
        )
