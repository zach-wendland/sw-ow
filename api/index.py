"""
FastAPI Entry Point for Vercel Serverless Python Runtime.

CRITICAL: Vercel expects the ASGI app to be named `app` in this file.
The file MUST be at api/index.py for the Python runtime to detect it.
"""
from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.core.config import settings
from api.core.exceptions import APIException
from api.core.middleware import RequestLoggingMiddleware
from api.routes import health
from api.routes.v1 import player


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Lifecycle manager for FastAPI application.
    Handles startup/shutdown events for connection pooling.

    NOTE: In serverless, this runs on each cold start.
    Keep initialization lightweight.
    """
    print(f"[STARTUP] FastAPI app starting - Environment: {settings.ENVIRONMENT}")
    yield
    print("[SHUTDOWN] FastAPI app shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Open World Game API - Python backend for Next.js hybrid deployment",
    lifespan=lifespan,
    docs_url="/api/py/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/py/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/api/py/openapi.json" if settings.ENVIRONMENT != "production" else None,
)

# ============================================================================
# MIDDLEWARE STACK (Order matters: last added = first executed)
# ============================================================================

# 1. CORS - Must be first for preflight requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time"],
)

# 2. Request logging and timing
app.add_middleware(RequestLoggingMiddleware)


# ============================================================================
# GLOBAL EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """Handle custom API exceptions with structured response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "trace_id": getattr(request.state, "request_id", str(uuid.uuid4())),
            },
            "meta": {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "request_id": getattr(request.state, "request_id", str(uuid.uuid4())),
                "duration_ms": 0,
            },
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    # Log the full exception in serverless logs
    print(f"[ERROR] Unhandled exception - request_id={request_id}: {exc!r}")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred" if settings.ENVIRONMENT == "production" else str(exc),
                "details": None,
                "trace_id": request_id,
            },
            "meta": {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "request_id": request_id,
                "duration_ms": 0,
            },
        },
    )


# ============================================================================
# ROUTE REGISTRATION
# ============================================================================

# Health checks (accessible at /api/py/health)
app.include_router(health.router, prefix="/api/py", tags=["Health"])

# API v1 routes
app.include_router(player.router, prefix="/api/py/v1", tags=["Player"])


# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/api/py")
async def root():
    """Root endpoint - API information."""
    return {
        "success": True,
        "data": {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "docs": "/api/py/docs" if settings.ENVIRONMENT != "production" else None,
            "endpoints": {
                "health": "/api/py/health",
                "player": "/api/py/v1/player",
                "world": "/api/py/v1/world",
                "inventory": "/api/py/v1/inventory",
                "quests": "/api/py/v1/quests",
            },
        },
        "error": None,
        "meta": {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "request_id": str(uuid.uuid4()),
            "duration_ms": 0,
        },
    }
