-- ============================================================================
-- Migration: 003_init_inventory
-- Description: Create item definitions and inventory tables
-- ============================================================================

-- ============================================================================
-- ITEM DEFINITIONS TABLE
-- ============================================================================
-- Master list of all items in the game (weapons, armor, consumables, etc.)
-- This is reference data, not player-specific

CREATE TABLE IF NOT EXISTS public.item_definitions (
    id TEXT PRIMARY KEY,  -- e.g., "lightsaber_basic", "health_potion_small"

    -- Display
    name TEXT NOT NULL,
    description TEXT,
    icon_path TEXT,
    model_path TEXT,

    -- Classification
    item_type TEXT NOT NULL CHECK (item_type IN ('weapon', 'armor', 'consumable', 'quest', 'misc', 'material')),
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),

    -- Stacking
    stackable BOOLEAN DEFAULT FALSE,
    max_stack INTEGER DEFAULT 1 CHECK (max_stack >= 1),

    -- Equipment
    equip_slot TEXT CHECK (equip_slot IN ('head', 'chest', 'legs', 'feet', 'main_hand', 'off_hand', 'accessory_1', 'accessory_2', NULL)),
    level_requirement INTEGER DEFAULT 1 CHECK (level_requirement >= 1),

    -- Stats (for equipment)
    stats JSONB DEFAULT '{}'::jsonb,
    -- Example: {"damage": 25, "attack_speed": 1.2, "crit_chance": 0.05}

    -- Economy
    buy_price INTEGER DEFAULT 0 CHECK (buy_price >= 0),
    sell_price INTEGER DEFAULT 0 CHECK (sell_price >= 0),
    tradeable BOOLEAN DEFAULT TRUE,

    -- Effects (for consumables)
    effects JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"type": "heal", "value": 50}, {"type": "buff", "stat": "strength", "value": 5, "duration": 60}]

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVENTORY TABLE
-- ============================================================================
-- Player inventory - tracks what items each character owns

CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    item_def_id TEXT NOT NULL REFERENCES public.item_definitions(id),

    -- Stack
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),

    -- Position in inventory grid (for UI)
    slot_index INTEGER,

    -- Equipment state
    is_equipped BOOLEAN DEFAULT FALSE,
    equipped_slot TEXT CHECK (equipped_slot IN ('head', 'chest', 'legs', 'feet', 'main_hand', 'off_hand', 'accessory_1', 'accessory_2', NULL)),

    -- Item instance data (for unique items)
    instance_data JSONB DEFAULT '{}'::jsonb,
    -- Example: {"durability": 95, "enchantments": ["fire_damage"], "custom_name": "Vader's Saber"}

    -- Metadata
    acquired_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT equipped_slot_match CHECK (
        (is_equipped = FALSE AND equipped_slot IS NULL) OR
        (is_equipped = TRUE AND equipped_slot IS NOT NULL)
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Item definitions
CREATE INDEX IF NOT EXISTS idx_item_defs_type ON public.item_definitions(item_type);
CREATE INDEX IF NOT EXISTS idx_item_defs_rarity ON public.item_definitions(rarity);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_character_id ON public.inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_def_id ON public.inventory(item_def_id);
CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON public.inventory(character_id, is_equipped) WHERE is_equipped = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Item definitions are public read-only
ALTER TABLE public.item_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view item definitions"
    ON public.item_definitions
    FOR SELECT
    USING (TRUE);

-- Only admins/service role can modify item definitions
CREATE POLICY "Service role can manage item definitions"
    ON public.item_definitions
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Inventory RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own inventory"
    ON public.inventory
    FOR SELECT
    USING (
        character_id IN (
            SELECT c.id FROM public.characters c
            JOIN public.players p ON c.player_id = p.id
            WHERE p.auth_id = auth.uid()
        )
    );

CREATE POLICY "Players can modify own inventory"
    ON public.inventory
    FOR ALL
    USING (
        character_id IN (
            SELECT c.id FROM public.characters c
            JOIN public.players p ON c.player_id = p.id
            WHERE p.auth_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full inventory access"
    ON public.inventory
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- SEED DATA - Basic Items
-- ============================================================================

INSERT INTO public.item_definitions (id, name, description, item_type, rarity, stackable, max_stack, equip_slot, level_requirement, stats, buy_price, sell_price)
VALUES
    -- Weapons
    ('training_saber', 'Training Lightsaber', 'A basic practice lightsaber for initiates.', 'weapon', 'common', FALSE, 1, 'main_hand', 1, '{"damage": 15, "attack_speed": 1.0}', 100, 25),
    ('lightsaber_basic', 'Lightsaber', 'Standard Jedi lightsaber.', 'weapon', 'uncommon', FALSE, 1, 'main_hand', 5, '{"damage": 35, "attack_speed": 1.2, "crit_chance": 0.05}', 500, 125),
    ('blaster_pistol', 'DL-44 Blaster Pistol', 'A reliable heavy blaster pistol.', 'weapon', 'common', FALSE, 1, 'main_hand', 1, '{"damage": 20, "attack_speed": 1.5, "range": 30}', 150, 40),

    -- Armor
    ('robes_initiate', 'Initiate Robes', 'Simple robes for Force-sensitive trainees.', 'armor', 'common', FALSE, 1, 'chest', 1, '{"defense": 5, "max_mana": 10}', 50, 12),
    ('robes_padawan', 'Padawan Robes', 'Traditional robes worn by Jedi Padawans.', 'armor', 'uncommon', FALSE, 1, 'chest', 5, '{"defense": 15, "max_mana": 25, "force_regen": 0.1}', 300, 75),

    -- Consumables
    ('medpac_small', 'Small Medpac', 'Restores 50 health.', 'consumable', 'common', TRUE, 20, NULL, 1, '{}', 25, 5),
    ('medpac_medium', 'Medium Medpac', 'Restores 150 health.', 'consumable', 'uncommon', TRUE, 10, NULL, 5, '{}', 75, 15),
    ('stim_strength', 'Strength Stim', 'Increases strength by 10 for 60 seconds.', 'consumable', 'uncommon', TRUE, 5, NULL, 3, '{}', 100, 25),
    ('stim_speed', 'Speed Stim', 'Increases movement speed by 25% for 30 seconds.', 'consumable', 'uncommon', TRUE, 5, NULL, 3, '{}', 100, 25),

    -- Materials
    ('kyber_crystal_blue', 'Blue Kyber Crystal', 'A Force-attuned crystal. Used in lightsaber construction.', 'material', 'rare', TRUE, 10, NULL, 1, '{}', 1000, 250),
    ('kyber_crystal_green', 'Green Kyber Crystal', 'A Force-attuned crystal. Used in lightsaber construction.', 'material', 'rare', TRUE, 10, NULL, 1, '{}', 1000, 250),
    ('kyber_crystal_red', 'Red Kyber Crystal', 'A corrupted crystal infused with dark side energy.', 'material', 'epic', TRUE, 5, NULL, 1, '{}', 2500, 625),

    -- Quest Items
    ('holocron_jedi', 'Jedi Holocron', 'An ancient Jedi data storage device.', 'quest', 'epic', FALSE, 1, NULL, 1, '{}', 0, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.item_definitions IS 'Master item definitions - reference data for all game items';
COMMENT ON TABLE public.inventory IS 'Character inventories linking characters to their owned items';
COMMENT ON COLUMN public.inventory.instance_data IS 'Unique data for this specific item instance (durability, enchants, etc.)';
