from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.seed.fixtures import INTERVIEW_HISTORY
from tests.conftest import MOCK_AUTH_HEADERS

METRIC_KEYS = ["quality", "confidence", "behavior", "accuracy", "vagueness", "sentiment"]


async def _seed_history(db: AsyncIOMotorDatabase, user_id: str) -> None:
    """Inserts the demo log directly — history entries are produced by completed practice
    sessions, so there is no write endpoint to go through."""
    await db.interview_history.insert_many(
        [{**doc, "user_id": user_id} for doc in INTERVIEW_HISTORY]
    )


def _current_user_id(client: TestClient) -> str:
    return str(client.get("/api/v1/me", headers=MOCK_AUTH_HEADERS).json()["id"])


def test_history_is_empty_for_new_user(client: TestClient) -> None:
    response = client.get("/api/v1/history/sessions", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json() == []


async def test_history_returns_seeded_sessions_newest_first(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    await _seed_history(db, _current_user_id(client))

    response = client.get("/api/v1/history/sessions", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()

    assert len(body) == len(INTERVIEW_HISTORY)
    started = [entry["startedAt"] for entry in body]
    assert started == sorted(started, reverse=True)

    first = body[0]
    assert first["code"] == "IVU-7429-A"
    assert first["status"] == "completed"
    assert first["reportId"] == "report-demo-01"
    assert first["startedAt"].endswith("Z")
    assert [metric["key"] for metric in first["metrics"]] == METRIC_KEYS
    assert first["metrics"][0] == {
        "key": "quality",
        "label": "Quality",
        "value": "High",
        "tone": "positive",
    }


async def test_processing_history_entry_keeps_a_null_report_id(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    await _seed_history(db, _current_user_id(client))

    body = client.get("/api/v1/history/sessions", headers=MOCK_AUTH_HEADERS).json()
    processing = next(entry for entry in body if entry["status"] == "processing")

    # Present-and-null, not absent — the frontend switches on it to disable "Analyze".
    assert "reportId" in processing
    assert processing["reportId"] is None


async def test_delete_history_session(client: TestClient, db: AsyncIOMotorDatabase) -> None:
    await _seed_history(db, _current_user_id(client))

    response = client.delete("/api/v1/history/sessions/history-01", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 204

    remaining = client.get("/api/v1/history/sessions", headers=MOCK_AUTH_HEADERS).json()
    assert len(remaining) == len(INTERVIEW_HISTORY) - 1
    assert all(entry["id"] != "history-01" for entry in remaining)


def test_delete_unknown_history_session_404s(client: TestClient) -> None:
    response = client.delete("/api/v1/history/sessions/history-missing", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "HISTORY_SESSION_NOT_FOUND"


async def test_another_users_history_is_invisible(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    await _seed_history(db, "user-someone-else")

    assert client.get("/api/v1/history/sessions", headers=MOCK_AUTH_HEADERS).json() == []
    # Deleting someone else's entry reads as "not found", never 403.
    assert (
        client.delete("/api/v1/history/sessions/history-01", headers=MOCK_AUTH_HEADERS).status_code
        == 404
    )


async def test_delete_removes_the_report_session_and_transcripts_too(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    """Deleting a history row must actually delete the analysis.

    The confirmation dialog promises this "removes the log and its analysis" and
    "cannot be undone". The delete used to drop only the `interview_history` row,
    leaving the report, the practice session (with every raw transcript and the
    full interviewer log), the completion insight and the Q&A thread in place and
    still fetchable by id — the user merely lost the link to them.
    """
    user_id = _current_user_id(client)
    await db.practice_sessions.insert_one(
        {
            "_id": "session-cascade",
            "user_id": user_id,
            "answers": [{"question_id": "q1", "transcript": "a private answer"}],
            "interviewer_log": [{"speaker": "candidate", "text": "a private answer"}],
        }
    )
    await db.reports.insert_one(
        {"_id": "report-cascade", "user_id": user_id, "session_id": "session-cascade"}
    )
    await db.session_completions.insert_one({"_id": "report-cascade", "user_id": user_id})
    await db.report_conversations.insert_one(
        {"_id": "report-cascade", "user_id": user_id, "turns": []}
    )
    await db.interview_history.insert_one(
        {
            **INTERVIEW_HISTORY[0],
            "_id": "history-cascade",
            "user_id": user_id,
            "report_id": "report-cascade",
        }
    )

    response = client.delete(
        "/api/v1/history/sessions/history-cascade", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code in (200, 204)

    assert await db.interview_history.find_one({"_id": "history-cascade"}) is None
    assert await db.reports.find_one({"_id": "report-cascade"}) is None
    assert await db.session_completions.find_one({"_id": "report-cascade"}) is None
    assert await db.report_conversations.find_one({"_id": "report-cascade"}) is None
    assert await db.practice_sessions.find_one({"_id": "session-cascade"}) is None


async def test_delete_does_not_reach_another_users_records(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    """Every cascaded delete is scoped by user_id, so a guessed report id on someone
    else's history row can't be used to erase their analysis."""
    user_id = _current_user_id(client)
    await db.reports.insert_one(
        {"_id": "report-someone-else", "user_id": "other-user", "session_id": "session-other"}
    )
    await db.interview_history.insert_one(
        {
            **INTERVIEW_HISTORY[0],
            "_id": "history-pointing-elsewhere",
            "user_id": user_id,
            "report_id": "report-someone-else",
        }
    )

    response = client.delete(
        "/api/v1/history/sessions/history-pointing-elsewhere", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code in (200, 204)

    assert await db.reports.find_one({"_id": "report-someone-else"}) is not None
