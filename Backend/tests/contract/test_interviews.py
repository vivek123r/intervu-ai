from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.interviews import InterviewRepository
from tests.conftest import MOCK_AUTH_HEADERS

CREATE_BODY = {
    "company": "Acme Corp",
    "role": "Backend Engineer",
    "type": "technical",
    "scheduledAt": "2026-09-01T10:00:00.000Z",
    "timezone": "Asia/Kolkata",
}


def test_list_interviews_empty(client: TestClient) -> None:
    response = client.get("/api/v1/interviews", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json() == []


def test_create_interview_derives_server_fields(client: TestClient) -> None:
    response = client.post("/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_BODY)
    assert response.status_code == 201

    body = response.json()
    assert body["id"].startswith("interview-")
    assert body["companyMark"] == "A"
    assert body["status"] == "upcoming"
    assert body["readiness"] == 0
    assert body["preparationProgress"] == 0
    assert body["roundNumber"] == 1
    assert body["totalRounds"] == 1
    assert len(body["rounds"]) == 1
    assert body["rounds"][0]["status"] == "current"
    assert "meetingUrl" not in body
    assert "recruiter" not in body
    assert "interviewers" not in body
    assert body["scheduledAt"] == "2026-09-01T10:00:00.000Z"


def test_get_interview_round_trip(client: TestClient) -> None:
    created = client.post(
        "/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_BODY
    ).json()

    response = client.get(f"/api/v1/interviews/{created['id']}", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_missing_interview_returns_envelope(client: TestClient) -> None:
    response = client.get("/api/v1/interviews/interview-missing", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "INTERVIEW_NOT_FOUND"


def test_update_interview_partial(client: TestClient) -> None:
    created = client.post(
        "/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_BODY
    ).json()

    response = client.patch(
        f"/api/v1/interviews/{created['id']}",
        headers=MOCK_AUTH_HEADERS,
        json={"meetingUrl": "https://meet.example.com/x"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meetingUrl"] == "https://meet.example.com/x"
    assert body["company"] == created["company"]


def test_confirm_interview_transitions_status(client: TestClient) -> None:
    created = client.post(
        "/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_BODY
    ).json()

    response = client.post(
        f"/api/v1/interviews/{created['id']}/confirm", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"


def test_delete_interview_returns_204_then_404(client: TestClient) -> None:
    created = client.post(
        "/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_BODY
    ).json()

    delete_response = client.delete(
        f"/api/v1/interviews/{created['id']}", headers=MOCK_AUTH_HEADERS
    )
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    get_response = client.get(f"/api/v1/interviews/{created['id']}", headers=MOCK_AUTH_HEADERS)
    assert get_response.status_code == 404


def test_delete_missing_interview_404s(client: TestClient) -> None:
    response = client.delete("/api/v1/interviews/interview-missing", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 404


async def test_delete_interview_cascades_preparation_data(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    created = client.post(
        "/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_BODY
    ).json()
    client.post(f"/api/v1/interviews/{created['id']}/prepare", headers=MOCK_AUTH_HEADERS)
    assert await db.preparation_tasks.count_documents({"interview_id": created["id"]}) > 0

    client.delete(f"/api/v1/interviews/{created['id']}", headers=MOCK_AUTH_HEADERS)

    assert await db.preparation_tasks.count_documents({"interview_id": created["id"]}) == 0
    assert await db.questions.count_documents({"interview_id": created["id"]}) == 0
    assert await db.preparation_plans.find_one({"_id": created["id"]}) is None


async def test_repository_get_is_scoped_by_user_id(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    owner_id = client.get("/api/v1/me", headers=MOCK_AUTH_HEADERS).json()["id"]
    created = client.post(
        "/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_BODY
    ).json()

    repo = InterviewRepository(db)
    assert await repo.get("user-someone-else", created["id"]) is None
    assert await repo.get(owner_id, created["id"]) is not None
