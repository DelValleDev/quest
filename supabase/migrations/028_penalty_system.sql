-- =====================================================
-- Migration 028: Penalty System for Incomplete Tasks
-- Description: Track and penalize incomplete habits and quests
-- =====================================================

-- Add penalty tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_penalties INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalty_xp_lost INTEGER DEFAULT 0;

-- Create penalties log table
CREATE TABLE IF NOT EXISTS public.penalty_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  penalty_type TEXT NOT NULL CHECK (penalty_type IN ('habit', 'quest')),
  item_id UUID NOT NULL,
  item_title TEXT NOT NULL,
  xp_lost INTEGER NOT NULL,
  penalty_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_penalty_logs_user ON penalty_logs(user_id, penalty_date DESC);
CREATE INDEX IF NOT EXISTS idx_penalty_logs_date ON penalty_logs(penalty_date DESC);

ALTER TABLE public.penalty_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own penalties" ON public.penalty_logs;
CREATE POLICY "Users can view own penalties" ON public.penalty_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Function to apply penalties for incomplete habits
CREATE OR REPLACE FUNCTION apply_daily_penalties()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_habit RECORD;
  v_quest RECORD;
  v_penalty_xp INTEGER;
  v_yesterday DATE;
BEGIN
  v_yesterday := CURRENT_DATE - INTERVAL '1 day';
  
  -- Process incomplete habits from yesterday (try user_habits first, then habits)
  FOR v_habit IN
    SELECT 
      h.id,
      h.user_id,
      COALESCE(h.title, h.name) as title,
      h.frequency,
      COALESCE(
        h.xp_reward,
        CASE h.frequency
          WHEN 'daily' THEN 20  -- Base XP for daily habits
          WHEN 'weekly' THEN 50 -- Base XP for weekly habits
          ELSE 30
        END,
        20
      ) as base_xp
    FROM user_habits h
    WHERE h.is_active = true
      AND h.frequency IN ('daily', 'weekly')
      AND NOT EXISTS (
        SELECT 1 FROM habit_logs hl
        WHERE hl.habit_id = h.id
          AND hl.date = v_yesterday
      )
      -- Only penalize if habit was active yesterday
      AND h.created_at < v_yesterday + INTERVAL '1 day'
  LOOP
    -- Calculate penalty (50% of what they would have gained)
    v_penalty_xp := FLOOR(v_habit.base_xp * 0.5);
    
    -- Deduct XP from user profile (don't go below 0)
    UPDATE profiles
    SET 
      total_xp = GREATEST(0, total_xp - v_penalty_xp),
      penalty_xp_lost = penalty_xp_lost + v_penalty_xp,
      total_penalties = total_penalties + 1,
      level = GREATEST(1, FLOOR(GREATEST(0, total_xp - v_penalty_xp) / 100) + 1)
    WHERE id = v_habit.user_id;
    
    -- Log the penalty
    INSERT INTO penalty_logs (user_id, penalty_type, item_id, item_title, xp_lost, penalty_date)
    VALUES (v_habit.user_id, 'habit', v_habit.id, v_habit.title, v_penalty_xp, v_yesterday);
  END LOOP;
  
  -- Process incomplete daily quests from yesterday
  FOR v_quest IN
    SELECT 
      dq.id,
      dq.user_id,
      c.title,
      c.xp_reward
    FROM daily_quests dq
    JOIN challenges c ON dq.challenge_id = c.id
    WHERE dq.date = v_yesterday
      AND dq.completed = false
      AND dq.skipped = false
  LOOP
    -- Calculate penalty (50% of quest XP reward)
    v_penalty_xp := FLOOR(v_quest.xp_reward * 0.5);
    
    -- Deduct XP from user profile (don't go below 0)
    UPDATE profiles
    SET 
      total_xp = GREATEST(0, total_xp - v_penalty_xp),
      penalty_xp_lost = penalty_xp_lost + v_penalty_xp,
      total_penalties = total_penalties + 1,
      level = GREATEST(1, FLOOR(GREATEST(0, total_xp - v_penalty_xp) / 100) + 1)
    WHERE id = v_quest.user_id;
    
    -- Log the penalty
    INSERT INTO penalty_logs (user_id, penalty_type, item_id, item_title, xp_lost, penalty_date)
    VALUES (v_quest.user_id, 'quest', v_quest.id, v_quest.title, v_penalty_xp, v_yesterday);
  END LOOP;
  
  RAISE NOTICE 'Daily penalties applied successfully';
END;
$$;

-- Create a function to get user's recent penalties
CREATE OR REPLACE FUNCTION get_user_penalties(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  penalty_date DATE,
  penalty_type TEXT,
  item_title TEXT,
  xp_lost INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.penalty_date,
    pl.penalty_type,
    pl.item_title,
    pl.xp_lost
  FROM penalty_logs pl
  WHERE pl.user_id = p_user_id
    AND pl.penalty_date >= CURRENT_DATE - p_days
  ORDER BY pl.penalty_date DESC, pl.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apply_daily_penalties() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_penalties(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION apply_daily_penalties() IS 'Applies penalties for incomplete habits and quests from the previous day. Should be run daily via cron job.';
COMMENT ON FUNCTION get_user_penalties(UUID, INTEGER) IS 'Returns recent penalty history for a user';
