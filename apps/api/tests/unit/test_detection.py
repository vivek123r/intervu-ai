from datetime import UTC, datetime, timedelta

from app.schemas.calendar import NormalizedCalendarEvent
from app.services.interview_detection import detect_interview_candidate


def event(title: str, description: str = "", *, all_day: bool = False) -> NormalizedCalendarEvent:
    start = datetime.now(UTC) + timedelta(days=1)
    return NormalizedCalendarEvent(
        provider_event_id="event-1",
        title=title,
        description=description,
        start_at=start,
        end_at=start + timedelta(hours=1),
        organizer_email="recruiter@acme.example",
        attendee_emails=["alex@example.test", "recruiter@acme.example"],
        meeting_url="https://meet.google.com/demo",
        is_all_day=all_day,
    )


def test_interview_signals_pass_prefilter() -> None:
    result = detect_interview_candidate(
        event("Backend Engineer technical interview round 2"), user_email="alex@example.test"
    )
    assert result.likely_candidate is True
    assert result.score >= 0.7


def test_meeting_link_alone_does_not_trigger_candidate() -> None:
    result = detect_interview_candidate(event("Weekly team sync"), user_email="alex@example.test")
    assert result.likely_candidate is False


def test_all_day_event_is_ignored() -> None:
    result = detect_interview_candidate(
        event("Interview preparation", all_day=True), user_email="alex@example.test"
    )
    assert result.score == 0
