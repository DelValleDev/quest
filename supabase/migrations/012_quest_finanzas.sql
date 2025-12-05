-- =====================================================
-- MIGRATION 012: Quest Finanzas - Financial Management System
-- Date: December 4, 2025
-- Description: Personal finance tracking with AI assistance
-- =====================================================

-- =====================================================
-- EXPENSE CATEGORIES
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

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories"
  ON public.expense_categories FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- TRANSACTIONS (Expenses & Income)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  notes TEXT,
  date DATE DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  tags TEXT[], -- For AI categorization
  ai_categorized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions"
  ON public.financial_transactions FOR ALL
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
  ON public.financial_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category 
  ON public.financial_transactions(category_id);

-- =====================================================
-- BUDGET GOALS
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
  category TEXT, -- 'savings', 'emergency', 'vacation', 'purchase', 'investment'
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.budget_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
  ON public.budget_goals FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- MONTHLY BUDGET SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month (2024-12-01)
  total_budget DECIMAL(10,2),
  total_income DECIMAL(10,2) DEFAULT 0,
  total_expenses DECIMAL(10,2) DEFAULT 0,
  savings_goal_percent INTEGER DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budgets"
  ON public.monthly_budgets FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- FINANCIAL INSIGHTS (AI Generated)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'warning', 'tip', 'achievement', 'trend'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_read BOOLEAN DEFAULT false,
  related_category_id UUID REFERENCES public.expense_categories(id),
  data JSONB, -- Additional context
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON public.financial_insights FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Initialize default categories for new user
CREATE OR REPLACE FUNCTION public.init_default_expense_categories(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.expense_categories (user_id, name, icon, color, is_default, sort_order)
  VALUES
    (p_user_id, 'Comida', '🍔', '#EF4444', true, 1),
    (p_user_id, 'Transporte', '🚗', '#3B82F6', true, 2),
    (p_user_id, 'Entretenimiento', '🎮', '#8B5CF6', true, 3),
    (p_user_id, 'Salud', '💊', '#10B981', true, 4),
    (p_user_id, 'Hogar', '🏠', '#F59E0B', true, 5),
    (p_user_id, 'Compras', '🛍️', '#EC4899', true, 6),
    (p_user_id, 'Suscripciones', '📱', '#6366F1', true, 7),
    (p_user_id, 'Educación', '📚', '#14B8A6', true, 8),
    (p_user_id, 'Otros', '📦', '#64748B', true, 9)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Add expense with AI categorization
CREATE OR REPLACE FUNCTION public.add_expense(
  p_user_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_category_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO public.financial_transactions (
    user_id, category_id, type, amount, description, date, notes
  ) VALUES (
    p_user_id, p_category_id, 'expense', p_amount, p_description, p_date, p_notes
  )
  RETURNING id INTO v_transaction_id;
  
  -- Update monthly budget
  INSERT INTO public.monthly_budgets (user_id, month, total_expenses)
  VALUES (p_user_id, date_trunc('month', p_date)::DATE, p_amount)
  ON CONFLICT (user_id, month)
  DO UPDATE SET 
    total_expenses = monthly_budgets.total_expenses + p_amount,
    updated_at = NOW();
  
  RETURN v_transaction_id;
END;
$$;

-- Add income
CREATE OR REPLACE FUNCTION public.add_income(
  p_user_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO public.financial_transactions (
    user_id, type, amount, description, date
  ) VALUES (
    p_user_id, 'income', p_amount, p_description, p_date
  )
  RETURNING id INTO v_transaction_id;
  
  -- Update monthly budget
  INSERT INTO public.monthly_budgets (user_id, month, total_income)
  VALUES (p_user_id, date_trunc('month', p_date)::DATE, p_amount)
  ON CONFLICT (user_id, month)
  DO UPDATE SET 
    total_income = monthly_budgets.total_income + p_amount,
    updated_at = NOW();
  
  RETURN v_transaction_id;
END;
$$;

-- Get financial summary for a month
CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_user_id UUID,
  p_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_categories JSONB;
  v_budget RECORD;
BEGIN
  -- Get or create monthly budget
  SELECT * INTO v_budget
  FROM public.monthly_budgets
  WHERE user_id = p_user_id AND month = p_month;
  
  -- Get expenses by category
  SELECT jsonb_agg(jsonb_build_object(
    'category_id', c.id,
    'category_name', c.name,
    'category_icon', c.icon,
    'category_color', c.color,
    'total', COALESCE(SUM(t.amount), 0),
    'budget_limit', c.budget_limit,
    'percent_used', CASE 
      WHEN c.budget_limit > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / c.budget_limit * 100)::numeric, 1)
      ELSE 0 
    END
  ))
  INTO v_categories
  FROM public.expense_categories c
  LEFT JOIN public.financial_transactions t 
    ON t.category_id = c.id 
    AND t.type = 'expense'
    AND date_trunc('month', t.date) = p_month
  WHERE c.user_id = p_user_id
  GROUP BY c.id, c.name, c.icon, c.color, c.budget_limit;
  
  v_result := jsonb_build_object(
    'month', p_month,
    'total_income', COALESCE(v_budget.total_income, 0),
    'total_expenses', COALESCE(v_budget.total_expenses, 0),
    'balance', COALESCE(v_budget.total_income, 0) - COALESCE(v_budget.total_expenses, 0),
    'budget', v_budget.total_budget,
    'savings_goal_percent', COALESCE(v_budget.savings_goal_percent, 20),
    'categories', COALESCE(v_categories, '[]'::jsonb)
  );
  
  RETURN v_result;
END;
$$;

-- Get spending trends (last 6 months)
CREATE OR REPLACE FUNCTION public.get_spending_trends(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trends JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'month', month,
    'income', total_income,
    'expenses', total_expenses,
    'savings', total_income - total_expenses
  ) ORDER BY month)
  INTO v_trends
  FROM public.monthly_budgets
  WHERE user_id = p_user_id
    AND month >= date_trunc('month', CURRENT_DATE - INTERVAL '6 months')::DATE;
  
  RETURN COALESCE(v_trends, '[]'::jsonb);
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 012 completed: Quest Finanzas system created';
END $$;
