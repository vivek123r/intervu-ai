from __future__ import annotations

from contextlib import suppress
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.orchestrator import AIOrchestrator
from app.config import Settings
from app.core.encryption import TokenCipher
from app.core.security import OAuthStateSigner
from app.exceptions import CalendarNotConnected
from app.integrations.calendar import (
    CalendarCredentials,
    GoogleCalendarProvider,
    MockCalendarProvider,
)
from app.models.enums import CalendarConnectionStatus, InterviewSource, InterviewStatus
from app.models.interview import Interview
from app.models.user import User
from app.repositories.calendar import CalendarConnectionRepository
from app.repositories.interviews import InterviewRepository
from app.schemas.calendar import CalendarConnectResponse, CalendarSyncResult
from app.services.interview_detection import detect_interview_candidate


class CalendarService:
    def __init__(
        self,
        *,
        session: AsyncSession,
        settings: Settings,
        cipher: TokenCipher,
        signer: OAuthStateSigner,
        ai: AIOrchestrator,
    ) -> None:
        self.session = session
        self.settings = settings
        self.cipher = cipher
        self.signer = signer
        self.ai = ai
        self.connections = CalendarConnectionRepository(session)
        self.interviews = InterviewRepository(session)

    @property
    def is_mock(self) -> bool:
        return not self.settings.google_client_id or not self.settings.google_client_secret

    async def begin_connect(self, user: User, redirect_path: str) -> CalendarConnectResponse:
        state = self.signer.create(user_id=str(user.id), redirect_path=redirect_path)
        if self.is_mock:
            credentials = await MockCalendarProvider().exchange_code("mock")
            await self._store_credentials(user.id, user.email, credentials)
            await self.session.commit()
            return CalendarConnectResponse(
                authorization_url=f"{self.settings.web_origin}{redirect_path}?calendar=connected",
                mode="mock",
            )
        provider = GoogleCalendarProvider(self.settings)
        return CalendarConnectResponse(
            authorization_url=provider.authorization_url(state=state), mode="google_oauth"
        )

    async def complete_callback(self, *, state: str, code: str) -> str:
        payload = self.signer.read(state)
        user_id = UUID(payload["user_id"])
        user = await self.session.scalar(select(User).where(User.id == user_id))
        if user is None:
            raise CalendarNotConnected("The account for this authorization could not be found.")
        provider = MockCalendarProvider() if self.is_mock else GoogleCalendarProvider(self.settings)
        credentials = await provider.exchange_code(code)
        await self._store_credentials(user.id, user.email, credentials)
        await self.session.commit()
        return payload.get("redirect_path", "/settings/integrations")

    async def sync(self, user: User) -> CalendarSyncResult:
        connection = await self.connections.get_for_user(user.id)
        if connection is None or connection.status == CalendarConnectionStatus.REVOKED:
            raise CalendarNotConnected()
        provider = (
            MockCalendarProvider()
            if self.is_mock or not connection.encrypted_access_token
            else GoogleCalendarProvider(self.settings)
        )
        credentials = CalendarCredentials(
            access_token=(
                self.cipher.decrypt(connection.encrypted_access_token)
                if connection.encrypted_access_token
                else "mock-access"
            ),
            refresh_token=(
                self.cipher.decrypt(connection.encrypted_refresh_token)
                if connection.encrypted_refresh_token
                else None
            ),
            expiry=connection.token_expiry,
            scopes=connection.scope.split(),
        )
        fetched = await provider.fetch_upcoming(credentials)
        await self._store_credentials(
            user.id, connection.provider_account_email or user.email, fetched.credentials
        )
        created = 0
        updated = 0
        ignored = 0
        candidates = 0
        interview_ids: list[UUID] = []
        for event in fetched.events:
            evidence = detect_interview_candidate(event, user_email=user.email)
            if not evidence.likely_candidate:
                ignored += 1
                continue
            candidates += 1
            existing = await self.interviews.get_by_calendar_event(
                connection.id, event.provider_event_id
            )
            classification = await self.ai.classify_calendar_event(event.model_dump(mode="json"))
            if not classification.is_interview or classification.confidence < 0.55:
                ignored += 1
                continue
            if existing:
                existing.scheduled_at = event.start_at
                existing.duration_minutes = max(
                    10, round((event.end_at - event.start_at).total_seconds() / 60)
                )
                existing.meeting_url = event.meeting_url
                existing.detection_confidence = max(evidence.score, classification.confidence)
                existing.detection_evidence = evidence.evidence
                interview_ids.append(existing.id)
                updated += 1
                continue
            interview = Interview(
                user_id=user.id,
                company_name=classification.company or "Company to confirm",
                role_title=classification.role or event.title,
                interview_type=classification.interview_type or "technical",
                round_name=classification.round,
                scheduled_at=event.start_at,
                timezone=event.timezone,
                duration_minutes=max(
                    10, round((event.end_at - event.start_at).total_seconds() / 60)
                ),
                meeting_type=classification.meeting_platform,
                meeting_url=event.meeting_url,
                location=event.location,
                status=InterviewStatus.DETECTED,
                source=InterviewSource.GOOGLE_CALENDAR,
                calendar_connection_id=connection.id,
                calendar_event_id=event.provider_event_id,
                detection_confidence=max(evidence.score, classification.confidence),
                detection_evidence=evidence.evidence,
            )
            await self.interviews.add_calendar_candidate(interview)
            interview_ids.append(interview.id)
            created += 1
        synced_at = datetime.now(UTC)
        await self.connections.mark_sync(connection, synced_at=synced_at, succeeded=True)
        await self.session.commit()
        return CalendarSyncResult(
            fetched=len(fetched.events),
            candidates=candidates,
            created=created,
            updated=updated,
            ignored=ignored,
            interview_ids=interview_ids,
            synced_at=synced_at,
        )

    async def disconnect(self, user: User) -> None:
        connection = await self.connections.get_for_user(user.id)
        if connection is None:
            raise CalendarNotConnected()
        if connection.encrypted_access_token and not self.is_mock:
            access_token = self.cipher.decrypt(connection.encrypted_access_token)
            # Local credential removal still happens if Google's revoke endpoint is unavailable.
            with suppress(Exception):
                await GoogleCalendarProvider(self.settings).revoke(access_token)
        await self.connections.disconnect(connection)
        await self.session.commit()

    async def _store_credentials(
        self, user_id: UUID, email: str, credentials: CalendarCredentials
    ) -> None:
        await self.connections.upsert(
            user_id=user_id,
            account_email=email,
            encrypted_access_token=self.cipher.encrypt(credentials.access_token),
            encrypted_refresh_token=(
                self.cipher.encrypt(credentials.refresh_token)
                if credentials.refresh_token
                else None
            ),
            token_expiry=credentials.expiry,
            scope=" ".join(credentials.scopes),
        )
