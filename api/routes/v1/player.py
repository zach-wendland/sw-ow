"""
Player and Character API routes.

NOTE: These routes are currently disabled as the game uses localStorage
for persistence (single-player offline mode). This file is kept as a
template for future multiplayer/cloud save functionality.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/player")

# All player routes disabled - game uses localStorage for persistence
# See lib/storage/localStorage.ts for the client-side implementation
