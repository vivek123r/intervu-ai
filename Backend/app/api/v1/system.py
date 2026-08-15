from fastapi import APIRouter

from app.dependencies import CurrentUser, UserServiceDep
from app.schemas.users import UpdateUserRequest, User

router = APIRouter(tags=["system"])


@router.get("/me", response_model=User)
async def get_me(current_user: CurrentUser) -> User:
    return current_user


@router.patch("/me", response_model=User)
async def update_me(
    patch: UpdateUserRequest, current_user: CurrentUser, user_service: UserServiceDep
) -> User:
    return await user_service.update(current_user.id, patch)
