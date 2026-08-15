from fastapi.testclient import TestClient

from tests.conftest import MOCK_AUTH_HEADERS


def test_calendar_connection_defaults_to_disconnected(client: TestClient) -> None:
    response = client.get("/api/v1/calendar/connection", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["connected"] is False
    assert body["provider"] is None
    assert body["accountEmail"] is None
    assert body["scopes"] == []
    assert body["lastSyncAt"] is None
    assert body["status"] is None


def test_connect_calendar_returns_authorization_url(client: TestClient) -> None:
    response = client.post("/api/v1/calendar/connect", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json()["authorizationUrl"].startswith("https://")

    connection = client.get("/api/v1/calendar/connection", headers=MOCK_AUTH_HEADERS).json()
    assert connection["connected"] is True
    assert connection["provider"] == "google"
    assert connection["status"] == "healthy"


def test_sync_calendar_returns_job_handle_and_bumps_last_sync(client: TestClient) -> None:
    client.post("/api/v1/calendar/connect", headers=MOCK_AUTH_HEADERS)
    before = client.get("/api/v1/calendar/connection", headers=MOCK_AUTH_HEADERS).json()

    response = client.post("/api/v1/calendar/sync", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 202
    body = response.json()
    assert body["type"] == "calendar_sync"
    assert body["jobId"].startswith("job-")

    after = client.get("/api/v1/calendar/connection", headers=MOCK_AUTH_HEADERS).json()
    assert after["lastSyncAt"] != before["lastSyncAt"]


def test_disconnect_calendar_resets_state(client: TestClient) -> None:
    client.post("/api/v1/calendar/connect", headers=MOCK_AUTH_HEADERS)

    response = client.delete("/api/v1/calendar/connection", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 204
    assert response.content == b""

    connection = client.get("/api/v1/calendar/connection", headers=MOCK_AUTH_HEADERS).json()
    assert connection["connected"] is False
    assert connection["provider"] is None
