from datetime import UTC, datetime

from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorDatabase

from tests.conftest import MOCK_AUTH_HEADERS


async def _seed_notification(db: AsyncIOMotorDatabase, client: TestClient) -> str:
    user_id = client.get("/api/v1/me", headers=MOCK_AUTH_HEADERS).json()["id"]
    doc = {
        "_id": "note-test-1",
        "user_id": user_id,
        "title": "Test notification",
        "message": "Something happened.",
        "created_at": datetime.now(UTC),
        "read": False,
        "action_href": "/interviews/interview-northstar/prepare",
    }
    await db.notifications.insert_one(doc)
    return doc["_id"]


def test_list_notifications_empty(client: TestClient) -> None:
    response = client.get("/api/v1/notifications", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json() == []


async def test_list_notifications_returns_seeded(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    await _seed_notification(db, client)

    response = client.get("/api/v1/notifications", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == "note-test-1"
    assert body[0]["read"] is False
    assert body[0]["actionHref"] == "/interviews/interview-northstar/prepare"


async def test_mark_notification_read(client: TestClient, db: AsyncIOMotorDatabase) -> None:
    notification_id = await _seed_notification(db, client)

    response = client.post(
        f"/api/v1/notifications/{notification_id}/read", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code == 200
    assert response.json()["read"] is True


def test_mark_missing_notification_404s(client: TestClient) -> None:
    response = client.post(
        "/api/v1/notifications/note-missing/read", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOTIFICATION_NOT_FOUND"
