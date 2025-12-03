-- =====================================================
-- QUEST APP - DAILY QUEST ASSIGNMENT & VERIFICATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- Table to track user's assigned daily quests
CREATE TABLE IF NOT EXISTS public.user_daily_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_quest_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Verification
  verification_type TEXT DEFAULT 'honor', -- honor, photo, auto
  verification_photo_url TEXT,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, daily_quest_id, assigned_date)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_daily_quests_user_date 
ON public.user_daily_quests(user_id, assigned_date);

-- =====================================================
-- FUNCTION: Generate daily quests for a user
-- Assigns 5-8 random daily challenges each day
-- =====================================================
CREATE OR REPLACE FUNCTION generate_daily_quests(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_today DATE := CURRENT_DATE;
  v_pillar_scores JSONB;
  v_weakest_pillar TEXT;
  v_quest RECORD;
  v_assigned INTEGER := 0;
  v_target_count INTEGER := 5 + floor(random() * 3)::INTEGER; -- 5-7 quests
BEGIN
  -- Check if already generated today
  SELECT COUNT(*) INTO v_count
  FROM public.user_daily_quests
  WHERE user_id = p_user_id AND assigned_date = v_today;
  
  IF v_count > 0 THEN
    RETURN v_count; -- Already generated
  END IF;
  
  -- Get user's pillar scores to prioritize weak areas
  SELECT pillar_scores INTO v_pillar_scores
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Find weakest pillar if assessment completed
  IF v_pillar_scores IS NOT NULL THEN
    SELECT key INTO v_weakest_pillar
    FROM jsonb_each_text(v_pillar_scores)
    ORDER BY value::numeric ASC
    LIMIT 1;
  END IF;
  
  -- Assign quests - prioritize weak pillar (2 quests from it)
  IF v_weakest_pillar IS NOT NULL THEN
    FOR v_quest IN
      SELECT id FROM public.challenges
      WHERE is_daily = true 
      AND pillar_id = v_weakest_pillar
      ORDER BY random()
      LIMIT 2
    LOOP
      INSERT INTO public.user_daily_quests (user_id, daily_quest_id, assigned_date)
      VALUES (p_user_id, v_quest.id, v_today)
      ON CONFLICT DO NOTHING;
      v_assigned := v_assigned + 1;
    END LOOP;
  END IF;
  
  -- Fill remaining slots with random quests from all pillars
  FOR v_quest IN
    SELECT c.id FROM public.challenges c
    WHERE c.is_daily = true
    AND c.id NOT IN (
      SELECT daily_quest_id FROM public.user_daily_quests
      WHERE user_id = p_user_id AND assigned_date = v_today
    )
    ORDER BY random()
    LIMIT (v_target_count - v_assigned)
  LOOP
    INSERT INTO public.user_daily_quests (user_id, daily_quest_id, assigned_date)
    VALUES (p_user_id, v_quest.id, v_today)
    ON CONFLICT DO NOTHING;
    v_assigned := v_assigned + 1;
  END LOOP;
  
  RETURN v_assigned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Complete a daily quest
-- Handles XP, coins, streak, and achievement checks
-- =====================================================
CREATE OR REPLACE FUNCTION complete_daily_quest(
  p_user_id UUID,
  p_quest_assignment_id UUID,
  p_verification_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_quest RECORD;
  v_challenge RECORD;
  v_profile RECORD;
  v_pillar RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - 1;
  v_new_streak INTEGER;
  v_new_level INTEGER;
  v_pillar_new_level INTEGER;
  v_pillar_new_xp INTEGER;
  v_all_completed BOOLEAN;
  v_bonus_xp INTEGER := 0;
  v_total_xp INTEGER;
  v_total_coins INTEGER;
BEGIN
  -- Get the quest assignment
  SELECT * INTO v_quest
  FROM public.user_daily_quests
  WHERE id = p_quest_assignment_id
  AND user_id = p_user_id
  AND assigned_date = v_today;
  
  IF v_quest IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest not found or not assigned today');
  END IF;
  
  IF v_quest.completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest already completed');
  END IF;
  
  -- Get challenge details
  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = v_quest.daily_quest_id;
  
  -- Get current profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Calculate streak
  IF v_profile.last_activity_date = v_yesterday THEN
    v_new_streak := v_profile.current_streak + 1;
  ELSIF v_profile.last_activity_date = v_today THEN
    v_new_streak := v_profile.current_streak;
  ELSE
    v_new_streak := 1;
  END IF;
  
  -- Mark quest as completed
  UPDATE public.user_daily_quests
  SET 
    completed = true,
    completed_at = NOW(),
    verification_photo_url = p_verification_photo_url,
    verified = CASE WHEN p_verification_photo_url IS NOT NULL THEN true ELSE false END,
    verified_at = CASE WHEN p_verification_photo_url IS NOT NULL THEN NOW() ELSE NULL END
  WHERE id = p_quest_assignment_id;
  
  -- Check if all daily quests completed for bonus
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_daily_quests
    WHERE user_id = p_user_id
    AND assigned_date = v_today
    AND completed = false
  ) INTO v_all_completed;
  
  IF v_all_completed THEN
    v_bonus_xp := 50; -- Bonus for completing all daily quests
  END IF;
  
  v_total_xp := v_challenge.xp_reward + v_bonus_xp;
  v_total_coins := v_challenge.coin_reward;
  
  -- Update profile
  v_new_level := FLOOR((v_profile.total_xp + v_total_xp) / 100) + 1;
  
  UPDATE public.profiles
  SET
    total_xp = total_xp + v_total_xp,
    quest_coins = quest_coins + v_total_coins,
    level = v_new_level,
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    last_activity_date = v_today,
    challenges_completed = challenges_completed + 1
  WHERE id = p_user_id;
  
  -- Update pillar
  SELECT * INTO v_pillar
  FROM public.user_pillars
  WHERE user_id = p_user_id AND pillar_id = v_challenge.pillar_id;
  
  IF v_pillar IS NOT NULL THEN
    v_pillar_new_xp := v_pillar.current_xp + v_challenge.xp_reward;
    v_pillar_new_level := v_pillar.level;
    
    -- Check for level up
    WHILE v_pillar_new_xp >= (v_pillar_new_level * 100) LOOP
      v_pillar_new_xp := v_pillar_new_xp - (v_pillar_new_level * 100);
      v_pillar_new_level := v_pillar_new_level + 1;
    END LOOP;
    
    UPDATE public.user_pillars
    SET
      current_xp = v_pillar_new_xp,
      level = v_pillar_new_level,
      challenges_completed = challenges_completed + 1
    WHERE user_id = p_user_id AND pillar_id = v_challenge.pillar_id;
  END IF;
  
  -- Check for achievements (simplified - can be expanded)
  PERFORM check_achievements(p_user_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_earned', v_total_xp,
    'coins_earned', v_total_coins,
    'new_level', v_new_level,
    'new_streak', v_new_streak,
    'all_completed_bonus', v_all_completed,
    'pillar', v_challenge.pillar_id,
    'pillar_level', v_pillar_new_level
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check and award achievements
-- =====================================================
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_profile RECORD;
  v_achievement RECORD;
  v_awarded INTEGER := 0;
  v_value INTEGER;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  
  FOR v_achievement IN
    SELECT * FROM public.achievements
    WHERE id NOT IN (
      SELECT achievement_id FROM public.user_achievements WHERE user_id = p_user_id
    )
  LOOP
    v_value := NULL;
    
    -- Check requirement based on type
    CASE v_achievement.requirement_type
      WHEN 'streak_days' THEN
        v_value := v_profile.current_streak;
      WHEN 'challenges_completed' THEN
        v_value := v_profile.challenges_completed;
      WHEN 'total_xp' THEN
        v_value := v_profile.total_xp;
      WHEN 'pillar_level' THEN
        SELECT level INTO v_value
        FROM public.user_pillars
        WHERE user_id = p_user_id AND pillar_id = v_achievement.pillar_id;
      ELSE
        CONTINUE;
    END CASE;
    
    IF v_value IS NOT NULL AND v_value >= v_achievement.requirement_value THEN
      -- Award achievement
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_achievement.id)
      ON CONFLICT DO NOTHING;
      
      -- Award achievement rewards
      UPDATE public.profiles
      SET
        total_xp = total_xp + v_achievement.xp_reward,
        quest_coins = quest_coins + v_achievement.coin_reward
      WHERE id = p_user_id;
      
      v_awarded := v_awarded + 1;
    END IF;
  END LOOP;
  
  RETURN v_awarded;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get user's daily quest summary
-- =====================================================
CREATE OR REPLACE FUNCTION get_daily_quest_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_total INTEGER;
  v_completed INTEGER;
  v_quests JSONB;
BEGIN
  -- Generate quests if not exists
  PERFORM generate_daily_quests(p_user_id);
  
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true)
  INTO v_total, v_completed
  FROM public.user_daily_quests
  WHERE user_id = p_user_id AND assigned_date = v_today;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', udq.id,
      'completed', udq.completed,
      'completed_at', udq.completed_at,
      'challenge', jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'description', c.description,
        'pillar_id', c.pillar_id,
        'difficulty', c.difficulty,
        'xp_reward', c.xp_reward,
        'coin_reward', c.coin_reward,
        'icon', c.icon,
        'duration_minutes', c.duration_minutes
      )
    )
    ORDER BY udq.completed, c.pillar_id
  ) INTO v_quests
  FROM public.user_daily_quests udq
  JOIN public.challenges c ON c.id = udq.daily_quest_id
  WHERE udq.user_id = p_user_id AND udq.assigned_date = v_today;
  
  RETURN jsonb_build_object(
    'date', v_today,
    'total', v_total,
    'completed', v_completed,
    'progress', CASE WHEN v_total > 0 THEN ROUND((v_completed::numeric / v_total) * 100, 1) ELSE 0 END,
    'quests', COALESCE(v_quests, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE public.user_daily_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily quests"
ON public.user_daily_quests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own daily quests"
ON public.user_daily_quests FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert daily quests"
ON public.user_daily_quests FOR INSERT
WITH CHECK (true);

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION generate_daily_quests(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_daily_quest(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_quest_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;
