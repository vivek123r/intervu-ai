from fastapi import APIRouter

from app.dependencies import CurrentUser, NotificationServiceDep
from app.schemas.notifications import NotificationItem

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=list[NotificationItem])
async def list_notifications(
    current_user: CurrentUser, notifications: NotificationServiceDep
) -> list[NotificationItem]:
    return await notifications.list_for_user(current_user.id)


@router.post("/notifications/{notification_id}/read", response_model=NotificationItem)
async def mark_notification_read(
    notification_id: str, current_user: CurrentUser, notifications: NotificationServiceDep
) -> NotificationItem:
    return await notifications.mark_read(current_user.id, notification_id)
