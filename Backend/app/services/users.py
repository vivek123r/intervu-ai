from typing import Any

from app.core.ids import IdPrefix, new_id
from app.core.security import ResolvedIdentity
from app.core.timeutils import utcnow
from app.repositories.users import UserRepository
from app.schemas.common import ExperienceLevel
from app.schemas.users import UpdateUserRequest, User


class UserService:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def get_or_provision(self, identity: ResolvedIdentity) -> User:
        existing = await self._users.get_by_firebase_uid(identity.firebase_uid)
        if existing is not None:
            return User(**existing)
        doc = self._default_profile(identity)
        await self._users.insert(doc)
        return User(**doc)

    async def update(self, user_id: str, patch: UpdateUserRequest) -> User:
        changes = patch.model_dump(exclude_unset=True)
        doc = await self._users.update(user_id, changes)
        if doc is None:
            raise RuntimeError(f"user {user_id} vanished mid-request")
        return User(**doc)

    @staticmethod
    def _default_profile(identity: ResolvedIdentity) -> dict[str, Any]:
        return {
            "id": new_id(IdPrefix.USER),
            "firebase_uid": identity.firebase_uid,
            "email": identity.email or "unknown@intervu.ai",
            "display_name": identity.display_name or "New user",
            "avatar_url": None,
            "timezone": "UTC",
            "target_role": "",
            "experience_level": ExperienceLevel.MID,
            "preferred_language": "English",
            "skills": [],
            "onboarding_completed": False,
            "created_at": utcnow(),
        }
