from typing import Any

from app.core.ids import IdPrefix, new_id
from app.schemas.practice import PracticeConfig, SessionAnswer
from app.schemas.preparation import Question

# A fixed, deterministic stand-in for real AI-driven question selection, scoring,
# and report generation — see app/ai/provider.py. None of this is content-aware.
_QUESTION_BANK: list[dict[str, str]] = [
    {
        "text": "Walk me through a time you used caching to reduce load, including what "
        "you cached and how you kept it correct.",
        "category": "Technical", "topic": "Caching", "difficulty": "hard",
    },
    {
        "text": "Design a background-job system that can tolerate worker failures without "
        "processing the same task twice.",
        "category": "System design", "topic": "Distributed systems", "difficulty": "hard",
    },
    {
        "text": "Tell me about a production incident where your first hypothesis was "
        "wrong. How did you recover?",
        "category": "Behavioral", "topic": "Ownership", "difficulty": "normal",
    },
    {
        "text": "When can adding a database index make a system slower, and how would "
        "you validate the trade-off?",
        "category": "Technical", "topic": "Databases", "difficulty": "hard",
    },
    {
        "text": "How would you design rate limiting for a public API?",
        "category": "System design", "topic": "APIs", "difficulty": "normal",
    },
    {
        "text": "Describe a time you disagreed with a technical decision. What did you do?",
        "category": "Behavioral", "topic": "Collaboration", "difficulty": "easy",
    },
    {
        "text": "What's the difference between optimistic and pessimistic locking, and "
        "when would you use each?",
        "category": "Technical", "topic": "Concurrency", "difficulty": "normal",
    },
    {
        "text": "How do you decide when a service should be split apart versus kept "
        "together?",
        "category": "System design", "topic": "Architecture", "difficulty": "brutal",
    },
]

_FILLER_WORDS = ("um", "uh", "like", "you know", "actually", "basically")


class DeterministicProvider:
    """Implements AIProvider with fixed, reproducible logic — no model calls."""

    def generate_questions(self, config: PracticeConfig, count: int) -> list[Question]:
        pool = [q for q in _QUESTION_BANK if q["difficulty"] == config.difficulty]
        pool = pool or _QUESTION_BANK
        selected = (pool * ((count // len(pool)) + 1))[:count]
        return [
            Question(
                id=new_id(IdPrefix.QUESTION),
                text=item["text"],
                category=item["category"],
                topic=item["topic"],
                difficulty=item["difficulty"],
            )
            for item in selected
        ]

    def score_answer(self, question: Question, transcript: str) -> float:
        word_count = len(transcript.split())
        return round(min(9.2, 6.4 + word_count / 45), 1)

    def generate_report(
        self, config: PracticeConfig, answers: list[SessionAnswer]
    ) -> dict[str, Any]:
        scores = [answer.score for answer in answers] or [7.0]
        overall = round((sum(scores) / len(scores)) * 10)

        total_words = sum(len(answer.transcript.split()) for answer in answers)
        total_seconds = sum(answer.duration_seconds for answer in answers)
        average_wpm = round((total_words / total_seconds) * 60) if total_seconds else 0

        fillers: dict[str, int] = {}
        for answer in answers:
            lowered = answer.transcript.lower()
            for filler in _FILLER_WORDS:
                occurrences = lowered.count(filler)
                if occurrences:
                    fillers[filler] = fillers.get(filler, 0) + occurrences

        return {
            "overall": overall,
            "technical": overall,
            "communication": overall,
            "structure": max(0, overall - 6),
            "clarity": min(100, overall + 4),
            "relevance": overall,
            "depth": max(0, overall - 3),
            "summary": (
                "Your answers were clear and grounded in real examples. Structure them "
                "explicitly — decision, trade-off, outcome — to raise the next score."
            ),
            "speech": {
                "average_wpm": average_wpm,
                "filler_count": sum(fillers.values()),
                "fillers": fillers,
                "long_pauses": 0,
                "longest_pause": 0.0,
                "average_answer_seconds": round(total_seconds / len(answers)) if answers else 0,
            },
            "weak_topics": config.focus_areas[:3] or ["System design"],
            "strengths": ["Used concrete examples", "Explained trade-offs clearly"],
            "recommended_actions": [
                "Practice structuring answers with a clear decision and outcome",
                "Add measurable results to your examples",
            ],
            "answers": [
                {
                    "question": answer.question,
                    "answer": answer.transcript,
                    "score": answer.score,
                    "strengths": ["Answered with a concrete example"],
                    "missing": ["A measurable outcome or metric"],
                    "better_structure": ["Situation", "Task", "Action", "Result"],
                }
                for answer in answers
            ],
        }
