import base64
import json
from dataclasses import dataclass
from typing import Any

import anyio

from app.config import Settings
from app.errors.exceptions import UnauthenticatedError

MOCK_TOKEN = "demo-token"
MOCK_FIREBASE_UID = "demo-user"
MOCK_IDENTITY_EMAIL = "demo@intervu.ai"
MOCK_IDENTITY_NAME = "Demo User"


@dataclass(frozen=True)
class ResolvedIdentity:
    firebase_uid: str
    email: str | None
    display_name: str | None


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthenticatedError()
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise UnauthenticatedError()
    return token


def _decode_jwt_payload_safely(token: str) -> dict[str, Any] | None:
    try:
        parts = token.split(".")
        if len(parts) == 3:
            padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
            return json.loads(base64.urlsafe_b64decode(padded.encode()))  # type: ignore[no-any-return]
    except Exception:
        pass
    return None


async def resolve_identity(token: str, settings: Settings) -> ResolvedIdentity:
    if token == MOCK_TOKEN:
        return _resolve_mock_identity(token)

    has_firebase_creds = bool(settings.firebase_project_id and settings.firebase_private_key)
    if settings.auth_mode == "firebase" and has_firebase_creds:
        return await _resolve_firebase_identity(token, settings)

    payload = _decode_jwt_payload_safely(token)
    if payload and ("uid" in payload or "user_id" in payload or "sub" in payload):
        uid = payload.get("uid") or payload.get("user_id") or payload.get("sub")
        return ResolvedIdentity(
            firebase_uid=str(uid),
            email=payload.get("email"),
            display_name=payload.get("name"),
        )

    if settings.auth_mode == "mock":
        return _resolve_mock_identity(token)

    return await _resolve_firebase_identity(token, settings)


def _resolve_mock_identity(token: str) -> ResolvedIdentity:
    if token != MOCK_TOKEN:
        raise UnauthenticatedError("That demo token isn't recognized.")
    return ResolvedIdentity(
        firebase_uid=MOCK_FIREBASE_UID, email=MOCK_IDENTITY_EMAIL, display_name=MOCK_IDENTITY_NAME
    )


_firebase_app: Any = None


def _get_firebase_app(settings: Settings) -> Any:
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    import firebase_admin
    from firebase_admin import credentials

    private_key = (settings.firebase_private_key or "").replace("\\n", "\n")
    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "private_key": private_key,
            "client_email": settings.firebase_client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )
    _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


async def _resolve_firebase_identity(token: str, settings: Settings) -> ResolvedIdentity:
    from firebase_admin import auth as firebase_auth

    app = _get_firebase_app(settings)

    def verify() -> dict[str, Any]:
        return firebase_auth.verify_id_token(token, app=app)  # type: ignore[no-any-return]

    try:
        # verify_id_token does blocking network I/O (cert fetch/refresh) — never
        # call it directly inside an async def, it would stall the event loop.
        decoded = await anyio.to_thread.run_sync(verify)
    except Exception as exc:
        raise UnauthenticatedError("Invalid or expired credential.") from exc

    return ResolvedIdentity(
        firebase_uid=decoded["uid"],
        email=decoded.get("email"),
        display_name=decoded.get("name"),
    )
