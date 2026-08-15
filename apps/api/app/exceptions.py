from __future__ import annotations

from typing import Any


class DomainError(Exception):
    code = "DOMAIN_ERROR"
    status_code = 400
    default_message = "The request could not be completed."

    def __init__(
        self, message: str | None = None, *, details: dict[str, Any] | None = None
    ) -> None:
        super().__init__(message or self.default_message)
        self.message = message or self.default_message
        self.details = details or {}


class AuthenticationRequired(DomainError):
    code = "AUTHENTICATION_REQUIRED"
    status_code = 401
    default_message = "Sign in to continue."


class PermissionDenied(DomainError):
    code = "PERMISSION_DENIED"
    status_code = 403
    default_message = "You do not have access to this resource."


class InterviewNotFound(DomainError):
    code = "INTERVIEW_NOT_FOUND"
    status_code = 404
    default_message = "That interview could not be found."


class SessionNotFound(DomainError):
    code = "SESSION_NOT_FOUND"
    status_code = 404
    default_message = "That practice session could not be found."


class SessionAlreadyCompleted(DomainError):
    code = "SESSION_ALREADY_COMPLETED"
    status_code = 409
    default_message = "This interview session is already complete."


class InvalidSessionTransition(DomainError):
    code = "INVALID_SESSION_TRANSITION"
    status_code = 409
    default_message = "The interview cannot move to that stage."


class CalendarAuthorizationExpired(DomainError):
    code = "CALENDAR_AUTH_EXPIRED"
    status_code = 401
    default_message = "Your Google Calendar connection has expired."


class CalendarNotConnected(DomainError):
    code = "CALENDAR_NOT_CONNECTED"
    status_code = 409
    default_message = "Connect Google Calendar to continue."


class ResumeParseError(DomainError):
    code = "RESUME_PARSE_ERROR"
    status_code = 422
    default_message = "We could not read that resume. Try another PDF or DOCX file."


class InvalidUpload(DomainError):
    code = "INVALID_UPLOAD"
    status_code = 422
    default_message = "That file type is not supported."


class AIProviderUnavailable(DomainError):
    code = "AI_PROVIDER_UNAVAILABLE"
    status_code = 503
    default_message = "The AI interviewer is temporarily unavailable. Your work is preserved."


class AIInvalidResponse(DomainError):
    code = "AI_INVALID_RESPONSE"
    status_code = 502
    default_message = "The AI response could not be validated. Please retry."


class RateLimitExceeded(DomainError):
    code = "RATE_LIMIT_EXCEEDED"
    status_code = 429
    default_message = "Too many requests. Please wait a moment and retry."
