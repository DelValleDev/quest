-- =====================================================
-- Migration 024: User Streaks Table
-- Description: Track various streak types
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('daily_quest', 'login', 'workout', 'meditation', 'journal')),
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own streaks" ON public.user_streaks;
CREATE POLICY "Users can manage own streaks" ON public.user_streaks
  FOR ALL USING (auth.uid() = user_id);

-- Function to update streaks
CREATE OR REPLACE FUNCTION update_user_streak(
  p_user_id UUID,
  p_streak_type TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_date DATE;
  v_current INTEGER;
  v_best INTEGER;
BEGIN
  SELECT last_activity_date, current_streak, best_streak
  INTO v_last_date, v_current, v_best
  FROM user_streaks
  WHERE user_id = p_user_id AND streak_type = p_streak_type;

  IF v_last_date IS NULL THEN
    -- First activity ever
    INSERT INTO user_streaks (user_id, streak_type, current_streak, best_streak, last_activity_date)
    VALUES (p_user_id, p_streak_type, 1, 1, CURRENT_DATE);
    RETURN 1;
  ELSIF v_last_date = CURRENT_DATE THEN
    -- Already logged today
    RETURN v_current;
  ELSIF v_last_date = CURRENT_DATE - 1 THEN
    -- Consecutive day
    v_current := v_current + 1;
    IF v_current > v_best THEN
      v_best := v_current;
    END IF;
    UPDATE user_streaks
    SET current_streak = v_current, best_streak = v_best, last_activity_date = CURRENT_DATE, updated_at = NOW()
    WHERE user_id = p_user_id AND streak_type = p_streak_type;
    RETURN v_current;
  ELSE
    -- Streak broken
    UPDATE user_streaks
    SET current_streak = 1, last_activity_date = CURRENT_DATE, updated_at = NOW()
    WHERE user_id = p_user_id AND streak_type = p_streak_type;
    RETURN 1;
  END IF;
END;
$$;
