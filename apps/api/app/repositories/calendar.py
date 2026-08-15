from __future__ import annotations

from datetime import datetime
from typing import cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.calendar import CalendarConnection
from app.models.enums import CalendarConnectionStatus


class CalendarConnectionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_for_user(
        self, user_id: UUID, provider: str = "google"
    ) -> CalendarConnection | None:
        return cast(
            CalendarConnection | None,
            await self.session.scalar(
                select(CalendarConnection).where(
                    CalendarConnection.user_id == user_id,
                    CalendarConnection.provider == provider,
                )
            ),
        )

    async def get_owned(self, connection_id: UUID, user_id: UUID) -> CalendarConnection | None:
        return cast(
            CalendarConnection | None,
            await self.session.scalar(
                select(CalendarConnection).where(
                    CalendarConnection.id == connection_id,
                    CalendarConnection.user_id == user_id,
                )
            ),
        )

    async def upsert(
        self,
        *,
        user_id: UUID,
        account_email: str | None,
        encrypted_access_token: str | None,
        encrypted_refresh_token: str | None,
        token_expiry: datetime | None,
        scope: str,
    ) -> CalendarConnection:
        connection = await self.get_for_user(user_id)
        if connection is None:
            connection = CalendarConnection(
                user_id=user_id,
                provider="google",
                provider_account_email=account_email,
                encrypted_access_token=encrypted_access_token,
                encrypted_refresh_token=encrypted_refresh_token,
                token_expiry=token_expiry,
                scope=scope,
                status=CalendarConnectionStatus.CONNECTED,
            )
            self.session.add(connection)
        else:
            connection.provider_account_email = account_email or connection.provider_account_email
            connection.encrypted_access_token = encrypted_access_token
            connection.encrypted_refresh_token = (
                encrypted_refresh_token or connection.encrypted_refresh_token
            )
            connection.token_expiry = token_expiry
            connection.scope = scope
            connection.status = CalendarConnectionStatus.CONNECTED
        await self.session.flush()
        return connection

    async def mark_sync(
        self, connection: CalendarConnection, *, synced_at: datetime, succeeded: bool
    ) -> None:
        connection.last_sync_at = synced_at
        if succeeded:
            connection.last_success_at = synced_at
            connection.status = CalendarConnectionStatus.CONNECTED
        await self.session.flush()

    async def disconnect(self, connection: CalendarConnection) -> None:
        connection.encrypted_access_token = None
        connection.encrypted_refresh_token = None
        connection.token_expiry = None
        connection.status = CalendarConnectionStatus.REVOKED
        await self.session.flush()
