from __future__ import annotations

from typing import Any

import firebase_admin  # type: ignore[import-untyped]
from firebase_admin import auth, credentials

from app.config import Settings
from app.core.security import AuthPrincipal
from app.exceptions import AuthenticationRequired


class FirebaseTokenVerifier:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._initialized = False

    def _initialize(self) -> None:
        if self._initialized:
            return
        if not all(
            [
                self._settings.firebase_project_id,
                self._settings.firebase_client_email,
                self._settings.firebase_private_key,
            ]
        ):
            raise AuthenticationRequired("Firebase Admin credentials are not configured.")
        if not firebase_admin._apps:
            credential = credentials.Certificate(
                {
                    "type": "service_account",
                    "project_id": self._settings.firebase_project_id,
                    "client_email": self._settings.firebase_client_email,
                    "private_key": self._settings.firebase_private_key,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            )
            firebase_admin.initialize_app(credential)
        self._initialized = True

    async def verify(self, token: str) -> AuthPrincipal:
        self._initialize()
        try:
            decoded: dict[str, Any] = auth.verify_id_token(token, check_revoked=True)
        except Exception as exc:
            raise AuthenticationRequired("Your session is invalid or expired.") from exc
        uid = decoded.get("uid")
        email = decoded.get("email")
        if not isinstance(uid, str) or not isinstance(email, str):
            raise AuthenticationRequired("The identity token is missing required claims.")
        return AuthPrincipal(
            firebase_uid=uid,
            email=email,
            display_name=str(decoded.get("name") or email.split("@", maxsplit=1)[0]),
            avatar_url=str(decoded["picture"]) if decoded.get("picture") else None,
        )


class MockTokenVerifier:
    async def verify(self, token: str | None = None) -> AuthPrincipal:
        if token not in {None, "", "demo-token"}:
            raise AuthenticationRequired("Use the demo token in local mock mode.")
        return AuthPrincipal(
            firebase_uid="demo_alex_rivera",
            email="alex.rivera@example.test",
            display_name="Alex Rivera",
            avatar_url=None,
        )
