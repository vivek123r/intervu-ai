from typing import ClassVar

from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime


class NotificationItem(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"action_href"})

    id: str
    title: str
    message: str
    created_at: UtcDatetime
    read: bool
    action_href: str | None = None
