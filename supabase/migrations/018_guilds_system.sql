-- =====================================================
-- GUILDS SYSTEM (GRUPOS)
-- Migration: 018_guilds_system.sql
-- 
-- Features:
-- - Crear y gestionar guilds
-- - Roles (leader, officer, member)
-- - Raids grupales
-- - Sistema de castigos por votación
-- - Leaderboards
-- =====================================================

-- =====================================================
-- ALTER EXISTING GUILDS TABLE (add missing columns)
-- =====================================================

-- Add new columns to existing guilds table
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS min_level_required INTEGER DEFAULT 1;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS total_xp BIGINT DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS total_raids_completed INTEGER DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS current_raid_streak INTEGER DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS best_raid_streak INTEGER DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Copy owner_id to leader_id if owner_id exists and leader_id is null
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'owner_id') THEN
        UPDATE guilds SET leader_id = owner_id WHERE leader_id IS NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guilds_public ON guilds(is_public);
CREATE INDEX IF NOT EXISTS idx_guilds_invite ON guilds(invite_code) WHERE invite_code IS NOT NULL;

-- =====================================================
-- GUILD MEMBERS TABLE (alter existing or create new)
-- =====================================================

-- First, add missing columns if table exists
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS xp_contributed BIGINT DEFAULT 0;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS raids_participated INTEGER DEFAULT 0;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS raids_completed INTEGER DEFAULT 0;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS punishments_received INTEGER DEFAULT 0;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Update role constraint to include leader, officer, member (drop and recreate if different)
DO $$
BEGIN
    -- Check if role column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guild_members' AND column_name = 'role') THEN
        ALTER TABLE guild_members ADD COLUMN role TEXT NOT NULL DEFAULT 'member';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);

-- =====================================================
-- GUILD INVITES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS guild_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invited_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Can be user-specific or open invite code
    invite_code TEXT,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_guild_invites_user ON guild_invites(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_guild_invites_code ON guild_invites(invite_code);

-- =====================================================
-- GUILD RAIDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS guild_raids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    
    -- Raid info
    title TEXT NOT NULL,
    description TEXT,
    raid_type TEXT DEFAULT 'challenge' CHECK (raid_type IN ('challenge', 'competition', 'boss')),
    
    -- Requirements
    target_type TEXT NOT NULL CHECK (target_type IN ('quests', 'habits', 'xp', 'streak', 'custom')),
    target_value INTEGER NOT NULL, -- e.g., 50 quests, 10000 XP
    current_value INTEGER DEFAULT 0,
    
    -- Time limits
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    duration_hours INTEGER,
    
    -- Rewards
    xp_reward_per_member INTEGER DEFAULT 0,
    bonus_coins INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'failed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    
    -- Created by
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guild_raids_guild ON guild_raids(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_raids_status ON guild_raids(status);
CREATE INDEX IF NOT EXISTS idx_guild_raids_active ON guild_raids(guild_id, status) WHERE status = 'active';

-- =====================================================
-- RAID PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS raid_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raid_id UUID NOT NULL REFERENCES guild_raids(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Contribution
    contribution_value INTEGER DEFAULT 0,
    contribution_percent DECIMAL(5, 2) DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'left')),
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    UNIQUE(raid_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_raid_participants_raid ON raid_participants(raid_id);
CREATE INDEX IF NOT EXISTS idx_raid_participants_user ON raid_participants(user_id);

-- =====================================================
-- PUNISHMENT SYSTEM
-- =====================================================

-- Punishment proposals when someone fails
CREATE TABLE IF NOT EXISTS punishment_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    
    -- Who is being punished
    target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Why (failed raid, lost bet, etc.)
    reason_type TEXT NOT NULL CHECK (reason_type IN ('raid_fail', 'duel_loss', 'bet_loss', 'streak_break', 'custom')),
    reason_description TEXT,
    reference_id UUID, -- raid_id, duel_id, etc.
    
    -- Status
    status TEXT DEFAULT 'voting' CHECK (status IN ('voting', 'decided', 'completed', 'cancelled')),
    
    -- Voting period
    voting_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Result
    winning_punishment_id UUID,
    punishment_completed BOOLEAN DEFAULT FALSE,
    punishment_completed_at TIMESTAMPTZ,
    proof_url TEXT, -- Evidence that punishment was done
    
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_punishment_proposals_guild ON punishment_proposals(guild_id);
CREATE INDEX IF NOT EXISTS idx_punishment_proposals_target ON punishment_proposals(target_user_id);
CREATE INDEX IF NOT EXISTS idx_punishment_proposals_voting ON punishment_proposals(status) WHERE status = 'voting';

-- Punishment options to vote on
CREATE TABLE IF NOT EXISTS punishment_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES punishment_proposals(id) ON DELETE CASCADE,
    
    -- Punishment description
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('light', 'medium', 'hard', 'extreme')),
    
    -- Votes
    vote_count INTEGER DEFAULT 0,
    
    -- Who proposed this option
    proposed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_punishment_options_proposal ON punishment_options(proposal_id);

-- Votes for punishment options
CREATE TABLE IF NOT EXISTS punishment_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES punishment_proposals(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES punishment_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(proposal_id, user_id) -- One vote per user per proposal
);

CREATE INDEX IF NOT EXISTS idx_punishment_votes_proposal ON punishment_votes(proposal_id);

-- =====================================================
-- GUILD CHAT/MESSAGES (Simple implementation)
-- =====================================================

CREATE TABLE IF NOT EXISTS guild_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'raid_update', 'achievement')),
    content TEXT NOT NULL,
    
    -- Optional metadata
    metadata JSONB,
    
    -- For replies
    reply_to_id UUID REFERENCES guild_messages(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_guild_messages_guild ON guild_messages(guild_id, created_at DESC);

-- =====================================================
-- LEADERBOARDS TABLE (Cached for performance)
-- =====================================================

CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scope
    scope TEXT NOT NULL CHECK (scope IN ('global', 'guild', 'friends')),
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE, -- If scope is 'guild'
    
    -- Type
    leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN (
        'xp_total', 'xp_weekly', 'xp_monthly',
        'level', 'streak', 'quests_completed',
        'raids_completed', 'duels_won'
    )),
    
    -- Time period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Cached rankings (JSONB array of {user_id, rank, value, display_name, avatar_url})
    rankings JSONB NOT NULL DEFAULT '[]',
    
    -- Last update
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(scope, guild_id, leaderboard_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_leaderboards_type ON leaderboards(scope, leaderboard_type);

-- =====================================================
-- TITLES / RANKS BY LEVEL
-- =====================================================

CREATE TABLE IF NOT EXISTS user_titles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_es TEXT NOT NULL,
    min_level INTEGER NOT NULL,
    max_level INTEGER,
    icon TEXT,
    color TEXT, -- Hex color for display
    description TEXT,
    description_es TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Insert default titles
INSERT INTO user_titles (id, name, name_es, min_level, max_level, icon, color, sort_order) VALUES
    ('novice', 'Novice', 'Novato', 1, 4, '🌱', '#9CA3AF', 1),
    ('apprentice', 'Apprentice', 'Aprendiz', 5, 9, '📚', '#60A5FA', 2),
    ('adventurer', 'Adventurer', 'Aventurero', 10, 19, '🗺️', '#34D399', 3),
    ('warrior', 'Warrior', 'Guerrero', 20, 29, '⚔️', '#FBBF24', 4),
    ('veteran', 'Veteran', 'Veterano', 30, 39, '🛡️', '#F97316', 5),
    ('elite', 'Elite', 'Élite', 40, 49, '💎', '#A855F7', 6),
    ('champion', 'Champion', 'Campeón', 50, 59, '🏆', '#EF4444', 7),
    ('master', 'Master', 'Maestro', 60, 74, '👑', '#EC4899', 8),
    ('grandmaster', 'Grandmaster', 'Gran Maestro', 75, 89, '⭐', '#8B5CF6', 9),
    ('legend', 'Legend', 'Leyenda', 90, 99, '🌟', '#F59E0B', 10),
    ('mythic', 'Mythic', 'Mítico', 100, NULL, '🔥', '#DC2626', 11)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_es = EXCLUDED.name_es,
    min_level = EXCLUDED.min_level,
    max_level = EXCLUDED.max_level,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;

-- =====================================================
-- FUNCTIONS (Drop existing to allow return type changes)
-- =====================================================

-- Drop existing functions if they exist with different signatures
DROP FUNCTION IF EXISTS get_user_title(INTEGER);
DROP FUNCTION IF EXISTS create_guild(UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS create_guild(UUID, TEXT, TEXT, TEXT, BOOLEAN); -- Old version with icon
DROP FUNCTION IF EXISTS join_guild_by_code(UUID, TEXT);
DROP FUNCTION IF EXISTS update_raid_progress(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS vote_punishment(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS calculate_leaderboard(TEXT, TEXT, UUID);

-- Get user's title based on level
CREATE OR REPLACE FUNCTION get_user_title(p_level INTEGER)
RETURNS TABLE(id TEXT, name TEXT, name_es TEXT, icon TEXT, color TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT ut.id, ut.name, ut.name_es, ut.icon, ut.color
    FROM user_titles ut
    WHERE ut.min_level <= p_level
    AND (ut.max_level IS NULL OR ut.max_level >= p_level)
    ORDER BY ut.min_level DESC
    LIMIT 1;
END;
$$;

-- Create a guild
CREATE OR REPLACE FUNCTION create_guild(
    p_user_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_is_public BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_guild_id UUID;
    v_invite_code TEXT;
BEGIN
    -- Generate unique invite code
    v_invite_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Create guild
    INSERT INTO guilds (name, description, is_public, leader_id, invite_code)
    VALUES (p_name, p_description, p_is_public, p_user_id, v_invite_code)
    RETURNING id INTO v_guild_id;
    
    -- Add creator as leader
    INSERT INTO guild_members (guild_id, user_id, role)
    VALUES (v_guild_id, p_user_id, 'leader');
    
    RETURN v_guild_id;
END;
$$;

-- Join guild by invite code
CREATE OR REPLACE FUNCTION join_guild_by_code(
    p_user_id UUID,
    p_invite_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_guild guilds;
    v_member_count INTEGER;
    v_user_level INTEGER;
BEGIN
    -- Find guild
    SELECT * INTO v_guild
    FROM guilds
    WHERE invite_code = UPPER(p_invite_code);
    
    IF v_guild.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Código de invitación inválido');
    END IF;
    
    -- Check if already member
    IF EXISTS (SELECT 1 FROM guild_members WHERE guild_id = v_guild.id AND user_id = p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ya eres miembro de este guild');
    END IF;
    
    -- Check member count
    SELECT COUNT(*) INTO v_member_count FROM guild_members WHERE guild_id = v_guild.id;
    IF v_member_count >= v_guild.max_members THEN
        RETURN jsonb_build_object('success', false, 'error', 'El guild está lleno');
    END IF;
    
    -- Check level requirement
    SELECT level INTO v_user_level FROM profiles WHERE id = p_user_id;
    IF v_user_level < v_guild.min_level_required THEN
        RETURN jsonb_build_object('success', false, 'error', 'No cumples el nivel mínimo requerido');
    END IF;
    
    -- Join
    INSERT INTO guild_members (guild_id, user_id, role)
    VALUES (v_guild.id, p_user_id, 'member');
    
    RETURN jsonb_build_object(
        'success', true,
        'guild_id', v_guild.id,
        'guild_name', v_guild.name
    );
END;
$$;

-- Update raid progress
CREATE OR REPLACE FUNCTION update_raid_progress(
    p_raid_id UUID,
    p_user_id UUID,
    p_contribution INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_raid guild_raids;
    v_new_total INTEGER;
BEGIN
    -- Get raid
    SELECT * INTO v_raid FROM guild_raids WHERE id = p_raid_id AND status = 'active';
    
    IF v_raid.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Raid no encontrado o no activo');
    END IF;
    
    -- Update participant contribution
    UPDATE raid_participants
    SET contribution_value = contribution_value + p_contribution
    WHERE raid_id = p_raid_id AND user_id = p_user_id;
    
    -- Update raid total
    UPDATE guild_raids
    SET current_value = current_value + p_contribution,
        updated_at = NOW()
    WHERE id = p_raid_id
    RETURNING current_value INTO v_new_total;
    
    -- Check if completed
    IF v_new_total >= v_raid.target_value THEN
        UPDATE guild_raids
        SET status = 'completed', completed_at = NOW()
        WHERE id = p_raid_id;
        
        -- Mark all participants as completed
        UPDATE raid_participants
        SET status = 'completed', completed_at = NOW()
        WHERE raid_id = p_raid_id;
        
        -- Update guild stats
        UPDATE guilds
        SET total_raids_completed = total_raids_completed + 1,
            current_raid_streak = current_raid_streak + 1,
            best_raid_streak = GREATEST(best_raid_streak, current_raid_streak + 1)
        WHERE id = v_raid.guild_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'completed', true,
            'current_value', v_new_total,
            'target_value', v_raid.target_value
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'completed', false,
        'current_value', v_new_total,
        'target_value', v_raid.target_value,
        'progress_percent', ROUND((v_new_total::DECIMAL / v_raid.target_value) * 100, 1)
    );
END;
$$;

-- Vote on punishment
CREATE OR REPLACE FUNCTION vote_punishment(
    p_user_id UUID,
    p_proposal_id UUID,
    p_option_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_proposal punishment_proposals;
    v_old_option_id UUID;
BEGIN
    -- Check proposal exists and is voting
    SELECT * INTO v_proposal
    FROM punishment_proposals
    WHERE id = p_proposal_id AND status = 'voting';
    
    IF v_proposal.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Votación no encontrada o cerrada');
    END IF;
    
    -- Check voting period
    IF NOW() > v_proposal.voting_ends_at THEN
        RETURN jsonb_build_object('success', false, 'error', 'El período de votación terminó');
    END IF;
    
    -- Check if already voted (and get old option)
    SELECT option_id INTO v_old_option_id
    FROM punishment_votes
    WHERE proposal_id = p_proposal_id AND user_id = p_user_id;
    
    IF v_old_option_id IS NOT NULL THEN
        -- Change vote
        UPDATE punishment_votes
        SET option_id = p_option_id
        WHERE proposal_id = p_proposal_id AND user_id = p_user_id;
        
        -- Update counts
        UPDATE punishment_options SET vote_count = vote_count - 1 WHERE id = v_old_option_id;
        UPDATE punishment_options SET vote_count = vote_count + 1 WHERE id = p_option_id;
    ELSE
        -- New vote
        INSERT INTO punishment_votes (proposal_id, option_id, user_id)
        VALUES (p_proposal_id, p_option_id, p_user_id);
        
        UPDATE punishment_options SET vote_count = vote_count + 1 WHERE id = p_option_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Voto registrado');
END;
$$;

-- Calculate and cache leaderboard
CREATE OR REPLACE FUNCTION calculate_leaderboard(
    p_scope TEXT,
    p_type TEXT,
    p_guild_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rankings JSONB;
BEGIN
    -- Calculate rankings based on type
    CASE p_type
        WHEN 'xp_total' THEN
            SELECT jsonb_agg(row_to_json(r))
            INTO v_rankings
            FROM (
                SELECT 
                    p.id as user_id,
                    ROW_NUMBER() OVER (ORDER BY p.total_xp DESC) as rank,
                    p.total_xp as value,
                    p.display_name,
                    p.avatar_url
                FROM profiles p
                WHERE (p_guild_id IS NULL OR EXISTS (
                    SELECT 1 FROM guild_members gm WHERE gm.user_id = p.id AND gm.guild_id = p_guild_id
                ))
                ORDER BY p.total_xp DESC
                LIMIT 100
            ) r;
            
        WHEN 'level' THEN
            SELECT jsonb_agg(row_to_json(r))
            INTO v_rankings
            FROM (
                SELECT 
                    p.id as user_id,
                    ROW_NUMBER() OVER (ORDER BY p.level DESC, p.total_xp DESC) as rank,
                    p.level as value,
                    p.display_name,
                    p.avatar_url
                FROM profiles p
                WHERE (p_guild_id IS NULL OR EXISTS (
                    SELECT 1 FROM guild_members gm WHERE gm.user_id = p.id AND gm.guild_id = p_guild_id
                ))
                ORDER BY p.level DESC, p.total_xp DESC
                LIMIT 100
            ) r;
            
        WHEN 'streak' THEN
            SELECT jsonb_agg(row_to_json(r))
            INTO v_rankings
            FROM (
                SELECT 
                    p.id as user_id,
                    ROW_NUMBER() OVER (ORDER BY p.current_streak DESC) as rank,
                    p.current_streak as value,
                    p.display_name,
                    p.avatar_url
                FROM profiles p
                WHERE (p_guild_id IS NULL OR EXISTS (
                    SELECT 1 FROM guild_members gm WHERE gm.user_id = p.id AND gm.guild_id = p_guild_id
                ))
                ORDER BY p.current_streak DESC
                LIMIT 100
            ) r;
            
        ELSE
            v_rankings := '[]'::JSONB;
    END CASE;
    
    -- Upsert leaderboard
    INSERT INTO leaderboards (scope, guild_id, leaderboard_type, rankings, calculated_at)
    VALUES (p_scope, p_guild_id, p_type, COALESCE(v_rankings, '[]'), NOW())
    ON CONFLICT (scope, guild_id, leaderboard_type, period_start) 
    DO UPDATE SET rankings = COALESCE(v_rankings, '[]'), calculated_at = NOW();
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_raids ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE punishment_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE punishment_votes ENABLE ROW LEVEL SECURITY;

-- Guilds: Public guilds visible to all, private only to members
CREATE POLICY "guilds_select" ON guilds FOR SELECT
    USING (is_public OR EXISTS (
        SELECT 1 FROM guild_members gm WHERE gm.guild_id = id AND gm.user_id = auth.uid()
    ));

CREATE POLICY "guilds_insert" ON guilds FOR INSERT
    WITH CHECK (leader_id = auth.uid());

CREATE POLICY "guilds_update" ON guilds FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = id AND gm.user_id = auth.uid() AND gm.role IN ('leader', 'officer')
    ));

-- Guild members: Visible to guild members
CREATE POLICY "guild_members_select" ON guild_members FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_id AND gm.user_id = auth.uid()
    ) OR user_id = auth.uid());

CREATE POLICY "guild_members_insert" ON guild_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Guild messages: Visible to guild members
CREATE POLICY "guild_messages_select" ON guild_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_id AND gm.user_id = auth.uid()
    ));

CREATE POLICY "guild_messages_insert" ON guild_messages FOR INSERT
    WITH CHECK (user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_id AND gm.user_id = auth.uid()
    ));

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_title TO authenticated;
GRANT EXECUTE ON FUNCTION create_guild TO authenticated;
GRANT EXECUTE ON FUNCTION join_guild_by_code TO authenticated;
GRANT EXECUTE ON FUNCTION update_raid_progress TO authenticated;
GRANT EXECUTE ON FUNCTION vote_punishment TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_leaderboard TO authenticated;

-- =====================================================
-- SUMMARY
-- =====================================================
-- 
-- Tables:
-- - guilds: Grupos/clanes de usuarios
-- - guild_members: Miembros y roles
-- - guild_invites: Invitaciones
-- - guild_raids: Raids grupales
-- - raid_participants: Participantes en raids
-- - punishment_proposals: Propuestas de castigo
-- - punishment_options: Opciones de castigo para votar
-- - punishment_votes: Votos de castigo
-- - guild_messages: Chat del guild
-- - leaderboards: Rankings cacheados
-- - user_titles: Títulos por nivel
--
-- Functions:
-- - get_user_title: Obtener título por nivel
-- - create_guild: Crear guild
-- - join_guild_by_code: Unirse por código
-- - update_raid_progress: Actualizar progreso de raid
-- - vote_punishment: Votar castigo
-- - calculate_leaderboard: Calcular leaderboard
-- =====================================================
