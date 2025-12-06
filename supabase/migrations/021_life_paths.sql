-- =====================================================
-- Migration 021: Life Paths Table
-- Description: Long-term goal paths/journeys
-- =====================================================

CREATE TABLE IF NOT EXISTS public.life_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_pillar TEXT,
  milestones JSONB DEFAULT '[]',
  current_milestone INTEGER DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  target_date DATE,
  is_active BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_life_paths_user ON life_paths(user_id);

ALTER TABLE public.life_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own paths" ON public.life_paths;
CREATE POLICY "Users can manage own paths" ON public.life_paths
  FOR ALL USING (auth.uid() = user_id);
