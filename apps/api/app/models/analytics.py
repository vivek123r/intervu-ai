from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import JSON_VALUE, Base, TimestampMixin, UUIDPrimaryKeyMixin


class TopicPerformance(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "topic_performance"
    __table_args__ = (Index("ix_topic_performance_user_topic", "user_id", "topic", unique=True),)

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    best_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    recent_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    confidence_weight: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    trend: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    last_practiced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProcessingJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "processing_jobs"
    __table_args__ = (Index("ix_jobs_user_status", "user_id", "status"),)

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="queued", nullable=False, index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    phase: Mapped[str | None] = mapped_column(String(64))
    idempotency_key: Mapped[str | None] = mapped_column(String(128), unique=True)
    result: Mapped[dict[str, object]] = mapped_column(JSON_VALUE, default=dict, nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(96))
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Notification(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_read", "user_id", "read_at"),)

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    action_label: Mapped[str | None] = mapped_column(String(80))
    action_url: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict[str, object]] = mapped_column(JSON_VALUE, default=dict, nullable=False)
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AIUsage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ai_usage"
    __table_args__ = (Index("ix_ai_usage_user_created", "user_id", "created_at"),)

    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    session_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("mock_interview_sessions.id", ondelete="SET NULL"),
        index=True,
    )
    agent: Mapped[str] = mapped_column(String(80), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    model: Mapped[str] = mapped_column(String(180), nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(96))
