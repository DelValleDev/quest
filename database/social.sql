-- =====================================================
-- QUEST APP - SOCIAL SYSTEM
-- Run this in Supabase SQL Editor AFTER schema.sql
-- =====================================================

-- =====================================================
-- FRIEND REQUESTS TABLE
-- =====================================================
DROP TABLE IF EXISTS public.guild_challenges CASCADE;
DROP TABLE IF EXISTS public.guild_members CASCADE;
DROP TABLE IF EXISTS public.guilds CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;

CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  message TEXT, -- optional message with request
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  
  UNIQUE(sender_id, receiver_id)
);

-- =====================================================
-- FRIENDS TABLE (Accepted friendships)
-- =====================================================
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Stats
  challenges_together INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, friend_id)
);

-- =====================================================
-- GUILDS TABLE
-- =====================================================
CREATE TABLE public.guilds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic info
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '⚔️',
  banner_color TEXT DEFAULT '#8B5CF6',
  
  -- Owner
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Settings
  is_public BOOLEAN DEFAULT true, -- anyone can join
  max_members INTEGER DEFAULT 50,
  min_level INTEGER DEFAULT 1, -- level requirement to join
  
  -- Stats
  total_xp BIGINT DEFAULT 0,
  total_challenges INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 1,
  
  -- Ranking
  weekly_xp INTEGER DEFAULT 0,
  rank INTEGER, -- calculated weekly
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GUILD MEMBERS TABLE
-- =====================================================
CREATE TABLE public.guild_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  role TEXT DEFAULT 'member', -- owner, admin, member
  
  -- Contribution stats
  xp_contributed BIGINT DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(guild_id, user_id)
);

-- =====================================================
-- GUILD CHALLENGES (Group challenges)
-- =====================================================
CREATE TABLE public.guild_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  
  -- Challenge info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_type TEXT NOT NULL, -- total_xp, challenges_completed, streak_days
  goal_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  
  -- Rewards
  xp_reward INTEGER DEFAULT 100,
  coin_reward INTEGER DEFAULT 50,
  
  -- Timing
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_challenges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can update own friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can view own friends" ON public.friends;
DROP POLICY IF EXISTS "Users can insert friends" ON public.friends;
DROP POLICY IF EXISTS "Users can delete friends" ON public.friends;
DROP POLICY IF EXISTS "Anyone can view public guilds" ON public.guilds;
DROP POLICY IF EXISTS "Guild owners can update" ON public.guilds;
DROP POLICY IF EXISTS "Users can create guilds" ON public.guilds;
DROP POLICY IF EXISTS "Members can view guild members" ON public.guild_members;
DROP POLICY IF EXISTS "Users can join guilds" ON public.guild_members;
DROP POLICY IF EXISTS "Users can leave guilds" ON public.guild_members;
DROP POLICY IF EXISTS "Guild members can view challenges" ON public.guild_challenges;

-- Friend requests
CREATE POLICY "Users can view own friend requests" ON public.friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own friend requests" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Friends
CREATE POLICY "Users can view own friends" ON public.friends
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can insert friends" ON public.friends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete friends" ON public.friends
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Guilds
CREATE POLICY "Anyone can view public guilds" ON public.guilds
  FOR SELECT USING (is_public = true);

CREATE POLICY "Guild owners can update" ON public.guilds
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can create guilds" ON public.guilds
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Guild members
CREATE POLICY "Members can view guild members" ON public.guild_members
  FOR SELECT USING (true);

CREATE POLICY "Users can join guilds" ON public.guild_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave guilds" ON public.guild_members
  FOR DELETE USING (auth.uid() = user_id);

-- Guild challenges
CREATE POLICY "Guild members can view challenges" ON public.guild_challenges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.guild_members 
      WHERE guild_id = guild_challenges.guild_id 
      AND user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Send friend request
CREATE OR REPLACE FUNCTION send_friend_request(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Can't friend yourself
  IF p_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot send friend request to yourself');
  END IF;

  -- Check if already friends
  IF EXISTS (
    SELECT 1 FROM public.friends 
    WHERE (user_id = p_sender_id AND friend_id = p_receiver_id)
       OR (user_id = p_receiver_id AND friend_id = p_sender_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already friends');
  END IF;

  -- Check for existing request
  SELECT * INTO v_existing FROM public.friend_requests 
  WHERE (sender_id = p_sender_id AND receiver_id = p_receiver_id)
     OR (sender_id = p_receiver_id AND receiver_id = p_sender_id);

  IF v_existing IS NOT NULL THEN
    IF v_existing.status = 'pending' THEN
      -- If other person sent request, auto-accept
      IF v_existing.sender_id = p_receiver_id THEN
        RETURN accept_friend_request(p_sender_id, v_existing.id);
      END IF;
      RETURN jsonb_build_object('success', false, 'error', 'Request already pending');
    END IF;
  END IF;

  -- Create request
  INSERT INTO public.friend_requests (sender_id, receiver_id, message)
  VALUES (p_sender_id, p_receiver_id, p_message);

  RETURN jsonb_build_object('success', true, 'message', 'Friend request sent');
END;
$$;

-- Accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(
  p_user_id UUID,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Get request
  SELECT * INTO v_request FROM public.friend_requests 
  WHERE id = p_request_id AND receiver_id = p_user_id AND status = 'pending';

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  -- Update request status
  UPDATE public.friend_requests 
  SET status = 'accepted', responded_at = NOW()
  WHERE id = p_request_id;

  -- Create friendship (both directions)
  INSERT INTO public.friends (user_id, friend_id)
  VALUES (v_request.sender_id, v_request.receiver_id);
  
  INSERT INTO public.friends (user_id, friend_id)
  VALUES (v_request.receiver_id, v_request.sender_id);

  RETURN jsonb_build_object('success', true, 'message', 'Friend request accepted');
END;
$$;

-- Reject friend request
CREATE OR REPLACE FUNCTION reject_friend_request(
  p_user_id UUID,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.friend_requests 
  SET status = 'rejected', responded_at = NOW()
  WHERE id = p_request_id AND receiver_id = p_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Friend request rejected');
END;
$$;

-- Remove friend
CREATE OR REPLACE FUNCTION remove_friend(
  p_user_id UUID,
  p_friend_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete both directions
  DELETE FROM public.friends 
  WHERE (user_id = p_user_id AND friend_id = p_friend_id)
     OR (user_id = p_friend_id AND friend_id = p_user_id);

  RETURN jsonb_build_object('success', true, 'message', 'Friend removed');
END;
$$;

-- Create guild
CREATE OR REPLACE FUNCTION create_guild(
  p_owner_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT '⚔️',
  p_is_public BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guild_id UUID;
  v_user RECORD;
BEGIN
  -- Check if user already in a guild
  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = p_owner_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in a guild. Leave first.');
  END IF;

  -- Check name availability
  IF EXISTS (SELECT 1 FROM public.guilds WHERE LOWER(name) = LOWER(p_name)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild name already taken');
  END IF;

  -- Create guild
  INSERT INTO public.guilds (name, description, icon, owner_id, is_public)
  VALUES (p_name, p_description, p_icon, p_owner_id, p_is_public)
  RETURNING id INTO v_guild_id;

  -- Add owner as member
  INSERT INTO public.guild_members (guild_id, user_id, role)
  VALUES (v_guild_id, p_owner_id, 'owner');

  RETURN jsonb_build_object('success', true, 'guild_id', v_guild_id, 'message', 'Guild created');
END;
$$;

-- Join guild
CREATE OR REPLACE FUNCTION join_guild(
  p_user_id UUID,
  p_guild_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guild RECORD;
  v_user RECORD;
BEGIN
  -- Check if already in a guild
  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in a guild');
  END IF;

  -- Get guild
  SELECT * INTO v_guild FROM public.guilds WHERE id = p_guild_id;
  
  IF v_guild IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild not found');
  END IF;

  IF NOT v_guild.is_public THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild is private');
  END IF;

  IF v_guild.member_count >= v_guild.max_members THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guild is full');
  END IF;

  -- Check level requirement
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id;
  IF v_user.level < v_guild.min_level THEN
    RETURN jsonb_build_object('success', false, 'error', 'Level too low', 'required', v_guild.min_level);
  END IF;

  -- Join
  INSERT INTO public.guild_members (guild_id, user_id, role)
  VALUES (p_guild_id, p_user_id, 'member');

  -- Update member count
  UPDATE public.guilds SET member_count = member_count + 1 WHERE id = p_guild_id;

  RETURN jsonb_build_object('success', true, 'message', 'Joined guild');
END;
$$;

-- Leave guild
CREATE OR REPLACE FUNCTION leave_guild(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_membership RECORD;
  v_guild RECORD;
BEGIN
  -- Get membership
  SELECT gm.*, g.owner_id, g.id as guild_id 
  INTO v_membership
  FROM public.guild_members gm
  JOIN public.guilds g ON g.id = gm.guild_id
  WHERE gm.user_id = p_user_id;

  IF v_membership IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in a guild');
  END IF;

  -- If owner, transfer or delete guild
  IF v_membership.owner_id = p_user_id THEN
    -- Try to transfer to another admin or member
    UPDATE public.guilds 
    SET owner_id = (
      SELECT user_id FROM public.guild_members 
      WHERE guild_id = v_membership.guild_id 
        AND user_id != p_user_id 
      ORDER BY role = 'admin' DESC, joined_at 
      LIMIT 1
    )
    WHERE id = v_membership.guild_id;

    -- If no one left, delete guild
    IF NOT EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = v_membership.guild_id AND user_id != p_user_id) THEN
      DELETE FROM public.guilds WHERE id = v_membership.guild_id;
      DELETE FROM public.guild_members WHERE user_id = p_user_id;
      RETURN jsonb_build_object('success', true, 'message', 'Guild disbanded');
    END IF;
  END IF;

  -- Leave
  DELETE FROM public.guild_members WHERE user_id = p_user_id;

  -- Update member count
  UPDATE public.guilds SET member_count = member_count - 1 WHERE id = v_membership.guild_id;

  RETURN jsonb_build_object('success', true, 'message', 'Left guild');
END;
$$;

-- =====================================================
-- LEADERBOARD VIEW
-- =====================================================
CREATE OR REPLACE VIEW public.leaderboard_global AS
SELECT 
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.level,
  p.total_xp,
  p.current_streak,
  p.longest_streak,
  p.challenges_completed,
  RANK() OVER (ORDER BY p.total_xp DESC) as rank_xp,
  RANK() OVER (ORDER BY p.current_streak DESC) as rank_streak,
  RANK() OVER (ORDER BY p.challenges_completed DESC) as rank_challenges
FROM public.profiles p
WHERE p.username IS NOT NULL
ORDER BY p.total_xp DESC;

-- Weekly leaderboard (last 7 days XP)
-- Note: This would need a separate table tracking weekly XP, simplified here

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friends_user ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_guilds_public ON public.guilds(is_public);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON public.guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON public.guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON public.profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON public.profiles(current_streak DESC);
