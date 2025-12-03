-- =====================================================
-- QUEST APP - ACTIVITY FEED SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- ACTIVITY FEED TABLE
-- Stores all user activities for social feed
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Activity type
  activity_type TEXT NOT NULL, -- challenge_completed, level_up, streak, achievement, duel_won, raid_completed, friend_added
  
  -- Related entities (nullable based on type)
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
  achievement_id UUID,
  duel_id UUID,
  raid_id UUID,
  
  -- Activity details
  pillar_id TEXT REFERENCES public.pillars(id),
  xp_earned INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  new_level INTEGER,
  streak_days INTEGER,
  
  -- Display data (denormalized for fast reads)
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  
  -- Metadata
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast friend feed queries
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_date 
ON public.activity_feed(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created 
ON public.activity_feed(created_at DESC);

-- =====================================================
-- ACTIVITY REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activity_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  reaction_type TEXT NOT NULL, -- fire, strong, clap, wow
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(activity_id, user_id) -- One reaction per user per activity
);

-- =====================================================
-- FUNCTION: Log activity
-- Called when user completes actions
-- =====================================================
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT '⭐',
  p_challenge_id UUID DEFAULT NULL,
  p_achievement_id UUID DEFAULT NULL,
  p_duel_id UUID DEFAULT NULL,
  p_raid_id UUID DEFAULT NULL,
  p_pillar_id TEXT DEFAULT NULL,
  p_xp_earned INTEGER DEFAULT 0,
  p_coins_earned INTEGER DEFAULT 0,
  p_new_level INTEGER DEFAULT NULL,
  p_streak_days INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO public.activity_feed (
    user_id,
    activity_type,
    title,
    description,
    icon,
    challenge_id,
    achievement_id,
    duel_id,
    raid_id,
    pillar_id,
    xp_earned,
    coins_earned,
    new_level,
    streak_days
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_title,
    p_description,
    p_icon,
    p_challenge_id,
    p_achievement_id,
    p_duel_id,
    p_raid_id,
    p_pillar_id,
    p_xp_earned,
    p_coins_earned,
    p_new_level,
    p_streak_days
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

-- =====================================================
-- FUNCTION: Get friend activity feed
-- Returns activities from user's friends
-- =====================================================
CREATE OR REPLACE FUNCTION get_friend_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  activity_type TEXT,
  title TEXT,
  description TEXT,
  icon TEXT,
  pillar_id TEXT,
  xp_earned INTEGER,
  coins_earned INTEGER,
  new_level INTEGER,
  streak_days INTEGER,
  created_at TIMESTAMPTZ,
  reaction_count BIGINT,
  user_reacted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    af.id,
    af.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    af.activity_type,
    af.title,
    af.description,
    af.icon,
    af.pillar_id,
    af.xp_earned,
    af.coins_earned,
    af.new_level,
    af.streak_days,
    af.created_at,
    (SELECT COUNT(*) FROM public.activity_reactions ar WHERE ar.activity_id = af.id) as reaction_count,
    EXISTS(SELECT 1 FROM public.activity_reactions ar WHERE ar.activity_id = af.id AND ar.user_id = p_user_id) as user_reacted
  FROM public.activity_feed af
  JOIN public.profiles p ON p.id = af.user_id
  WHERE af.is_public = true
  AND (
    -- Include own activities
    af.user_id = p_user_id
    OR
    -- Include friends' activities
    af.user_id IN (
      SELECT 
        CASE 
          WHEN f.user_id = p_user_id THEN f.friend_id
          ELSE f.user_id
        END
      FROM public.friends f
      WHERE (f.user_id = p_user_id OR f.friend_id = p_user_id)
      AND f.status = 'accepted'
    )
  )
  ORDER BY af.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- FUNCTION: React to activity
-- =====================================================
CREATE OR REPLACE FUNCTION react_to_activity(
  p_user_id UUID,
  p_activity_id UUID,
  p_reaction_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing UUID;
BEGIN
  -- Check if already reacted
  SELECT id INTO v_existing
  FROM public.activity_reactions
  WHERE activity_id = p_activity_id AND user_id = p_user_id;
  
  IF v_existing IS NOT NULL THEN
    -- Remove reaction (toggle off)
    DELETE FROM public.activity_reactions WHERE id = v_existing;
    RETURN jsonb_build_object('action', 'removed');
  ELSE
    -- Add reaction
    INSERT INTO public.activity_reactions (activity_id, user_id, reaction_type)
    VALUES (p_activity_id, p_user_id, p_reaction_type);
    RETURN jsonb_build_object('action', 'added', 'reaction', p_reaction_type);
  END IF;
END;
$$;

-- =====================================================
-- TRIGGER: Auto-log challenge completion
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_log_challenge_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge RECORD;
  v_profile RECORD;
BEGIN
  -- Only trigger on completion
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    -- Get challenge details
    SELECT * INTO v_challenge FROM public.challenges WHERE id = NEW.daily_quest_id;
    
    -- Get user profile
    SELECT * INTO v_profile FROM public.profiles WHERE id = NEW.user_id;
    
    IF v_challenge IS NOT NULL THEN
      PERFORM log_activity(
        NEW.user_id,
        'challenge_completed',
        'Completed: ' || v_challenge.title,
        v_challenge.description,
        v_challenge.icon,
        v_challenge.id,
        NULL, -- achievement_id
        NULL, -- duel_id
        NULL, -- raid_id
        v_challenge.pillar_id,
        v_challenge.xp_reward,
        v_challenge.coin_reward,
        NULL, -- new_level
        v_profile.current_streak -- streak_days
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_daily_quests
DROP TRIGGER IF EXISTS on_challenge_completed ON public.user_daily_quests;
CREATE TRIGGER on_challenge_completed
  AFTER UPDATE ON public.user_daily_quests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_challenge_completion();

-- =====================================================
-- TRIGGER: Auto-log level up
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_log_level_up()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if level increased
  IF NEW.level > OLD.level THEN
    PERFORM log_activity(
      NEW.id,
      'level_up',
      'Reached Level ' || NEW.level || '! 🎉',
      'Keep pushing your limits!',
      '🆙',
      NULL, NULL, NULL, NULL, NULL,
      0, 0,
      NEW.level,
      NEW.current_streak
    );
  END IF;
  
  -- Check if streak milestone (7, 14, 30, 60, 100, etc.)
  IF NEW.current_streak IN (7, 14, 30, 60, 100, 365) AND NEW.current_streak > OLD.current_streak THEN
    PERFORM log_activity(
      NEW.id,
      'streak',
      NEW.current_streak || ' Day Streak! 🔥',
      'Consistency is the key to greatness!',
      '🔥',
      NULL, NULL, NULL, NULL, NULL,
      0, 0,
      NULL,
      NEW.current_streak
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles
DROP TRIGGER IF EXISTS on_profile_level_up ON public.profiles;
CREATE TRIGGER on_profile_level_up
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_level_up();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;

-- Activity feed policies
CREATE POLICY "Users can view public activities"
ON public.activity_feed FOR SELECT
USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can insert own activities"
ON public.activity_feed FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Reaction policies
CREATE POLICY "Users can view all reactions"
ON public.activity_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can manage own reactions"
ON public.activity_reactions FOR ALL
USING (user_id = auth.uid());

-- =====================================================
-- GRANTS
-- =====================================================
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_friend_feed(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION react_to_activity(UUID, UUID, TEXT) TO authenticated;

-- =====================================================
-- SEED: Add some initial activity types reference
-- =====================================================
COMMENT ON TABLE public.activity_feed IS 'Activity types:
- challenge_completed: User completed a challenge
- level_up: User leveled up (overall or pillar)
- streak: User hit a streak milestone
- achievement: User unlocked an achievement
- duel_won: User won a 1v1 duel
- duel_lost: User lost a 1v1 duel
- raid_completed: User completed a group raid
- friend_added: User added a new friend
- class_changed: User changed their class
';
