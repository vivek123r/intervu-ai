from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.schemas.users import UserRead, UserUpdate
from app.services.users import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserRead)
async def get_me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)


@router.patch("/me", response_model=UserRead)
async def update_me(payload: UserUpdate, user: CurrentUser, session: DbSession) -> UserRead:
    updated = await UserService(session).update(user, payload)
    return UserRead.model_validate(updated)
