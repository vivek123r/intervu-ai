"""Words-per-minute must reflect speaking pace, and must refuse to report a
number the measurement can't support."""

from app.services.speech_metrics import MAX_PLAUSIBLE_WPM, compute_speaking_wpm


def test_a_sub_second_answer_reports_nothing_rather_than_1400_wpm() -> None:
    """`duration_seconds` is floored to 1, so a 23-word answer recorded in under a
    second used to divide out to ~1400 wpm and be shown as the candidate's pace."""
    assert compute_speaking_wpm(total_words=23, total_seconds=1, pause_markers_ms=[]) == 0


def test_thinking_silence_is_excluded_from_the_pace() -> None:
    """120 words over 120 wall-clock seconds, 60 of which were long pauses, is a
    120 wpm speaking pace — not 60."""
    assert (
        compute_speaking_wpm(total_words=120, total_seconds=120, pause_markers_ms=[60_000])
        == 120
    )


def test_wall_clock_is_used_when_pauses_swallow_the_whole_answer() -> None:
    """Marker data can exceed the recorded duration; falling through to a negative
    or near-zero denominator would produce an absurd rate."""
    wpm = compute_speaking_wpm(total_words=30, total_seconds=20, pause_markers_ms=[19_500])
    assert 0 < wpm <= MAX_PLAUSIBLE_WPM


def test_an_impossible_rate_reports_nothing_rather_than_the_ceiling() -> None:
    """Clamping to the maximum would present a number the measurement doesn't
    support — the same failure as the 1400 wpm reading, just quieter."""
    assert compute_speaking_wpm(total_words=5000, total_seconds=10, pause_markers_ms=[]) == 0


def test_a_genuinely_fast_speaker_is_still_reported() -> None:
    # 250 words in 60 seconds — fast, but well within what a person can say.
    assert (
        compute_speaking_wpm(total_words=250, total_seconds=60, pause_markers_ms=[])
        <= MAX_PLAUSIBLE_WPM
    )
    assert compute_speaking_wpm(total_words=250, total_seconds=60, pause_markers_ms=[]) == 250


def test_an_empty_answer_has_no_pace() -> None:
    assert compute_speaking_wpm(total_words=0, total_seconds=30, pause_markers_ms=[]) == 0


def test_a_normal_answer_is_unchanged() -> None:
    # 150 words in 60 seconds with no long pauses.
    assert compute_speaking_wpm(total_words=150, total_seconds=60, pause_markers_ms=[]) == 150
