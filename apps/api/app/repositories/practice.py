from __future__ import annotations

from typing import cast
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SessionStatus
from app.models.session import (
    AnswerEvaluation,
    InterviewAnswer,
    InterviewReport,
    MockInterviewSession,
    SessionQuestion,
    SpeechMetrics,
)


class PracticeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_session(self, interview_session: MockInterviewSession) -> MockInterviewSession:
        self.session.add(interview_session)
        await self.session.flush()
        return interview_session

    async def get_session(self, session_id: UUID, user_id: UUID) -> MockInterviewSession | None:
        return cast(
            MockInterviewSession | None,
            await self.session.scalar(
                select(MockInterviewSession).where(
                    MockInterviewSession.id == session_id,
                    MockInterviewSession.user_id == user_id,
                )
            ),
        )

    async def list_sessions(self, user_id: UUID, *, limit: int = 50) -> list[MockInterviewSession]:
        return list(
            await self.session.scalars(
                select(MockInterviewSession)
                .where(MockInterviewSession.user_id == user_id)
                .order_by(MockInterviewSession.created_at.desc())
                .limit(limit)
            )
        )

    async def add_question(self, question: SessionQuestion) -> SessionQuestion:
        self.session.add(question)
        await self.session.flush()
        return question

    async def get_question(self, question_id: UUID, session_id: UUID) -> SessionQuestion | None:
        return cast(
            SessionQuestion | None,
            await self.session.scalar(
                select(SessionQuestion).where(
                    SessionQuestion.id == question_id,
                    SessionQuestion.session_id == session_id,
                )
            ),
        )

    async def current_question(self, session_id: UUID) -> SessionQuestion | None:
        return cast(
            SessionQuestion | None,
            await self.session.scalar(
                select(SessionQuestion)
                .where(SessionQuestion.session_id == session_id)
                .order_by(SessionQuestion.position.desc())
                .limit(1)
            ),
        )

    async def questions(self, session_id: UUID) -> list[SessionQuestion]:
        return list(
            await self.session.scalars(
                select(SessionQuestion)
                .where(SessionQuestion.session_id == session_id)
                .order_by(SessionQuestion.position)
            )
        )

    async def answers(self, session_id: UUID) -> list[InterviewAnswer]:
        return list(
            await self.session.scalars(
                select(InterviewAnswer)
                .where(InterviewAnswer.session_id == session_id)
                .order_by(InterviewAnswer.created_at)
            )
        )

    async def save_answer(self, answer: InterviewAnswer) -> InterviewAnswer:
        self.session.add(answer)
        await self.session.flush()
        return answer

    async def answer_for_question(self, question_id: UUID) -> InterviewAnswer | None:
        return cast(
            InterviewAnswer | None,
            await self.session.scalar(
                select(InterviewAnswer).where(InterviewAnswer.question_id == question_id)
            ),
        )

    async def save_evaluation(self, evaluation: AnswerEvaluation) -> AnswerEvaluation:
        self.session.add(evaluation)
        await self.session.flush()
        return evaluation

    async def evaluation_for_answer(self, answer_id: UUID) -> AnswerEvaluation | None:
        return cast(
            AnswerEvaluation | None,
            await self.session.scalar(
                select(AnswerEvaluation).where(AnswerEvaluation.answer_id == answer_id)
            ),
        )

    async def evaluations_for_session(self, session_id: UUID) -> list[AnswerEvaluation]:
        return list(
            await self.session.scalars(
                select(AnswerEvaluation)
                .join(InterviewAnswer, InterviewAnswer.id == AnswerEvaluation.answer_id)
                .where(InterviewAnswer.session_id == session_id)
                .order_by(InterviewAnswer.created_at)
            )
        )

    async def save_metrics(self, metrics: SpeechMetrics) -> SpeechMetrics:
        self.session.add(metrics)
        await self.session.flush()
        return metrics

    async def save_report(self, report: InterviewReport) -> InterviewReport:
        self.session.add(report)
        await self.session.flush()
        return report

    async def report_for_session(self, session_id: UUID) -> InterviewReport | None:
        return cast(
            InterviewReport | None,
            await self.session.scalar(
                select(InterviewReport).where(InterviewReport.session_id == session_id)
            ),
        )

    async def metrics_for_session(self, session_id: UUID) -> SpeechMetrics | None:
        return cast(
            SpeechMetrics | None,
            await self.session.scalar(
                select(SpeechMetrics).where(SpeechMetrics.session_id == session_id)
            ),
        )

    async def completed_count(self, user_id: UUID) -> int:
        return int(
            await self.session.scalar(
                select(func.count(MockInterviewSession.id)).where(
                    MockInterviewSession.user_id == user_id,
                    MockInterviewSession.status == SessionStatus.COMPLETED,
                )
            )
            or 0
        )
