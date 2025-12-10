"""
Base Pydantic models for API responses.
"""
from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """Structured error information."""

    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error context")
    trace_id: str = Field(..., description="Unique identifier for error tracing")


class ResponseMeta(BaseModel):
    """Response metadata."""

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: str = Field(..., description="Unique request identifier")
    duration_ms: float = Field(0, description="Request processing time")


class APIResponse(BaseModel, Generic[T]):
    """
    Standard API response envelope.

    All API responses MUST use this format for consistency.
    """

    model_config = ConfigDict(populate_by_name=True)

    success: bool = Field(..., description="Whether the request succeeded")
    data: Optional[T] = Field(None, description="Response payload")
    error: Optional[ErrorDetail] = Field(None, description="Error details if failed")
    meta: ResponseMeta = Field(..., description="Response metadata")


class PaginatedData(BaseModel, Generic[T]):
    """Paginated list response."""

    items: List[T]
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number (1-indexed)")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_prev: bool = Field(..., description="Whether there are previous pages")
