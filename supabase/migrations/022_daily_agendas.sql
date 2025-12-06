-- =====================================================
-- Migration 022: Daily Agenda Extensions
-- Description: daily_agenda_items table already exists in master schema
-- =====================================================

-- Table exists as daily_agenda_items in master schema, just ensure index
CREATE INDEX IF NOT EXISTS idx_daily_agenda_user_date ON daily_agenda_items(user_id, agenda_date);

-- RLS already enabled in master schema
