from app.analytics.speech import AnswerSpeechInput, calculate_speech_metrics, detect_fillers


def test_filler_detector_counts_configured_phrases() -> None:
    fillers = detect_fillers("Um, I mean, we basically used Redis, you know, for caching.")
    assert fillers == {"um": 1, "basically": 1, "you know": 1, "I mean": 1}


def test_speech_metrics_are_deterministic() -> None:
    metrics = calculate_speech_metrics(
        [
            AnswerSpeechInput(
                transcript="We used Redis for cache-aside reads and database fallback.",
                duration_ms=30_000,
                pause_markers_ms=[500, 2_300],
            ),
            AnswerSpeechInput(
                transcript="Um, invalidation happened after the transaction committed.",
                duration_ms=30_000,
                pause_markers_ms=[800],
            ),
        ]
    )
    assert metrics["total_words"] == 16
    assert metrics["average_wpm"] == 16.0
    assert metrics["filler_count"] == 1
    assert metrics["long_pause_count"] == 1
    assert metrics["longest_pause_ms"] == 2_300
