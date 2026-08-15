import pytest

from app.exceptions import InvalidSessionTransition
from app.models.enums import SessionState
from app.services.session_state import assert_transition


def test_created_to_ready_is_allowed() -> None:
    assert_transition(SessionState.CREATED, SessionState.READY)


def test_completed_cannot_return_to_technical() -> None:
    with pytest.raises(InvalidSessionTransition):
        assert_transition(SessionState.COMPLETED, SessionState.TECHNICAL)


def test_technical_can_wrap_up() -> None:
    assert_transition(SessionState.TECHNICAL, SessionState.WRAP_UP)
