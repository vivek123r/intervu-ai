from typing import Any

from app.repositories.base import BaseRepository


class PracticeSessionRepository(BaseRepository):
    collection_name = "practice_sessions"

    async def get(self, user_id: str, session_id: str) -> dict[str, Any] | None:
        return self._from_doc(
            await self._collection.find_one({"_id": session_id, "user_id": user_id})
        )

    async def insert(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))

    async def update(
        self, user_id: str, session_id: str, changes: dict[str, Any]
    ) -> dict[str, Any] | None:
        await self._collection.update_one(
            {"_id": session_id, "user_id": user_id}, {"$set": changes}
        )
        return await self.get(user_id, session_id)

    async def append_turn(
        self,
        user_id: str,
        session_id: str,
        *,
        answer: dict[str, Any],
        new_question: dict[str, Any] | None,
        current_question_index: int,
        log_entries: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        """Appends one turn's outcome without ever `$set`-ing the whole `answers` or
        `questions` array. A background analysis task (services/analysis.py) targets
        one answer by `question_id` with an array-filtered `$set` — see
        `set_answer_analysis` — and a whole-array replace here would silently clobber
        whatever it had just written for an earlier answer still in flight.
        """
        push: dict[str, Any] = {
            "answers": answer,
            "interviewer_log": {"$each": log_entries},
        }
        if new_question is not None:
            push["questions"] = new_question
        await self._collection.update_one(
            {"_id": session_id, "user_id": user_id},
            {
                "$push": push,
                "$set": {"current_question_index": current_question_index},
            },
        )
        return await self.get(user_id, session_id)

    async def set_answer_analysis(
        self, user_id: str, session_id: str, question_id: str, analysis: dict[str, Any]
    ) -> None:
        """Positional `$set` targeting exactly one answer by `question_id` — safe to run
        concurrently with `append_turn` appending a later answer, since neither touches
        the other's slice of the `answers` array. Uses the `$` positional operator
        (matched via the query's `answers.question_id` clause) rather than
        `array_filters` — mongomock, the test-suite's in-memory Mongo, doesn't
        implement array filters, and the positional form is otherwise equivalent here
        since `question_id` is unique within one session's `answers` array."""
        fields = {f"answers.$.{key}": value for key, value in analysis.items()}
        await self._collection.update_one(
            {"_id": session_id, "user_id": user_id, "answers.question_id": question_id},
            {"$set": fields},
        )
