-- ============================================================================
-- Migration: 004_init_quests
-- Description: Create quest definitions and progress tables
-- ============================================================================

-- ============================================================================
-- QUEST DEFINITIONS TABLE
-- ============================================================================
-- Master list of all quests in the game

CREATE TABLE IF NOT EXISTS public.quest_definitions (
    id TEXT PRIMARY KEY,  -- e.g., "main_001_awakening", "side_tatooine_moisture"

    -- Display
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Classification
    quest_type TEXT NOT NULL CHECK (quest_type IN ('main', 'side', 'daily', 'repeatable', 'hidden')),
    category TEXT,  -- e.g., "Jedi Training", "Bounty Hunting", "Exploration"

    -- Requirements
    level_requirement INTEGER DEFAULT 1 CHECK (level_requirement >= 1),
    prerequisites TEXT[] DEFAULT '{}',  -- Array of quest IDs that must be completed first
    alignment_requirement INTEGER,  -- NULL = any, negative = dark side, positive = light side

    -- Objectives (JSONB array)
    objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: [
    --   {"id": "obj_1", "type": "kill", "target": "stormtrooper", "required": 10, "description": "Defeat 10 Stormtroopers"},
    --   {"id": "obj_2", "type": "collect", "target": "kyber_crystal_blue", "required": 1, "description": "Find a Kyber Crystal"},
    --   {"id": "obj_3", "type": "talk", "target": "npc_yoda", "required": 1, "description": "Speak with Master Yoda"}
    -- ]

    -- Rewards (JSONB array)
    rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: [
    --   {"type": "xp", "value": 500},
    --   {"type": "gold", "value": 100},
    --   {"type": "item", "item_id": "lightsaber_basic", "quantity": 1},
    --   {"type": "alignment", "value": 10}
    -- ]

    -- Dialog/Story
    dialog_tree JSONB DEFAULT '{}'::jsonb,
    -- Conversation structure for quest NPCs

    -- Tracking
    is_active BOOLEAN DEFAULT TRUE,  -- For temporarily disabling quests

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- QUEST PROGRESS TABLE
-- ============================================================================
-- Tracks each character's progress on quests

CREATE TABLE IF NOT EXISTS public.quest_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    quest_def_id TEXT NOT NULL REFERENCES public.quest_definitions(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed', 'failed', 'abandoned')),

    -- Objective Progress (JSONB)
    objectives_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"obj_1": {"current": 5, "completed": false}, "obj_2": {"current": 0, "completed": false}}

    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each character can only have one progress record per quest
    CONSTRAINT unique_character_quest UNIQUE (character_id, quest_def_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Quest definitions
CREATE INDEX IF NOT EXISTS idx_quest_defs_type ON public.quest_definitions(quest_type);
CREATE INDEX IF NOT EXISTS idx_quest_defs_level ON public.quest_definitions(level_requirement);
CREATE INDEX IF NOT EXISTS idx_quest_defs_active ON public.quest_definitions(is_active) WHERE is_active = TRUE;

-- Quest progress
CREATE INDEX IF NOT EXISTS idx_quest_progress_character_id ON public.quest_progress(character_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_status ON public.quest_progress(character_id, status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Quest definitions are public read-only
ALTER TABLE public.quest_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quest definitions"
    ON public.quest_definitions
    FOR SELECT
    USING (TRUE);

CREATE POLICY "Service role can manage quest definitions"
    ON public.quest_definitions
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Quest progress RLS
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own quest progress"
    ON public.quest_progress
    FOR SELECT
    USING (
        character_id IN (
            SELECT c.id FROM public.characters c
            JOIN public.players p ON c.player_id = p.id
            WHERE p.auth_id = auth.uid()
        )
    );

CREATE POLICY "Players can modify own quest progress"
    ON public.quest_progress
    FOR ALL
    USING (
        character_id IN (
            SELECT c.id FROM public.characters c
            JOIN public.players p ON c.player_id = p.id
            WHERE p.auth_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full quest progress access"
    ON public.quest_progress
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER set_quest_progress_updated_at
    BEFORE UPDATE ON public.quest_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- SEED DATA - Starting Quests
-- ============================================================================

INSERT INTO public.quest_definitions (id, title, description, quest_type, category, level_requirement, objectives, rewards)
VALUES
    (
        'main_001_awakening',
        'The Awakening',
        'You feel a strange pull in the Force. Something is calling to you...',
        'main',
        'Jedi Training',
        1,
        '[
            {"id": "obj_1", "type": "explore", "target": "meditation_chamber", "required": 1, "description": "Find the Meditation Chamber"},
            {"id": "obj_2", "type": "interact", "target": "holocron_pedestal", "required": 1, "description": "Activate the Ancient Holocron"},
            {"id": "obj_3", "type": "talk", "target": "npc_master_ghost", "required": 1, "description": "Speak with the Force Ghost"}
        ]'::jsonb,
        '[
            {"type": "xp", "value": 100},
            {"type": "item", "item_id": "training_saber", "quantity": 1},
            {"type": "alignment", "value": 5}
        ]'::jsonb
    ),
    (
        'main_002_first_steps',
        'First Steps',
        'Your training begins. Master the basics of combat and the Force.',
        'main',
        'Jedi Training',
        1,
        '[
            {"id": "obj_1", "type": "kill", "target": "training_droid", "required": 3, "description": "Defeat 3 Training Droids"},
            {"id": "obj_2", "type": "interact", "target": "force_push_target", "required": 5, "description": "Use Force Push 5 times"},
            {"id": "obj_3", "type": "collect", "target": "training_orb", "required": 3, "description": "Collect 3 Training Orbs"}
        ]'::jsonb,
        '[
            {"type": "xp", "value": 200},
            {"type": "gold", "value": 50},
            {"type": "item", "item_id": "robes_initiate", "quantity": 1}
        ]'::jsonb
    ),
    (
        'side_gathering_supplies',
        'Gathering Supplies',
        'The temple stores are running low. Help gather essential supplies.',
        'side',
        'Exploration',
        1,
        '[
            {"id": "obj_1", "type": "collect", "target": "supply_crate", "required": 5, "description": "Find 5 Supply Crates"},
            {"id": "obj_2", "type": "collect", "target": "medpac_small", "required": 3, "description": "Gather 3 Medpacs"}
        ]'::jsonb,
        '[
            {"type": "xp", "value": 75},
            {"type": "gold", "value": 30},
            {"type": "item", "item_id": "medpac_small", "quantity": 5}
        ]'::jsonb
    ),
    (
        'daily_training',
        'Daily Training',
        'Complete your daily training routine.',
        'daily',
        'Jedi Training',
        1,
        '[
            {"id": "obj_1", "type": "kill", "target": "any_enemy", "required": 10, "description": "Defeat 10 enemies"},
            {"id": "obj_2", "type": "collect", "target": "any_item", "required": 5, "description": "Collect 5 items"}
        ]'::jsonb,
        '[
            {"type": "xp", "value": 50},
            {"type": "gold", "value": 25}
        ]'::jsonb
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.quest_definitions IS 'Master quest definitions - all quests available in the game';
COMMENT ON TABLE public.quest_progress IS 'Character quest progress tracking';
COMMENT ON COLUMN public.quest_definitions.objectives IS 'JSON array of objectives with type (kill, collect, talk, explore, interact)';
COMMENT ON COLUMN public.quest_definitions.rewards IS 'JSON array of rewards (xp, gold, items, alignment)';
