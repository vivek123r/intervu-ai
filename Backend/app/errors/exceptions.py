from typing import Any

from app.errors.codes import ErrorCode


class AppError(Exception):
    """Any error that must reach the client as the API-CONTRACT.md error envelope."""

    def __init__(
        self,
        status_code: int,
        code: ErrorCode,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


class NotFoundError(AppError):
    def __init__(self, code: ErrorCode, message: str) -> None:
        super().__init__(status_code=404, code=code, message=message)


class UnauthenticatedError(AppError):
    def __init__(self, message: str = "Sign in to continue.") -> None:
        super().__init__(status_code=401, code=ErrorCode.UNAUTHENTICATED, message=message)


class ValidationAppError(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            status_code=422, code=ErrorCode.VALIDATION_ERROR, message=message, details=details
        )
