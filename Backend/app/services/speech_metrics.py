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


# Nobody speaks faster than this (conversational speech is ~150, a fast
# auctioneer ~300). A computed rate above it means the measured duration is
# wrong, not that the candidate is remarkable — most often a sub-second answer,
# whose duration is floored to 1 second and so divides ~20 words into a 1400 wpm
# reading.
MAX_PLAUSIBLE_WPM = 320

# Below this, a "duration" is a measurement artefact rather than a spoken answer.
MIN_MEASURABLE_ANSWER_SECONDS = 2


def compute_speaking_wpm(
    total_words: int, total_seconds: int, pause_markers_ms: list[int]
) -> int:
    """Words per minute over *speaking* time, not wall-clock answer time.

    The answer duration includes thinking silence, so dividing by it understates a
    candidate's actual pace. The long pauses are already recorded, so they are
    subtracted here. Returns 0 when there is too little to measure, rather than
    reporting a number the data can't support.
    """
    if total_words <= 0 or total_seconds < MIN_MEASURABLE_ANSWER_SECONDS:
        return 0

    pause_seconds = sum(ms for ms in pause_markers_ms if ms > 0) / 1000
    speaking_seconds = total_seconds - pause_seconds
    if speaking_seconds < MIN_MEASURABLE_ANSWER_SECONDS:
        # Pauses accounted for essentially the whole answer; the wall clock is the
        # only defensible denominator left.
        speaking_seconds = total_seconds

    wpm = round((total_words / speaking_seconds) * 60)

    # Deliberately not clamped to the ceiling: reporting the maximum would be
    # presenting a number the measurement doesn't support, which is the same
    # failure as the 1400 wpm reading, just quieter. 0 means "not measured", and
    # the UI renders it as such.
    return wpm if wpm <= MAX_PLAUSIBLE_WPM else 0
