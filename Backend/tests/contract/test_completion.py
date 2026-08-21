"""GET /reports/{id}/completion and GET /sessions/{id}/completion — see
docs/API-CONTRACT.md's "Session completion" section."""

from typing import Any

from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.seed.fixtures import (
    DEMO_REPORT_ID,
    DEMO_SESSION_ID,
    INTERVIEW_HISTORY,
    PRACTICE_SESSIONS,
    REPORTS,
    SESSION_COMPLETIONS,
)
from tests.conftest import MOCK_AUTH_HEADERS

CONFIG_BODY = {
    "role": "Senior Backend Engineer",
    "company": "Northstar Labs",
    "type": "system_design",
    "difficulty": "hard",
    "duration": 30,
    "focusAreas": ["System design", "SQL"],
    "interviewerStyle": "Senior engineer",
}

DIMENSION_KEYS = ["quality", "relevance", "structure", "depth", "communication", "clarity"]


def _current_user_id(client: TestClient) -> str:
    return str(client.get("/api/v1/me", headers=MOCK_AUTH_HEADERS).json()["id"])


async def _seed_demo_session(db: AsyncIOMotorDatabase, user_id: str) -> None:
    """The demo report, the session that produced it, its history log, and the authored
    completion insight — the four records the completion view is composed from."""

    def owned(docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [{**doc, "user_id": user_id} for doc in docs]

    await db.practice_sessions.insert_many(owned(PRACTICE_SESSIONS))
    await db.reports.insert_many(owned(REPORTS))
    await db.interview_history.insert_many(owned(INTERVIEW_HISTORY))
    await db.session_completions.insert_many(owned(SESSION_COMPLETIONS))


def _complete_a_live_session(client: TestClient) -> str:
    """Runs a session end to end and returns its report id — the path with no authored
    insight document behind it."""
    session_id = client.post(
        "/api/v1/sessions", headers=MOCK_AUTH_HEADERS, json=CONFIG_BODY
    ).json()["id"]
    started = client.post(f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS).json()
    client.post(
        f"/api/v1/sessions/{session_id}/answers",
        headers=MOCK_AUTH_HEADERS,
        json={
            "questionId": started["questions"][0]["id"],
            "transcript": "We cached the account summary and invalidated it on writes. " * 4,
            "startedAt": "2026-08-15T02:00:00.000Z",
            "endedAt": "2026-08-15T02:01:30.000Z",
            "durationMs": 90000,
        },
    )
    client.post(f"/api/v1/sessions/{session_id}/complete", headers=MOCK_AUTH_HEADERS)
    return str(
        client.get(f"/api/v1/sessions/{session_id}/report", headers=MOCK_AUTH_HEADERS).json()["id"]
    )


async def test_completion_composes_seeded_report_session_and_history(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    await _seed_demo_session(db, _current_user_id(client))

    response = client.get(f"/api/v1/reports/{DEMO_REPORT_ID}/completion", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()

    assert body["reportId"] == DEMO_REPORT_ID
    assert body["sessionId"] == DEMO_SESSION_ID
    # Session identity comes off the history log, the role/company off the session config.
    assert body["code"] == "IVU-7429-A"
    assert body["mode"] == "System design mock"
    assert body["role"] == "Senior Backend Engineer"
    assert body["durationMinutes"] == 30
    assert body["questionsAnswered"] == 2

    # Authored copy comes from the session_completions document, the score from the report.
    assert body["overall"]["score"] == 82
    assert body["overall"]["band"] == "Interview ready"
    assert body["overall"]["topPercent"] == 12
    # history-01 (92) against the last completed entry before it, history-04 (88).
    assert body["overall"]["deltaFromPrevious"] == 4


async def test_completion_metrics_and_signature_track_the_report(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    await _seed_demo_session(db, _current_user_id(client))

    body = client.get(
        f"/api/v1/reports/{DEMO_REPORT_ID}/completion", headers=MOCK_AUTH_HEADERS
    ).json()

    assert [metric["key"] for metric in body["metrics"]] == DIMENSION_KEYS
    assert [axis["key"] for axis in body["signature"]] == DIMENSION_KEYS
    # Both views of a dimension read the same number — structure is 76 in the report.
    structure_metric = next(m for m in body["metrics"] if m["key"] == "structure")
    structure_axis = next(a for a in body["signature"] if a["key"] == "structure")
    assert structure_metric["value"] == structure_axis["value"] == 76
    assert structure_metric["band"] == "Standard"
    assert structure_metric["tone"] == "neutral"
    assert structure_metric["delta"] == "+11"

    quality = next(m for m in body["metrics"] if m["key"] == "quality")
    assert quality["value"] == 84
    assert quality["band"] == "Optimal"
    assert quality["tone"] == "positive"


async def test_completion_questions_join_reviews_to_the_asked_questions(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    await _seed_demo_session(db, _current_user_id(client))

    body = client.get(
        f"/api/v1/reports/{DEMO_REPORT_ID}/completion", headers=MOCK_AUTH_HEADERS
    ).json()

    assert [question["position"] for question in body["questions"]] == [1, 2]
    first, second = body["questions"]

    assert first["id"] == "q-cache"
    assert first["topic"] == "Caching"
    assert first["difficulty"] == "hard"
    assert first["durationSeconds"] == 96
    assert first["score"] == 8.2
    assert first["verdict"] == "strong"
    assert first["answer"].startswith("We cached the read-heavy account summary")
    assert first["missing"] == [
        "Stampede protection",
        "Concurrent write ordering",
        "Operational alert threshold",
    ]

    assert second["id"] == "q-incident"
    assert second["verdict"] == "solid"


async def test_completion_protocols_are_prioritised(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    await _seed_demo_session(db, _current_user_id(client))

    body = client.get(
        f"/api/v1/reports/{DEMO_REPORT_ID}/completion", headers=MOCK_AUTH_HEADERS
    ).json()

    assert [protocol["priority"] for protocol in body["protocols"]] == [
        "high",
        "medium",
        "low",
    ]
    assert body["protocols"][0]["focusArea"] == "Answer structure"


async def test_completion_by_session_id_matches_by_report_id(
    client: TestClient, db: AsyncIOMotorDatabase
) -> None:
    await _seed_demo_session(db, _current_user_id(client))

    by_session = client.get(
        f"/api/v1/sessions/{DEMO_SESSION_ID}/completion", headers=MOCK_AUTH_HEADERS
    )
    by_report = client.get(
        f"/api/v1/reports/{DEMO_REPORT_ID}/completion", headers=MOCK_AUTH_HEADERS
    )
    assert by_session.status_code == 200
    assert by_session.json() == by_report.json()


def test_completion_falls_back_to_derived_insights_for_a_live_session(
    client: TestClient,
) -> None:
    report_id = _complete_a_live_session(client)

    response = client.get(f"/api/v1/reports/{report_id}/completion", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()

    # No authored document and no history row: band and standing are derived, the delta
    # and every metric delta stay absent rather than being invented.
    assert body["overall"]["band"]
    assert 1 <= body["overall"]["topPercent"] <= 99
    assert body["overall"]["deltaFromPrevious"] == 0
    assert all(metric["delta"] is None for metric in body["metrics"])
    assert body["code"].startswith("IVU-")
    assert body["mode"] == "System design mock"
    assert body["role"] == "Senior Backend Engineer"
    assert len(body["questions"]) == 1
    assert body["questions"][0]["topic"]


def test_completion_404s_for_a_report_that_does_not_exist(client: TestClient) -> None:
    response = client.get(
        "/api/v1/reports/report-does-not-exist/completion", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "REPORT_NOT_FOUND"


def test_completion_404s_before_a_session_is_completed(client: TestClient) -> None:
    session_id = client.post(
        "/api/v1/sessions", headers=MOCK_AUTH_HEADERS, json=CONFIG_BODY
    ).json()["id"]

    response = client.get(f"/api/v1/sessions/{session_id}/completion", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "REPORT_NOT_FOUND"
