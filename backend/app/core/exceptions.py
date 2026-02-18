"""Custom exception classes for ToolHub."""

from typing import Any


class ToolHubException(Exception):
    """Base exception for ToolHub application."""

    def __init__(
        self,
        message: str = "An error occurred",
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class BadRequestError(ToolHubException):
    """400 Bad Request."""

    def __init__(self, message: str = "Bad request", details: dict[str, Any] | None = None):
        super().__init__(message=message, status_code=400, details=details)


class UnauthorizedError(ToolHubException):
    """401 Unauthorized."""

    def __init__(self, message: str = "Unauthorized", details: dict[str, Any] | None = None):
        super().__init__(message=message, status_code=401, details=details)


class ForbiddenError(ToolHubException):
    """403 Forbidden."""

    def __init__(self, message: str = "Forbidden", details: dict[str, Any] | None = None):
        super().__init__(message=message, status_code=403, details=details)


class NotFoundError(ToolHubException):
    """404 Not Found."""

    def __init__(self, message: str = "Not found", details: dict[str, Any] | None = None):
        super().__init__(message=message, status_code=404, details=details)


class RateLimitError(ToolHubException):
    """429 Too Many Requests."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message=message, status_code=429, details=details)


class PaymentRequiredError(ToolHubException):
    """402 Payment Required."""

    def __init__(
        self,
        message: str = "Payment required",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message=message, status_code=402, details=details)


class UsageLimitError(ToolHubException):
    """Usage limit exceeded (maps to 402)."""

    def __init__(
        self,
        message: str = "Daily usage limit exceeded. Please upgrade your plan.",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message=message, status_code=402, details=details)


class FileProcessingError(ToolHubException):
    """Error during file processing."""

    def __init__(
        self,
        message: str = "File processing failed",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message=message, status_code=422, details=details)
