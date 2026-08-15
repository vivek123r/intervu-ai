from __future__ import annotations

import hashlib
from dataclasses import dataclass

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import get_settings


@dataclass(frozen=True, slots=True)
class LimitRule:
    method: str
    path_contains: str
    requests: int
    window_seconds: int


RULES = [
    LimitRule("POST", "/calendar/sync", 10, 60),
    LimitRule("POST", "/resumes", 10, 3_600),
    LimitRule("POST", "/prepare", 10, 60),
    LimitRule("POST", "/practice/sessions", 20, 60),
    LimitRule("POST", "/answers", 60, 60),
]


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        settings = get_settings()
        if not settings.rate_limit_enabled:
            return await call_next(request)
        rule = next(
            (
                item
                for item in RULES
                if request.method == item.method and item.path_contains in request.url.path
            ),
            None,
        )
        if rule is None:
            return await call_next(request)
        identity = request.headers.get("authorization") or (
            request.client.host if request.client else "unknown"
        )
        digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:24]
        bucket = int(__import__("time").time()) // rule.window_seconds
        key = f"ratelimit:{digest}:{rule.method}:{rule.path_contains}:{bucket}"
        try:
            count = await request.app.state.redis.incr(key)
            if count == 1:
                await request.app.state.redis.expire(key, rule.window_seconds + 1)
            if count > rule.requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": "Too many requests. Please wait a moment and retry.",
                            "details": {"retry_after_seconds": rule.window_seconds},
                            "request_id": getattr(request.state, "request_id", None),
                        }
                    },
                    headers={"Retry-After": str(rule.window_seconds)},
                )
        except Exception:
            # Redis failure must not take the durable application offline.
            pass
        return await call_next(request)
