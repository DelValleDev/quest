-- =====================================================
-- Migration 007: Pillar Snapshots Table
-- Description: Historical snapshots of pillar progress for analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pillar_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pillar_scores JSONB NOT NULL,
  level INTEGER,
  total_xp INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_pillar_snapshots_user_date ON pillar_snapshots(user_id, snapshot_date DESC);

ALTER TABLE public.pillar_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own snapshots" ON public.pillar_snapshots;
CREATE POLICY "Users can view own snapshots" ON public.pillar_snapshots
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert snapshots" ON public.pillar_snapshots;
CREATE POLICY "System can insert snapshots" ON public.pillar_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
