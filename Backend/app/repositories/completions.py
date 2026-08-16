from typing import Any

from app.repositories.base import BaseRepository


class CompletionInsightRepository(BaseRepository):
    """The authored half of a completion view, keyed by the report it belongs to.

    Only the parts a model (or an editor) writes live here — band, standing, protocols,
    per-metric deltas. Everything measurable is composed from the report, session, and
    history records at read time, so this collection never holds a second copy of a score.
    """

    collection_name = "session_completions"

    async def get(self, user_id: str, report_id: str) -> dict[str, Any] | None:
        return self._from_doc(
            await self._collection.find_one({"_id": report_id, "user_id": user_id})
        )
