from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.users import UserUpdate


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = UserRepository(session)

    async def update(self, user: User, payload: UserUpdate) -> User:
        updated = await self.repository.update(user, payload)
        await self.session.commit()
        await self.session.refresh(updated)
        return updated
