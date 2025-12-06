-- =====================================================
-- Migration 003: Achievement Logs Table
-- Description: Table for logging free-form activities that earn XP
-- =====================================================

CREATE TABLE IF NOT EXISTS public.achievement_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  pillar TEXT NOT NULL DEFAULT 'general',
  xp_earned INTEGER DEFAULT 10,
  coins_earned INTEGER DEFAULT 0,
  ai_analyzed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievement_logs_user ON achievement_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_logs_created ON achievement_logs(created_at DESC);

ALTER TABLE public.achievement_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own achievement logs" ON public.achievement_logs;
CREATE POLICY "Users can manage own achievement logs" ON public.achievement_logs
  FOR ALL USING (auth.uid() = user_id);
