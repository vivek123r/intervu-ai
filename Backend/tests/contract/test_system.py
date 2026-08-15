from fastapi.testclient import TestClient

from tests.conftest import MOCK_AUTH_HEADERS


def test_me_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/me")
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "UNAUTHENTICATED"
    assert "details" in body["error"]


def test_me_rejects_wrong_mock_token(client: TestClient) -> None:
    response = client.get("/api/v1/me", headers={"Authorization": "Bearer wrong-token"})
    assert response.status_code == 401


def test_me_echoes_request_id_on_error(client: TestClient) -> None:
    response = client.get("/api/v1/me", headers={"X-Request-ID": "trace-42"})
    assert response.status_code == 401
    assert response.json()["error"]["requestId"] == "trace-42"
    assert response.headers["x-request-id"] == "trace-42"


def test_me_provisions_and_returns_demo_user(client: TestClient) -> None:
    response = client.get("/api/v1/me", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200

    body = response.json()
    assert body["id"].startswith("user-")
    assert body["email"] == "demo@intervu.ai"
    assert body["displayName"] == "Demo User"
    assert body["avatarUrl"] is None
    assert "avatarUrl" in body
    assert body["experienceLevel"] == "mid"
    assert isinstance(body["skills"], list)
    assert body["createdAt"].endswith("Z")


def test_me_is_idempotent_across_requests(client: TestClient) -> None:
    first = client.get("/api/v1/me", headers=MOCK_AUTH_HEADERS).json()
    second = client.get("/api/v1/me", headers=MOCK_AUTH_HEADERS).json()
    assert first["id"] == second["id"]


def test_patch_me_updates_partial_fields(client: TestClient) -> None:
    client.get("/api/v1/me", headers=MOCK_AUTH_HEADERS)

    response = client.patch(
        "/api/v1/me", headers=MOCK_AUTH_HEADERS, json={"displayName": "Alex Morgan"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["displayName"] == "Alex Morgan"
    assert body["email"] == "demo@intervu.ai"


def test_patch_me_ignores_unknown_fields(client: TestClient) -> None:
    client.get("/api/v1/me", headers=MOCK_AUTH_HEADERS)

    body = {"bogusField": "x", "timezone": "Asia/Kolkata"}
    response = client.patch("/api/v1/me", headers=MOCK_AUTH_HEADERS, json=body)
    assert response.status_code == 200
    assert response.json()["timezone"] == "Asia/Kolkata"
