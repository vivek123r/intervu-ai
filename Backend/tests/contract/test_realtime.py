from fastapi.testclient import TestClient

from tests.conftest import MOCK_AUTH_HEADERS

CONFIG_BODY = {
    "role": "Senior Backend Engineer",
    "company": "Northstar Labs",
    "type": "system_design",
    "difficulty": "hard",
    "duration": 18,  # -> 3 questions (max(3, 18 // 6))
    "focusAreas": ["System design"],
    "interviewerStyle": "Senior engineer",
}


def _create_session_and_ticket(client: TestClient) -> tuple[str, str]:
    session_id = client.post(
        "/api/v1/sessions", headers=MOCK_AUTH_HEADERS, json=CONFIG_BODY
    ).json()["id"]
    ticket = client.post(
        f"/api/v1/sessions/{session_id}/socket-ticket", headers=MOCK_AUTH_HEADERS
    ).json()["ticket"]
    return session_id, ticket


def test_websocket_rejects_invalid_ticket(client: TestClient) -> None:
    session_id, _ = _create_session_and_ticket(client)

    try:
        with client.websocket_connect(f"/ws/interviews/{session_id}?ticket=not-a-real-ticket"):
            pass
        raised = False
    except Exception:
        raised = True
    assert raised


def test_websocket_full_scripted_interview_flow(client: TestClient) -> None:
    session_id, ticket = _create_session_and_ticket(client)

    with client.websocket_connect(f"/ws/interviews/{session_id}?ticket={ticket}") as ws:
        ws.send_json({"type": "session.start", "payload": {}})

        ready = ws.receive_json()
        assert ready["type"] == "session.ready"

        started = ws.receive_json()
        assert started["type"] == "session.started"
        assert started["payload"]["state"] == "introduction"

        intro_response = ws.receive_json()
        assert intro_response["type"] == "interviewer.response"
        assert intro_response["payload"]["kind"] == "intro"

        question_ids = []
        while True:
            event = ws.receive_json()
            if event["type"] == "question.created":
                question_ids.append(event["payload"]["id"])
            if event["type"] == "question.started":
                break

        assert question_ids[0].startswith("q-")

        # Answer with detailed responses so we don't trigger follow-ups in this baseline test
        while True:
            ws.send_json(
                {
                    "type": "answer.completed",
                    "payload": {
                        "questionId": question_ids[-1],
                        "transcript": (
                            "We cached the account summary in Redis with a TTL of 30 seconds "
                            "and invalidated on write operations to ensure strict consistency "
                            "across high-throughput read paths."
                        ),
                        "startedAt": "2026-08-15T02:00:00.000Z",
                        "endedAt": "2026-08-15T02:01:00.000Z",
                        "durationMs": 60000,
                    },
                }
            )

            event = ws.receive_json()
            assert event["type"] == "interviewer.thinking"

            transition_event = ws.receive_json()
            assert transition_event["type"] == "interviewer.response"
            assert transition_event["payload"]["kind"] == "transition"

            next_event = ws.receive_json()
            if next_event["type"] == "section.changed":
                next_event = ws.receive_json()

            if next_event["type"] == "question.created":
                question_ids.append(next_event["payload"]["id"])
                started_ev = ws.receive_json()
                assert started_ev["type"] == "question.started"
                continue

            # Interview finished: wrap-up response received
            assert next_event["type"] == "interviewer.response"
            assert next_event["payload"]["kind"] == "wrap_up"
            break

        assert ws.receive_json()["type"] == "section.changed"
        assert ws.receive_json()["type"] == "session.completed"

        analysis_started = ws.receive_json()
        assert analysis_started["type"] == "analysis.started"
        job_id = analysis_started["payload"]["jobId"]

        # 4 staged progress events
        for _ in range(4):
            progress = ws.receive_json()
            assert progress["type"] == "analysis.progress"
            assert progress["payload"]["jobId"] == job_id

        completed = ws.receive_json()
        assert completed["type"] == "analysis.completed"
        report_id = completed["payload"]["reportId"]

    report = client.get(f"/api/v1/reports/{report_id}", headers=MOCK_AUTH_HEADERS).json()
    assert len(report["answers"]) == len(question_ids)


def test_websocket_follow_up_on_weak_answer(client: TestClient) -> None:
    session_id, ticket = _create_session_and_ticket(client)

    with client.websocket_connect(f"/ws/interviews/{session_id}?ticket={ticket}") as ws:
        ws.send_json({"type": "session.start", "payload": {}})
        assert ws.receive_json()["type"] == "session.ready"
        assert ws.receive_json()["type"] == "session.started"
        assert ws.receive_json()["type"] == "interviewer.response"

        first_q = ws.receive_json()
        assert first_q["type"] == "question.created"
        assert first_q["payload"]["isFollowUp"] is False
        first_q_id = first_q["payload"]["id"]
        assert ws.receive_json()["type"] == "question.started"

        # Submit short/weak answer (< 18 words) to trigger follow-up proposal
        ws.send_json(
            {
                "type": "answer.completed",
                "payload": {
                    "questionId": first_q_id,
                    "transcript": "I used caching once.",
                    "startedAt": "2026-08-15T02:00:00.000Z",
                    "endedAt": "2026-08-15T02:00:10.000Z",
                    "durationMs": 10000,
                },
            }
        )

        assert ws.receive_json()["type"] == "interviewer.thinking"
        transition = ws.receive_json()
        assert transition["type"] == "interviewer.response"
        assert transition["payload"]["kind"] == "transition"

        follow_up_q = ws.receive_json()
        assert follow_up_q["type"] == "question.created"
        assert follow_up_q["payload"]["isFollowUp"] is True
        assert ws.receive_json()["type"] == "question.started"


def test_websocket_heartbeat(client: TestClient) -> None:
    session_id, ticket = _create_session_and_ticket(client)

    with client.websocket_connect(f"/ws/interviews/{session_id}?ticket={ticket}") as ws:
        ws.send_json({"type": "heartbeat", "payload": {}})
        response = ws.receive_json()
        assert response["type"] == "heartbeat.ack"
