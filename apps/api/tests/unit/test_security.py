import pytest

from app.core.encryption import TokenCipher
from app.core.security import OAuthStateSigner, WebSocketTicketSigner
from app.exceptions import AuthenticationRequired


def test_token_cipher_round_trip() -> None:
    cipher = TokenCipher("test-secret")
    encrypted = cipher.encrypt("refresh-token")
    assert encrypted != "refresh-token"
    assert cipher.decrypt(encrypted) == "refresh-token"


def test_oauth_state_is_signed() -> None:
    signer = OAuthStateSigner("test-secret")
    state = signer.create(user_id="user-1", redirect_path="/onboarding")
    assert signer.read(state)["redirect_path"] == "/onboarding"
    with pytest.raises(AuthenticationRequired):
        signer.read(state + "tampered")


def test_websocket_ticket_is_scoped_to_session() -> None:
    signer = WebSocketTicketSigner("test-secret")
    ticket = signer.create(user_id="user-1", session_id="session-1")
    assert signer.read(ticket) == {"user_id": "user-1", "session_id": "session-1"}
