from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.integrations.calendar.base import CalendarCredentials, CalendarFetchResult
from app.schemas.calendar import NormalizedCalendarEvent


class MockCalendarProvider:
    def authorization_url(self, *, state: str) -> str:
        return f"/api/v1/calendar/mock/callback?state={state}"

    async def exchange_code(self, code: str) -> CalendarCredentials:
        del code
        return CalendarCredentials(
            access_token="mock-access",
            refresh_token="mock-refresh",
            expiry=datetime.now(UTC) + timedelta(hours=1),
            scopes=["https://www.googleapis.com/auth/calendar.readonly"],
        )

    async def fetch_upcoming(
        self, credentials: CalendarCredentials, *, days: int = 90
    ) -> CalendarFetchResult:
        del days
        now = datetime.now(UTC).replace(minute=30, second=0, microsecond=0)
        events = [
            NormalizedCalendarEvent(
                provider_event_id="demo-acme-technical-round-2",
                title="Acme Labs · Backend Engineer · Technical Interview Round 2",
                description=(
                    "Technical discussion with the backend team. Please join using the Meet link."
                ),
                start_at=now + timedelta(days=2, hours=3),
                end_at=now + timedelta(days=2, hours=4),
                timezone="Asia/Kolkata",
                organizer_email="maya@acmelabs.example",
                attendee_emails=["alex.rivera@example.test", "maya@acmelabs.example"],
                meeting_url="https://meet.google.com/demo-acme-round",
            ),
            NormalizedCalendarEvent(
                provider_event_id="demo-amazon-recruiter",
                title="Recruiter screen · Platform Engineer",
                description="Conversation about the Platform Engineer opportunity and hiring process.",
                start_at=now + timedelta(days=8, hours=1),
                end_at=now + timedelta(days=8, hours=1, minutes=30),
                timezone="Asia/Kolkata",
                organizer_email="recruiting@amazon.example",
                attendee_emails=["alex.rivera@example.test", "recruiting@amazon.example"],
                meeting_url="https://teams.microsoft.com/l/meetup-join/demo",
            ),
            NormalizedCalendarEvent(
                provider_event_id="demo-team-sync",
                title="Backend team weekly sync",
                description="Weekly project status and blockers.",
                start_at=now + timedelta(days=1),
                end_at=now + timedelta(days=1, minutes=30),
                timezone="Asia/Kolkata",
                organizer_email="engineering@example.test",
                attendee_emails=["alex.rivera@example.test"],
                meeting_url="https://meet.google.com/team-sync",
            ),
        ]
        return CalendarFetchResult(events=events, credentials=credentials)

    async def revoke(self, access_token: str) -> None:
        del access_token
