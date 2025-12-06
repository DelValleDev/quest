-- =====================================================
-- Migration 035: Perfect Streaks System
-- Description: Reward users for completing ALL daily quests perfectly for X days in a row
-- =====================================================

-- Table to track perfect days (all quests completed)
CREATE TABLE IF NOT EXISTS public.perfect_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  perfect_date DATE NOT NULL,
  total_quests INTEGER NOT NULL,
  total_xp_earned INTEGER DEFAULT 0,
  total_coins_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, perfect_date)
);

-- Table to track perfect streaks and milestones
CREATE TABLE IF NOT EXISTS public.perfect_streak_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_days INTEGER NOT NULL, -- 7, 15, 30, 60, 100, etc.
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  bonus_xp_awarded INTEGER DEFAULT 0,
  bonus_coins_awarded INTEGER DEFAULT 0,
  
  UNIQUE(user_id, milestone_days)
);

-- Add perfect_streak to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'perfect_streak'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN perfect_streak INTEGER DEFAULT 0,
    ADD COLUMN best_perfect_streak INTEGER DEFAULT 0;
    
    COMMENT ON COLUMN public.profiles.perfect_streak IS 'Current streak of perfect days (all quests completed)';
    COMMENT ON COLUMN public.profiles.best_perfect_streak IS 'Best perfect streak ever achieved';
  END IF;
END $$;

-- Function to check if today was a perfect day and update streak
CREATE OR REPLACE FUNCTION check_and_update_perfect_day(
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_total_quests INTEGER;
  v_completed_quests INTEGER;
  v_is_perfect BOOLEAN;
  v_current_streak INTEGER;
  v_new_streak INTEGER;
  v_best_streak INTEGER;
  v_milestone_reached INTEGER;
  v_bonus_xp INTEGER := 0;
  v_bonus_coins INTEGER := 0;
  v_total_xp INTEGER;
  v_total_coins INTEGER;
BEGIN
  -- Count today's quests
  SELECT COUNT(*) INTO v_total_quests
  FROM user_daily_quests
  WHERE user_id = p_user_id 
  AND assigned_date = CURRENT_DATE;
  
  -- Count completed quests
  SELECT COUNT(*) INTO v_completed_quests
  FROM user_daily_quests
  WHERE user_id = p_user_id 
  AND assigned_date = CURRENT_DATE
  AND completed = true;
  
  -- Check if perfect day
  v_is_perfect := (v_total_quests > 0 AND v_total_quests = v_completed_quests);
  
  IF NOT v_is_perfect THEN
    -- Not a perfect day, check if we need to break streak
    SELECT perfect_streak INTO v_current_streak
    FROM profiles WHERE id = p_user_id;
    
    IF v_current_streak > 0 THEN
      -- Break the streak
      UPDATE profiles 
      SET perfect_streak = 0
      WHERE id = p_user_id;
      
      RETURN json_build_object(
        'is_perfect', false,
        'streak_broken', true,
        'lost_streak', v_current_streak
      );
    END IF;
    
    RETURN json_build_object('is_perfect', false);
  END IF;
  
  -- Calculate total XP and coins earned today
  SELECT 
    COALESCE(SUM(c.xp_reward), 0),
    COALESCE(SUM(c.coin_reward), 0)
  INTO v_total_xp, v_total_coins
  FROM user_daily_quests udq
  JOIN challenges c ON c.id = udq.daily_quest_id
  WHERE udq.user_id = p_user_id 
  AND udq.assigned_date = CURRENT_DATE
  AND udq.completed = true;
  
  -- Record perfect day
  INSERT INTO perfect_days (user_id, perfect_date, total_quests, total_xp_earned, total_coins_earned)
  VALUES (p_user_id, CURRENT_DATE, v_total_quests, v_total_xp, v_total_coins)
  ON CONFLICT (user_id, perfect_date) DO NOTHING;
  
  -- Get current streak
  SELECT perfect_streak, best_perfect_streak 
  INTO v_current_streak, v_best_streak
  FROM profiles WHERE id = p_user_id;
  
  -- Increment streak
  v_new_streak := v_current_streak + 1;
  
  -- Update profile
  UPDATE profiles 
  SET 
    perfect_streak = v_new_streak,
    best_perfect_streak = GREATEST(best_perfect_streak, v_new_streak)
  WHERE id = p_user_id;
  
  -- Check for milestone and calculate bonuses
  v_milestone_reached := NULL;
  
  IF v_new_streak = 7 THEN
    v_milestone_reached := 7;
    v_bonus_xp := 100;
    v_bonus_coins := 50;
  ELSIF v_new_streak = 15 THEN
    v_milestone_reached := 15;
    v_bonus_xp := 250;
    v_bonus_coins := 100;
  ELSIF v_new_streak = 30 THEN
    v_milestone_reached := 30;
    v_bonus_xp := 500;
    v_bonus_coins := 200;
  ELSIF v_new_streak = 60 THEN
    v_milestone_reached := 60;
    v_bonus_xp := 1000;
    v_bonus_coins := 400;
  ELSIF v_new_streak = 100 THEN
    v_milestone_reached := 100;
    v_bonus_xp := 2000;
    v_bonus_coins := 800;
  ELSIF v_new_streak = 365 THEN
    v_milestone_reached := 365;
    v_bonus_xp := 10000; -- LEGENDARY!
    v_bonus_coins := 5000;
  END IF;
  
  -- Award milestone bonuses
  IF v_milestone_reached IS NOT NULL THEN
    -- Record milestone
    INSERT INTO perfect_streak_milestones (
      user_id, milestone_days, bonus_xp_awarded, bonus_coins_awarded
    ) VALUES (
      p_user_id, v_milestone_reached, v_bonus_xp, v_bonus_coins
    ) ON CONFLICT (user_id, milestone_days) DO NOTHING;
    
    -- Award bonus
    UPDATE profiles 
    SET 
      total_xp = total_xp + v_bonus_xp,
      quest_coins = quest_coins + v_bonus_coins
    WHERE id = p_user_id;
  END IF;
  
  RETURN json_build_object(
    'is_perfect', true,
    'new_streak', v_new_streak,
    'milestone_reached', v_milestone_reached,
    'bonus_xp', v_bonus_xp,
    'bonus_coins', v_bonus_coins,
    'total_quests', v_total_quests
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get perfect streak stats
CREATE OR REPLACE FUNCTION get_perfect_streak_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'current_streak', COALESCE(perfect_streak, 0),
    'best_streak', COALESCE(best_perfect_streak, 0),
    'total_perfect_days', (
      SELECT COUNT(*) FROM perfect_days WHERE user_id = p_user_id
    ),
    'milestones_achieved', (
      SELECT json_agg(
        json_build_object(
          'days', milestone_days,
          'achieved_at', achieved_at,
          'bonus_xp', bonus_xp_awarded,
          'bonus_coins', bonus_coins_awarded
        ) ORDER BY milestone_days
      )
      FROM perfect_streak_milestones 
      WHERE user_id = p_user_id
    ),
    'recent_perfect_days', (
      SELECT json_agg(
        json_build_object(
          'date', perfect_date,
          'quests', total_quests,
          'xp', total_xp_earned,
          'coins', total_coins_earned
        ) ORDER BY perfect_date DESC
      )
      FROM (
        SELECT * FROM perfect_days 
        WHERE user_id = p_user_id 
        ORDER BY perfect_date DESC 
        LIMIT 30
      ) recent
    )
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically check perfect day when quest is completed
CREATE OR REPLACE FUNCTION trigger_check_perfect_day()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if completed changed to true
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    -- Check if all quests are now completed
    PERFORM check_and_update_perfect_day(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_quest_completion_check_perfect'
  ) THEN
    CREATE TRIGGER trigger_quest_completion_check_perfect
    AFTER UPDATE OF completed ON user_daily_quests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_check_perfect_day();
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_perfect_days_user ON perfect_days(user_id, perfect_date DESC);
CREATE INDEX IF NOT EXISTS idx_perfect_streak_milestones_user ON perfect_streak_milestones(user_id, milestone_days);

-- RLS Policies
ALTER TABLE perfect_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfect_streak_milestones ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'perfect_days' 
    AND policyname = 'Users can view own perfect days'
  ) THEN
    CREATE POLICY "Users can view own perfect days" 
    ON perfect_days FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'perfect_streak_milestones' 
    AND policyname = 'Users can view own milestones'
  ) THEN
    CREATE POLICY "Users can view own milestones" 
    ON perfect_streak_milestones FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Comments
COMMENT ON TABLE perfect_days IS 'Records days where user completed ALL daily quests';
COMMENT ON TABLE perfect_streak_milestones IS 'Milestone rewards for perfect streaks (7, 15, 30, 60, 100, 365 days)';
COMMENT ON FUNCTION check_and_update_perfect_day IS 'Checks if today was perfect and updates streak/awards bonuses';
COMMENT ON FUNCTION get_perfect_streak_stats IS 'Returns comprehensive perfect streak statistics';
