import pytest

from app.ai.mock import DeterministicProvider
from app.ai.openrouter import OpenRouterAIProvider
from app.schemas.common import Difficulty, InterviewType
from app.schemas.interviewer import (
    TurnContext,
    TurnDecision,
)
from app.schemas.practice import PracticeConfig
from app.schemas.preparation import Question


@pytest.fixture
def sample_config() -> PracticeConfig:
    return PracticeConfig(
        role="Senior Backend Engineer",
        company="Northstar Labs",
        type=InterviewType.TECHNICAL,
        difficulty=Difficulty.HARD,
        duration=18,
        focus_areas=["Databases", "Distributed Systems"],
        interviewer_style="Senior Engineer",
    )


@pytest.fixture
def sample_question() -> Question:
    return Question(
        id="q-test-1",
        text="How do you handle distributed transactions across microservices?",
        category="System design",
        topic="Distributed systems",
        difficulty=Difficulty.HARD,
    )


@pytest.mark.asyncio
async def test_deterministic_provider_turn_proposes_follow_up_on_short_answer(
    sample_config: PracticeConfig, sample_question: Question
) -> None:
    provider = DeterministicProvider()
    ctx = TurnContext(
        config=sample_config,
        question=sample_question,
        transcript="I use saga pattern.",
        log=[],
        answers_so_far=[],
        follow_ups_used_on_root=0,
        follow_up_budget=3,
        roots_remaining=3,
        planned_root_count=3,
        roots_asked=1,
        topics_covered=["Distributed systems"],
        recent_scores=[],
    )

    decision = await provider.interviewer_turn(ctx)
    assert decision.score < 6.0
    assert decision.action == "follow_up"
    assert decision.follow_up is not None
    assert (
        "Distributed systems" in decision.follow_up.text
        or decision.follow_up.topic == "Distributed systems"
    )
    assert len(decision.transition) > 0
    assert decision.next_root is not None


@pytest.mark.asyncio
async def test_deterministic_provider_turn_advances_on_detailed_answer(
    sample_config: PracticeConfig, sample_question: Question
) -> None:
    provider = DeterministicProvider()
    ctx = TurnContext(
        config=sample_config,
        question=sample_question,
        transcript=(
            "We used an orchestration-based saga with Temporal where each step is idempotent "
            "and compensation handlers undo partial state changes on failure."
        ),
        log=[],
        answers_so_far=[],
        follow_ups_used_on_root=0,
        follow_up_budget=3,
        roots_remaining=3,
        planned_root_count=3,
        roots_asked=1,
        topics_covered=["Distributed systems"],
        recent_scores=[8.5],
    )

    decision = await provider.interviewer_turn(ctx)
    assert decision.score >= 6.0
    assert decision.action == "advance"
    assert decision.follow_up is None
    assert len(decision.transition) > 0
    assert decision.next_root is not None


@pytest.mark.asyncio
async def test_deterministic_provider_enforces_budget_limit(
    sample_config: PracticeConfig, sample_question: Question
) -> None:
    provider = DeterministicProvider()
    ctx = TurnContext(
        config=sample_config,
        question=sample_question,
        transcript="Short answer.",
        log=[],
        answers_so_far=[],
        follow_ups_used_on_root=2,  # Root limit reached
        follow_up_budget=0,  # Budget exhausted
        roots_remaining=2,
        planned_root_count=3,
        roots_asked=2,
        topics_covered=["Distributed systems"],
        recent_scores=[4.0],
    )

    decision = await provider.interviewer_turn(ctx)
    assert decision.action == "advance"
    assert decision.follow_up is None
    assert decision.next_root is not None


@pytest.mark.asyncio
async def test_deterministic_provider_generate_first_and_fallback_next(
    sample_config: PracticeConfig,
) -> None:
    provider = DeterministicProvider()
    first_q = await provider.generate_first_question(sample_config)
    assert first_q.id.startswith("q-")
    assert first_q.difficulty == sample_config.difficulty

    # Fallback next root with low score steps down difficulty
    next_q = await provider.fallback_next_root(
        sample_config,
        topics_covered=[first_q.topic],
        recent_scores=[3.0],
    )
    assert next_q.id.startswith("q-")
    assert next_q.topic is not None
    assert next_q.difficulty == Difficulty.NORMAL  # stepped down from HARD on mean <= 5.0


@pytest.mark.asyncio
async def test_openrouter_provider_fallback_when_no_api_key(
    sample_config: PracticeConfig, sample_question: Question
) -> None:
    provider = OpenRouterAIProvider(api_key="")
    ctx = TurnContext(
        config=sample_config,
        question=sample_question,
        transcript="Short answer.",
        log=[],
        answers_so_far=[],
        follow_ups_used_on_root=0,
        follow_up_budget=3,
        roots_remaining=3,
        planned_root_count=3,
        roots_asked=1,
        topics_covered=["Distributed systems"],
        recent_scores=[],
    )

    decision = await provider.interviewer_turn(ctx)
    assert isinstance(decision, TurnDecision)
    assert decision.score > 0
    assert decision.transition is not None
    assert decision.next_root is not None

    first_q = await provider.generate_first_question(sample_config)
    assert first_q.id.startswith("q-")
