from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import httpx
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow  # type: ignore[import-untyped]
from googleapiclient.discovery import build  # type: ignore[import-untyped]

from app.config import Settings
from app.integrations.calendar.base import CalendarCredentials, CalendarFetchResult
from app.schemas.calendar import NormalizedCalendarEvent


class GoogleCalendarProvider:
    def __init__(self, settings: Settings) -> None:
        if not settings.google_client_id or not settings.google_client_secret:
            raise ValueError("Google Calendar OAuth credentials are not configured")
        self._settings = settings
        self._client_config = {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        }

    def _flow(self, *, state: str | None = None) -> Flow:
        return Flow.from_client_config(
            self._client_config,
            scopes=self._settings.calendar_scopes,
            state=state,
            redirect_uri=self._settings.google_redirect_uri,
        )

    def authorization_url(self, *, state: str) -> str:
        url, _ = self._flow(state=state).authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )
        return str(url)

    async def exchange_code(self, code: str) -> CalendarCredentials:
        flow = self._flow()
        await asyncio.to_thread(flow.fetch_token, code=code)
        credentials = flow.credentials
        return self._to_bundle(credentials)

    async def fetch_upcoming(
        self, credentials: CalendarCredentials, *, days: int = 90
    ) -> CalendarFetchResult:
        google_credentials = Credentials(  # type: ignore[no-untyped-call]
            token=credentials.access_token,
            refresh_token=credentials.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self._settings.google_client_id,
            client_secret=self._settings.google_client_secret,
            scopes=credentials.scopes,
            expiry=credentials.expiry,
        )
        if google_credentials.expired and google_credentials.refresh_token:
            await asyncio.to_thread(google_credentials.refresh, GoogleRequest())

        def fetch() -> list[dict[str, Any]]:
            service = build("calendar", "v3", credentials=google_credentials, cache_discovery=False)
            response = (
                service.events()
                .list(
                    calendarId="primary",
                    timeMin=datetime.now(UTC).isoformat(),
                    timeMax=(datetime.now(UTC) + timedelta(days=days)).isoformat(),
                    singleEvents=True,
                    orderBy="startTime",
                    maxResults=250,
                )
                .execute()
            )
            return list(response.get("items", []))

        raw_events = await asyncio.to_thread(fetch)
        events = [self._normalize(item) for item in raw_events if item.get("status") != "cancelled"]
        return CalendarFetchResult(events=events, credentials=self._to_bundle(google_credentials))

    async def revoke(self, access_token: str) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": access_token},
                headers={"content-type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()

    def _normalize(self, item: dict[str, Any]) -> NormalizedCalendarEvent:
        start_at, is_all_day = self._parse_time(item.get("start") or {})
        end_at, _ = self._parse_time(item.get("end") or {})
        conference = item.get("conferenceData") or {}
        entry_points = conference.get("entryPoints") or []
        video_entry = next(
            (entry for entry in entry_points if entry.get("entryPointType") == "video"), None
        )
        meeting_url = item.get("hangoutLink") or (video_entry or {}).get("uri")
        return NormalizedCalendarEvent(
            provider_event_id=str(item["id"]),
            title=str(item.get("summary") or "Untitled event"),
            description=str(item.get("description") or ""),
            start_at=start_at,
            end_at=end_at,
            timezone=str((item.get("start") or {}).get("timeZone") or "UTC"),
            organizer_email=(item.get("organizer") or {}).get("email"),
            attendee_emails=[
                str(attendee["email"])
                for attendee in item.get("attendees") or []
                if attendee.get("email")
            ],
            location=item.get("location"),
            meeting_url=meeting_url,
            status=str(item.get("status") or "confirmed"),
            is_all_day=is_all_day,
        )

    @staticmethod
    def _parse_time(value: dict[str, Any]) -> tuple[datetime, bool]:
        if value.get("dateTime"):
            return datetime.fromisoformat(str(value["dateTime"]).replace("Z", "+00:00")), False
        date_value = datetime.fromisoformat(str(value["date"]))
        timezone_name = str(value.get("timeZone") or "UTC")
        return date_value.replace(tzinfo=ZoneInfo(timezone_name)).astimezone(UTC), True

    @staticmethod
    def _to_bundle(credentials: Credentials) -> CalendarCredentials:
        return CalendarCredentials(
            access_token=str(credentials.token),
            refresh_token=credentials.refresh_token,
            expiry=credentials.expiry.replace(tzinfo=UTC)
            if credentials.expiry and credentials.expiry.tzinfo is None
            else credentials.expiry,
            scopes=list(credentials.scopes or []),
        )
