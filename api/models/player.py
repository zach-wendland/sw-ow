"""
Player and Character Pydantic models.
Mirrors the database schema for type safety.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# SETTINGS MODELS
# ============================================================================

class GraphicsSettings(BaseModel):
    """Graphics settings."""
    quality: str = Field(default="high", pattern="^(low|medium|high|ultra)$")
    shadows: bool = True
    particles: bool = True
    view_distance: int = Field(default=1000, ge=100, le=5000, alias="viewDistance")

    model_config = ConfigDict(populate_by_name=True)


class AudioSettings(BaseModel):
    """Audio settings."""
    master: float = Field(default=1.0, ge=0.0, le=1.0)
    music: float = Field(default=0.7, ge=0.0, le=1.0)
    sfx: float = Field(default=0.8, ge=0.0, le=1.0)
    voice: float = Field(default=1.0, ge=0.0, le=1.0)


class ControlSettings(BaseModel):
    """Control settings."""
    mouse_sensitivity: float = Field(default=1.0, ge=0.1, le=5.0, alias="mouseSensitivity")
    invert_y: bool = Field(default=False, alias="invertY")

    model_config = ConfigDict(populate_by_name=True)


class PlayerSettings(BaseModel):
    """Complete player settings."""
    graphics: GraphicsSettings = Field(default_factory=GraphicsSettings)
    audio: AudioSettings = Field(default_factory=AudioSettings)
    controls: ControlSettings = Field(default_factory=ControlSettings)


# ============================================================================
# PLAYER MODELS
# ============================================================================

class PlayerBase(BaseModel):
    """Base player fields."""
    username: str = Field(..., min_length=3, max_length=30, pattern="^[a-zA-Z0-9_]+$")
    display_name: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = None


class PlayerCreate(PlayerBase):
    """Request model for creating a player (usually auto-created on signup)."""
    pass


class PlayerUpdate(BaseModel):
    """Request model for updating player profile."""
    display_name: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = None
    settings: Optional[PlayerSettings] = None


class Player(PlayerBase):
    """Complete player model."""
    id: UUID
    auth_id: UUID
    settings: PlayerSettings = Field(default_factory=PlayerSettings)
    total_play_time_seconds: int = 0
    last_login: Optional[datetime] = None
    login_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# CHARACTER MODELS
# ============================================================================

class Position(BaseModel):
    """3D position."""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class CharacterStats(BaseModel):
    """Character combat stats."""
    level: int = Field(default=1, ge=1, le=100)
    experience: int = Field(default=0, ge=0)
    experience_to_next_level: int = Field(default=100, ge=0)

    health: int = Field(default=100, ge=0)
    max_health: int = Field(default=100, ge=1)
    stamina: int = Field(default=100, ge=0)
    max_stamina: int = Field(default=100, ge=1)
    mana: int = Field(default=50, ge=0)
    max_mana: int = Field(default=50, ge=0)

    gold: int = Field(default=0, ge=0)
    skill_points: int = Field(default=0, ge=0)
    attribute_points: int = Field(default=0, ge=0)


class CharacterAttributes(BaseModel):
    """Character base attributes."""
    strength: int = Field(default=10, ge=1)
    dexterity: int = Field(default=10, ge=1)
    intelligence: int = Field(default=10, ge=1)
    vitality: int = Field(default=10, ge=1)


class CharacterBase(BaseModel):
    """Base character fields."""
    name: str = Field(..., min_length=2, max_length=30)
    slot_number: int = Field(..., ge=1, le=5)


class CharacterCreate(CharacterBase):
    """Request model for creating a character."""
    # Initial attributes can be customized during creation
    strength: int = Field(default=10, ge=8, le=15)
    dexterity: int = Field(default=10, ge=8, le=15)
    intelligence: int = Field(default=10, ge=8, le=15)
    vitality: int = Field(default=10, ge=8, le=15)


class CharacterUpdate(BaseModel):
    """Request model for updating character (save game)."""
    # Position
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    position_z: Optional[float] = None
    rotation_y: Optional[float] = None
    current_zone: Optional[str] = None

    # Stats (server-validated updates)
    health: Optional[int] = Field(None, ge=0)
    stamina: Optional[int] = Field(None, ge=0)
    mana: Optional[int] = Field(None, ge=0)

    # For admin/cheat commands (require elevated permissions)
    experience: Optional[int] = Field(None, ge=0)
    gold: Optional[int] = Field(None, ge=0)


class CharacterSaveData(BaseModel):
    """Full character save data for load/save operations."""
    position: Position
    rotation_y: float = 0.0
    current_zone: str = "starting_area"

    health: int
    stamina: int
    mana: int

    is_dead: bool = False


class Character(CharacterBase):
    """Complete character model."""
    id: UUID
    player_id: UUID

    # Position
    position_x: float = 0.0
    position_y: float = 0.0
    position_z: float = 0.0
    rotation_y: float = 0.0
    current_zone: str = "starting_area"

    # Stats
    level: int = 1
    experience: int = 0
    experience_to_next_level: int = 100

    health: int = 100
    max_health: int = 100
    stamina: int = 100
    max_stamina: int = 100
    mana: int = 50
    max_mana: int = 50

    gold: int = 0
    premium_currency: int = 0
    skill_points: int = 0
    attribute_points: int = 0

    # Attributes
    strength: int = 10
    dexterity: int = 10
    intelligence: int = 10
    vitality: int = 10

    # Alignment
    alignment: int = 0  # -100 (dark) to +100 (light)

    # State
    is_dead: bool = False
    respawn_point_x: float = 0.0
    respawn_point_y: float = 0.0
    respawn_point_z: float = 0.0

    # Statistics
    total_play_time_seconds: int = 0
    enemies_killed: int = 0
    deaths: int = 0
    quests_completed: int = 0
    distance_traveled: float = 0.0

    # Timestamps
    created_at: datetime
    updated_at: datetime
    last_played_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CharacterSummary(BaseModel):
    """Lightweight character summary for character selection screen."""
    id: UUID
    name: str
    slot_number: int
    level: int
    current_zone: str
    total_play_time_seconds: int
    last_played_at: datetime
    alignment: int

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# AUTH MODELS
# ============================================================================

class LoginRequest(BaseModel):
    """Login request."""
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)


class SignupRequest(BaseModel):
    """Signup request."""
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)
    username: str = Field(..., min_length=3, max_length=30, pattern="^[a-zA-Z0-9_]+$")
    display_name: Optional[str] = Field(None, max_length=50)


class AuthResponse(BaseModel):
    """Authentication response with tokens and player data."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    player: Player


class SessionInfo(BaseModel):
    """Current session information."""
    user_id: UUID
    email: str
    player: Player
    active_character: Optional[CharacterSummary] = None
