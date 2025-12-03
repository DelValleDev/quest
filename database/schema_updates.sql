-- =====================================================
-- QUEST APP - SCHEMA UPDATES
-- Run this AFTER schema.sql to add missing columns
-- =====================================================

-- Add missing columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS challenges_completed INTEGER DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pillar_scores JSONB;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_check_in_date DATE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mood_today TEXT; -- great, good, okay, bad, terrible

-- =====================================================
-- FUNCTION: Daily Check-In
-- Records user's mood and generates daily quests
-- =====================================================
CREATE OR REPLACE FUNCTION daily_check_in(
  p_user_id UUID,
  p_mood TEXT DEFAULT 'good'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - 1;
  v_profile RECORD;
  v_new_streak INTEGER;
  v_quests_generated INTEGER;
  v_bonus_xp INTEGER := 10; -- Check-in bonus
BEGIN
  -- Get current profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  
  -- Check if already checked in today
  IF v_profile.daily_check_in_date = v_today THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already checked in today',
      'mood', v_profile.mood_today
    );
  END IF;
  
  -- Calculate streak
  IF v_profile.last_activity_date = v_yesterday OR v_profile.daily_check_in_date = v_yesterday THEN
    v_new_streak := COALESCE(v_profile.current_streak, 0) + 1;
  ELSIF v_profile.last_activity_date = v_today THEN
    v_new_streak := v_profile.current_streak;
  ELSE
    v_new_streak := 1;
  END IF;
  
  -- Update profile
  UPDATE public.profiles
  SET
    daily_check_in_date = v_today,
    mood_today = p_mood,
    current_streak = v_new_streak,
    longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
    last_activity_date = v_today,
    total_xp = total_xp + v_bonus_xp
  WHERE id = p_user_id;
  
  -- Generate daily quests
  SELECT generate_daily_quests(p_user_id) INTO v_quests_generated;
  
  -- Log activity
  PERFORM log_activity(
    p_user_id,
    'check_in',
    'Daily Check-In Complete! ✅',
    'Feeling ' || p_mood || ' today',
    CASE p_mood
      WHEN 'great' THEN '😄'
      WHEN 'good' THEN '😊'
      WHEN 'okay' THEN '😐'
      WHEN 'bad' THEN '😔'
      WHEN 'terrible' THEN '😢'
      ELSE '✅'
    END,
    NULL, NULL, NULL, NULL, NULL,
    v_bonus_xp, 0,
    NULL,
    v_new_streak
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'mood', p_mood,
    'streak', v_new_streak,
    'bonus_xp', v_bonus_xp,
    'quests_generated', v_quests_generated,
    'message', 'Check-in complete! +' || v_bonus_xp || ' XP'
  );
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION daily_check_in(UUID, TEXT) TO authenticated;

-- =====================================================
-- FUNCTION: Get today's summary for HomeScreen
-- =====================================================
CREATE OR REPLACE FUNCTION get_today_summary(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_today DATE := CURRENT_DATE;
  v_daily_quests JSONB;
  v_completed_count INTEGER;
  v_total_count INTEGER;
  v_checked_in BOOLEAN;
  v_pillar_levels JSONB;
BEGIN
  -- Get profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  
  -- Check if checked in today
  v_checked_in := (v_profile.daily_check_in_date = v_today);
  
  -- Get daily quest progress
  SELECT 
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*)
  INTO v_completed_count, v_total_count
  FROM public.user_daily_quests
  WHERE user_id = p_user_id AND assigned_date = v_today;
  
  -- Get pillar levels
  SELECT jsonb_object_agg(pillar_id, jsonb_build_object('level', level, 'xp', current_xp))
  INTO v_pillar_levels
  FROM public.user_pillars
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'checked_in', v_checked_in,
    'mood', v_profile.mood_today,
    'streak', COALESCE(v_profile.current_streak, 0),
    'longest_streak', COALESCE(v_profile.longest_streak, 0),
    'level', COALESCE(v_profile.level, 1),
    'total_xp', COALESCE(v_profile.total_xp, 0),
    'quest_coins', COALESCE(v_profile.quest_coins, 100),
    'quests_completed', v_completed_count,
    'quests_total', v_total_count,
    'quests_progress', CASE WHEN v_total_count > 0 
      THEN ROUND((v_completed_count::numeric / v_total_count) * 100, 1) 
      ELSE 0 END,
    'pillars', COALESCE(v_pillar_levels, '{}'::jsonb),
    'challenges_completed', COALESCE(v_profile.challenges_completed, 0),
    'user_class', COALESCE(v_profile.user_class, 'warrior')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_today_summary(UUID) TO authenticated;

-- =====================================================
-- Quest AI Conversations History
-- =====================================================
CREATE TABLE IF NOT EXISTS quest_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quest_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations"
    ON quest_conversations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON quest_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON quest_conversations(created_at DESC);

-- =====================================================
-- Add personality columns to profiles
-- =====================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_completed_assessment BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS goals TEXT[];

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS personality_traits JSONB DEFAULT '{}';

-- Sync has_completed_assessment with assessment_completed
UPDATE public.profiles 
SET has_completed_assessment = true 
WHERE assessment_completed = true 
AND (has_completed_assessment IS NULL OR has_completed_assessment = false);
