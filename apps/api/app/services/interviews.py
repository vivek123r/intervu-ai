from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.scoring import readiness_score
from app.exceptions import InterviewNotFound
from app.models.enums import InterviewStatus
from app.models.interview import Interview
from app.models.user import User
from app.repositories.interviews import InterviewRepository
from app.schemas.interviews import (
    DashboardOverview,
    InterviewCreate,
    InterviewRead,
    InterviewRoundRead,
    InterviewUpdate,
)


class InterviewService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = InterviewRepository(session)

    async def create(self, user: User, payload: InterviewCreate) -> InterviewRead:
        interview = await self.repository.create(user.id, payload)
        await self.session.commit()
        return await self._read(interview)

    async def get(self, user: User, interview_id: UUID) -> InterviewRead:
        interview = await self.repository.get_owned(interview_id, user.id)
        if interview is None:
            raise InterviewNotFound()
        return await self._read(interview)

    async def list_upcoming(
        self, user: User, *, limit: int = 20, after: datetime | None = None
    ) -> list[InterviewRead]:
        interviews = await self.repository.list_for_user(
            user.id,
            limit=limit,
            after=after,
            statuses=[
                InterviewStatus.DETECTED,
                InterviewStatus.CONFIRMED,
                InterviewStatus.UPCOMING,
            ],
        )
        return [await self._read(interview) for interview in interviews]

    async def update(
        self, user: User, interview_id: UUID, payload: InterviewUpdate
    ) -> InterviewRead:
        interview = await self.repository.get_owned(interview_id, user.id)
        if interview is None:
            raise InterviewNotFound()
        interview = await self.repository.update(interview, payload)
        await self.session.commit()
        return await self._read(interview)

    async def confirm(self, user: User, interview_id: UUID, confirmed: bool) -> InterviewRead:
        interview = await self.repository.get_owned(interview_id, user.id)
        if interview is None:
            raise InterviewNotFound()
        interview.status = InterviewStatus.UPCOMING if confirmed else InterviewStatus.REJECTED
        await self.session.commit()
        return await self._read(interview)

    async def delete(self, user: User, interview_id: UUID) -> None:
        interview = await self.repository.get_owned(interview_id, user.id)
        if interview is None:
            raise InterviewNotFound()
        await self.repository.delete(interview)
        await self.session.commit()

    async def dashboard(self, user: User) -> DashboardOverview:
        now = datetime.now(UTC)
        interviews = await self.repository.list_for_user(
            user.id,
            limit=5,
            after=now,
            statuses=[
                InterviewStatus.DETECTED,
                InterviewStatus.CONFIRMED,
                InterviewStatus.UPCOMING,
            ],
        )
        reads = [await self._read(interview) for interview in interviews]
        next_interview = reads[0] if reads else None
        components = (
            next_interview.readiness_components
            if next_interview and next_interview.readiness_components
            else {
                "mock_performance": 0,
                "target_skill_coverage": 0,
                "preparation_completion": 0,
                "recent_improvement": 0,
                "weak_topic_coverage": 0,
            }
        )
        readiness, normalized = readiness_score(components)
        return DashboardOverview(
            next_interview=next_interview,
            upcoming_interviews=reads,
            readiness_score=next_interview.readiness_score or readiness
            if next_interview
            else readiness,
            readiness_components=normalized,
            today_completed=0,
            today_total=0,
            recommended_minutes=12 if next_interview else 0,
            weak_topics=[],
            improvement_percent=0,
        )

    async def _read(self, interview: Interview) -> InterviewRead:
        rounds = await self.repository.get_rounds(interview.id)
        return InterviewRead.model_validate(
            {
                **{
                    column.name: getattr(interview, column.name)
                    for column in Interview.__table__.columns
                },
                "rounds": [InterviewRoundRead.model_validate(item) for item in rounds],
            }
        )
