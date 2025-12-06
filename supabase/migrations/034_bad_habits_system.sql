-- =====================================================
-- Migration 034: Bad Habits System
-- Description: System for tracking and breaking bad habits
-- =====================================================

-- Add habit_type column to differentiate good vs bad habits
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'habits' 
    AND column_name = 'habit_type'
  ) THEN
    ALTER TABLE public.habits 
    ADD COLUMN habit_type TEXT DEFAULT 'positive' CHECK (habit_type IN ('positive', 'negative'));
    
    COMMENT ON COLUMN public.habits.habit_type IS 'Type: positive (build) or negative (break)';
  END IF;
END $$;

-- Add quit_reason and triggers_identified for bad habits
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'habits' 
    AND column_name = 'quit_reason'
  ) THEN
    ALTER TABLE public.habits 
    ADD COLUMN quit_reason TEXT,
    ADD COLUMN triggers_identified TEXT[],
    ADD COLUMN replacement_activity TEXT;
    
    COMMENT ON COLUMN public.habits.quit_reason IS 'Why user wants to quit this habit';
    COMMENT ON COLUMN public.habits.triggers_identified IS 'Situations/emotions that trigger the bad habit';
    COMMENT ON COLUMN public.habits.replacement_activity IS 'Healthy activity to do instead';
  END IF;
END $$;

-- Track slip-ups (when user does the bad habit)
CREATE TABLE IF NOT EXISTS public.bad_habit_slip_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  slipped_at TIMESTAMPTZ DEFAULT NOW(),
  slip_date DATE DEFAULT CURRENT_DATE,
  trigger_identified TEXT, -- what caused the slip
  context TEXT, -- where, when, emotional state
  learned_lesson TEXT, -- what they learned from it
  severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5), -- 1=minor, 5=major relapse
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, slip_date)
);

-- Track clean days (days WITHOUT the bad habit)
CREATE TABLE IF NOT EXISTS public.bad_habit_clean_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  clean_date DATE NOT NULL,
  notes TEXT,
  coping_strategy_used TEXT, -- what helped them resist
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5), -- how hard was it to resist
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, clean_date)
);

-- Function to mark a day as clean (NOT doing the bad habit)
CREATE OR REPLACE FUNCTION mark_bad_habit_clean_day(
  p_user_id UUID,
  p_habit_id UUID,
  p_coping_strategy TEXT DEFAULT NULL,
  p_difficulty INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_habit RECORD;
  v_xp_reward INTEGER;
  v_coin_reward INTEGER;
  v_new_streak INTEGER;
BEGIN
  -- Get habit details
  SELECT * INTO v_habit FROM habits 
  WHERE id = p_habit_id AND user_id = p_user_id AND habit_type = 'negative';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bad habit not found';
  END IF;
  
  -- Check if already marked today
  IF EXISTS (
    SELECT 1 FROM bad_habit_clean_days 
    WHERE habit_id = p_habit_id AND clean_date = CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Already marked as clean today';
  END IF;
  
  -- Insert clean day record
  INSERT INTO bad_habit_clean_days (
    habit_id, user_id, clean_date, coping_strategy_used, difficulty_level
  ) VALUES (
    p_habit_id, p_user_id, CURRENT_DATE, p_coping_strategy, p_difficulty
  );
  
  -- Update streak
  v_new_streak := v_habit.current_streak + 1;
  
  UPDATE habits 
  SET 
    current_streak = v_new_streak,
    best_streak = GREATEST(best_streak, v_new_streak),
    total_completions = total_completions + 1,
    updated_at = NOW()
  WHERE id = p_habit_id;
  
  -- Calculate XP reward (increases with streak milestones)
  v_xp_reward := v_habit.xp_reward;
  
  -- Bonus XP for milestone streaks
  IF v_new_streak = 7 THEN v_xp_reward := v_xp_reward + 50; END IF; -- 1 week
  IF v_new_streak = 30 THEN v_xp_reward := v_xp_reward + 100; END IF; -- 1 month
  IF v_new_streak = 90 THEN v_xp_reward := v_xp_reward + 200; END IF; -- 3 months
  IF v_new_streak = 365 THEN v_xp_reward := v_xp_reward + 500; END IF; -- 1 year!
  
  v_coin_reward := v_habit.coin_reward;
  
  -- Award XP and coins
  UPDATE profiles 
  SET 
    total_xp = total_xp + v_xp_reward,
    quest_coins = quest_coins + v_coin_reward
  WHERE id = p_user_id;
  
  -- Update pillar XP if associated
  IF v_habit.pillar_id IS NOT NULL THEN
    INSERT INTO user_pillar_xp (user_id, pillar_id, xp_gained, source)
    VALUES (p_user_id, v_habit.pillar_id, v_xp_reward, 'bad_habit_resist');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'new_streak', v_new_streak,
    'xp_earned', v_xp_reward,
    'coins_earned', v_coin_reward,
    'milestone_reached', v_new_streak IN (7, 30, 90, 365)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a slip-up
CREATE OR REPLACE FUNCTION record_bad_habit_slip(
  p_user_id UUID,
  p_habit_id UUID,
  p_trigger TEXT DEFAULT NULL,
  p_context TEXT DEFAULT NULL,
  p_severity INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_habit RECORD;
  v_old_streak INTEGER;
  v_penalty_xp INTEGER;
BEGIN
  -- Get habit details
  SELECT * INTO v_habit FROM habits 
  WHERE id = p_habit_id AND user_id = p_user_id AND habit_type = 'negative';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bad habit not found';
  END IF;
  
  v_old_streak := v_habit.current_streak;
  
  -- Record the slip-up
  INSERT INTO bad_habit_slip_ups (
    habit_id, user_id, slip_date, trigger_identified, context, severity
  ) VALUES (
    p_habit_id, p_user_id, CURRENT_DATE, p_trigger, p_context, p_severity
  )
  ON CONFLICT (habit_id, slip_date) DO UPDATE
  SET 
    trigger_identified = EXCLUDED.trigger_identified,
    context = EXCLUDED.context,
    severity = EXCLUDED.severity;
  
  -- Delete clean day if it exists
  DELETE FROM bad_habit_clean_days 
  WHERE habit_id = p_habit_id AND clean_date = CURRENT_DATE;
  
  -- Reset streak (but keep best_streak)
  UPDATE habits 
  SET 
    current_streak = 0,
    updated_at = NOW()
  WHERE id = p_habit_id;
  
  -- Apply penalty (lose XP based on severity)
  v_penalty_xp := v_habit.xp_reward * p_severity;
  
  UPDATE profiles 
  SET total_xp = GREATEST(0, total_xp - v_penalty_xp)
  WHERE id = p_user_id;
  
  -- Log the penalty
  INSERT INTO penalty_logs (
    user_id, penalty_type, item_type, item_id, xp_lost, reason
  ) VALUES (
    p_user_id, 'bad_habit_slip', 'habit', p_habit_id, v_penalty_xp, 
    'Slip-up on bad habit: ' || v_habit.title
  );
  
  RETURN json_build_object(
    'success', true,
    'streak_lost', v_old_streak,
    'xp_penalty', v_penalty_xp,
    'message', 'It''s okay to slip. What matters is getting back up.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bad_habit_slip_ups_habit ON bad_habit_slip_ups(habit_id, slip_date DESC);
CREATE INDEX IF NOT EXISTS idx_bad_habit_clean_days_habit ON bad_habit_clean_days(habit_id, clean_date DESC);
CREATE INDEX IF NOT EXISTS idx_habits_type ON habits(user_id, habit_type);

-- RLS Policies
ALTER TABLE bad_habit_slip_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bad_habit_clean_days ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bad_habit_slip_ups' 
    AND policyname = 'Users can manage own slip-ups'
  ) THEN
    CREATE POLICY "Users can manage own slip-ups" 
    ON bad_habit_slip_ups FOR ALL 
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bad_habit_clean_days' 
    AND policyname = 'Users can manage own clean days'
  ) THEN
    CREATE POLICY "Users can manage own clean days" 
    ON bad_habit_clean_days FOR ALL 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Comments
COMMENT ON TABLE bad_habit_slip_ups IS 'Records when user does the bad habit (relapses)';
COMMENT ON TABLE bad_habit_clean_days IS 'Records days where user successfully avoided the bad habit';
COMMENT ON FUNCTION mark_bad_habit_clean_day IS 'Mark today as a clean day - user resisted the bad habit';
COMMENT ON FUNCTION record_bad_habit_slip IS 'Record a slip-up - user did the bad habit';
