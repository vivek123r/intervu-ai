from typing import Any

from app.core.ids import IdPrefix, new_id
from app.core.timeutils import utcnow
from app.core.uploads import validate_resume_upload
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.repositories.documents import JobDescriptionRepository, ResumeRepository
from app.schemas.documents import AnalyzeJobDescriptionRequest, JobDescriptionAnalysis, Resume

# Real resume parsing and JD matching are AI work and out of scope here (see
# app/ai/provider.py) — these are fixed, deterministic stand-ins so profile/prepare
# pages have plausible data to render.
_MOCK_PARSED_SKILLS = ["Node.js", "PostgreSQL", "Redis", "Docker", "AWS", "REST APIs"]
_SKILL_MATRIX_TEMPLATE: list[dict[str, Any]] = [
    {"skill": "Node.js", "candidate_score": 90, "role_score": 90},
    {"skill": "REST APIs", "candidate_score": 92, "role_score": 85},
    {"skill": "SQL", "candidate_score": 68, "role_score": 85},
    {"skill": "Docker", "candidate_score": 55, "role_score": 75},
    {"skill": "AWS", "candidate_score": 42, "role_score": 70},
]


class DocumentService:
    def __init__(
        self, resumes: ResumeRepository, job_descriptions: JobDescriptionRepository
    ) -> None:
        self._resumes = resumes
        self._job_descriptions = job_descriptions

    async def upload_resume(self, user_id: str, filename: str, content: bytes) -> Resume:
        validate_resume_upload(filename, content)
        doc = {
            "id": new_id(IdPrefix.RESUME),
            "user_id": user_id,
            "file_name": filename,
            "parsed_skills": _MOCK_PARSED_SKILLS,
            "uploaded_at": utcnow(),
        }
        await self._resumes.insert(doc)
        return Resume(**doc)

    async def get_current_resume(self, user_id: str) -> Resume | None:
        doc = await self._resumes.get_current_for_user(user_id)
        return Resume(**doc) if doc else None

    async def delete_resume(self, user_id: str, resume_id: str) -> None:
        deleted = await self._resumes.delete(user_id, resume_id)
        if not deleted:
            raise NotFoundError(ErrorCode.RESUME_NOT_FOUND, "That resume could not be found.")

    async def analyze_job_description(
        self, user_id: str, request: AnalyzeJobDescriptionRequest
    ) -> JobDescriptionAnalysis:
        text = request.text.strip()
        if text:
            overall_match = min(95, 60 + len(text.split()) % 30)
            summary = "Your strongest evidence fits the core of this role."
            skill_matrix = _SKILL_MATRIX_TEMPLATE
        else:
            overall_match = 0
            summary = "Paste a job description to see your role match."
            skill_matrix = []

        doc = {
            "id": new_id(IdPrefix.JOB_DESCRIPTION),
            "user_id": user_id,
            "interview_id": request.interview_id,
            "overall_match": overall_match,
            "summary": summary,
            "skill_matrix": skill_matrix,
            "created_at": utcnow(),
        }
        await self._job_descriptions.insert(doc)
        return JobDescriptionAnalysis(**doc)

    async def get_job_description(self, user_id: str, jd_id: str) -> JobDescriptionAnalysis:
        doc = await self._job_descriptions.get_by_id(user_id, jd_id)
        if doc is None:
            raise NotFoundError(ErrorCode.ANALYSIS_NOT_FOUND, "That analysis could not be found.")
        return JobDescriptionAnalysis(**doc)

    async def get_job_description_for_interview(
        self, interview_id: str
    ) -> JobDescriptionAnalysis | None:
        doc = await self._job_descriptions.get_latest_for_interview(interview_id)
        return JobDescriptionAnalysis(**doc) if doc else None
