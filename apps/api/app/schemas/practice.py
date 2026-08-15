from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SessionState, SessionStatus


class PracticeSessionCreate(BaseModel):
    interview_id: UUID | None = None
    mode: str = Field(default="full_mock", max_length=64)
    difficulty: Literal["easy", "normal", "hard", "brutal"] = "normal"
    interviewer_style: str = Field(default="neutral_interviewer", max_length=64)
    planned_duration: int = Field(default=30, ge=5, le=90)
    focus_areas: list[str] = Field(default_factory=list, max_length=12)


class SessionQuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int
    parent_question_id: UUID | None
    question_text: str
    question_type: str
    topic: str
    difficulty: str
    is_follow_up: bool
    followup_depth: int
    asked_at: datetime | None


class PracticeSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    interview_id: UUID | None
    mode: str
    difficulty: str
    interviewer_style: str
    planned_duration: int
    started_at: datetime | None
    ended_at: datetime | None
    state: SessionState
    current_section: str | None
    question_count: int
    current_question_index: int
    overall_score: float | None
    status: SessionStatus
    current_question: SessionQuestionRead | None = None


class SessionAnswerCreate(BaseModel):
    question_id: UUID
    transcript: str = Field(min_length=1, max_length=20_000)
    started_at: datetime
    ended_at: datetime
    duration_ms: int = Field(ge=100, le=7_200_000)
    pause_markers_ms: list[int] = Field(default_factory=list, max_length=500)


class AnswerEvaluationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    correctness: float
    completeness: float
    relevance: float
    depth: float
    structure: float
    clarity: float
    strengths: list[str]
    missing_points: list[str]
    recommendations: list[str]
    improved_structure: list[str]


class AnswerResult(BaseModel):
    answer_id: UUID
    evaluation: AnswerEvaluationRead
    decision: str
    next_question: SessionQuestionRead | None


class SpeechMetricsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_words: int
    total_speaking_ms: int
    average_wpm: float
    filler_count: int
    fillers: dict[str, int]
    pause_count: int
    long_pause_count: int
    longest_pause_ms: int
    average_pause_ms: float
    average_answer_ms: float


class InterviewReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    overall_score: float
    technical_score: float
    communication_score: float
    structure_score: float
    clarity_score: float
    relevance_score: float
    depth_score: float
    strengths: list[str]
    weaknesses: list[str]
    weak_topics: list[dict[str, object]]
    recommended_actions: list[dict[str, object]]
    summary: str
    speech_metrics: SpeechMetricsRead | None = None
    answers: list[dict[str, object]] = Field(default_factory=list)
