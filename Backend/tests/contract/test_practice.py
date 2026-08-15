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
    return client.post(
        "/api/v1/sessions", headers=MOCK_AUTH_HEADERS, json=CONFIG_BODY
    ).json()["id"]


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
    assert len(body["questions"]) >= 3
    assert body["startedAt"] is not None
    for question in body["questions"]:
        assert question["difficulty"] == "hard"


def test_submit_answer_scores_and_advances_index(client: TestClient) -> None:
    session_id = _create_session(client)
    started = client.post(
        f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS
    ).json()
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
    assert updated["answers"][0]["score"] > 6.4
    assert updated["currentQuestionIndex"] == 1


def test_submit_answer_index_never_exceeds_last_question(client: TestClient) -> None:
    session_id = _create_session(client)
    started = client.post(
        f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS
    ).json()
    questions = started["questions"]

    for question in questions:
        body = {
            "questionId": question["id"],
            "transcript": "A reasonably detailed answer with some words in it.",
            "startedAt": "2026-08-15T02:00:00.000Z",
            "endedAt": "2026-08-15T02:00:30.000Z",
            "durationMs": 30000,
        }
        last = client.post(
            f"/api/v1/sessions/{session_id}/answers", headers=MOCK_AUTH_HEADERS, json=body
        ).json()

    assert last["currentQuestionIndex"] == len(questions) - 1


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
    started = client.post(
        f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS
    ).json()

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

    by_id = client.get(
        f"/api/v1/reports/{by_session['id']}", headers=MOCK_AUTH_HEADERS
    ).json()
    assert by_id["id"] == by_session["id"]


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
