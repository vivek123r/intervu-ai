from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import JSON_VALUE, Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    experience_level: Mapped[str | None] = mapped_column(String(64))
    target_roles: Mapped[list[str]] = mapped_column(JSON_VALUE, default=list, nullable=False)
    primary_skills: Mapped[list[str]] = mapped_column(JSON_VALUE, default=list, nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(32), default="English", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_active_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
