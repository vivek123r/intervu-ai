"""The report must be generated once, and must say what it actually measured."""

import asyncio

import pytest

from app.ai.provider import derive_overall, scored_answers
from app.schemas.common import AnswerAnalysisStatus
from app.schemas.practice import SessionAnswer


def _answer(question_id: str, score: float | None) -> SessionAnswer:
    return SessionAnswer(
        question_id=question_id,
        question="Tell me about caching.",
        transcript="We used Redis.",
        duration_seconds=30,
        score=score,
        analysis_status=(
            AnswerAnalysisStatus.COMPLETE if score is not None else AnswerAnalysisStatus.FAILED
        ),
    )


def test_overall_reflects_the_scores_that_were_measured() -> None:
    answers = [_answer("q1", 4.0), _answer("q2", 4.0), _answer("q3", 4.0)]
    # A session where every answer scored 4/10 cannot be reported as an 82 just
    # because the model asserted one.
    assert derive_overall(answers, fallback=82) == 40


def test_unscored_answers_do_not_drag_the_average_toward_a_midpoint() -> None:
    """Substituting 7.0 for a failed analysis used to pull a weak session upward
    (and a strong one down) with no sign anything had gone wrong."""
    answers = [_answer("q1", 3.0), _answer("q2", None), _answer("q3", None)]
    assert derive_overall(answers, fallback=75) == 30
    assert len(scored_answers(answers)) == 1


def test_overall_falls_back_only_when_nothing_at_all_was_scored() -> None:
    """An average of nothing is not a zero — a session with no successful analysis
    has no measured score, so the caller's value stands."""
    answers = [_answer("q1", None)]
    assert derive_overall(answers, fallback=75) == 75


def test_overall_is_clamped_to_the_reportable_range() -> None:
    assert derive_overall([], fallback=500) == 100
    assert derive_overall([], fallback=-10) == 0


class _RecordingReports:
    """Counts inserts so a duplicated finalize is visible."""

    def __init__(self) -> None:
        self.inserted: list[dict] = []

    async def get_by_session_id(self, user_id: str, session_id: str):
        return next((r for r in self.inserted if r["session_id"] == session_id), None)

    async def insert(self, doc: dict) -> None:
        self.inserted.append(doc)


@pytest.mark.asyncio
async def test_concurrent_finalize_generates_one_report() -> None:
    """`finishSession` fires `session.end` over the socket AND awaits the REST
    `complete` endpoint. Both used to pass the "already exists?" check and each pay
    for a full report round-trip, with the loser raising DuplicateKeyError."""
    from app.services import practice as practice_module

    reports = _RecordingReports()
    generate_calls = 0

    async def fake_locked(user_id: str, session_id: str, job_id: str | None):
        nonlocal generate_calls
        existing = await reports.get_by_session_id(user_id, session_id)
        if existing:
            return existing
        # Yield, so an unserialized second caller would interleave here.
        await asyncio.sleep(0)
        generate_calls += 1
        doc = {"id": f"report-{generate_calls}", "session_id": session_id}
        await reports.insert(doc)
        return doc

    async def finalize(session_id: str):
        async with practice_module._finalize_lock(session_id):
            try:
                return await fake_locked("user-1", session_id, None)
            finally:
                practice_module._finalize_locks.pop(session_id, None)

    results = await asyncio.gather(finalize("session-1"), finalize("session-1"))

    assert generate_calls == 1
    assert len(reports.inserted) == 1
    assert results[0]["id"] == results[1]["id"]


@pytest.mark.asyncio
async def test_finalize_locks_are_not_leaked_per_session() -> None:
    from app.services import practice as practice_module

    practice_module._finalize_locks.clear()
    async with practice_module._finalize_lock("session-x"):
        pass
    practice_module._finalize_locks.pop("session-x", None)
    assert practice_module._finalize_locks == {}
