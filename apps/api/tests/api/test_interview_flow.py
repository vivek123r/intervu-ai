from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from httpx import AsyncClient


def interview_payload() -> dict[str, object]:
    return {
        "company_name": "Acme Labs",
        "role_title": "Backend Engineer",
        "interview_type": "technical",
        "round_name": "Technical Round 2",
        "round_number": 2,
        "total_rounds": 4,
        "scheduled_at": (datetime.now(UTC) + timedelta(days=3)).isoformat(),
        "timezone": "Asia/Kolkata",
        "duration_minutes": 60,
        "meeting_type": "Google Meet",
        "meeting_url": "https://meet.google.com/sample-interview",
        "rounds": [
            {"position": 1, "name": "Recruiter Screen", "type": "recruiter", "status": "completed"},
            {"position": 2, "name": "Technical", "type": "technical", "status": "upcoming"},
        ],
    }


async def test_interview_crud_and_ownership_scope(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    created = await client.post(
        "/api/v1/interviews", json=interview_payload(), headers=auth_headers
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["company_name"] == "Acme Labs"
    assert len(body["rounds"]) == 2

    listed = await client.get("/api/v1/interviews", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    updated = await client.patch(
        f"/api/v1/interviews/{body['id']}",
        json={"notes": "Ask about the event ingestion architecture."},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert "event ingestion" in updated.json()["notes"]

    missing = await client.get(f"/api/v1/interviews/{uuid4()}", headers=auth_headers)
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "INTERVIEW_NOT_FOUND"


async def test_mock_calendar_detects_then_user_confirms(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    connected = await client.post(
        "/api/v1/calendar/connect",
        json={"redirect_path": "/onboarding"},
        headers=auth_headers,
    )
    assert connected.status_code == 200
    assert connected.json()["mode"] == "mock"

    synced = await client.post("/api/v1/calendar/sync", headers=auth_headers)
    assert synced.status_code == 200, synced.text
    result = synced.json()
    assert result["created"] == 2
    assert result["ignored"] == 1

    interview_id = result["interview_ids"][0]
    confirmed = await client.post(
        f"/api/v1/interviews/{interview_id}/confirm",
        json={"confirmed": True},
        headers=auth_headers,
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "upcoming"


async def test_preparation_and_adaptive_mock_report(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    created = await client.post(
        "/api/v1/interviews", json=interview_payload(), headers=auth_headers
    )
    interview_id = created.json()["id"]

    job_description = """
    Acme Labs is hiring a Backend Engineer to design resilient Node.js services.
    Required: Node.js, SQL, REST APIs, system design, and production debugging.
    Preferred: Redis, Docker, AWS. Own reliability, observability, and database performance.
    Candidates should have at least three years of backend engineering experience.
    """
    jd_response = await client.post(
        "/api/v1/job-descriptions",
        json={
            "interview_id": interview_id,
            "raw_text": job_description,
            "company_name": "Acme Labs",
            "role_title": "Backend Engineer",
        },
        headers=auth_headers,
    )
    assert jd_response.status_code == 201, jd_response.text
    assert jd_response.json()["parse_status"] == "completed"

    prepared = await client.post(f"/api/v1/interviews/{interview_id}/prepare", headers=auth_headers)
    assert prepared.status_code == 200, prepared.text
    assert len(prepared.json()["tasks"]) == 4

    session_response = await client.post(
        "/api/v1/practice/sessions",
        json={
            "interview_id": interview_id,
            "mode": "technical",
            "difficulty": "hard",
            "interviewer_style": "strict_technical_lead",
            "planned_duration": 20,
            "focus_areas": ["SQL Transactions"],
        },
        headers=auth_headers,
    )
    assert session_response.status_code == 201, session_response.text
    session_id = session_response.json()["id"]

    started = await client.post(
        f"/api/v1/practice/sessions/{session_id}/start", headers=auth_headers
    )
    assert started.status_code == 200, started.text
    question = started.json()["current_question"]

    answer = await client.post(
        f"/api/v1/practice/sessions/{session_id}/answers",
        json={
            "question_id": question["id"],
            "transcript": (
                "I would use a transaction with an optimistic version check, retry conflicts, "
                "and record contention metrics. For high-contention rows I would consider a "
                "short pessimistic lock and keep external calls outside the transaction."
            ),
            "started_at": datetime.now(UTC).isoformat(),
            "ended_at": (datetime.now(UTC) + timedelta(seconds=45)).isoformat(),
            "duration_ms": 45_000,
            "pause_markers_ms": [500, 2_100],
        },
        headers=auth_headers,
    )
    assert answer.status_code == 200, answer.text
    assert answer.json()["next_question"]["is_follow_up"] is True

    completed = await client.post(
        f"/api/v1/practice/sessions/{session_id}/complete", headers=auth_headers
    )
    assert completed.status_code == 200, completed.text
    report = completed.json()
    assert report["overall_score"] > 0
    assert report["speech_metrics"]["total_words"] > 20

    restored = await client.get(
        f"/api/v1/practice/sessions/{session_id}/report", headers=auth_headers
    )
    assert restored.status_code == 200
    assert len(restored.json()["answers"]) == 1

    analytics = await client.get("/api/v1/analytics/overview", headers=auth_headers)
    assert analytics.status_code == 200
    assert analytics.json()["questions_answered"] == 2
