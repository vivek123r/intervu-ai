import logging
from typing import Any

from pymongo.errors import OperationFailure

from app.config import get_settings
from app.db.mongo import MongoDatabase

logger = logging.getLogger(__name__)


async def _create_index(collection: Any, *args: Any, **kwargs: Any) -> None:
    try:
        await collection.create_index(*args, **kwargs)
    except OperationFailure as e:
        if e.code in (85, 86) or "IndexKeySpecsConflict" in str(e) or "IndexOptionsConflict" in str(e) or "already exists" in str(e):
            name = kwargs.get("name")
            if not name and args:
                keys = args[0]
                if isinstance(keys, str):
                    name = f"{keys}_1"
                elif isinstance(keys, list):
                    name = "_".join(f"{k}_{v}" for k, v in keys)
            logger.info("Resolving index spec conflict on %s (%s)...", getattr(collection, "name", "collection"), name)
            if name:
                try:
                    await collection.drop_index(name)
                except Exception:
                    pass
            elif args:
                try:
                    await collection.drop_index(args[0])
                except Exception:
                    pass
            await collection.create_index(*args, **kwargs)
        else:
            raise


async def ensure_indexes(db: MongoDatabase) -> None:
    await _create_index(db.users, "firebase_uid", unique=True, sparse=True)

    await _create_index(db.interviews, "user_id")
    await _create_index(
        db.interviews,
        [("user_id", 1), ("provider_event_id", 1)],
        unique=True,
        # sparse only excludes documents missing the field — every manually-created
        # interview sets provider_event_id to None explicitly, so it still needs a
        # partial filter (not sparse) to exclude nulls from the uniqueness check.
        partialFilterExpression={"provider_event_id": {"$type": "string"}},
    )

    await _create_index(db.preparation_tasks, "interview_id")
    await _create_index(db.preparation_tasks, "user_id")
    await _create_index(db.questions, "interview_id")
    # preparation_plans uses interview_id as its _id directly — no separate index needed.

    await _create_index(db.calendar_connections, "user_id", unique=True)

    await _create_index(db.resumes, "user_id")
    await _create_index(db.job_descriptions, "interview_id")
    await _create_index(db.job_descriptions, "user_id")

    await _create_index(db.notifications, [("user_id", 1), ("created_at", -1)])

    await _create_index(db.jobs, "user_id")

    await _create_index(db.practice_sessions, "user_id")
    await _create_index(db.reports, "session_id", unique=True)
    await _create_index(db.reports, "user_id")

    # Completion insights are keyed by report id (_id) — this index only covers the
    # ownership filter every read applies alongside it.
    await _create_index(db.session_completions, "user_id")

    # Post-interview Q&A threads are keyed by report id (_id) too, one doc per
    # report holding the whole turn list.
    await _create_index(db.report_conversations, "user_id")

    # The history log is always read newest-first for one user.
    await _create_index(db.interview_history, [("user_id", 1), ("started_at", -1)])
    # `code` is shown to the user and used to refer to a session, so it must
    # not repeat within an account.
    await _create_index(db.interview_history, [("user_id", 1), ("code", 1)], unique=True)

    await _create_index(db.socket_tickets, "expires_at", expireAfterSeconds=0)

    # Raw transcripts and the interviewer log live on the session document and
    # were previously kept forever. The report they produce is the artefact the
    # candidate came for and is deliberately not expired.
    retention_days = get_settings().practice_session_retention_days
    if retention_days > 0:
        await _create_index(
            db.practice_sessions,
            "started_at",
            expireAfterSeconds=retention_days * 24 * 60 * 60,
        )

    # Keyed by `_id` (the user id) — the repository queries `{"_id": user_id}`, so
    # a separate unique index on a `user_id` field served no query.

    # Coding Practice platform indexes
    await _create_index(db.coding_problems, "slug", unique=True)
    await _create_index(db.coding_problems, "number")
    await _create_index(
        db.coding_submissions,
        [("user_id", 1), ("problem_slug", 1), ("created_at", -1)],
    )
    await _create_index(db.coding_submissions, [("user_id", 1), ("created_at", -1)])
    await _create_index(
        db.coding_drafts,
        [("user_id", 1), ("problem_slug", 1), ("language", 1)],
        unique=True,
    )
