-- =====================================================
-- Migration 021: Life Paths Extensions
-- Description: life_paths table already exists in master schema
-- =====================================================

-- Table already exists in master schema, just ensure index
CREATE INDEX IF NOT EXISTS idx_life_paths_user ON life_paths(user_id);

-- RLS already enabled in master schema
