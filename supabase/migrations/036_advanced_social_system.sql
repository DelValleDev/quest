-- =====================================================
-- Migration 036: Advanced Social System
-- Description: Complete social features - Guilds with media, challenges, leaderboards, notifications
-- =====================================================

-- ============================================
-- PART 1: ENHANCED GUILDS
-- ============================================

-- Add advanced fields to guilds table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'cover_image_url') THEN
    ALTER TABLE public.guilds ADD COLUMN cover_image_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'guild_type') THEN
    ALTER TABLE public.guilds ADD COLUMN guild_type TEXT DEFAULT 'public' CHECK (guild_type IN ('public', 'private', 'invite_only'));
    COMMENT ON COLUMN public.guilds.guild_type IS 'public, private, or invite_only';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'weekly_xp_goal') THEN
    ALTER TABLE public.guilds ADD COLUMN weekly_xp_goal INTEGER DEFAULT 1000;
    COMMENT ON COLUMN public.guilds.weekly_xp_goal IS 'Collective XP goal for the week';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'current_week_xp') THEN
    ALTER TABLE public.guilds ADD COLUMN current_week_xp INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'guild_level') THEN
    ALTER TABLE public.guilds ADD COLUMN guild_level INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'total_guild_xp') THEN
    ALTER TABLE public.guilds ADD COLUMN total_guild_xp INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'tags') THEN
    ALTER TABLE public.guilds ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    COMMENT ON COLUMN public.guilds.tags IS 'Tags for guild discovery (fitness, mindfulness, career, etc)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'rules') THEN
    ALTER TABLE public.guilds ADD COLUMN rules TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'welcome_message') THEN
    ALTER TABLE public.guilds ADD COLUMN welcome_message TEXT;
  END IF;
END $$;

-- Guild posts/feed (like WhatsApp group messages)
CREATE TABLE IF NOT EXISTS public.guild_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'achievement', 'challenge', 'poll')),
  
  -- Media
  media_url TEXT,
  media_thumbnail_url TEXT,
  media_type TEXT, -- image/jpeg, video/mp4, etc
  media_duration INTEGER, -- for videos in seconds
  
  -- Achievement share
  achievement_id UUID,
  achievement_data JSONB,
  
  -- Poll data
  poll_options JSONB, -- [{option: "A", votes: 0}, {option: "B", votes: 0}]
  poll_ends_at TIMESTAMPTZ,
  
  -- Engagement
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  
  -- Metadata
  is_pinned BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guild post likes
CREATE TABLE IF NOT EXISTS public.guild_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.guild_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Guild post comments
CREATE TABLE IF NOT EXISTS public.guild_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.guild_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guild challenges: extend existing table
-- Note: guild_challenges already exists, adding missing columns

-- Add creator_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_challenges' 
    AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE public.guild_challenges ADD COLUMN creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add challenge_type if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_challenges' 
    AND column_name = 'challenge_type'
  ) THEN
    ALTER TABLE public.guild_challenges ADD COLUMN challenge_type TEXT DEFAULT 'collective';
  END IF;
END $$;

-- Add goal_target if not exists (rename goal_value)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_challenges' 
    AND column_name = 'goal_target'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'guild_challenges' 
      AND column_name = 'goal_value'
    ) THEN
      ALTER TABLE public.guild_challenges RENAME COLUMN goal_value TO goal_target;
    END IF;
  END IF;
END $$;

-- Add current_progress if not exists (rename current_value)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_challenges' 
    AND column_name = 'current_progress'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'guild_challenges' 
      AND column_name = 'current_value'
    ) THEN
      ALTER TABLE public.guild_challenges RENAME COLUMN current_value TO current_progress;
    END IF;
  END IF;
END $$;

-- Add reward_xp if not exists (rename xp_reward)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_challenges' 
    AND column_name = 'reward_xp'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'guild_challenges' 
      AND column_name = 'xp_reward'
    ) THEN
      ALTER TABLE public.guild_challenges RENAME COLUMN xp_reward TO reward_xp;
    END IF;
  END IF;
END $$;

-- Add reward_coins if not exists (rename coin_reward)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_challenges' 
    AND column_name = 'reward_coins'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'guild_challenges' 
      AND column_name = 'coin_reward'
    ) THEN
      ALTER TABLE public.guild_challenges RENAME COLUMN coin_reward TO reward_coins;
    END IF;
  END IF;
END $$;

-- Add reward_badge_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_challenges' 
    AND column_name = 'reward_badge_id'
  ) THEN
    ALTER TABLE public.guild_challenges ADD COLUMN reward_badge_id UUID;
  END IF;
END $$;

-- Add status if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_challenges' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.guild_challenges ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Add completed_at if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_challenges' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.guild_challenges ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Guild challenge participants
CREATE TABLE IF NOT EXISTS public.guild_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.guild_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  individual_progress INTEGER DEFAULT 0,
  contribution_percentage DECIMAL(5,2) DEFAULT 0,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(challenge_id, user_id)
);

-- Guild weekly leaderboard (auto-reset every week)
CREATE TABLE IF NOT EXISTS public.guild_weekly_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  quests_completed INTEGER DEFAULT 0,
  habits_completed INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  
  rank INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(guild_id, user_id, week_start)
);

-- ============================================
-- PART 2: NOTIFICATIONS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL, -- 'guild_invite', 'friend_request', 'challenge_complete', 'achievement', etc
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  related_user_id UUID,
  related_guild_id UUID,
  related_challenge_id UUID,
  related_post_id UUID,
  
  -- Actions
  action_url TEXT, -- Deep link to open in app
  action_data JSONB,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: MEDIA UPLOAD TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS public.media_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  public_url TEXT NOT NULL,
  
  -- Context
  upload_context TEXT, -- 'guild_post', 'profile_avatar', 'challenge_verification', etc
  related_entity_id UUID,
  
  -- Metadata
  width INTEGER, -- for images
  height INTEGER, -- for images
  duration INTEGER, -- for videos in seconds
  thumbnail_url TEXT, -- for videos
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 4: FUNCTIONS
-- ============================================

-- Function to get guild feed with pagination
CREATE OR REPLACE FUNCTION get_guild_feed(
  p_guild_id UUID,
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', gp.id,
        'content', gp.content,
        'post_type', gp.post_type,
        'media_url', gp.media_url,
        'media_thumbnail_url', gp.media_thumbnail_url,
        'likes_count', gp.likes_count,
        'comments_count', gp.comments_count,
        'is_pinned', gp.is_pinned,
        'created_at', gp.created_at,
        'user', json_build_object(
          'id', p.id,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url,
          'level', p.level
        ),
        'liked_by_me', EXISTS(
          SELECT 1 FROM guild_post_likes 
          WHERE post_id = gp.id AND user_id = p_user_id
        )
      ) ORDER BY gp.is_pinned DESC, gp.created_at DESC
    )
    FROM guild_posts gp
    JOIN profiles p ON p.id = gp.user_id
    WHERE gp.guild_id = p_guild_id
    ORDER BY gp.is_pinned DESC, gp.created_at DESC
    LIMIT p_limit OFFSET p_offset
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update guild weekly leaderboard
CREATE OR REPLACE FUNCTION update_guild_leaderboard(
  p_guild_id UUID,
  p_user_id UUID,
  p_xp_gained INTEGER DEFAULT 0,
  p_coins_gained INTEGER DEFAULT 0,
  p_quest_completed BOOLEAN DEFAULT false,
  p_habit_completed BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Get current week (Monday to Sunday)
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  v_week_end := (v_week_start + INTERVAL '6 days')::DATE;
  
  -- Upsert leaderboard entry
  INSERT INTO guild_weekly_leaderboard (
    guild_id, user_id, week_start, week_end,
    quests_completed, habits_completed, xp_earned, coins_earned
  ) VALUES (
    p_guild_id, p_user_id, v_week_start, v_week_end,
    CASE WHEN p_quest_completed THEN 1 ELSE 0 END,
    CASE WHEN p_habit_completed THEN 1 ELSE 0 END,
    p_xp_gained,
    p_coins_gained
  )
  ON CONFLICT (guild_id, user_id, week_start) DO UPDATE
  SET
    quests_completed = guild_weekly_leaderboard.quests_completed + CASE WHEN p_quest_completed THEN 1 ELSE 0 END,
    habits_completed = guild_weekly_leaderboard.habits_completed + CASE WHEN p_habit_completed THEN 1 ELSE 0 END,
    xp_earned = guild_weekly_leaderboard.xp_earned + p_xp_gained,
    coins_earned = guild_weekly_leaderboard.coins_earned + p_coins_gained,
    updated_at = NOW();
  
  -- Update guild total XP
  UPDATE guilds
  SET 
    current_week_xp = current_week_xp + p_xp_gained,
    total_guild_xp = total_guild_xp + p_xp_gained
  WHERE id = p_guild_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and update leaderboard ranks
CREATE OR REPLACE FUNCTION update_guild_leaderboard_ranks(p_guild_id UUID, p_week_start DATE)
RETURNS VOID AS $$
BEGIN
  WITH ranked AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY xp_earned DESC, quests_completed DESC) as new_rank
    FROM guild_weekly_leaderboard
    WHERE guild_id = p_guild_id AND week_start = p_week_start
  )
  UPDATE guild_weekly_leaderboard gl
  SET rank = ranked.new_rank
  FROM ranked
  WHERE gl.id = ranked.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_user_id UUID DEFAULT NULL,
  p_related_guild_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, notification_type, title, message,
    related_user_id, related_guild_id, action_url
  ) VALUES (
    p_user_id, p_type, p_title, p_message,
    p_related_user_id, p_related_guild_id, p_action_url
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: TRIGGERS
-- ============================================

-- Trigger to update post counts on like
CREATE OR REPLACE FUNCTION trigger_update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE guild_posts 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE guild_posts 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.post_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_guild_post_likes_count') THEN
    CREATE TRIGGER trigger_guild_post_likes_count
    AFTER INSERT OR DELETE ON guild_post_likes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_post_likes_count();
  END IF;
END $$;

-- Trigger to update comments count
CREATE OR REPLACE FUNCTION trigger_update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE guild_posts 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE guild_posts 
    SET comments_count = GREATEST(0, comments_count - 1) 
    WHERE id = OLD.post_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_guild_post_comments_count') THEN
    CREATE TRIGGER trigger_guild_post_comments_count
    AFTER INSERT OR DELETE ON guild_post_comments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_post_comments_count();
  END IF;
END $$;

-- ============================================
-- PART 6: INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_guild_posts_guild ON guild_posts(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_posts_user ON guild_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_posts_pinned ON guild_posts(guild_id, is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_post_likes_post ON guild_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_guild_post_likes_user ON guild_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_post_comments_post ON guild_post_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_challenges_guild ON guild_challenges(guild_id, ends_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_leaderboard_week ON guild_weekly_leaderboard(guild_id, week_start, xp_earned DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_uploads_user ON media_uploads(user_id, created_at DESC);

-- ============================================
-- PART 7: RLS POLICIES
-- ============================================

ALTER TABLE guild_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_weekly_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;

-- Guild posts visible to guild members
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'guild_posts' AND policyname = 'Guild members can view posts') THEN
    CREATE POLICY "Guild members can view posts" ON guild_posts FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM guild_members 
        WHERE guild_id = guild_posts.guild_id AND user_id = auth.uid()
      )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'guild_posts' AND policyname = 'Guild members can create posts') THEN
    CREATE POLICY "Guild members can create posts" ON guild_posts FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM guild_members 
        WHERE guild_id = guild_posts.guild_id AND user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Notifications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications') THEN
    CREATE POLICY "Users can view own notifications" ON notifications FOR ALL
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Media uploads
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_uploads' AND policyname = 'Users can manage own uploads') THEN
    CREATE POLICY "Users can manage own uploads" ON media_uploads FOR ALL
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- PART 8: COMMENTS
-- ============================================

COMMENT ON TABLE guild_posts IS 'Social feed posts in guilds (text, images, videos, achievements)';
COMMENT ON TABLE guild_challenges IS 'Group challenges with collective or individual goals';
COMMENT ON TABLE guild_weekly_leaderboard IS 'Auto-resetting weekly leaderboard for guild competition';
COMMENT ON TABLE notifications IS 'In-app notification system';
COMMENT ON TABLE media_uploads IS 'Tracking for all media uploads (images, videos)';
COMMENT ON FUNCTION get_guild_feed IS 'Fetches guild feed with user info and like status';
COMMENT ON FUNCTION update_guild_leaderboard IS 'Updates weekly leaderboard when user completes quests/habits';
