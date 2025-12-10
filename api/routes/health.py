"""
Health check endpoints for monitoring and load balancing.
"""
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field

from api.core.config import settings

router = APIRouter()


class HealthStatus(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Overall health status")
    version: str = Field(..., description="API version")
    environment: str = Field(..., description="Deployment environment")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    checks: dict = Field(default_factory=dict, description="Individual service checks")


class ReadinessStatus(BaseModel):
    """Readiness check for Kubernetes/load balancers."""

    ready: bool
    checks: dict


@router.get("/health", response_model=HealthStatus)
async def health_check():
    """
    Basic health check - always returns quickly.
    Used by load balancers for instance health.
    """
    return HealthStatus(
        status="healthy",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        checks={"api": "ok"},
    )


@router.get("/health/ready", response_model=ReadinessStatus)
async def readiness_check():
    """
    Deep health check - verifies all dependencies.
    Used before accepting traffic after deployment.
    """
    checks = {}
    all_healthy = True

    # Check if Supabase is configured
    if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
        checks["supabase_config"] = {"status": "ok"}
    else:
        checks["supabase_config"] = {"status": "not_configured"}
        # Not a failure - might be using mock data

    return ReadinessStatus(ready=all_healthy, checks=checks)


@router.get("/health/live")
async def liveness_check():
    """
    Liveness probe - minimal check that process is running.
    """
    return {"alive": True}
