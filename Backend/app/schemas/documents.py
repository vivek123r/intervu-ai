from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime


class Resume(CamelModel):
    id: str
    file_name: str
    parsed_skills: list[str]
    uploaded_at: UtcDatetime


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
