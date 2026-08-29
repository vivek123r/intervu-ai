import asyncio
import logging
from collections.abc import Awaitable, Callable, Coroutine
from typing import Any

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int, int], Awaitable[None]]


class AnalysisRegistry:
    """Tracks the background per-answer analysis tasks running for each session.

    The realtime turn loop schedules one task per answer and moves on immediately —
    the candidate is never kept waiting on it. `drain()` is the "wait for all
    analyses to complete" step: it awaits everything still outstanding for a
    session, which `complete_session` calls before generating the final report.

    In-process only, matching the single-worker assumption already documented in
    Backend/README.md. State that must survive a restart (which answer has been
    analyzed) lives in Mongo via `analysis_status`, so a restart degrades a
    still-pending answer to `failed` rather than leaving the session hung — see
    PracticeService.analyze_and_store.
    """

    def __init__(self) -> None:
        self._tasks: dict[str, set[asyncio.Task[None]]] = {}

    def schedule(self, session_id: str, coro: Coroutine[Any, Any, None]) -> None:
        task = asyncio.create_task(self._run(session_id, coro))
        self._tasks.setdefault(session_id, set()).add(task)

    async def _run(self, session_id: str, coro: Coroutine[Any, Any, None]) -> None:
        try:
            await coro
        except Exception:
            logger.exception("Background analysis task failed for session %s", session_id)
        finally:
            tasks = self._tasks.get(session_id)
            if tasks is not None:
                tasks.discard(asyncio.current_task())
                if not tasks:
                    self._tasks.pop(session_id, None)

    async def drain(self, session_id: str, on_progress: ProgressCallback | None = None) -> None:
        """Awaits every analysis task outstanding for a session. Re-checks the
        registry after each batch completes rather than working from one fixed
        snapshot, so a task scheduled just as draining started is still awaited."""
        total = 0
        completed = 0
        while True:
            pending = list(self._tasks.get(session_id) or ())
            if not pending:
                return
            total = max(total, completed + len(pending))
            done, _ = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            completed += len(done)
            if on_progress:
                await on_progress(completed, total)

    def has_pending(self, session_id: str) -> bool:
        return bool(self._tasks.get(session_id))
