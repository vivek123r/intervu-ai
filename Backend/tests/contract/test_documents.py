from fastapi.testclient import TestClient

from tests.conftest import MOCK_AUTH_HEADERS

CREATE_INTERVIEW_BODY = {
    "company": "Acme Corp",
    "role": "Backend Engineer",
    "type": "technical",
    "scheduledAt": "2026-09-01T10:00:00.000Z",
    "timezone": "Asia/Kolkata",
}


def test_get_current_resume_is_null_before_upload(client: TestClient) -> None:
    response = client.get("/api/v1/resumes", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json() is None


def test_upload_resume_returns_parsed_skills(client: TestClient) -> None:
    files = {"file": ("resume.pdf", b"%PDF-1.4 fake pdf content", "application/pdf")}
    response = client.post("/api/v1/resumes", headers=MOCK_AUTH_HEADERS, files=files)
    assert response.status_code == 201
    body = response.json()
    assert body["id"].startswith("resume-")
    assert body["fileName"] == "resume.pdf"
    assert len(body["parsedSkills"]) > 0

    current = client.get("/api/v1/resumes", headers=MOCK_AUTH_HEADERS).json()
    assert current["id"] == body["id"]


def test_upload_resume_rejects_wrong_extension(client: TestClient) -> None:
    files = {"file": ("resume.txt", b"plain text", "text/plain")}
    response = client.post("/api/v1/resumes", headers=MOCK_AUTH_HEADERS, files=files)
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_upload_resume_rejects_mismatched_magic_bytes(client: TestClient) -> None:
    files = {"file": ("resume.pdf", b"not actually a pdf", "application/pdf")}
    response = client.post("/api/v1/resumes", headers=MOCK_AUTH_HEADERS, files=files)
    assert response.status_code == 415


def test_upload_resume_rejects_oversized_file(client: TestClient) -> None:
    oversized = b"%PDF" + (b"0" * (10 * 1024 * 1024 + 1))
    files = {"file": ("resume.pdf", oversized, "application/pdf")}
    response = client.post("/api/v1/resumes", headers=MOCK_AUTH_HEADERS, files=files)
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_delete_resume(client: TestClient) -> None:
    files = {"file": ("resume.pdf", b"%PDF-1.4", "application/pdf")}
    resume_id = client.post("/api/v1/resumes", headers=MOCK_AUTH_HEADERS, files=files).json()["id"]

    response = client.delete(f"/api/v1/resumes/{resume_id}", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 204


def test_list_and_update_resume(client: TestClient) -> None:
    files = {"file": ("resume.pdf", b"%PDF-1.4", "application/pdf")}
    created = client.post("/api/v1/resumes", headers=MOCK_AUTH_HEADERS, files=files).json()
    resume_id = created["id"]

    # Test list
    all_resumes = client.get("/api/v1/resumes/all", headers=MOCK_AUTH_HEADERS).json()
    assert any(r["id"] == resume_id for r in all_resumes)

    # Test update
    update_payload = {
        "summary": "Updated executive summary for testing.",
        "parsedSkills": ["Python", "Golang", "Kubernetes", "Kafka"],
        "keyHighlights": ["Led 100k events/sec streaming platform."],
    }
    updated = client.patch(
        f"/api/v1/resumes/{resume_id}", headers=MOCK_AUTH_HEADERS, json=update_payload
    ).json()
    assert updated["summary"] == "Updated executive summary for testing."
    assert updated["parsedSkills"] == ["Python", "Golang", "Kubernetes", "Kafka"]
    assert updated["keyHighlights"] == ["Led 100k events/sec streaming platform."]


def test_delete_missing_resume_404s(client: TestClient) -> None:
    response = client.delete("/api/v1/resumes/resume-missing", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "RESUME_NOT_FOUND"


def test_analyze_job_description(client: TestClient) -> None:
    interview_id = client.post(
        "/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_INTERVIEW_BODY
    ).json()["id"]

    body = {"interviewId": interview_id, "text": "We need a backend engineer with Node.js."}
    response = client.post("/api/v1/job-descriptions", headers=MOCK_AUTH_HEADERS, json=body)
    assert response.status_code == 201
    analysis = response.json()
    assert analysis["id"].startswith("jd-")
    assert analysis["overallMatch"] > 0
    assert len(analysis["skillMatrix"]) > 0

    fetched = client.get(
        f"/api/v1/job-descriptions/{analysis['id']}", headers=MOCK_AUTH_HEADERS
    ).json()
    assert fetched["id"] == analysis["id"]

    for_interview = client.get(
        f"/api/v1/interviews/{interview_id}/job-description", headers=MOCK_AUTH_HEADERS
    ).json()
    assert for_interview["id"] == analysis["id"]


def test_analyze_empty_job_description_text(client: TestClient) -> None:
    interview_id = client.post(
        "/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_INTERVIEW_BODY
    ).json()["id"]

    body = {"interviewId": interview_id, "text": "   "}
    response = client.post("/api/v1/job-descriptions", headers=MOCK_AUTH_HEADERS, json=body)
    analysis = response.json()
    assert analysis["overallMatch"] == 0
    assert analysis["skillMatrix"] == []


def test_job_description_for_interview_is_null_before_analysis(client: TestClient) -> None:
    interview_id = client.post(
        "/api/v1/interviews", headers=MOCK_AUTH_HEADERS, json=CREATE_INTERVIEW_BODY
    ).json()["id"]

    response = client.get(
        f"/api/v1/interviews/{interview_id}/job-description", headers=MOCK_AUTH_HEADERS
    )
    assert response.status_code == 200
    assert response.json() is None


def test_get_missing_job_description_404s(client: TestClient) -> None:
    response = client.get("/api/v1/job-descriptions/jd-missing", headers=MOCK_AUTH_HEADERS)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ANALYSIS_NOT_FOUND"
