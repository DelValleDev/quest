-- =====================================================
-- Migration 013: Budget Goals Table
-- Description: Savings and financial goals tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.budget_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  deadline DATE,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#10B981',
  category TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_goals_user ON budget_goals(user_id);

ALTER TABLE public.budget_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own goals" ON public.budget_goals;
CREATE POLICY "Users can manage own goals" ON public.budget_goals
  FOR ALL USING (auth.uid() = user_id);
