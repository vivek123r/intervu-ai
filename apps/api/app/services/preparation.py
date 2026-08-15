from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.orchestrator import AIOrchestrator
from app.exceptions import InterviewNotFound
from app.models.enums import PreparationTaskStatus
from app.models.preparation import PreparationPlan, PreparationTask
from app.models.user import User
from app.repositories.documents import DocumentRepository
from app.repositories.interviews import InterviewRepository
from app.repositories.preparation import PreparationRepository
from app.schemas.preparation import PreparationPlanRead, PreparationTaskRead


class PreparationService:
    def __init__(self, *, session: AsyncSession, ai: AIOrchestrator) -> None:
        self.session = session
        self.ai = ai
        self.interviews = InterviewRepository(session)
        self.documents = DocumentRepository(session)
        self.preparation = PreparationRepository(session)

    async def generate(self, user: User, interview_id: UUID) -> PreparationPlanRead:
        interview = await self.interviews.get_owned(interview_id, user.id)
        if interview is None:
            raise InterviewNotFound()
        resume = (
            await self.documents.get_resume(interview.resume_id, user.id)
            if interview.resume_id
            else None
        )
        job_description = (
            await self.documents.get_job_description(interview.job_description_id, user.id)
            if interview.job_description_id
            else await self.documents.get_for_interview(interview.id, user.id)
        )
        now = datetime.now(UTC)
        days_remaining = max(0, (interview.scheduled_at.date() - now.date()).days)
        output = await self.ai.create_preparation_plan(
            {
                "interview": {
                    "company": interview.company_name,
                    "role": interview.role_title,
                    "type": interview.interview_type,
                    "round": interview.round_name,
                    "scheduled_at": interview.scheduled_at.isoformat(),
                    "days_remaining": days_remaining,
                },
                "resume": resume.parsed_data if resume else {},
                "job_description": job_description.parsed_data if job_description else {},
                "role_match": job_description.role_match_data if job_description else {},
                "historical_weak_topics": [],
            }
        )
        existing = await self.preparation.get_for_interview(interview.id, user.id)
        if existing:
            plan = existing
            plan.start_date = now.date()
            plan.interview_date = interview.scheduled_at.date()
            plan.generated_at = now
            plan.overall_progress = 0
        else:
            plan = PreparationPlan(
                user_id=user.id,
                interview_id=interview.id,
                start_date=now.date(),
                interview_date=interview.scheduled_at.date(),
                generated_at=now,
                overall_progress=0,
            )
        tasks = [
            PreparationTask(
                plan_id=plan.id,
                date=now.date() + timedelta(days=min(task.day_offset, days_remaining)),
                position=index,
                category=task.category,
                title=task.title,
                description=task.description,
                estimated_minutes=task.estimated_minutes,
                priority=task.priority,
            )
            for index, task in enumerate(output.tasks, start=1)
        ]
        if existing:
            await self.preparation.replace_tasks(plan, tasks)
        else:
            await self.preparation.create(plan, tasks)
        interview.preparation_progress = 0
        await self.session.commit()
        return await self._read(plan)

    async def get(self, user: User, interview_id: UUID) -> PreparationPlanRead:
        plan = await self.preparation.get_for_interview(interview_id, user.id)
        if plan is None:
            raise InterviewNotFound("No preparation plan exists for this interview yet.")
        return await self._read(plan)

    async def update_task(self, user: User, task_id: UUID, status: str) -> PreparationPlanRead:
        task = await self.preparation.get_task_owned(task_id, user.id)
        if task is None:
            raise InterviewNotFound("That preparation task could not be found.")
        task.status = PreparationTaskStatus(status)
        plan = await self.preparation.get_owned(task.plan_id, user.id)
        if plan is None:
            raise InterviewNotFound()
        tasks = await self.preparation.list_tasks(plan.id)
        completed = sum(item.status == PreparationTaskStatus.COMPLETED for item in tasks)
        plan.overall_progress = round(100 * completed / max(1, len(tasks)), 1)
        interview = await self.interviews.get_owned(plan.interview_id, user.id)
        if interview:
            interview.preparation_progress = plan.overall_progress
        await self.session.commit()
        return await self._read(plan)

    async def _read(self, plan: PreparationPlan) -> PreparationPlanRead:
        tasks = await self.preparation.list_tasks(plan.id)
        return PreparationPlanRead.model_validate(
            {
                **{
                    column.name: getattr(plan, column.name)
                    for column in PreparationPlan.__table__.columns
                },
                "tasks": [PreparationTaskRead.model_validate(task) for task in tasks],
            }
        )
