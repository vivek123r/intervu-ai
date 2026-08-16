from typing import ClassVar

from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime


class Resume(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"summary", "raw_text"})

    id: str
    file_name: str
    parsed_skills: list[str]
    uploaded_at: UtcDatetime
    summary: str | None = None
    key_highlights: list[str] = []
    experience_points: list[str] = []
    domain_strengths: list[str] = []
    education: list[str] = []
    certifications: list[str] = []
    projects: list[str] = []
    raw_text: str | None = None


class UpdateResumeRequest(CamelModel):
    file_name: str | None = None
    summary: str | None = None
    parsed_skills: list[str] | None = None
    key_highlights: list[str] | None = None
    experience_points: list[str] | None = None
    domain_strengths: list[str] | None = None
    education: list[str] | None = None
    certifications: list[str] | None = None
    projects: list[str] | None = None


class SkillMatrixEntry(CamelModel):
    skill: str
    candidate_score: int
    role_score: int


class JobDescriptionAnalysis(CamelModel):
    id: str
    overall_match: int
    summary: str
    skill_matrix: list[SkillMatrixEntry]
    created_at: UtcDatetime


class AnalyzeJobDescriptionRequest(CamelModel):
    interview_id: str
    text: str
