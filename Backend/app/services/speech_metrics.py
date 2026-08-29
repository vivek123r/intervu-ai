import re

# Mirrors Frontend/src/lib/voice/speech-metrics.ts's COMMON_FILLER_WORDS so both sides
# agree on the same list.
FILLER_WORDS: tuple[str, ...] = (
    "um",
    "uh",
    "like",
    "you know",
    "actually",
    "basically",
    "literally",
    "sort of",
    "kind of",
    "i mean",
)

# The client only records a pause marker once a gap exceeds this threshold
# (Frontend/src/lib/voice/speech-recognition.ts) — kept here too so a marker list from
# any source is still a defensible input, not merely trusted.
LONG_PAUSE_THRESHOLD_MS = 2500


def count_filler_words(
    transcript: str, fillers: tuple[str, ...] = FILLER_WORDS
) -> dict[str, int]:
    """Word-boundary filler counts. Plain substring counting (`text.count("um")`) matches
    "um" inside "number" and "like" inside "unlike", inflating the count — this is the bug
    being fixed."""
    if not transcript or not transcript.strip():
        return {}

    lowered = transcript.lower()
    counts: dict[str, int] = {}
    for filler in fillers:
        pattern = r"\b" + re.escape(filler) + r"\b"
        matches = re.findall(pattern, lowered)
        if matches:
            counts[filler] = len(matches)
    return counts


def merge_filler_counts(transcripts: list[str]) -> dict[str, int]:
    totals: dict[str, int] = {}
    for transcript in transcripts:
        for filler, count in count_filler_words(transcript).items():
            totals[filler] = totals.get(filler, 0) + count
    return totals


def compute_pause_metrics(pause_markers_ms: list[int]) -> tuple[int, float]:
    """(long_pauses count, longest pause in seconds) from a session's collected gap
    markers."""
    long_pauses = [p for p in pause_markers_ms if p >= LONG_PAUSE_THRESHOLD_MS]
    longest_ms = max(pause_markers_ms) if pause_markers_ms else 0
    return len(long_pauses), round(longest_ms / 1000, 1)
