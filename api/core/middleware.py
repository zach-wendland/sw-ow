"""
Custom middleware for request logging and timing.
"""
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for:
    - Assigning unique request IDs
    - Timing request duration
    - Structured logging for Vercel
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        # Record start time
        start_time = time.perf_counter()

        # Process request
        response: Response = await call_next(request)

        # Calculate duration
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Add response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"

        # Structured log for Vercel (JSON is parsed automatically)
        print(
            f'{{"level": "info", "request_id": "{request_id}", '
            f'"method": "{request.method}", "path": "{request.url.path}", '
            f'"status": {response.status_code}, "duration_ms": {duration_ms}}}'
        )

        return response
