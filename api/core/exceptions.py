"""
Custom exception classes for structured error handling.
"""
from typing import Any, Dict, Optional


class APIException(Exception):
    """Base exception for all API errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "API_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class ValidationError(APIException):
    """Request validation failed."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details=details,
        )


class NotFoundError(APIException):
    """Resource not found."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' not found",
            error_code="NOT_FOUND",
            status_code=404,
            details={"resource": resource, "identifier": str(identifier)},
        )


class UnauthorizedError(APIException):
    """Authentication required."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=401,
        )


class ForbiddenError(APIException):
    """Insufficient permissions."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message,
            error_code="FORBIDDEN",
            status_code=403,
        )


class ConflictError(APIException):
    """Resource conflict (e.g., duplicate entry)."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="CONFLICT",
            status_code=409,
            details=details,
        )


class RateLimitError(APIException):
    """Rate limit exceeded."""

    def __init__(self, retry_after: int = 60):
        super().__init__(
            message=f"Rate limit exceeded. Retry after {retry_after} seconds",
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details={"retry_after": retry_after},
        )
