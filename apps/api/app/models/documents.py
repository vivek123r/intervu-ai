from __future__ import annotations

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import JSON_VALUE, Base, TimestampMixin, UUIDPrimaryKeyMixin


class Resume(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "resumes"
    __table_args__ = (Index("ix_resumes_user_primary", "user_id", "is_primary"),)

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(80), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    raw_text: Mapped[str | None] = mapped_column(Text)
    parsed_data: Mapped[dict[str, object]] = mapped_column(JSON_VALUE, default=dict, nullable=False)
    parse_status: Mapped[str] = mapped_column(String(32), default="queued", nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class JobDescription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "job_descriptions"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interview_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE"), index=True
    )
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(180))
    role_title: Mapped[str | None] = mapped_column(String(180))
    parsed_data: Mapped[dict[str, object]] = mapped_column(JSON_VALUE, default=dict, nullable=False)
    role_match_data: Mapped[dict[str, object]] = mapped_column(
        JSON_VALUE, default=dict, nullable=False
    )
    parse_status: Mapped[str] = mapped_column(String(32), default="queued", nullable=False)
