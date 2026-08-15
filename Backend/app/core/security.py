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


async def resolve_identity(token: str, settings: Settings) -> ResolvedIdentity:
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
