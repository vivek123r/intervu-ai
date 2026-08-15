from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class InterviewClassification(BaseModel):
    is_interview: bool
    confidence: float = Field(ge=0, le=1)
    company: str | None = None
    role: str | None = None
    round: str | None = None
    interview_type: str | None = None
    meeting_platform: str | None = None


class ResumeExperience(BaseModel):
    company: str
    role: str
    highlights: list[str]
    technologies: list[str]


class ResumeAnalysis(BaseModel):
    skills: list[str]
    experience: list[ResumeExperience]
    projects: list[dict[str, object]]
    education: list[dict[str, object]]
    certifications: list[str]
    achievements: list[str]


class JobDescriptionAnalysis(BaseModel):
    required_skills: list[str]
    preferred_skills: list[str]
    responsibilities: list[str]
    experience_requirements: list[str]
    seniority: str
    technologies: list[str]
    likely_interview_areas: list[str]
    keywords: list[str]


class PreparationTaskOutput(BaseModel):
    day_offset: int = Field(ge=0)
    category: str
    title: str
    description: str
    estimated_minutes: int = Field(ge=5, le=180)
    priority: int = Field(ge=1, le=3)


class PreparationPlanOutput(BaseModel):
    focus_summary: str
    tasks: list[PreparationTaskOutput]


class GeneratedQuestion(BaseModel):
    text: str
    question_type: str
    topic: str
    difficulty: Literal["easy", "normal", "hard", "brutal"]
    rationale: str


class AnswerEvaluationOutput(BaseModel):
    correctness: float = Field(ge=0, le=100)
    completeness: float = Field(ge=0, le=100)
    relevance: float = Field(ge=0, le=100)
    depth: float = Field(ge=0, le=100)
    structure: float = Field(ge=0, le=100)
    clarity: float = Field(ge=0, le=100)
    strengths: list[str]
    missing_points: list[str]
    recommendations: list[str]
    improved_structure: list[str]


class FollowUpDecision(BaseModel):
    action: Literal["follow_up", "next_question", "change_topic", "end_section"]
    reason: str
    question: str | None = None


class ReportTopic(BaseModel):
    topic: str
    score: float = Field(ge=0, le=100)
    reason: str


class RecommendedAction(BaseModel):
    title: str
    description: str
    estimated_minutes: int = Field(ge=1, le=180)
    topic: str | None = None


class FinalReportCoaching(BaseModel):
    strengths: list[str]
    weaknesses: list[str]
    weak_topics: list[ReportTopic]
    recommended_actions: list[RecommendedAction]
    summary: str
