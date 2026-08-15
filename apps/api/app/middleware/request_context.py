from __future__ import annotations

from time import perf_counter
from uuid import uuid4

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid4())
        request.state.request_id = request_id
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        started = perf_counter()
        logger = structlog.get_logger("http")
        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "request.failed",
                method=request.method,
                path=request.url.path,
                duration_ms=round((perf_counter() - started) * 1000, 2),
            )
            raise
        response.headers["x-request-id"] = request_id
        logger.info(
            "request.completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round((perf_counter() - started) * 1000, 2),
        )
        return response
