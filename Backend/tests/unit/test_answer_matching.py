"""Joining a report's answer reviews back to the session that produced them.

This used to be done by lowercased question text with a positional fallback — and
`generate_report` used the opposite precedence to `CompletionService`, so the two
could disagree about which answer was which. Reviews now carry `question_id`.
"""

from typing import Any

from app.services.conversation import _find_question_context, _transcript_index


def _report(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": "report-1",
        "overall": 70,
        "answers": [
            {
                "question_id": "q-alpha",
                "question": "How did you keep the cache correct?",
                "answer": "We invalidated synchronously on every write.",
                "score": 7.5,
            },
            {
                "question_id": "q-beta",
                "question": "How did you keep the cache correct?",
                "answer": "A completely different second answer.",
                "score": 4.0,
            },
        ],
    }
    base.update(overrides)
    return base


def test_the_right_answer_is_found_even_when_two_share_question_text() -> None:
    """A repeated topic can produce two identical question texts. Text matching
    returned the first one for both."""
    context = _find_question_context(_report(), session=None, question_id="q-beta")
    assert context is not None
    assert context["answer"] == "A completely different second answer."


def test_a_paraphrased_question_still_resolves() -> None:
    """The report generator is free to reword the question it reviews; text
    matching then silently found nothing, and the candidate's "why did I get this
    score?" was answered with no idea which question they meant."""
    report = _report(
        answers=[
            {
                "question_id": "q-alpha",
                "question": "Reworded entirely by the model.",
                "answer": "The real answer.",
                "score": 6.5,
            }
        ]
    )
    session = {"questions": [{"id": "q-alpha", "text": "How did you keep the cache correct?"}]}
    context = _find_question_context(report, session, "q-alpha")
    assert context is not None
    assert context["answer"] == "The real answer."


def test_older_reports_without_ids_still_match_on_text() -> None:
    report = {
        "id": "report-old",
        "answers": [{"question": "Tell me about caching.", "answer": "Redis.", "score": 7.0}],
    }
    session = {"questions": [{"id": "q-old", "text": "Tell me about caching."}]}
    context = _find_question_context(report, session, "q-old")
    assert context is not None
    assert context["answer"] == "Redis."


def test_no_question_id_means_no_single_answer_context() -> None:
    assert _find_question_context(_report(), None, None) is None


def test_an_unknown_question_id_resolves_to_nothing() -> None:
    assert _find_question_context(_report(), None, "q-does-not-exist") is None


def test_the_transcript_index_covers_every_answer() -> None:
    """The chat could previously ground only against the one answer the UI
    attached a questionId to, so a freely typed question had nothing to use."""
    index = _transcript_index(_report())
    assert [row["position"] for row in index] == ["1", "2"]
    assert index[1]["excerpt"] == "A completely different second answer."


def test_long_answers_are_excerpted_and_marked() -> None:
    report = _report(
        answers=[{"question_id": "q", "question": "Q", "answer": "x" * 900, "score": 5.0}]
    )
    row = _transcript_index(report)[0]
    assert len(row["excerpt"]) < 900
    assert row["truncated"] == "true"
