from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.repositories.notifications import NotificationRepository
from app.schemas.notifications import NotificationItem


class NotificationService:
    def __init__(self, notifications: NotificationRepository) -> None:
        self._notifications = notifications

    async def list_for_user(self, user_id: str) -> list[NotificationItem]:
        docs = await self._notifications.list_for_user(user_id)
        return [NotificationItem(**doc) for doc in docs]

    async def mark_read(self, user_id: str, notification_id: str) -> NotificationItem:
        doc = await self._notifications.mark_read(user_id, notification_id)
        if doc is None:
            raise NotFoundError(
                ErrorCode.NOTIFICATION_NOT_FOUND, "That notification could not be found."
            )
        return NotificationItem(**doc)
