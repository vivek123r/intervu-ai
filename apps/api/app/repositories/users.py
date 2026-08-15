from __future__ import annotations

from datetime import UTC, datetime
from typing import cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthPrincipal
from app.models.user import User
from app.schemas.users import UserUpdate


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_firebase_uid(self, firebase_uid: str) -> User | None:
        return cast(
            User | None,
            await self.session.scalar(select(User).where(User.firebase_uid == firebase_uid)),
        )

    async def resolve_principal(self, principal: AuthPrincipal) -> User:
        user = await self.get_by_firebase_uid(principal.firebase_uid)
        now = datetime.now(UTC)
        if user is None:
            user = User(
                firebase_uid=principal.firebase_uid,
                email=principal.email.casefold(),
                display_name=principal.display_name,
                avatar_url=principal.avatar_url,
                last_active_at=now,
            )
            self.session.add(user)
        else:
            user.email = principal.email.casefold()
            user.display_name = principal.display_name or user.display_name
            user.avatar_url = principal.avatar_url or user.avatar_url
            user.last_active_at = now
        await self.session.flush()
        return user

    async def update(self, user: User, payload: UserUpdate) -> User:
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(user, key, value)
        await self.session.flush()
        return user
