-- =====================================================
-- Migration 012: Financial Transactions Table
-- Description: Track income and expenses
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
  tags TEXT[],
  ai_categorized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON financial_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON financial_transactions(category_id);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own transactions" ON public.financial_transactions;
CREATE POLICY "Users can manage own transactions" ON public.financial_transactions
  FOR ALL USING (auth.uid() = user_id);
