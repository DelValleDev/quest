-- =====================================================
-- Migration 019: Weekly Reviews Extensions
-- Description: weekly_plans table already exists in master schema
-- =====================================================

-- Table exists as weekly_plans in master schema, just ensure index
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user ON weekly_plans(user_id, week_start DESC);

-- RLS already enabled in master schema
