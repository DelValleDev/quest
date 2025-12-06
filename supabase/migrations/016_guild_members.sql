-- =====================================================
-- Migration 016: Guild Members Extensions
-- Description: guild_members table already exists in master schema
-- =====================================================

-- Table already exists in master schema, just ensure indexes
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);

-- RLS already enabled in master schema
