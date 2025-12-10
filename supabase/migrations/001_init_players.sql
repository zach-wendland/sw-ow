-- ============================================================================
-- Migration: 001_init_players
-- Description: Create players table linked to Supabase Auth
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PLAYERS TABLE
-- ============================================================================
-- Stores player profile data linked to Supabase Auth users
-- One-to-one relationship with auth.users

CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Profile
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,

    -- Settings
    settings JSONB DEFAULT '{
        "graphics": {
            "quality": "high",
            "shadows": true,
            "particles": true,
            "viewDistance": 1000
        },
        "audio": {
            "master": 1.0,
            "music": 0.7,
            "sfx": 0.8,
            "voice": 1.0
        },
        "controls": {
            "mouseSensitivity": 1.0,
            "invertY": false
        }
    }'::jsonb,

    -- Stats
    total_play_time_seconds BIGINT DEFAULT 0,
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_players_auth_id ON public.players(auth_id);
CREATE INDEX IF NOT EXISTS idx_players_username ON public.players(username);
CREATE INDEX IF NOT EXISTS idx_players_created_at ON public.players(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Players can read their own data
CREATE POLICY "Players can view own data"
    ON public.players
    FOR SELECT
    USING (auth.uid() = auth_id);

-- Players can update their own data
CREATE POLICY "Players can update own data"
    ON public.players
    FOR UPDATE
    USING (auth.uid() = auth_id)
    WITH CHECK (auth.uid() = auth_id);

-- Players can insert their own data (on signup)
CREATE POLICY "Players can insert own data"
    ON public.players
    FOR INSERT
    WITH CHECK (auth.uid() = auth_id);

-- Allow service role full access (for server-side operations)
CREATE POLICY "Service role has full access"
    ON public.players
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_players_updated_at
    BEFORE UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create player profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.players (auth_id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || SUBSTRING(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'New Player'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.players IS 'Player profiles linked to Supabase Auth users';
COMMENT ON COLUMN public.players.auth_id IS 'References auth.users(id) - the Supabase Auth user';
COMMENT ON COLUMN public.players.settings IS 'JSON settings for graphics, audio, controls';
COMMENT ON COLUMN public.players.total_play_time_seconds IS 'Total accumulated play time across all sessions';
