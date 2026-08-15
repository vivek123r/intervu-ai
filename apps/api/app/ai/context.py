from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class InterviewContext:
    role: str
    company: str | None
    interview_type: str
    difficulty: str
    section: str
    resume_evidence: list[str] = field(default_factory=list)
    job_requirements: list[str] = field(default_factory=list)
    weak_topics: list[str] = field(default_factory=list)
    topics_covered: list[str] = field(default_factory=list)
    recent_turns: list[dict[str, str]] = field(default_factory=list)
    compact_memory: dict[str, object] = field(default_factory=dict)

    def minimal_dict(self) -> dict[str, object]:
        return {
            "role": self.role,
            "company": self.company,
            "interview_type": self.interview_type,
            "difficulty": self.difficulty,
            "section": self.section,
            "resume_evidence": self.resume_evidence[-5:],
            "job_requirements": self.job_requirements[:8],
            "weak_topics": self.weak_topics[:5],
            "topics_covered": self.topics_covered[-12:],
            "recent_turns": self.recent_turns[-4:],
            "compact_memory": self.compact_memory,
        }
