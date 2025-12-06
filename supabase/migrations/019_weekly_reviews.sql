-- =====================================================
-- Migration 019: Weekly Reviews Table
-- Description: Store weekly progress reviews
-- =====================================================

CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  pillar_changes JSONB DEFAULT '{}',
  quests_completed INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  highlights TEXT[],
  ai_summary TEXT,
  mood_average DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user ON weekly_reviews(user_id, week_start DESC);

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own reviews" ON public.weekly_reviews;
CREATE POLICY "Users can manage own reviews" ON public.weekly_reviews
  FOR ALL USING (auth.uid() = user_id);
