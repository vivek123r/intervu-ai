import uuid
from typing import Any

from app.core.timeutils import utcnow
from app.repositories.base import BaseRepository
from app.schemas.common import CodingLanguage


class CodeDraftRepository(BaseRepository):
    collection_name = "coding_drafts"

    async def get(
        self, user_id: str, problem_slug: str, language: CodingLanguage
    ) -> dict[str, Any] | None:
        lang_str = language.value if hasattr(language, "value") else str(language)
        return self._from_doc(
            await self._collection.find_one(
                {"user_id": user_id, "problem_slug": problem_slug, "language": lang_str}
            )
        )

    async def upsert(
        self, user_id: str, problem_slug: str, language: CodingLanguage, code: str
    ) -> dict[str, Any]:
        lang_str = language.value if hasattr(language, "value") else str(language)
        now = utcnow()
        doc = await self._collection.find_one_and_update(
            {"user_id": user_id, "problem_slug": problem_slug, "language": lang_str},
            {
                "$set": {
                    "code": code,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "_id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "problem_slug": problem_slug,
                    "language": lang_str,
                },
            },
            upsert=True,
            return_document=True,
        )
        return self._from_doc(doc) or {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "problem_slug": problem_slug,
            "language": lang_str,
            "code": code,
            "updated_at": now,
        }
