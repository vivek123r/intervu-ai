from typing import Any

from app.repositories.base import BaseRepository

# Roughly 25 exchanges. Well past any real post-interview conversation, and far
# past the 6-turn window the prompt actually uses.
MAX_THREAD_TURNS = 50


class ReportConversationRepository(BaseRepository):
    """One document per report, holding the whole post-interview Q&A turn list —
    keyed by report id like `session_completions`, so the thread survives a
    refresh and is scoped to the report it discusses."""

    collection_name = "report_conversations"

    async def get(self, user_id: str, report_id: str) -> dict[str, Any] | None:
        return self._from_doc(
            await self._collection.find_one({"_id": report_id, "user_id": user_id})
        )

    async def append_turns(
        self, user_id: str, report_id: str, turns: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Upserts the thread and appends both turns (candidate + assistant) in one
        call, so a reader never observes a thread with only one side of an
        exchange."""
        await self._collection.update_one(
            {"_id": report_id, "user_id": user_id},
            # Capped: the thread grew without bound, and only the last few turns
            # are ever sent to the model anyway.
            {"$push": {"turns": {"$each": turns, "$slice": -MAX_THREAD_TURNS}}},
            upsert=True,
        )
        doc = await self.get(user_id, report_id)
        assert doc is not None
        return doc

    async def delete(self, user_id: str, report_id: str) -> None:
        await self._collection.delete_one({"_id": report_id, "user_id": user_id})
