from datetime import timedelta
from typing import Any

from fastapi.testclient import TestClient

from app.core.timeutils import utcnow
from app.schemas.common import JobStatus, JobType
from app.services.jobs import JOB_DURATION_SECONDS, JobService
from tests.conftest import MOCK_AUTH_HEADERS

CREATE_BODY = {
    "company": "Acme Corp",
    "role": "Backend Engineer",
    "type": "technical",
    "scheduledAt": "2026-09-01T10:00:00.000Z",
    "timezone": "Asia/Kolkata",
}


def _create_interview(client: TestClient) -> str:
    return client.post("/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_BODY).json()[
        "id"
    ]


def test_preparation_is_empty_before_generation(client: TestClient) -> None:
    interview_id = _create_interview(client)

    response = client.get(
        f"/api/v1/interviews/{interview_id}/preparation", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code == 200
    assert response.json() == {"tasks": [], "questions": [], "timeline": []}


def test_prepare_returns_job_and_generates_plan(client: TestClient) -> None:
    interview_id = _create_interview(client)

    prepare_response = client.post(
        f"/api/v1/interviews/{interview_id}/prepare", headers=MOCK_AUTH_HEADERS
    )
    assert prepare_response.status_code == 202
    job = prepare_response.json()
    assert job["type"] == "preparation_generation"
    assert job["jobId"].startswith("job-")

    plan_response = client.get(
        f"/api/v1/interviews/{interview_id}/preparation", headers=MOCK_AUTH_HEADERS
    )
    plan = plan_response.json()
    assert len(plan["tasks"]) == 8
    assert len(plan["questions"]) == 4
    assert len(plan["timeline"]) == 5
    assert all(task["status"] == "pending" for task in plan["tasks"])
    assert "followUp" not in plan["questions"][0]


def test_prepare_404s_for_unowned_interview(client: TestClient) -> None:
    response = client.post(
        "/api/v1/interviews/interview-missing/prepare", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "INTERVIEW_NOT_FOUND"


class _FakeJobRepo:
    def __init__(self) -> None:
        self.doc: dict[str, Any] | None = None

    async def insert(self, doc: dict[str, Any]) -> None:
        self.doc = doc

    async def get(self, user_id: str, job_id: str) -> dict[str, Any] | None:
        return self.doc


async def test_job_progresses_from_processing_to_completed() -> None:
    repo = _FakeJobRepo()
    service = JobService(repo)  # type: ignore[arg-type]

    handle = await service.create("user-1", JobType.PREPARATION_GENERATION, "interview-1")
    assert handle.type == JobType.PREPARATION_GENERATION

    assert repo.doc is not None
    processing = await service.get("user-1", handle.job_id)
    assert processing.status == JobStatus.PROCESSING
    assert processing.result_id is None

    repo.doc["created_at"] = utcnow() - timedelta(seconds=JOB_DURATION_SECONDS + 1)
    completed = await service.get("user-1", handle.job_id)
    assert completed.status == JobStatus.COMPLETED
    assert completed.result_id == "interview-1"


def test_update_task_status(client: TestClient) -> None:
    interview_id = _create_interview(client)
    client.post(f"/api/v1/interviews/{interview_id}/prepare", headers=MOCK_AUTH_HEADERS)
    plan = client.get(
        f"/api/v1/interviews/{interview_id}/preparation", headers=MOCK_AUTH_HEADERS
    ).json()
    task_id = plan["tasks"][0]["id"]

    response = client.patch(
        f"/api/v1/preparation/tasks/{task_id}",
        headers=MOCK_AUTH_HEADERS,
        json={"status": "completed"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_update_missing_task_404s(client: TestClient) -> None:
    response = client.patch(
        "/api/v1/preparation/tasks/task-missing",
        headers=MOCK_AUTH_HEADERS,
        json={"status": "completed"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "TASK_NOT_FOUND"
