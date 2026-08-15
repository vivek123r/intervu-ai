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
