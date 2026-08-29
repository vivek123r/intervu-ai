import time

from fastapi.testclient import TestClient

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


def _create_session(client: TestClient) -> str:
    return client.post("/api/v1/sessions", headers=MOCK_AUTH_HEADERS, json=CONFIG_BODY).json()["id"]


def _wait_for_analysis(client: TestClient, session_id: str, question_id: str) -> dict:
    """Answer scoring now runs in the background (see services/analysis.py) — poll
    briefly rather than assuming it already landed by the time the POST returns."""
    for _ in range(50):
        session = client.get(f"/api/v1/sessions/{session_id}", headers=MOCK_AUTH_HEADERS).json()
        answer = next(a for a in session["answers"] if a["questionId"] == question_id)
        if answer["analysisStatus"] != "pending":
            return answer
        time.sleep(0.05)
    raise AssertionError(f"Analysis for {question_id} never left pending")


def test_create_session_is_ready_with_no_questions(client: TestClient) -> None:
    response = client.post("/api/v1/sessions", headers=MOCK_AUTH_HEADERS, json=CONFIG_BODY)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "ready"
    assert body["questions"] == []
    assert body["answers"] == []
    assert body["currentQuestionIndex"] == 0
    assert "startedAt" not in body


def test_start_session_generates_questions_and_becomes_active(client: TestClient) -> None:
    session_id = _create_session(client)

    response = client.post(f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "active"
    assert len(body["questions"]) == 1
    assert body["plannedQuestionCount"] == 5
    assert body["startedAt"] is not None
    assert body["questions"][0]["difficulty"] == "hard"


def test_submit_answer_scores_and_advances_index(client: TestClient) -> None:
    session_id = _create_session(client)
    started = client.post(f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS).json()
    question_id = started["questions"][0]["id"]

    body = {
        "questionId": question_id,
        "transcript": "We cached the account summary and invalidated it on writes " * 3,
        "startedAt": "2026-08-15T02:00:00.000Z",
        "endedAt": "2026-08-15T02:01:30.000Z",
        "durationMs": 90000,
    }
    response = client.post(
        f"/api/v1/sessions/{session_id}/answers", headers=MOCK_AUTH_HEADERS, json=body
    )
    assert response.status_code == 200
    updated = response.json()
    assert len(updated["answers"]) == 1
    # Scoring is backgrounded — the answer is recorded immediately, pending or not.
    assert updated["answers"][0]["analysisStatus"] in ("pending", "complete")
    assert updated["currentQuestionIndex"] == 1
    assert len(updated["questions"]) == 2

    scored = _wait_for_analysis(client, session_id, question_id)
    assert scored["analysisStatus"] == "complete"
    assert scored["score"] > 6.4


def test_submit_answer_index_never_exceeds_last_question(client: TestClient) -> None:
    session_id = _create_session(client)
    started = client.post(f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS).json()

    current_session = started
    # Answer 5 planned questions dynamically
    for _ in range(5):
        curr_idx = current_session["currentQuestionIndex"]
        question = current_session["questions"][curr_idx]
        body = {
            "questionId": question["id"],
            "transcript": "We cached the account summary in Redis with a TTL of 30 seconds and invalidated on write operations to ensure strict consistency.",
            "startedAt": "2026-08-15T02:00:00.000Z",
            "endedAt": "2026-08-15T02:00:30.000Z",
            "durationMs": 30000,
        }
        current_session = client.post(
            f"/api/v1/sessions/{session_id}/answers", headers=MOCK_AUTH_HEADERS, json=body
        ).json()

    assert current_session["currentQuestionIndex"] == len(current_session["questions"]) - 1
    assert len(current_session["answers"]) == 5


def test_submit_answer_rejects_unknown_question_id(client: TestClient) -> None:
    session_id = _create_session(client)
    client.post(f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS)

    body = {
        "questionId": "q-does-not-exist",
        "transcript": "Some answer.",
        "startedAt": "2026-08-15T02:00:00.000Z",
        "endedAt": "2026-08-15T02:00:30.000Z",
        "durationMs": 30000,
    }
    response = client.post(
        f"/api/v1/sessions/{session_id}/answers", headers=MOCK_AUTH_HEADERS, json=body
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_complete_session_generates_report_reachable_two_ways(client: TestClient) -> None:
    session_id = _create_session(client)
    started = client.post(f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS).json()

    body = {
        "questionId": started["questions"][0]["id"],
        "transcript": "A detailed and thoughtful answer about system design trade-offs.",
        "startedAt": "2026-08-15T02:00:00.000Z",
        "endedAt": "2026-08-15T02:01:00.000Z",
        "durationMs": 60000,
    }
    client.post(f"/api/v1/sessions/{session_id}/answers", headers=MOCK_AUTH_HEADERS, json=body)

    complete_response = client.post(
        f"/api/v1/sessions/{session_id}/complete", headers=MOCK_AUTH_HEADERS
    )
    assert complete_response.status_code == 202
    handle = complete_response.json()
    assert handle["type"] == "report_generation"
    assert handle["sessionId"] == session_id
    assert handle["jobId"].startswith("job-")

    by_session = client.get(
        f"/api/v1/sessions/{session_id}/report", headers=MOCK_AUTH_HEADERS
    ).json()
    assert by_session["sessionId"] == session_id
    assert 0 <= by_session["overall"] <= 100
    assert len(by_session["answers"]) == 1

    by_id = client.get(f"/api/v1/reports/{by_session['id']}", headers=MOCK_AUTH_HEADERS).json()
    assert by_id["id"] == by_session["id"]


def _run_and_complete_session(client: TestClient) -> str:
    session_id = _create_session(client)
    started = client.post(f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS).json()
    body = {
        "questionId": started["questions"][0]["id"],
        "transcript": "A detailed and thoughtful answer about system design trade-offs.",
        "startedAt": "2026-08-15T02:00:00.000Z",
        "endedAt": "2026-08-15T02:01:00.000Z",
        "durationMs": 60000,
    }
    client.post(f"/api/v1/sessions/{session_id}/answers", headers=MOCK_AUTH_HEADERS, json=body)
    client.post(f"/api/v1/sessions/{session_id}/complete", headers=MOCK_AUTH_HEADERS)
    return session_id


def test_completed_session_is_logged_to_history_with_a_real_delta(client: TestClient) -> None:
    first_session_id = _run_and_complete_session(client)

    history_after_first = client.get(
        "/api/v1/history/sessions", headers=MOCK_AUTH_HEADERS
    ).json()
    assert len(history_after_first) == 1
    first_row = history_after_first[0]
    assert first_row["status"] == "completed"
    assert first_row["reportId"] is not None
    assert [m["key"] for m in first_row["metrics"]] == [
        "quality",
        "confidence",
        "behavior",
        "accuracy",
        "vagueness",
        "sentiment",
    ]

    first_completion = client.get(
        f"/api/v1/sessions/{first_session_id}/completion", headers=MOCK_AUTH_HEADERS
    ).json()
    # No earlier completed session to compare against yet.
    assert first_completion["overall"]["deltaFromPrevious"] == 0

    second_session_id = _run_and_complete_session(client)

    history_after_second = client.get(
        "/api/v1/history/sessions", headers=MOCK_AUTH_HEADERS
    ).json()
    assert len(history_after_second) == 2

    second_completion = client.get(
        f"/api/v1/sessions/{second_session_id}/completion", headers=MOCK_AUTH_HEADERS
    ).json()
    expected_delta = second_completion["overall"]["score"] - first_completion["overall"]["score"]
    assert second_completion["overall"]["deltaFromPrevious"] == expected_delta


def test_report_404s_before_completion(client: TestClient) -> None:
    session_id = _create_session(client)
    response = client.get(f"/api/v1/sessions/{session_id}/report", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "REPORT_NOT_FOUND"


def test_socket_ticket_is_short_lived_and_session_scoped(client: TestClient) -> None:
    session_id = _create_session(client)

    response = client.post(
        f"/api/v1/sessions/{session_id}/socket-ticket", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ticket"].startswith("ticket-")
    assert body["expiresAt"] is not None


def test_socket_ticket_404s_for_missing_session(client: TestClient) -> None:
    response = client.post(
        "/api/v1/sessions/session-missing/socket-ticket", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SESSION_NOT_FOUND"


def test_create_session_rejects_an_absurd_duration(client: TestClient) -> None:
    """`duration` feeds `max(3, duration // 6)`, so an unbounded int let a single
    request plan 16,666 questions."""
    response = client.post(
        "/api/v1/sessions",
        headers=MOCK_AUTH_HEADERS,
        json={**CONFIG_BODY, "duration": 100000},
    )
    assert response.status_code == 422


def test_create_session_rejects_a_zero_duration(client: TestClient) -> None:
    response = client.post(
        "/api/v1/sessions", headers=MOCK_AUTH_HEADERS, json={**CONFIG_BODY, "duration": 0}
    )
    assert response.status_code == 422


def test_create_session_rejects_an_empty_role(client: TestClient) -> None:
    """An empty role went straight into the interviewer's prompt."""
    response = client.post(
        "/api/v1/sessions", headers=MOCK_AUTH_HEADERS, json={**CONFIG_BODY, "role": ""}
    )
    assert response.status_code == 422


def test_create_session_caps_focus_areas(client: TestClient) -> None:
    """The client-side cap of 4 was cosmetic — nothing enforced it on the wire."""
    response = client.post(
        "/api/v1/sessions",
        headers=MOCK_AUTH_HEADERS,
        json={**CONFIG_BODY, "focusAreas": [f"Area {i}" for i in range(20)]},
    )
    assert response.status_code == 422


def test_create_session_accepts_an_interview_id(client: TestClient) -> None:
    """A practice run started from a scheduled interview keeps that interview's
    identity, so a completed mock can feed back into its preparation progress."""
    response = client.post(
        "/api/v1/sessions",
        headers=MOCK_AUTH_HEADERS,
        json={**CONFIG_BODY, "interviewId": "interview-123"},
    )
    assert response.status_code == 201
    assert response.json()["config"]["interviewId"] == "interview-123"


def test_start_session_is_idempotent(client: TestClient) -> None:
    """The client's 12s REST fallback can fire while the WebSocket's own start is
    merely slow on TTS. This used to `$set` `questions` to a brand-new array, wiping
    the question the candidate was already answering — their next submit then failed
    with "that question isn't part of this session"."""
    session_id = _create_session(client)

    first = client.post(f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS)
    assert first.status_code == 200
    original = first.json()["questions"]
    assert original

    second = client.post(f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS)
    assert second.status_code == 200
    assert second.json()["questions"] == original
