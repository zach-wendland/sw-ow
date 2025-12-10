"""
Player and Character API routes.
Handles authentication, player profiles, and character management.
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from api.core.exceptions import NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, ValidationError
from api.models.base import APIResponse, PaginatedData, ResponseMeta
from api.models.player import (
    Player,
    PlayerUpdate,
    Character,
    CharacterCreate,
    CharacterUpdate,
    CharacterSummary,
    CharacterSaveData,
    SessionInfo,
)
from api.services.supabase import get_supabase_client

router = APIRouter(prefix="/player")


# ============================================================================
# HELPERS
# ============================================================================

def _create_response_meta(request_id: str = None) -> ResponseMeta:
    return ResponseMeta(
        request_id=request_id or str(uuid.uuid4()),
        duration_ms=0,
    )


async def get_current_user_id(authorization: str = Header(None)) -> str:
    """
    Extract user ID from JWT token.
    In production, this validates the Supabase JWT.
    """
    if not authorization:
        raise UnauthorizedError("Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise UnauthorizedError("Invalid authorization format")

    token = authorization.replace("Bearer ", "")

    # In production, verify JWT with Supabase
    # For now, we'll use the Supabase client to verify
    try:
        supabase = get_supabase_client()
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise UnauthorizedError("Invalid or expired token")
        return user.user.id
    except Exception as e:
        raise UnauthorizedError(f"Authentication failed: {str(e)}")


# ============================================================================
# PLAYER PROFILE ROUTES
# ============================================================================

@router.get("/me", response_model=APIResponse[Player])
async def get_current_player(
    user_id: str = Depends(get_current_user_id),
):
    """
    Get the current authenticated player's profile.
    """
    supabase = get_supabase_client()

    result = supabase.table("players").select("*").eq("auth_id", user_id).single().execute()

    if not result.data:
        raise NotFoundError("Player", user_id)

    player = Player(**result.data)

    return APIResponse(
        success=True,
        data=player,
        error=None,
        meta=_create_response_meta(),
    )


@router.patch("/me", response_model=APIResponse[Player])
async def update_current_player(
    payload: PlayerUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """
    Update the current player's profile.
    """
    supabase = get_supabase_client()

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No fields to update")

    # Convert settings to JSON if present
    if "settings" in update_data and update_data["settings"]:
        update_data["settings"] = update_data["settings"].model_dump()

    result = (
        supabase.table("players")
        .update(update_data)
        .eq("auth_id", user_id)
        .select()
        .single()
        .execute()
    )

    if not result.data:
        raise NotFoundError("Player", user_id)

    player = Player(**result.data)

    return APIResponse(
        success=True,
        data=player,
        error=None,
        meta=_create_response_meta(),
    )


@router.post("/me/login-recorded")
async def record_login(
    user_id: str = Depends(get_current_user_id),
):
    """
    Record a login event (called after successful auth).
    Updates last_login and increments login_count.
    """
    supabase = get_supabase_client()

    # Get current player to increment count
    current = supabase.table("players").select("login_count").eq("auth_id", user_id).single().execute()

    if not current.data:
        raise NotFoundError("Player", user_id)

    result = (
        supabase.table("players")
        .update({
            "last_login": datetime.utcnow().isoformat(),
            "login_count": current.data["login_count"] + 1,
        })
        .eq("auth_id", user_id)
        .execute()
    )

    return APIResponse(
        success=True,
        data={"recorded": True},
        error=None,
        meta=_create_response_meta(),
    )


# ============================================================================
# CHARACTER ROUTES
# ============================================================================

@router.get("/characters", response_model=APIResponse[List[CharacterSummary]])
async def list_characters(
    user_id: str = Depends(get_current_user_id),
):
    """
    List all characters for the current player.
    Returns lightweight summaries for character selection screen.
    """
    supabase = get_supabase_client()

    # First get player ID
    player_result = supabase.table("players").select("id").eq("auth_id", user_id).single().execute()

    if not player_result.data:
        raise NotFoundError("Player", user_id)

    player_id = player_result.data["id"]

    # Get all characters
    result = (
        supabase.table("characters")
        .select("id, name, slot_number, level, current_zone, total_play_time_seconds, last_played_at, alignment")
        .eq("player_id", player_id)
        .order("slot_number")
        .execute()
    )

    characters = [CharacterSummary(**c) for c in result.data]

    return APIResponse(
        success=True,
        data=characters,
        error=None,
        meta=_create_response_meta(),
    )


@router.post("/characters", response_model=APIResponse[Character], status_code=status.HTTP_201_CREATED)
async def create_character(
    payload: CharacterCreate,
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new character in the specified slot.
    """
    supabase = get_supabase_client()

    # Get player ID
    player_result = supabase.table("players").select("id").eq("auth_id", user_id).single().execute()

    if not player_result.data:
        raise NotFoundError("Player", user_id)

    player_id = player_result.data["id"]

    # Check if slot is already taken
    existing = (
        supabase.table("characters")
        .select("id")
        .eq("player_id", player_id)
        .eq("slot_number", payload.slot_number)
        .execute()
    )

    if existing.data:
        raise ConflictError(
            f"Character slot {payload.slot_number} is already in use",
            {"slot_number": payload.slot_number}
        )

    # Calculate initial stats based on attributes
    max_health = 100 + payload.vitality * 5
    max_stamina = 100 + payload.dexterity * 2
    max_mana = 50 + payload.intelligence * 3

    # Create character
    character_data = {
        "player_id": player_id,
        "name": payload.name,
        "slot_number": payload.slot_number,
        "strength": payload.strength,
        "dexterity": payload.dexterity,
        "intelligence": payload.intelligence,
        "vitality": payload.vitality,
        "max_health": max_health,
        "health": max_health,
        "max_stamina": max_stamina,
        "stamina": max_stamina,
        "max_mana": max_mana,
        "mana": max_mana,
    }

    result = (
        supabase.table("characters")
        .insert(character_data)
        .select()
        .single()
        .execute()
    )

    character = Character(**result.data)

    return APIResponse(
        success=True,
        data=character,
        error=None,
        meta=_create_response_meta(),
    )


@router.get("/characters/{character_id}", response_model=APIResponse[Character])
async def get_character(
    character_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Get full character data (for loading into game).
    """
    supabase = get_supabase_client()

    # Verify ownership
    result = (
        supabase.table("characters")
        .select("*, players!inner(auth_id)")
        .eq("id", character_id)
        .single()
        .execute()
    )

    if not result.data:
        raise NotFoundError("Character", character_id)

    if result.data["players"]["auth_id"] != user_id:
        raise ForbiddenError("You do not own this character")

    # Remove joined player data
    char_data = {k: v for k, v in result.data.items() if k != "players"}
    character = Character(**char_data)

    return APIResponse(
        success=True,
        data=character,
        error=None,
        meta=_create_response_meta(),
    )


@router.patch("/characters/{character_id}", response_model=APIResponse[Character])
async def update_character(
    character_id: str,
    payload: CharacterUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """
    Update character data (partial save).
    """
    supabase = get_supabase_client()

    # Verify ownership
    check = (
        supabase.table("characters")
        .select("id, players!inner(auth_id)")
        .eq("id", character_id)
        .single()
        .execute()
    )

    if not check.data:
        raise NotFoundError("Character", character_id)

    if check.data["players"]["auth_id"] != user_id:
        raise ForbiddenError("You do not own this character")

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No fields to update")

    result = (
        supabase.table("characters")
        .update(update_data)
        .eq("id", character_id)
        .select()
        .single()
        .execute()
    )

    character = Character(**result.data)

    return APIResponse(
        success=True,
        data=character,
        error=None,
        meta=_create_response_meta(),
    )


@router.post("/characters/{character_id}/save", response_model=APIResponse[Character])
async def save_character(
    character_id: str,
    payload: CharacterSaveData,
    user_id: str = Depends(get_current_user_id),
):
    """
    Full character save (called periodically during gameplay).
    """
    supabase = get_supabase_client()

    # Verify ownership
    check = (
        supabase.table("characters")
        .select("id, players!inner(auth_id)")
        .eq("id", character_id)
        .single()
        .execute()
    )

    if not check.data:
        raise NotFoundError("Character", character_id)

    if check.data["players"]["auth_id"] != user_id:
        raise ForbiddenError("You do not own this character")

    # Build save data
    save_data = {
        "position_x": payload.position.x,
        "position_y": payload.position.y,
        "position_z": payload.position.z,
        "rotation_y": payload.rotation_y,
        "current_zone": payload.current_zone,
        "health": payload.health,
        "stamina": payload.stamina,
        "mana": payload.mana,
        "is_dead": payload.is_dead,
        "last_played_at": datetime.utcnow().isoformat(),
    }

    result = (
        supabase.table("characters")
        .update(save_data)
        .eq("id", character_id)
        .select()
        .single()
        .execute()
    )

    character = Character(**result.data)

    return APIResponse(
        success=True,
        data=character,
        error=None,
        meta=_create_response_meta(),
    )


@router.delete("/characters/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    character_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Delete a character (permanent).
    """
    supabase = get_supabase_client()

    # Verify ownership
    check = (
        supabase.table("characters")
        .select("id, players!inner(auth_id)")
        .eq("id", character_id)
        .single()
        .execute()
    )

    if not check.data:
        raise NotFoundError("Character", character_id)

    if check.data["players"]["auth_id"] != user_id:
        raise ForbiddenError("You do not own this character")

    supabase.table("characters").delete().eq("id", character_id).execute()

    return None


# ============================================================================
# PLAY TIME TRACKING
# ============================================================================

@router.post("/characters/{character_id}/playtime")
async def update_playtime(
    character_id: str,
    seconds: int,
    user_id: str = Depends(get_current_user_id),
):
    """
    Add play time to character (called on save/logout).
    Also updates player's total play time.
    """
    supabase = get_supabase_client()

    # Verify ownership and get current values
    check = (
        supabase.table("characters")
        .select("id, total_play_time_seconds, player_id, players!inner(auth_id, total_play_time_seconds)")
        .eq("id", character_id)
        .single()
        .execute()
    )

    if not check.data:
        raise NotFoundError("Character", character_id)

    if check.data["players"]["auth_id"] != user_id:
        raise ForbiddenError("You do not own this character")

    # Update character play time
    new_char_time = check.data["total_play_time_seconds"] + seconds
    supabase.table("characters").update({
        "total_play_time_seconds": new_char_time,
        "last_played_at": datetime.utcnow().isoformat(),
    }).eq("id", character_id).execute()

    # Update player total play time
    new_player_time = check.data["players"]["total_play_time_seconds"] + seconds
    supabase.table("players").update({
        "total_play_time_seconds": new_player_time,
    }).eq("id", check.data["player_id"]).execute()

    return APIResponse(
        success=True,
        data={
            "character_play_time": new_char_time,
            "player_total_play_time": new_player_time,
        },
        error=None,
        meta=_create_response_meta(),
    )
