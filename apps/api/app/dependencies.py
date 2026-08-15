from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.orchestrator import AIOrchestrator
from app.ai.provider.mock import MockAIProvider
from app.ai.provider.openrouter import OpenRouterAIProvider
from app.config import Settings, get_settings
from app.core.encryption import TokenCipher
from app.core.firebase import FirebaseTokenVerifier, MockTokenVerifier
from app.core.security import AuthPrincipal, OAuthStateSigner, WebSocketTicketSigner
from app.db.session import get_db
from app.models.user import User
from app.repositories.users import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache
def get_token_verifier() -> FirebaseTokenVerifier | MockTokenVerifier:
    settings = get_settings()
    if settings.auth_mode == "firebase":
        return FirebaseTokenVerifier(settings)
    return MockTokenVerifier()


async def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthPrincipal:
    verifier = get_token_verifier()
    token = credentials.credentials if credentials else None
    if isinstance(verifier, FirebaseTokenVerifier):
        if token is None:
            from app.exceptions import AuthenticationRequired

            raise AuthenticationRequired()
        return await verifier.verify(token)
    return await verifier.verify(token)


async def get_current_user(
    principal: Annotated[AuthPrincipal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    user = await UserRepository(session).resolve_principal(principal)
    await session.commit()
    await session.refresh(user)
    return user


@lru_cache
def get_ai_orchestrator() -> AIOrchestrator:
    settings = get_settings()
    provider = (
        OpenRouterAIProvider(settings) if settings.ai_provider == "openrouter" else MockAIProvider()
    )
    return AIOrchestrator(provider, settings)


@lru_cache
def get_token_cipher() -> TokenCipher:
    return TokenCipher(get_settings().app_encryption_key)


@lru_cache
def get_oauth_state_signer() -> OAuthStateSigner:
    return OAuthStateSigner(get_settings().oauth_state_secret)


@lru_cache
def get_websocket_ticket_signer() -> WebSocketTicketSigner:
    return WebSocketTicketSigner(get_settings().oauth_state_secret)


DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
AI = Annotated[AIOrchestrator, Depends(get_ai_orchestrator)]
AppSettings = Annotated[Settings, Depends(get_settings)]
