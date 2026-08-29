import time
from collections import deque

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.security import extract_bearer_token
from app.errors.codes import ErrorCode

# Endpoints that cost a real LLM or TTS round-trip, and how many calls one caller
# may make per window. Matched as a (method, path-suffix) prefix check, so path
# parameters don't need enumerating.
RATE_LIMITED_ROUTES: tuple[tuple[str, str, int], ...] = (
    # Post-interview Q&A: one uncapped LLM call per POST.
    ("POST", "/chat", 20),
    # Speech synthesis: one edge-tts round-trip per line spoken.
    ("POST", "/voice/tts", 240),
    # Every session creation costs two LLM calls once started.
    ("POST", "/sessions", 30),
)

WINDOW_SECONDS = 60.0


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-caller sliding-window limit on the endpoints that cost real money.

    Deliberately in-process and approximate, matching the single-worker assumption
    documented in Backend/README.md. It exists to bound accidental or abusive
    hammering of the LLM and TTS paths, which previously had no ceiling at all —
    `settings.rate_limit_enabled` existed but nothing read it.
    """

    def __init__(self, app: object, enabled: bool = True) -> None:
        super().__init__(app)  # type: ignore[arg-type]
        self._enabled = enabled
        self._hits: dict[tuple[str, str], deque[float]] = {}

    def _limit_for(self, method: str, path: str) -> tuple[str, int] | None:
        for limited_method, suffix, limit in RATE_LIMITED_ROUTES:
            if method == limited_method and path.endswith(suffix):
                return suffix, limit
        return None

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not self._enabled:
            return await call_next(request)

        matched = self._limit_for(request.method, request.url.path)
        if matched is None:
            return await call_next(request)

        route_key, limit = matched
        # Keyed by token rather than IP: several candidates behind one office NAT
        # must not share a budget.
        caller = extract_bearer_token(request.headers.get("authorization")) or (
            request.client.host if request.client else "anonymous"
        )

        now = time.monotonic()
        bucket = self._hits.setdefault((caller, route_key), deque())
        while bucket and now - bucket[0] > WINDOW_SECONDS:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = int(WINDOW_SECONDS - (now - bucket[0])) + 1
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": ErrorCode.REQUEST_FAILED,
                        "message": "You're doing that too quickly. Give it a moment.",
                        "details": {"retryAfterSeconds": retry_after},
                    }
                },
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)
        return await call_next(request)
