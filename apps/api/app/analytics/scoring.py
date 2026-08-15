from __future__ import annotations

from collections.abc import Mapping, Sequence

DEFAULT_REPORT_WEIGHTS: dict[str, dict[str, float]] = {
    "technical": {
        "technical": 0.30,
        "relevance": 0.15,
        "depth": 0.15,
        "structure": 0.15,
        "clarity": 0.15,
        "communication": 0.10,
    },
    "behavioral": {
        "technical": 0.05,
        "relevance": 0.20,
        "depth": 0.10,
        "structure": 0.25,
        "clarity": 0.20,
        "communication": 0.20,
    },
    "hr": {
        "technical": 0.00,
        "relevance": 0.25,
        "depth": 0.10,
        "structure": 0.25,
        "clarity": 0.20,
        "communication": 0.20,
    },
}


def clamp_score(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 1)


def weighted_score(values: Mapping[str, float], weights: Mapping[str, float]) -> float:
    denominator = sum(weight for key, weight in weights.items() if key in values)
    if denominator <= 0:
        return 0.0
    value = sum(values[key] * weight for key, weight in weights.items() if key in values)
    return clamp_score(value / denominator)


def report_score(values: Mapping[str, float], interview_type: str) -> float:
    weights = DEFAULT_REPORT_WEIGHTS.get(interview_type, DEFAULT_REPORT_WEIGHTS["technical"])
    return weighted_score(values, weights)


READINESS_WEIGHTS = {
    "mock_performance": 0.40,
    "target_skill_coverage": 0.25,
    "preparation_completion": 0.15,
    "recent_improvement": 0.10,
    "weak_topic_coverage": 0.10,
}


def readiness_score(components: Mapping[str, float]) -> tuple[float, dict[str, float]]:
    normalized = {key: clamp_score(components.get(key, 0.0)) for key in READINESS_WEIGHTS}
    return weighted_score(normalized, READINESS_WEIGHTS), normalized


def deterministic_role_match(
    *,
    resume_skills: Sequence[str],
    required_skills: Sequence[str],
    preferred_skills: Sequence[str],
    experience_fit: float,
    project_relevance: float,
) -> dict[str, object]:
    resume = {skill.casefold(): skill for skill in resume_skills}
    required = list(required_skills)
    preferred = list(preferred_skills)
    required_matches = [skill for skill in required if skill.casefold() in resume]
    preferred_matches = [skill for skill in preferred if skill.casefold() in resume]
    required_score = 100 * len(required_matches) / max(1, len(required))
    preferred_score = 100 * len(preferred_matches) / max(1, len(preferred))
    score = weighted_score(
        {
            "required": required_score,
            "preferred": preferred_score,
            "experience": experience_fit,
            "projects": project_relevance,
        },
        {"required": 0.50, "preferred": 0.15, "experience": 0.20, "projects": 0.15},
    )
    return {
        "score": score,
        "required_matches": required_matches,
        "preferred_matches": preferred_matches,
        "skill_gaps": [skill for skill in required if skill.casefold() not in resume],
        "components": {
            "required_skills": round(required_score, 1),
            "preferred_skills": round(preferred_score, 1),
            "experience": clamp_score(experience_fit),
            "project_relevance": clamp_score(project_relevance),
        },
    }
