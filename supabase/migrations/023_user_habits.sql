-- =====================================================
-- Migration 023: User Habits Extensions
-- Description: habits/habit_logs tables already exist in master schema
-- =====================================================

-- Tables already exist in master schema (as 'habits' and 'habit_logs'), just ensure indexes
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user ON habit_logs(user_id, log_date DESC);

-- RLS already enabled in master schema
