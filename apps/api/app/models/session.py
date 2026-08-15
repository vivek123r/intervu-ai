from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import JSON_VALUE, Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import SessionState, SessionStatus


class MockInterviewSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "mock_interview_sessions"
    __table_args__ = (Index("ix_sessions_user_status", "user_id", "status"),)

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interview_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("interviews.id", ondelete="SET NULL"), index=True
    )
    mode: Mapped[str] = mapped_column(String(64), default="full_mock", nullable=False)
    difficulty: Mapped[str] = mapped_column(String(32), default="normal", nullable=False)
    interviewer_style: Mapped[str] = mapped_column(
        String(64), default="neutral_interviewer", nullable=False
    )
    planned_duration: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    state: Mapped[SessionState] = mapped_column(
        Enum(SessionState, native_enum=False, length=32),
        default=SessionState.CREATED,
        nullable=False,
    )
    current_section: Mapped[str | None] = mapped_column(String(64))
    question_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_question_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    overall_score: Mapped[float | None] = mapped_column(Float)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, native_enum=False, length=32),
        default=SessionStatus.CREATED,
        nullable=False,
        index=True,
    )
    compact_memory: Mapped[dict[str, object]] = mapped_column(
        JSON_VALUE, default=dict, nullable=False
    )


class SessionQuestion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "session_questions"
    __table_args__ = (UniqueConstraint("session_id", "position", name="uq_question_position"),)

    session_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("mock_interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    parent_question_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("session_questions.id", ondelete="SET NULL")
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(64), nullable=False)
    topic: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    difficulty: Mapped[str] = mapped_column(String(32), default="normal", nullable=False)
    is_follow_up: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    followup_depth: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    asked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class InterviewAnswer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "interview_answers"

    session_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("mock_interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("session_questions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False)
    pause_markers_ms: Mapped[list[int]] = mapped_column(JSON_VALUE, default=list, nullable=False)


class AnswerEvaluation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "answer_evaluations"

    answer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("interview_answers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    correctness: Mapped[float] = mapped_column(Float, nullable=False)
    completeness: Mapped[float] = mapped_column(Float, nullable=False)
    relevance: Mapped[float] = mapped_column(Float, nullable=False)
    depth: Mapped[float] = mapped_column(Float, nullable=False)
    structure: Mapped[float] = mapped_column(Float, nullable=False)
    clarity: Mapped[float] = mapped_column(Float, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(JSON_VALUE, default=list, nullable=False)
    missing_points: Mapped[list[str]] = mapped_column(JSON_VALUE, default=list, nullable=False)
    recommendations: Mapped[list[str]] = mapped_column(JSON_VALUE, default=list, nullable=False)
    improved_structure: Mapped[list[str]] = mapped_column(JSON_VALUE, default=list, nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), default="evaluator/v1", nullable=False)


class SpeechMetrics(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "speech_metrics"

    session_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("mock_interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    total_words: Mapped[int] = mapped_column(Integer, nullable=False)
    total_speaking_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    average_wpm: Mapped[float] = mapped_column(Float, nullable=False)
    filler_count: Mapped[int] = mapped_column(Integer, nullable=False)
    fillers: Mapped[dict[str, int]] = mapped_column(JSON_VALUE, default=dict, nullable=False)
    pause_count: Mapped[int] = mapped_column(Integer, nullable=False)
    long_pause_count: Mapped[int] = mapped_column(Integer, nullable=False)
    longest_pause_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    average_pause_ms: Mapped[float] = mapped_column(Float, nullable=False)
    average_answer_ms: Mapped[float] = mapped_column(Float, nullable=False)


class InterviewReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "interview_reports"

    session_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("mock_interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    technical_score: Mapped[float] = mapped_column(Float, nullable=False)
    communication_score: Mapped[float] = mapped_column(Float, nullable=False)
    structure_score: Mapped[float] = mapped_column(Float, nullable=False)
    clarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    relevance_score: Mapped[float] = mapped_column(Float, nullable=False)
    depth_score: Mapped[float] = mapped_column(Float, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(JSON_VALUE, default=list, nullable=False)
    weaknesses: Mapped[list[str]] = mapped_column(JSON_VALUE, default=list, nullable=False)
    weak_topics: Mapped[list[dict[str, object]]] = mapped_column(
        JSON_VALUE, default=list, nullable=False
    )
    recommended_actions: Mapped[list[dict[str, object]]] = mapped_column(
        JSON_VALUE, default=list, nullable=False
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_version: Mapped[str] = mapped_column(
        String(64), default="final_report/v1", nullable=False
    )
