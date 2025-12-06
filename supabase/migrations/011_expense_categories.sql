-- =====================================================
-- Migration 011: Expense Categories Table
-- Description: Categories for personal finance tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT '#6366F1',
  budget_limit DECIMAL(10,2),
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_user ON expense_categories(user_id);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own categories" ON public.expense_categories;
CREATE POLICY "Users can manage own categories" ON public.expense_categories
  FOR ALL USING (auth.uid() = user_id);
