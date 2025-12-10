"""
Supabase client singleton for database operations.
"""
from functools import lru_cache
from typing import Optional

from api.core.config import settings

# Lazy import to avoid issues when supabase is not configured
_supabase_client = None


@lru_cache(maxsize=1)
def get_supabase_client():
    """
    Create a singleton Supabase client.

    Uses lru_cache to ensure only one client per cold start.
    This is important for connection pooling efficiency.
    """
    global _supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise RuntimeError(
            "Supabase credentials not configured. "
            "Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
        )

    from supabase import create_client

    _supabase_client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
    )
    return _supabase_client


def get_supabase_admin_client():
    """
    Get admin client with service role key.

    WARNING: Only use for server-side admin operations.
    Never expose this client to user context.
    """
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Service role key not configured")

    from supabase import create_client

    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
