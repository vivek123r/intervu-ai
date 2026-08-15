from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.exceptions import AuthenticationRequired


@dataclass(frozen=True, slots=True)
class AuthPrincipal:
    firebase_uid: str
    email: str
    display_name: str
    avatar_url: str | None = None
    authenticated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class OAuthStateSigner:
    def __init__(self, secret: str) -> None:
        self._serializer = URLSafeTimedSerializer(secret, salt="intervu-calendar-oauth")

    def create(self, *, user_id: str, redirect_path: str) -> str:
        return self._serializer.dumps({"user_id": user_id, "redirect_path": redirect_path})

    def read(self, state: str, *, max_age_seconds: int = 600) -> dict[str, str]:
        try:
            value = self._serializer.loads(state, max_age=max_age_seconds)
        except (BadSignature, SignatureExpired) as exc:
            raise AuthenticationRequired("The calendar authorization request expired.") from exc
        if not isinstance(value, dict) or not isinstance(value.get("user_id"), str):
            raise AuthenticationRequired("The calendar authorization request is invalid.")
        return {str(key): str(item) for key, item in value.items()}


class WebSocketTicketSigner:
    def __init__(self, secret: str) -> None:
        self._serializer = URLSafeTimedSerializer(secret, salt="intervu-websocket-ticket")

    def create(self, *, user_id: str, session_id: str) -> str:
        return self._serializer.dumps({"user_id": user_id, "session_id": session_id})

    def read(self, ticket: str, *, max_age_seconds: int = 90) -> dict[str, str]:
        try:
            value = self._serializer.loads(ticket, max_age=max_age_seconds)
        except (BadSignature, SignatureExpired) as exc:
            raise AuthenticationRequired("The live-session connection ticket expired.") from exc
        if not isinstance(value, dict):
            raise AuthenticationRequired("The live-session connection ticket is invalid.")
        user_id = value.get("user_id")
        session_id = value.get("session_id")
        if not isinstance(user_id, str) or not isinstance(session_id, str):
            raise AuthenticationRequired("The live-session connection ticket is invalid.")
        return {"user_id": user_id, "session_id": session_id}
