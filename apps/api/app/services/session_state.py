from __future__ import annotations

from app.exceptions import InvalidSessionTransition
from app.models.enums import SessionState

ALLOWED_TRANSITIONS: dict[SessionState, set[SessionState]] = {
    SessionState.CREATED: {SessionState.READY},
    SessionState.READY: {SessionState.INTRODUCTION},
    SessionState.INTRODUCTION: {
        SessionState.RESUME,
        SessionState.TECHNICAL,
        SessionState.BEHAVIORAL,
        SessionState.WRAP_UP,
    },
    SessionState.RESUME: {
        SessionState.TECHNICAL,
        SessionState.BEHAVIORAL,
        SessionState.CANDIDATE_QUESTIONS,
        SessionState.WRAP_UP,
    },
    SessionState.TECHNICAL: {
        SessionState.BEHAVIORAL,
        SessionState.CANDIDATE_QUESTIONS,
        SessionState.WRAP_UP,
    },
    SessionState.BEHAVIORAL: {SessionState.CANDIDATE_QUESTIONS, SessionState.WRAP_UP},
    SessionState.CANDIDATE_QUESTIONS: {SessionState.WRAP_UP},
    SessionState.WRAP_UP: {SessionState.PROCESSING},
    SessionState.PROCESSING: {SessionState.COMPLETED},
    SessionState.COMPLETED: set(),
}


def assert_transition(current: SessionState, target: SessionState) -> None:
    if target not in ALLOWED_TRANSITIONS[current]:
        raise InvalidSessionTransition(
            details={"current_state": current.value, "requested_state": target.value}
        )


def next_configured_section(current: SessionState, sections: list[SessionState]) -> SessionState:
    try:
        current_index = sections.index(current)
    except ValueError:
        current_index = -1
    if current_index + 1 >= len(sections):
        target = SessionState.WRAP_UP
    else:
        target = sections[current_index + 1]
    assert_transition(current, target)
    return target
