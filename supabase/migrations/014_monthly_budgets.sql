-- =====================================================
-- Migration 014: Monthly Budgets Table
-- Description: Monthly budget settings and tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_budget DECIMAL(10,2),
  total_income DECIMAL(10,2) DEFAULT 0,
  total_expenses DECIMAL(10,2) DEFAULT 0,
  savings_goal_percent INTEGER DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user ON monthly_budgets(user_id, month DESC);

ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own budgets" ON public.monthly_budgets;
CREATE POLICY "Users can manage own budgets" ON public.monthly_budgets
  FOR ALL USING (auth.uid() = user_id);
