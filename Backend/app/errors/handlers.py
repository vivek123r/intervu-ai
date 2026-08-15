import logging
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.errors.codes import ErrorCode
from app.errors.exceptions import AppError

logger = logging.getLogger("app.errors")


def _envelope(
    code: str, message: str, details: dict[str, Any], request: Request
) -> dict[str, Any]:
    payload = {
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "requestId": getattr(request.state, "request_id", None),
        }
    }
    return cast(dict[str, Any], jsonable_encoder(payload))


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.code, exc.message, exc.details, request),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_envelope(
                ErrorCode.VALIDATION_ERROR,
                "That request could not be validated.",
                {"errors": exc.errors()},
                request,
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(ErrorCode.REQUEST_FAILED, str(exc.detail), {}, request),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content=_envelope(
                ErrorCode.REQUEST_FAILED,
                "Intervu could not complete that request.",
                {},
                request,
            ),
        )
