from app.schemas.common import SessionState, SessionWireStatus

_WIRE_STATUS_BY_STATE: dict[SessionState, SessionWireStatus] = {
    SessionState.CREATED: SessionWireStatus.READY,
    SessionState.READY: SessionWireStatus.READY,
    SessionState.INTRODUCTION: SessionWireStatus.ACTIVE,
    SessionState.RESUME: SessionWireStatus.ACTIVE,
    SessionState.TECHNICAL: SessionWireStatus.ACTIVE,
    SessionState.BEHAVIORAL: SessionWireStatus.ACTIVE,
    SessionState.CANDIDATE_QUESTIONS: SessionWireStatus.ACTIVE,
    SessionState.WRAP_UP: SessionWireStatus.ACTIVE,
    SessionState.PROCESSING: SessionWireStatus.PROCESSING,
    SessionState.COMPLETED: SessionWireStatus.COMPLETED,
}

# The order sections progress through once a session starts — the realtime driver
# walks this to emit section.changed. CREATED/READY/PROCESSING/COMPLETED are
# entry/exit states, not sections a session steps through one at a time.
SECTION_ORDER: list[SessionState] = [
    SessionState.INTRODUCTION,
    SessionState.RESUME,
    SessionState.TECHNICAL,
    SessionState.BEHAVIORAL,
    SessionState.CANDIDATE_QUESTIONS,
    SessionState.WRAP_UP,
]


def wire_status(state: SessionState) -> SessionWireStatus:
    return _WIRE_STATUS_BY_STATE[state]


def next_section(current: SessionState) -> SessionState:
    if current not in SECTION_ORDER:
        return SECTION_ORDER[0]
    index = SECTION_ORDER.index(current)
    if index + 1 < len(SECTION_ORDER):
        return SECTION_ORDER[index + 1]
    return SessionState.PROCESSING
