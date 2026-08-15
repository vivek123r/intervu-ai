from __future__ import annotations

from datetime import UTC, datetime
from statistics import fmean
from typing import cast
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.context import InterviewContext
from app.ai.orchestrator import AIOrchestrator
from app.analytics.scoring import clamp_score, report_score
from app.analytics.speech import AnswerSpeechInput, calculate_speech_metrics, word_count
from app.config import Settings
from app.exceptions import (
    InterviewNotFound,
    SessionAlreadyCompleted,
    SessionNotFound,
)
from app.models.enums import SessionState, SessionStatus
from app.models.session import (
    AnswerEvaluation,
    InterviewAnswer,
    InterviewReport,
    MockInterviewSession,
    SessionQuestion,
    SpeechMetrics,
)
from app.models.user import User
from app.repositories.interviews import InterviewRepository
from app.repositories.practice import PracticeRepository
from app.schemas.practice import (
    AnswerEvaluationRead,
    AnswerResult,
    InterviewReportRead,
    PracticeSessionCreate,
    PracticeSessionRead,
    SessionAnswerCreate,
    SessionQuestionRead,
    SpeechMetricsRead,
)
from app.services.session_state import assert_transition


class PracticeService:
    def __init__(self, *, session: AsyncSession, ai: AIOrchestrator, settings: Settings) -> None:
        self.session = session
        self.ai = ai
        self.settings = settings
        self.practice = PracticeRepository(session)
        self.interviews = InterviewRepository(session)

    async def create(self, user: User, payload: PracticeSessionCreate) -> PracticeSessionRead:
        if payload.interview_id:
            interview = await self.interviews.get_owned(payload.interview_id, user.id)
            if interview is None:
                raise InterviewNotFound()
        interview_session = MockInterviewSession(
            user_id=user.id,
            interview_id=payload.interview_id,
            mode=payload.mode,
            difficulty=payload.difficulty,
            interviewer_style=payload.interviewer_style,
            planned_duration=payload.planned_duration,
            compact_memory={"focus_areas": payload.focus_areas},
        )
        await self.practice.create_session(interview_session)
        await self.session.commit()
        return await self._read(interview_session)

    async def get(self, user: User, session_id: UUID) -> PracticeSessionRead:
        interview_session = await self._get_owned(user, session_id)
        return await self._read(interview_session)

    async def start(self, user: User, session_id: UUID) -> PracticeSessionRead:
        interview_session = await self._get_owned(user, session_id)
        if interview_session.status == SessionStatus.COMPLETED:
            raise SessionAlreadyCompleted()
        existing_question = await self.practice.current_question(interview_session.id)
        if existing_question:
            return await self._read(interview_session)
        assert_transition(interview_session.state, SessionState.READY)
        interview_session.state = SessionState.READY
        assert_transition(interview_session.state, SessionState.INTRODUCTION)
        interview_session.state = SessionState.INTRODUCTION
        target_section = self._initial_section(interview_session.mode)
        assert_transition(interview_session.state, target_section)
        interview_session.state = target_section
        interview_session.current_section = target_section.value
        interview_session.status = SessionStatus.ACTIVE
        interview_session.started_at = datetime.now(UTC)
        question = await self._generate_question(interview_session, user, position=1)
        await self.practice.add_question(question)
        interview_session.question_count = 1
        interview_session.current_question_index = 1
        await self.session.commit()
        return await self._read(interview_session)

    async def answer(
        self, user: User, session_id: UUID, payload: SessionAnswerCreate
    ) -> AnswerResult:
        interview_session = await self._get_owned(user, session_id)
        if interview_session.status != SessionStatus.ACTIVE:
            raise SessionAlreadyCompleted(
                "This session is not accepting answers.",
                details={"status": interview_session.status.value},
            )
        question = await self.practice.get_question(payload.question_id, interview_session.id)
        if question is None:
            raise SessionNotFound("The current question could not be found.")
        existing = await self.practice.answer_for_question(question.id)
        if existing:
            existing_evaluation = await self.practice.evaluation_for_answer(existing.id)
            if existing_evaluation is None:
                raise SessionNotFound("The saved answer is still processing.")
            return AnswerResult(
                answer_id=existing.id,
                evaluation=AnswerEvaluationRead.model_validate(existing_evaluation),
                decision="already_processed",
                next_question=(
                    SessionQuestionRead.model_validate(
                        await self.practice.current_question(interview_session.id)
                    )
                    if interview_session.question_count > question.position
                    else None
                ),
            )
        answer = InterviewAnswer(
            session_id=interview_session.id,
            question_id=question.id,
            transcript=payload.transcript.strip(),
            started_at=payload.started_at,
            ended_at=payload.ended_at,
            duration_ms=payload.duration_ms,
            word_count=word_count(payload.transcript),
            pause_markers_ms=payload.pause_markers_ms,
        )
        await self.practice.save_answer(answer)
        evaluation_output = await self.ai.evaluate_answer(
            {
                "question": question.question_text,
                "topic": question.topic,
                "answer": payload.transcript,
                "duration_ms": payload.duration_ms,
            }
        )
        evaluation = AnswerEvaluation(answer_id=answer.id, **evaluation_output.model_dump())
        await self.practice.save_evaluation(evaluation)

        decision = await self.ai.decide_followup(
            {
                "question": question.question_text,
                "answer": payload.transcript,
                "evaluation_summary": evaluation_output.model_dump(),
                "followup_depth": question.followup_depth,
                "max_followups": self.settings.max_followups_per_question,
            }
        )
        next_question: SessionQuestion | None
        if (
            decision.action == "follow_up"
            and decision.question
            and question.followup_depth < self.settings.max_followups_per_question
        ):
            next_question = SessionQuestion(
                session_id=interview_session.id,
                position=interview_session.question_count + 1,
                parent_question_id=question.parent_question_id or question.id,
                question_text=decision.question,
                question_type=question.question_type,
                topic=question.topic,
                difficulty=question.difficulty,
                is_follow_up=True,
                followup_depth=question.followup_depth + 1,
                asked_at=datetime.now(UTC),
            )
        else:
            next_question = await self._generate_question(
                interview_session,
                user,
                position=interview_session.question_count + 1,
            )
        await self.practice.add_question(next_question)
        interview_session.question_count += 1
        interview_session.current_question_index = interview_session.question_count
        await self.session.commit()
        return AnswerResult(
            answer_id=answer.id,
            evaluation=AnswerEvaluationRead.model_validate(evaluation),
            decision=decision.action,
            next_question=SessionQuestionRead.model_validate(next_question),
        )

    async def complete(self, user: User, session_id: UUID) -> InterviewReportRead:
        interview_session = await self._get_owned(user, session_id)
        existing_report = await self.practice.report_for_session(interview_session.id)
        if existing_report:
            return await self.report(user, interview_session.id)
        if interview_session.state != SessionState.WRAP_UP:
            assert_transition(interview_session.state, SessionState.WRAP_UP)
            interview_session.state = SessionState.WRAP_UP
        assert_transition(interview_session.state, SessionState.PROCESSING)
        interview_session.state = SessionState.PROCESSING
        interview_session.status = SessionStatus.PROCESSING
        interview_session.ended_at = datetime.now(UTC)
        await self.session.flush()
        return await self._generate_report(interview_session)

    async def report(self, user: User, session_id: UUID) -> InterviewReportRead:
        interview_session = await self._get_owned(user, session_id)
        report = await self.practice.report_for_session(interview_session.id)
        if report is None:
            raise SessionNotFound("The report is not ready yet.")
        metrics = await self.practice.metrics_for_session(interview_session.id)
        answers = await self.practice.answers(interview_session.id)
        questions = {
            question.id: question for question in await self.practice.questions(session_id)
        }
        answer_rows: list[dict[str, object]] = []
        for answer in answers:
            evaluation = await self.practice.evaluation_for_answer(answer.id)
            question = questions.get(answer.question_id)
            answer_rows.append(
                {
                    "id": str(answer.id),
                    "question": question.question_text if question else "Question",
                    "topic": question.topic if question else "General",
                    "transcript": answer.transcript,
                    "duration_ms": answer.duration_ms,
                    "evaluation": (
                        AnswerEvaluationRead.model_validate(evaluation).model_dump(mode="json")
                        if evaluation
                        else None
                    ),
                }
            )
        return InterviewReportRead.model_validate(
            {
                **{
                    column.name: getattr(report, column.name)
                    for column in InterviewReport.__table__.columns
                },
                "speech_metrics": SpeechMetricsRead.model_validate(metrics) if metrics else None,
                "answers": answer_rows,
            }
        )

    async def _generate_report(
        self, interview_session: MockInterviewSession
    ) -> InterviewReportRead:
        answers = await self.practice.answers(interview_session.id)
        evaluations = await self.practice.evaluations_for_session(interview_session.id)
        speech_values = calculate_speech_metrics(
            [
                AnswerSpeechInput(
                    transcript=answer.transcript,
                    duration_ms=answer.duration_ms,
                    pause_markers_ms=answer.pause_markers_ms,
                )
                for answer in answers
            ]
        )
        metrics = SpeechMetrics(session_id=interview_session.id, **speech_values)
        await self.practice.save_metrics(metrics)

        def average(name: str) -> float:
            if not evaluations:
                return 0.0
            return round(fmean(float(getattr(evaluation, name)) for evaluation in evaluations), 1)

        technical = round((average("correctness") + average("completeness")) / 2, 1)
        clarity = average("clarity")
        structure = average("structure")
        relevance = average("relevance")
        depth = average("depth")
        average_wpm = float(cast(int | float, speech_values["average_wpm"]))
        filler_count = float(cast(int | float, speech_values["filler_count"]))
        total_words = float(cast(int | float, speech_values["total_words"]))
        pace_score = 90.0 if 110 <= average_wpm <= 165 else 72.0
        filler_ratio = filler_count / max(1.0, total_words)
        communication = clamp_score(
            clarity * 0.72 + pace_score * 0.20 + (100 - min(40, filler_ratio * 500)) * 0.08
        )
        values = {
            "technical": technical,
            "communication": communication,
            "structure": structure,
            "clarity": clarity,
            "relevance": relevance,
            "depth": depth,
        }
        interview_type = "technical"
        if interview_session.interview_id:
            interview = await self.interviews.get_owned(
                interview_session.interview_id, interview_session.user_id
            )
            if interview:
                interview_type = interview.interview_type
        overall = report_score(values, interview_type)
        coaching = await self.ai.generate_final_report(
            {
                "dimension_scores": values,
                "overall_score": overall,
                "answer_evaluations": [
                    {
                        "strengths": item.strengths,
                        "missing_points": item.missing_points,
                        "recommendations": item.recommendations,
                    }
                    for item in evaluations
                ],
                "deterministic_speech_metrics": speech_values,
            }
        )
        report = InterviewReport(
            session_id=interview_session.id,
            overall_score=overall,
            technical_score=technical,
            communication_score=communication,
            structure_score=structure,
            clarity_score=clarity,
            relevance_score=relevance,
            depth_score=depth,
            **coaching.model_dump(mode="json"),
        )
        await self.practice.save_report(report)
        assert_transition(interview_session.state, SessionState.COMPLETED)
        interview_session.state = SessionState.COMPLETED
        interview_session.status = SessionStatus.COMPLETED
        interview_session.overall_score = overall
        await self.session.commit()
        return await self.report_by_entities(interview_session, report, metrics)

    async def report_by_entities(
        self,
        interview_session: MockInterviewSession,
        report: InterviewReport,
        metrics: SpeechMetrics,
    ) -> InterviewReportRead:
        del interview_session
        return InterviewReportRead.model_validate(
            {
                **{
                    column.name: getattr(report, column.name)
                    for column in InterviewReport.__table__.columns
                },
                "speech_metrics": SpeechMetricsRead.model_validate(metrics),
                "answers": [],
            }
        )

    async def _generate_question(
        self, interview_session: MockInterviewSession, user: User, *, position: int
    ) -> SessionQuestion:
        interview = (
            await self.interviews.get_owned(interview_session.interview_id, user.id)
            if interview_session.interview_id
            else None
        )
        existing_questions = await self.practice.questions(interview_session.id)
        raw_focus_areas = interview_session.compact_memory.get("focus_areas", [])
        focus_areas = (
            [str(item) for item in raw_focus_areas] if isinstance(raw_focus_areas, list) else []
        )
        generated = await self.ai.generate_question(
            InterviewContext(
                role=interview.role_title if interview else "Backend Engineer",
                company=interview.company_name if interview else None,
                interview_type=interview.interview_type if interview else interview_session.mode,
                difficulty=interview_session.difficulty,
                section=interview_session.current_section or "technical",
                weak_topics=focus_areas,
                topics_covered=[question.topic for question in existing_questions],
                recent_turns=[
                    {"role": "interviewer", "content": question.question_text}
                    for question in existing_questions[-3:]
                ],
                compact_memory=interview_session.compact_memory,
            )
        )
        return SessionQuestion(
            session_id=interview_session.id,
            position=position,
            question_text=generated.text,
            question_type=generated.question_type,
            topic=generated.topic,
            difficulty=generated.difficulty,
            is_follow_up=False,
            followup_depth=0,
            asked_at=datetime.now(UTC),
        )

    async def _get_owned(self, user: User, session_id: UUID) -> MockInterviewSession:
        interview_session = await self.practice.get_session(session_id, user.id)
        if interview_session is None:
            raise SessionNotFound()
        return interview_session

    async def _read(self, interview_session: MockInterviewSession) -> PracticeSessionRead:
        current = await self.practice.current_question(interview_session.id)
        return PracticeSessionRead.model_validate(
            {
                **{
                    column.name: getattr(interview_session, column.name)
                    for column in MockInterviewSession.__table__.columns
                },
                "current_question": SessionQuestionRead.model_validate(current)
                if current
                else None,
            }
        )

    @staticmethod
    def _initial_section(mode: str) -> SessionState:
        if "behavioral" in mode or mode == "hr":
            return SessionState.BEHAVIORAL
        if "resume" in mode or mode == "full_mock":
            return SessionState.RESUME
        return SessionState.TECHNICAL
