from app.analytics.scoring import deterministic_role_match, readiness_score, report_score


def test_technical_report_uses_deterministic_weights() -> None:
    score = report_score(
        {
            "technical": 90,
            "relevance": 80,
            "depth": 70,
            "structure": 80,
            "clarity": 90,
            "communication": 80,
        },
        "technical",
    )
    assert score == 83.0


def test_readiness_preserves_explainable_components() -> None:
    score, components = readiness_score(
        {
            "mock_performance": 80,
            "target_skill_coverage": 60,
            "preparation_completion": 100,
            "recent_improvement": 50,
            "weak_topic_coverage": 70,
        }
    )
    assert score == 74.0
    assert components["preparation_completion"] == 100


def test_role_match_scores_with_python_weights() -> None:
    result = deterministic_role_match(
        resume_skills=["Node.js", "SQL", "REST APIs", "Docker"],
        required_skills=["Node.js", "SQL", "REST APIs", "System Design"],
        preferred_skills=["Docker", "AWS"],
        experience_fit=80,
        project_relevance=90,
    )
    assert result["score"] == 74.5
    assert result["skill_gaps"] == ["System Design"]
