from __future__ import annotations

import re
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass

FILLER_PATTERNS = {
    "um": r"\bum+\b",
    "uh": r"\buh+\b",
    "erm": r"\berm+\b",
    "like": r"\blike\b",
    "actually": r"\bactually\b",
    "basically": r"\bbasically\b",
    "literally": r"\bliterally\b",
    "you know": r"\byou\s+know\b",
    "I mean": r"\bi\s+mean\b",
    "so": r"\bso\b",
}


@dataclass(frozen=True, slots=True)
class AnswerSpeechInput:
    transcript: str
    duration_ms: int
    pause_markers_ms: Sequence[int]


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text, flags=re.UNICODE))


def detect_fillers(text: str) -> dict[str, int]:
    lowered = text.casefold()
    counts: Counter[str] = Counter()
    for label, pattern in FILLER_PATTERNS.items():
        count = len(re.findall(pattern, lowered, flags=re.IGNORECASE))
        if count:
            counts[label] = count
    return dict(counts)


def calculate_speech_metrics(answers: Sequence[AnswerSpeechInput]) -> dict[str, object]:
    total_words = sum(word_count(answer.transcript) for answer in answers)
    total_speaking_ms = sum(max(0, answer.duration_ms) for answer in answers)
    average_wpm = round(total_words / (total_speaking_ms / 60_000), 1) if total_speaking_ms else 0.0
    fillers: Counter[str] = Counter()
    all_pauses: list[int] = []
    for answer in answers:
        fillers.update(detect_fillers(answer.transcript))
        all_pauses.extend(max(0, pause) for pause in answer.pause_markers_ms)
    return {
        "total_words": total_words,
        "total_speaking_ms": total_speaking_ms,
        "average_wpm": average_wpm,
        "filler_count": sum(fillers.values()),
        "fillers": dict(fillers),
        "pause_count": len(all_pauses),
        "long_pause_count": sum(pause >= 2_000 for pause in all_pauses),
        "longest_pause_ms": max(all_pauses, default=0),
        "average_pause_ms": round(sum(all_pauses) / len(all_pauses), 1) if all_pauses else 0.0,
        "average_answer_ms": (round(total_speaking_ms / len(answers), 1) if answers else 0.0),
    }
