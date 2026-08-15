from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
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
from app.models.enums import InterviewSource, InterviewStatus


class Interview(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "interviews"
    __table_args__ = (
        Index("ix_interviews_user_scheduled", "user_id", "scheduled_at"),
        Index("ix_interviews_user_status", "user_id", "status"),
        UniqueConstraint(
            "calendar_connection_id", "calendar_event_id", name="uq_interview_calendar_event"
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    company_name: Mapped[str] = mapped_column(String(180), nullable=False)
    role_title: Mapped[str] = mapped_column(String(180), nullable=False)
    interview_type: Mapped[str] = mapped_column(String(64), default="technical", nullable=False)
    round_name: Mapped[str | None] = mapped_column(String(120))
    round_number: Mapped[int | None] = mapped_column(Integer)
    total_rounds: Mapped[int | None] = mapped_column(Integer)
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    meeting_type: Mapped[str | None] = mapped_column(String(64))
    meeting_url: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus, native_enum=False, length=32),
        default=InterviewStatus.UPCOMING,
        nullable=False,
        index=True,
    )
    source: Mapped[InterviewSource] = mapped_column(
        Enum(InterviewSource, native_enum=False, length=32),
        default=InterviewSource.MANUAL,
        nullable=False,
    )
    calendar_connection_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("calendar_connections.id", ondelete="SET NULL")
    )
    calendar_event_id: Mapped[str | None] = mapped_column(String(512))
    job_description_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "job_descriptions.id",
            name="fk_interviews_job_description_id_job_descriptions",
            ondelete="SET NULL",
            use_alter=True,
        ),
    )
    resume_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("resumes.id", ondelete="SET NULL"),
    )
    readiness_score: Mapped[float | None] = mapped_column(Float)
    readiness_components: Mapped[dict[str, float]] = mapped_column(
        JSON_VALUE, default=dict, nullable=False
    )
    preparation_progress: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    detection_confidence: Mapped[float | None] = mapped_column(Float)
    detection_evidence: Mapped[list[str]] = mapped_column(JSON_VALUE, default=list, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


class InterviewRound(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "interview_rounds"
    __table_args__ = (UniqueConstraint("interview_id", "position", name="uq_round_position"),)

    interview_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
