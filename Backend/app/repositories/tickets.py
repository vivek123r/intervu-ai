from typing import Any

from app.core.timeutils import utcnow
from app.repositories.base import BaseRepository


class SocketTicketRepository(BaseRepository):
    collection_name = "socket_tickets"

    async def insert(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))

    async def get_valid(self, ticket: str, session_id: str) -> dict[str, Any] | None:
        doc = await self._collection.find_one(
            {"_id": ticket, "session_id": session_id, "expires_at": {"$gt": utcnow()}}
        )
        return self._from_doc(doc)
