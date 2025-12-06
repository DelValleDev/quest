-- =====================================================
-- Migration 022: Daily Agenda Function
-- Description: AI-generated daily agenda items
-- =====================================================

CREATE TABLE IF NOT EXISTS public.daily_agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  agenda_items JSONB DEFAULT '[]',
  generated_by TEXT DEFAULT 'ai',
  is_completed BOOLEAN DEFAULT false,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_agendas_user ON daily_agendas(user_id, date DESC);

ALTER TABLE public.daily_agendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own agendas" ON public.daily_agendas;
CREATE POLICY "Users can manage own agendas" ON public.daily_agendas
  FOR ALL USING (auth.uid() = user_id);
