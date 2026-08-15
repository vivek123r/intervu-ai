from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.health import router as health_router
from app.api.v1.router import api_router
from app.config import get_settings
from app.errors.handlers import register_error_handlers
from app.lifespan import lifespan
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.realtime.router import router as realtime_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Intervu AI API", lifespan=lifespan)

    # Middleware order matters: the LAST one added ends up OUTERMOST at runtime.
    # CORS goes last so it wraps every response — including one produced by an
    # exception thrown inside RequestContext/SecurityHeaders — since a response
    # missing CORS headers reaches the browser as an opaque CORS failure instead
    # of the real error.
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.web_origin],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

    register_error_handlers(app)

    app.include_router(health_router)
    app.include_router(api_router)
    # No /api/v1 prefix — the client dials ws://.../ws/interviews/{sessionId} directly.
    app.include_router(realtime_router)

    return app


app = create_app()
