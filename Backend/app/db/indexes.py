from app.db.mongo import MongoDatabase


async def ensure_indexes(db: MongoDatabase) -> None:
    await db.users.create_index("firebase_uid", unique=True, sparse=True)

    await db.interviews.create_index("user_id")
    await db.interviews.create_index(
        [("user_id", 1), ("provider_event_id", 1)],
        unique=True,
        # sparse only excludes documents missing the field — every manually-created
        # interview sets provider_event_id to None explicitly, so it still needs a
        # partial filter (not sparse) to exclude nulls from the uniqueness check.
        partialFilterExpression={"provider_event_id": {"$type": "string"}},
    )

    await db.preparation_tasks.create_index("interview_id")
    await db.preparation_tasks.create_index("user_id")
    await db.questions.create_index("interview_id")
    # preparation_plans uses interview_id as its _id directly — no separate index needed.

    await db.calendar_connections.create_index("user_id", unique=True)

    await db.resumes.create_index("user_id")
    await db.job_descriptions.create_index("interview_id")
    await db.job_descriptions.create_index("user_id")

    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

    await db.jobs.create_index("user_id")

    await db.practice_sessions.create_index("user_id")
    await db.reports.create_index("session_id", unique=True)
    await db.reports.create_index("user_id")

    # The history log is always read newest-first for one user.
    await db.interview_history.create_index([("user_id", 1), ("started_at", -1)])

    await db.socket_tickets.create_index("expires_at", expireAfterSeconds=0)

    await db.analytics_overviews.create_index("user_id", unique=True)
