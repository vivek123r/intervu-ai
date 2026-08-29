from fastapi.testclient import TestClient

from tests.conftest import MOCK_AUTH_HEADERS

CONFIG_BODY = {
    "role": "Senior Backend Engineer",
    "company": "Northstar Labs",
    "type": "system_design",
    "difficulty": "hard",
    "duration": 18,
    "focusAreas": ["System design"],
    "interviewerStyle": "Senior engineer",
}


def _completed_session_and_report(client: TestClient) -> tuple[str, str, str]:
    """Returns (session_id, report_id, question_id)."""
    session_id = client.post(
        "/api/v1/sessions", headers=MOCK_AUTH_HEADERS, json=CONFIG_BODY
    ).json()["id"]
    started = client.post(
        f"/api/v1/sessions/{session_id}/start", headers=MOCK_AUTH_HEADERS
    ).json()
    question_id = started["questions"][0]["id"]

    body = {
        "questionId": question_id,
        "transcript": "A detailed and thoughtful answer about system design trade-offs.",
        "startedAt": "2026-08-15T02:00:00.000Z",
        "endedAt": "2026-08-15T02:01:00.000Z",
        "durationMs": 60000,
    }
    client.post(f"/api/v1/sessions/{session_id}/answers", headers=MOCK_AUTH_HEADERS, json=body)
    complete_response = client.post(
        f"/api/v1/sessions/{session_id}/complete", headers=MOCK_AUTH_HEADERS
    )
    report_id = client.get(
        f"/api/v1/sessions/{session_id}/report", headers=MOCK_AUTH_HEADERS
    ).json()["id"]
    assert complete_response.status_code == 202
    return session_id, report_id, question_id


def test_report_chat_thread_starts_empty(client: TestClient) -> None:
    _, report_id, _ = _completed_session_and_report(client)

    response = client.get(f"/api/v1/reports/{report_id}/chat", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["reportId"] == report_id
    assert body["turns"] == []


def test_report_chat_answers_and_persists_the_thread(client: TestClient) -> None:
    _, report_id, _ = _completed_session_and_report(client)

    response = client.post(
        f"/api/v1/reports/{report_id}/chat",
        headers=MOCK_AUTH_HEADERS,
        json={"message": "Why did I get this score?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["reply"]["speaker"] == "assistant"
    assert len(body["reply"]["text"]) > 0
    assert len(body["turns"]) == 2
    assert body["turns"][0]["speaker"] == "candidate"
    assert body["turns"][0]["text"] == "Why did I get this score?"
    assert body["turns"][1]["speaker"] == "assistant"

    # The thread persists across requests.
    thread = client.get(f"/api/v1/reports/{report_id}/chat", headers=MOCK_AUTH_HEADERS).json()
    assert len(thread["turns"]) == 2

    # A second message appends rather than replacing.
    second = client.post(
        f"/api/v1/reports/{report_id}/chat",
        headers=MOCK_AUTH_HEADERS,
        json={"message": "What would a better answer look like?"},
    ).json()
    assert len(second["turns"]) == 4


def test_report_chat_grounds_in_a_specific_question(client: TestClient) -> None:
    _, report_id, question_id = _completed_session_and_report(client)

    response = client.post(
        f"/api/v1/reports/{report_id}/chat",
        headers=MOCK_AUTH_HEADERS,
        json={"message": "Why this score?", "questionId": question_id},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["turns"][0]["questionId"] == question_id
    assert body["reply"]["questionId"] == question_id


def test_session_chat_is_the_same_thread_as_report_chat(client: TestClient) -> None:
    session_id, report_id, _ = _completed_session_and_report(client)

    client.post(
        f"/api/v1/sessions/{session_id}/chat",
        headers=MOCK_AUTH_HEADERS,
        json={"message": "Why did I get this score?"},
    )

    by_report = client.get(f"/api/v1/reports/{report_id}/chat", headers=MOCK_AUTH_HEADERS).json()
    by_session = client.get(
        f"/api/v1/sessions/{session_id}/chat", headers=MOCK_AUTH_HEADERS
    ).json()
    assert by_report["turns"] == by_session["turns"]


def test_report_chat_404s_for_unknown_report(client: TestClient) -> None:
    response = client.get("/api/v1/reports/report-missing/chat", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "REPORT_NOT_FOUND"

    response = client.post(
        "/api/v1/reports/report-missing/chat",
        headers=MOCK_AUTH_HEADERS,
        json={"message": "hello"},
    )
    assert response.status_code == 404


def test_session_chat_404s_for_incomplete_session(client: TestClient) -> None:
    session_id = client.post(
        "/api/v1/sessions", headers=MOCK_AUTH_HEADERS, json=CONFIG_BODY
    ).json()["id"]

    response = client.get(f"/api/v1/sessions/{session_id}/chat", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "REPORT_NOT_FOUND"
