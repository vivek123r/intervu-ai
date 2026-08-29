import asyncio

import pytest

import app.realtime.connection as connection_module
from app.realtime.connection import SessionConnection

pytestmark = pytest.mark.asyncio


def _make_connection() -> SessionConnection:
    # `_speak`/`_on_speech_completed` never touch the websocket or practice
    # service — only `self._outbox`/`self._speech_gate`/`self._speak_pending` —
    # so a real WebSocket/PracticeService is unnecessary for this unit test.
    return SessionConnection(websocket=None, session_id="s1", user_id="u1", practice=None)  # type: ignore[arg-type]


async def test_stray_speech_completed_is_ignored_when_nothing_is_pending() -> None:
    conn = _make_connection()

    # No `_speak()` call is in flight — this must not set the gate.
    await conn._on_speech_completed()

    assert not conn._speech_gate.is_set()


async def test_stray_ack_does_not_open_a_later_speak_calls_gate_early() -> None:
    conn = _make_connection()

    # A stray ack arrives with nothing pending — ignored per the test above.
    await conn._on_speech_completed()

    # A real `_speak()` call starts. If the stray ack above had incorrectly set
    # the gate, this would return immediately instead of actually waiting for
    # its own ack.
    speak_task = asyncio.create_task(conn._speak("transition", "Let's continue."))
    await asyncio.sleep(0)
    assert not speak_task.done()

    await conn._on_speech_completed()
    await speak_task
    assert speak_task.done()


async def test_speak_pending_resets_after_timeout_so_a_late_ack_cannot_leak_into_the_next_gate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(connection_module, "SPEECH_ACK_TIMEOUT_SECONDS", 0.02)
    conn = _make_connection()

    await conn._speak("intro", "Welcome.")  # no ack ever sent — times out
    assert conn._speak_pending is False

    # A late ack for the timed-out call above arrives only now.
    await conn._on_speech_completed()
    assert not conn._speech_gate.is_set()
