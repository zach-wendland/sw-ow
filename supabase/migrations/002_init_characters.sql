-- ============================================================================
-- Migration: 002_init_characters
-- Description: Create characters table for player game characters
-- ============================================================================

-- ============================================================================
-- CHARACTERS TABLE
-- ============================================================================
-- Each player can have multiple characters (save slots)
-- Characters store in-game progress, position, stats

CREATE TABLE IF NOT EXISTS public.characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,

    -- Character Identity
    name TEXT NOT NULL,
    slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 5),

    -- Position & Rotation (world state)
    position_x REAL DEFAULT 0.0,
    position_y REAL DEFAULT 0.0,
    position_z REAL DEFAULT 0.0,
    rotation_y REAL DEFAULT 0.0,
    current_zone TEXT DEFAULT 'starting_area',

    -- Core Stats
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    experience BIGINT DEFAULT 0 CHECK (experience >= 0),
    experience_to_next_level BIGINT DEFAULT 100,

    -- Health & Resources
    health INTEGER DEFAULT 100 CHECK (health >= 0),
    max_health INTEGER DEFAULT 100 CHECK (max_health > 0),
    stamina INTEGER DEFAULT 100 CHECK (stamina >= 0),
    max_stamina INTEGER DEFAULT 100 CHECK (max_stamina > 0),
    mana INTEGER DEFAULT 50 CHECK (mana >= 0),
    max_mana INTEGER DEFAULT 50 CHECK (max_mana >= 0),

    -- Currency
    gold BIGINT DEFAULT 0 CHECK (gold >= 0),
    premium_currency BIGINT DEFAULT 0 CHECK (premium_currency >= 0),

    -- Progression
    skill_points INTEGER DEFAULT 0 CHECK (skill_points >= 0),
    attribute_points INTEGER DEFAULT 0 CHECK (attribute_points >= 0),

    -- Attributes (base values before equipment bonuses)
    strength INTEGER DEFAULT 10 CHECK (strength >= 1),
    dexterity INTEGER DEFAULT 10 CHECK (dexterity >= 1),
    intelligence INTEGER DEFAULT 10 CHECK (intelligence >= 1),
    vitality INTEGER DEFAULT 10 CHECK (vitality >= 1),

    -- Alignment/Reputation (for Star Wars: Light/Dark side)
    alignment INTEGER DEFAULT 0 CHECK (alignment >= -100 AND alignment <= 100),
    -- -100 = full dark side, 0 = neutral, 100 = full light side

    -- Game State
    is_dead BOOLEAN DEFAULT FALSE,
    respawn_point_x REAL DEFAULT 0.0,
    respawn_point_y REAL DEFAULT 0.0,
    respawn_point_z REAL DEFAULT 0.0,

    -- Statistics
    total_play_time_seconds BIGINT DEFAULT 0,
    enemies_killed BIGINT DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    quests_completed INTEGER DEFAULT 0,
    distance_traveled REAL DEFAULT 0.0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_played_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique slot per player
    CONSTRAINT unique_player_slot UNIQUE (player_id, slot_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_characters_player_id ON public.characters(player_id);
CREATE INDEX IF NOT EXISTS idx_characters_last_played ON public.characters(last_played_at DESC);
CREATE INDEX IF NOT EXISTS idx_characters_level ON public.characters(level DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Characters can be viewed by their owner
CREATE POLICY "Players can view own characters"
    ON public.characters
    FOR SELECT
    USING (
        player_id IN (
            SELECT id FROM public.players WHERE auth_id = auth.uid()
        )
    );

-- Characters can be updated by their owner
CREATE POLICY "Players can update own characters"
    ON public.characters
    FOR UPDATE
    USING (
        player_id IN (
            SELECT id FROM public.players WHERE auth_id = auth.uid()
        )
    );

-- Characters can be created by their owner
CREATE POLICY "Players can create own characters"
    ON public.characters
    FOR INSERT
    WITH CHECK (
        player_id IN (
            SELECT id FROM public.players WHERE auth_id = auth.uid()
        )
    );

-- Characters can be deleted by their owner
CREATE POLICY "Players can delete own characters"
    ON public.characters
    FOR DELETE
    USING (
        player_id IN (
            SELECT id FROM public.players WHERE auth_id = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role has full access to characters"
    ON public.characters
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER set_characters_updated_at
    BEFORE UPDATE ON public.characters
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculate XP needed for next level (exponential curve)
CREATE OR REPLACE FUNCTION public.calculate_xp_to_level(current_level INTEGER)
RETURNS BIGINT AS $$
BEGIN
    -- Formula: 100 * level^1.5 (roughly doubles every few levels)
    RETURN FLOOR(100 * POWER(current_level, 1.5))::BIGINT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Level up function
CREATE OR REPLACE FUNCTION public.try_level_up()
RETURNS TRIGGER AS $$
DECLARE
    new_level INTEGER;
    xp_needed BIGINT;
BEGIN
    -- Check if character has enough XP to level up
    WHILE NEW.experience >= NEW.experience_to_next_level AND NEW.level < 100 LOOP
        -- Subtract XP cost
        NEW.experience := NEW.experience - NEW.experience_to_next_level;
        NEW.level := NEW.level + 1;

        -- Calculate new XP requirement
        NEW.experience_to_next_level := public.calculate_xp_to_level(NEW.level);

        -- Award skill/attribute points
        NEW.skill_points := NEW.skill_points + 1;
        IF NEW.level % 5 = 0 THEN
            NEW.attribute_points := NEW.attribute_points + 1;
        END IF;

        -- Restore health/stamina/mana on level up
        NEW.max_health := 100 + (NEW.level - 1) * 10 + NEW.vitality * 5;
        NEW.max_stamina := 100 + (NEW.level - 1) * 5 + NEW.dexterity * 2;
        NEW.max_mana := 50 + (NEW.level - 1) * 5 + NEW.intelligence * 3;

        NEW.health := NEW.max_health;
        NEW.stamina := NEW.max_stamina;
        NEW.mana := NEW.max_mana;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_level_up
    BEFORE UPDATE ON public.characters
    FOR EACH ROW
    WHEN (NEW.experience > OLD.experience)
    EXECUTE FUNCTION public.try_level_up();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.characters IS 'Player game characters (save slots) with stats and position';
COMMENT ON COLUMN public.characters.slot_number IS 'Save slot 1-5, each player can have up to 5 characters';
COMMENT ON COLUMN public.characters.alignment IS '-100 (dark) to +100 (light), affects story choices and abilities';
COMMENT ON COLUMN public.characters.experience_to_next_level IS 'XP needed for next level, calculated on level up';
