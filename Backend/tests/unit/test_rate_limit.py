"""The LLM- and TTS-backed endpoints had no ceiling at all before this."""

import time

import pytest
from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Route
from starlette.testclient import TestClient

from app.middleware.rate_limit import RATE_LIMITED_ROUTES, RateLimitMiddleware


def _app(enabled: bool = True) -> Starlette:
    async def ok(_request: object) -> PlainTextResponse:
        return PlainTextResponse("ok")

    app = Starlette(
        routes=[
            Route("/api/v1/reports/r1/chat", ok, methods=["POST"]),
            Route("/api/v1/sessions", ok, methods=["POST"]),
            Route("/api/v1/interviews", ok, methods=["GET"]),
        ]
    )
    app.add_middleware(RateLimitMiddleware, enabled=enabled)
    return app


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_limits_are_per_route() -> None:
    limits = {suffix: limit for _, suffix, limit in RATE_LIMITED_ROUTES}
    assert limits["/chat"] < limits["/voice/tts"]


def test_chat_is_limited_after_its_budget() -> None:
    client = TestClient(_app())
    limit = next(limit for _, suffix, limit in RATE_LIMITED_ROUTES if suffix == "/chat")

    for _ in range(limit):
        assert client.post("/api/v1/reports/r1/chat", headers=_headers("a")).status_code == 200

    blocked = client.post("/api/v1/reports/r1/chat", headers=_headers("a"))
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_one_caller_cannot_exhaust_anothers_budget() -> None:
    """Keyed by token, not IP — several candidates behind one office NAT must not
    share a budget."""
    client = TestClient(_app())
    limit = next(limit for _, suffix, limit in RATE_LIMITED_ROUTES if suffix == "/chat")

    for _ in range(limit):
        client.post("/api/v1/reports/r1/chat", headers=_headers("noisy"))

    assert client.post("/api/v1/reports/r1/chat", headers=_headers("noisy")).status_code == 429
    assert client.post("/api/v1/reports/r1/chat", headers=_headers("quiet")).status_code == 200


def test_unlimited_routes_are_untouched() -> None:
    client = TestClient(_app())
    for _ in range(100):
        assert client.get("/api/v1/interviews", headers=_headers("a")).status_code == 200


def test_disabling_the_setting_turns_it_off() -> None:
    client = TestClient(_app(enabled=False))
    limit = next(limit for _, suffix, limit in RATE_LIMITED_ROUTES if suffix == "/chat")
    for _ in range(limit + 5):
        assert client.post("/api/v1/reports/r1/chat", headers=_headers("a")).status_code == 200


def test_the_window_slides(monkeypatch: pytest.MonkeyPatch) -> None:
    client = TestClient(_app())
    limit = next(limit for _, suffix, limit in RATE_LIMITED_ROUTES if suffix == "/chat")

    for _ in range(limit):
        client.post("/api/v1/reports/r1/chat", headers=_headers("a"))
    assert client.post("/api/v1/reports/r1/chat", headers=_headers("a")).status_code == 429

    real_monotonic = time.monotonic
    monkeypatch.setattr(time, "monotonic", lambda: real_monotonic() + 61.0)
    assert client.post("/api/v1/reports/r1/chat", headers=_headers("a")).status_code == 200
