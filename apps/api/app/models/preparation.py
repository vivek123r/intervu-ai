from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import PreparationTaskStatus


class PreparationPlan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "preparation_plans"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interview_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    interview_date: Mapped[date] = mapped_column(Date, nullable=False)
    overall_progress: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    prompt_version: Mapped[str] = mapped_column(
        String(64), default="prep_planner/v1", nullable=False
    )


class PreparationTask(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "preparation_tasks"

    plan_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("preparation_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    status: Mapped[PreparationTaskStatus] = mapped_column(
        Enum(PreparationTaskStatus, native_enum=False, length=32),
        default=PreparationTaskStatus.PENDING,
        nullable=False,
    )
    priority: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(64))
    resource_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
