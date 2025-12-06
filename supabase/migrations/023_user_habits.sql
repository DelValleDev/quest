-- =====================================================
-- Migration 023: User Habits Table
-- Description: Habit tracking with streaks
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '✨',
  color TEXT DEFAULT '#8B5CF6',
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),
  custom_days INTEGER[], -- 0=Sunday, 6=Saturday
  target_pillar TEXT,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  reminder_time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.user_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_user_habits_user ON user_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user ON habit_logs(user_id, date DESC);

ALTER TABLE public.user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own habits" ON public.user_habits;
CREATE POLICY "Users can manage own habits" ON public.user_habits
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own habit logs" ON public.habit_logs;
CREATE POLICY "Users can manage own habit logs" ON public.habit_logs
  FOR ALL USING (auth.uid() = user_id);
