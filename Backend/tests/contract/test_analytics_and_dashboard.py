from fastapi.testclient import TestClient

from tests.conftest import MOCK_AUTH_HEADERS

CREATE_BODY = {
    "company": "Acme Corp",
    "role": "Backend Engineer",
    "type": "technical",
    "scheduledAt": "2026-09-01T10:00:00.000Z",
    "timezone": "Asia/Kolkata",
}


def test_analytics_overview_is_empty_for_new_user(client: TestClient) -> None:
    response = client.get("/api/v1/analytics/overview", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["overallScore"] == 0
    assert body["topicPerformance"] == []
    assert body["recentSessions"] == []


def test_dashboard_overview_with_no_interviews(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard/overview", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["nextInterview"] is None
    assert "nextInterview" in body
    assert body["upcomingInterviews"] == []
    assert body["todayTasks"] == []
    assert body["weakTopics"] == []


def test_dashboard_overview_picks_soonest_interview(client: TestClient) -> None:
    later = {**CREATE_BODY, "company": "Later Co", "scheduledAt": "2026-10-01T10:00:00.000Z"}
    sooner = {**CREATE_BODY, "company": "Sooner Co", "scheduledAt": "2026-09-05T10:00:00.000Z"}
    client.post("/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=later)
    client.post("/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=sooner)

    response = client.get("/api/v1/dashboard/overview", headers=MOCK_AUTH_HEADERS)
    body = response.json()
    assert body["nextInterview"]["company"] == "Sooner Co"
    assert body["upcomingInterviews"][0]["company"] == "Sooner Co"
    assert len(body["upcomingInterviews"]) == 2


def test_dashboard_overview_includes_today_tasks_after_generation(client: TestClient) -> None:
    interview_id = client.post(
        "/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_BODY
    ).json()["id"]
    client.post(f"/api/v1/interviews/{interview_id}/prepare", headers=MOCK_AUTH_HEADERS)

    response = client.get("/api/v1/dashboard/overview", headers=MOCK_AUTH_HEADERS)
    body = response.json()
    assert len(body["todayTasks"]) == 5
    assert all(task["day"] == 1 for task in body["todayTasks"])
