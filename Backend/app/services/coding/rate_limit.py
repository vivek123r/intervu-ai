import asyncio
import time
from collections import deque


class SlidingWindowRateLimiter:
    """In-memory per-key sliding-window limiter. Adequate for a single-process
    deployment; the AI assist endpoint is currently the only surface that uses
    one, to protect the LLM budget."""

    def __init__(self, max_events: int, window_seconds: float) -> None:
        self.max_events = max_events
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = {}
        self._lock = asyncio.Lock()

    async def check(self, key: str) -> bool:
        """Record one event for `key`; returns False when the window is full."""
        now = time.monotonic()
        async with self._lock:
            bucket = self._events.setdefault(key, deque())
            while bucket and now - bucket[0] > self.window_seconds:
                bucket.popleft()
            if len(bucket) >= self.max_events:
                return False
            bucket.append(now)
            return True
