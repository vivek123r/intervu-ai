from __future__ import annotations

from datetime import datetime
from typing import cast
from uuid import UUID

from sqlalchemy import Select, and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import InterviewStatus
from app.models.interview import Interview, InterviewRound
from app.schemas.interviews import InterviewCreate, InterviewUpdate


class InterviewRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_owned(self, interview_id: UUID, user_id: UUID) -> Interview | None:
        return cast(
            Interview | None,
            await self.session.scalar(
                select(Interview).where(Interview.id == interview_id, Interview.user_id == user_id)
            ),
        )

    async def get_rounds(self, interview_id: UUID) -> list[InterviewRound]:
        result = await self.session.scalars(
            select(InterviewRound)
            .where(InterviewRound.interview_id == interview_id)
            .order_by(InterviewRound.position)
        )
        return list(result)

    async def list_for_user(
        self,
        user_id: UUID,
        *,
        limit: int,
        after: datetime | None = None,
        statuses: list[InterviewStatus] | None = None,
    ) -> list[Interview]:
        query: Select[tuple[Interview]] = select(Interview).where(Interview.user_id == user_id)
        if after:
            query = query.where(Interview.scheduled_at > after)
        if statuses:
            query = query.where(Interview.status.in_(statuses))
        query = query.order_by(Interview.scheduled_at.asc(), Interview.id.asc()).limit(limit)
        return list(await self.session.scalars(query))

    async def list_history(self, user_id: UUID, *, limit: int) -> list[Interview]:
        return list(
            await self.session.scalars(
                select(Interview)
                .where(
                    Interview.user_id == user_id,
                    Interview.status.in_([InterviewStatus.COMPLETED, InterviewStatus.OFFER]),
                )
                .order_by(Interview.scheduled_at.desc())
                .limit(limit)
            )
        )

    async def create(self, user_id: UUID, payload: InterviewCreate) -> Interview:
        values = payload.model_dump(exclude={"rounds"})
        interview = Interview(user_id=user_id, **values)
        self.session.add(interview)
        await self.session.flush()
        for round_payload in payload.rounds:
            self.session.add(
                InterviewRound(interview_id=interview.id, **round_payload.model_dump())
            )
        await self.session.flush()
        return interview

    async def update(self, interview: Interview, payload: InterviewUpdate) -> Interview:
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(interview, key, value)
        await self.session.flush()
        return interview

    async def delete(self, interview: Interview) -> None:
        await self.session.delete(interview)
        await self.session.flush()

    async def get_by_calendar_event(
        self, connection_id: UUID, provider_event_id: str
    ) -> Interview | None:
        return cast(
            Interview | None,
            await self.session.scalar(
                select(Interview).where(
                    and_(
                        Interview.calendar_connection_id == connection_id,
                        Interview.calendar_event_id == provider_event_id,
                    )
                )
            ),
        )

    async def add_calendar_candidate(self, interview: Interview) -> Interview:
        self.session.add(interview)
        await self.session.flush()
        return interview

    async def next_for_user(self, user_id: UUID, now: datetime) -> Interview | None:
        return cast(
            Interview | None,
            await self.session.scalar(
                select(Interview)
                .where(
                    Interview.user_id == user_id,
                    Interview.scheduled_at >= now,
                    Interview.status.in_(
                        [
                            InterviewStatus.CONFIRMED,
                            InterviewStatus.UPCOMING,
                            InterviewStatus.DETECTED,
                        ]
                    ),
                )
                .order_by(Interview.scheduled_at.asc())
                .limit(1)
            ),
        )
