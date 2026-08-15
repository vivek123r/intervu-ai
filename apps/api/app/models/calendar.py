from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import CalendarConnectionStatus


class CalendarConnection(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "calendar_connections"
    __table_args__ = (Index("ix_calendar_connections_user_provider", "user_id", "provider"),)

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(32), default="google", nullable=False)
    provider_account_email: Mapped[str | None] = mapped_column(String(320))
    encrypted_access_token: Mapped[str | None] = mapped_column(Text)
    encrypted_refresh_token: Mapped[str | None] = mapped_column(Text)
    token_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[CalendarConnectionStatus] = mapped_column(
        Enum(CalendarConnectionStatus, native_enum=False, length=32),
        default=CalendarConnectionStatus.CONNECTED,
        nullable=False,
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sync_cursor: Mapped[str | None] = mapped_column(Text)
