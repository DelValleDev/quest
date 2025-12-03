-- =====================================================
-- QUEST APP - 1v1 & GROUP CHALLENGES SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1v1 CHALLENGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.challenge_duels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Challenge info
  title TEXT NOT NULL,
  description TEXT,
  challenge_id UUID REFERENCES public.challenges(id), -- Optional base challenge
  
  -- Participants
  challenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  opponent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Stakes
  stake_type TEXT DEFAULT 'honor', -- honor, coins, custom
  stake_amount INTEGER DEFAULT 0, -- QC amount if coins
  custom_stake TEXT, -- Description of custom stake
  
  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  duration_days INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM ends_at - starts_at)
  ) STORED,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, active, completed, cancelled
  
  -- Winner (set when completed)
  winner_id UUID REFERENCES public.profiles(id),
  
  -- Progress tracking (JSONB for flexibility)
  challenger_progress JSONB DEFAULT '{"value": 0, "notes": []}',
  opponent_progress JSONB DEFAULT '{"value": 0, "notes": []}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_duels_challenger ON public.challenge_duels(challenger_id);
CREATE INDEX IF NOT EXISTS idx_duels_opponent ON public.challenge_duels(opponent_id);
CREATE INDEX IF NOT EXISTS idx_duels_status ON public.challenge_duels(status);

-- =====================================================
-- GROUP CHALLENGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.group_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Challenge info
  title TEXT NOT NULL,
  description TEXT,
  challenge_id UUID REFERENCES public.challenges(id),
  
  -- Creator
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Type
  challenge_type TEXT DEFAULT 'competitive', -- competitive, cooperative
  
  -- Stakes
  stake_type TEXT DEFAULT 'honor',
  stake_amount INTEGER DEFAULT 0,
  
  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, active, voting, completed
  
  -- Participants settings
  min_participants INTEGER DEFAULT 3,
  max_participants INTEGER DEFAULT 10,
  
  -- Punishment voting
  punishment_proposals JSONB DEFAULT '[]',
  punishment_votes JSONB DEFAULT '{}',
  selected_punishment TEXT,
  
  -- Winners/Losers
  winner_ids UUID[] DEFAULT '{}',
  loser_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group challenge participants
CREATE TABLE IF NOT EXISTS public.group_challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_challenge_id UUID REFERENCES public.group_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, accepted, declined, completed
  
  -- Progress
  progress JSONB DEFAULT '{"value": 0, "notes": []}',
  completed_at TIMESTAMPTZ,
  
  -- Rank (for competitive)
  final_rank INTEGER,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(group_challenge_id, user_id)
);

-- =====================================================
-- FUNCTION: Create a 1v1 Duel
-- =====================================================
CREATE OR REPLACE FUNCTION create_duel(
  p_challenger_id UUID,
  p_opponent_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_stake_type TEXT DEFAULT 'honor',
  p_stake_amount INTEGER DEFAULT 0,
  p_custom_stake TEXT DEFAULT NULL,
  p_duration_days INTEGER DEFAULT 7
)
RETURNS UUID AS $$
DECLARE
  v_duel_id UUID;
  v_starts_at TIMESTAMPTZ := NOW();
  v_ends_at TIMESTAMPTZ := NOW() + (p_duration_days || ' days')::INTERVAL;
BEGIN
  -- Validate participants are different
  IF p_challenger_id = p_opponent_id THEN
    RAISE EXCEPTION 'Cannot challenge yourself';
  END IF;
  
  -- Check if they're friends (optional - can be removed for open challenges)
  -- IF NOT EXISTS (
  --   SELECT 1 FROM public.friends 
  --   WHERE (user_id = p_challenger_id AND friend_id = p_opponent_id)
  --   OR (user_id = p_opponent_id AND friend_id = p_challenger_id)
  -- ) THEN
  --   RAISE EXCEPTION 'Can only challenge friends';
  -- END IF;
  
  -- If staking coins, verify challenger has enough
  IF p_stake_type = 'coins' AND p_stake_amount > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = p_challenger_id AND quest_coins >= p_stake_amount
    ) THEN
      RAISE EXCEPTION 'Insufficient Quest Coins';
    END IF;
  END IF;
  
  INSERT INTO public.challenge_duels (
    challenger_id, opponent_id, title, description,
    stake_type, stake_amount, custom_stake,
    starts_at, ends_at
  ) VALUES (
    p_challenger_id, p_opponent_id, p_title, p_description,
    p_stake_type, p_stake_amount, p_custom_stake,
    v_starts_at, v_ends_at
  ) RETURNING id INTO v_duel_id;
  
  RETURN v_duel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Accept/Decline Duel
-- =====================================================
CREATE OR REPLACE FUNCTION respond_to_duel(
  p_duel_id UUID,
  p_user_id UUID,
  p_accept BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_duel RECORD;
BEGIN
  SELECT * INTO v_duel FROM public.challenge_duels WHERE id = p_duel_id;
  
  IF v_duel IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Duel not found');
  END IF;
  
  IF v_duel.opponent_id != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not the opponent');
  END IF;
  
  IF v_duel.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Duel already processed');
  END IF;
  
  IF p_accept THEN
    -- Check if opponent has enough coins for stake
    IF v_duel.stake_type = 'coins' AND v_duel.stake_amount > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id AND quest_coins >= v_duel.stake_amount
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient Quest Coins');
      END IF;
      
      -- Deduct coins from both participants (escrow)
      UPDATE public.profiles SET quest_coins = quest_coins - v_duel.stake_amount
      WHERE id IN (v_duel.challenger_id, p_user_id);
    END IF;
    
    UPDATE public.challenge_duels
    SET status = 'active', accepted_at = NOW()
    WHERE id = p_duel_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Duel accepted!');
  ELSE
    UPDATE public.challenge_duels
    SET status = 'cancelled'
    WHERE id = p_duel_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Duel declined');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Update Duel Progress
-- =====================================================
CREATE OR REPLACE FUNCTION update_duel_progress(
  p_duel_id UUID,
  p_user_id UUID,
  p_progress_value INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_duel RECORD;
  v_is_challenger BOOLEAN;
  v_progress_field TEXT;
  v_current_progress JSONB;
BEGIN
  SELECT * INTO v_duel FROM public.challenge_duels WHERE id = p_duel_id;
  
  IF v_duel IS NULL OR v_duel.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive duel');
  END IF;
  
  v_is_challenger := (v_duel.challenger_id = p_user_id);
  
  IF NOT v_is_challenger AND v_duel.opponent_id != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;
  
  IF v_is_challenger THEN
    v_current_progress := v_duel.challenger_progress;
    v_current_progress := jsonb_set(v_current_progress, '{value}', to_jsonb(p_progress_value));
    IF p_note IS NOT NULL THEN
      v_current_progress := jsonb_set(
        v_current_progress, 
        '{notes}', 
        (v_current_progress->'notes') || jsonb_build_object('text', p_note, 'at', NOW())
      );
    END IF;
    UPDATE public.challenge_duels SET challenger_progress = v_current_progress WHERE id = p_duel_id;
  ELSE
    v_current_progress := v_duel.opponent_progress;
    v_current_progress := jsonb_set(v_current_progress, '{value}', to_jsonb(p_progress_value));
    IF p_note IS NOT NULL THEN
      v_current_progress := jsonb_set(
        v_current_progress, 
        '{notes}', 
        (v_current_progress->'notes') || jsonb_build_object('text', p_note, 'at', NOW())
      );
    END IF;
    UPDATE public.challenge_duels SET opponent_progress = v_current_progress WHERE id = p_duel_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'progress', p_progress_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Complete Duel (determine winner)
-- =====================================================
CREATE OR REPLACE FUNCTION complete_duel(p_duel_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_duel RECORD;
  v_challenger_score INTEGER;
  v_opponent_score INTEGER;
  v_winner_id UUID;
  v_loser_id UUID;
  v_total_stake INTEGER;
BEGIN
  SELECT * INTO v_duel FROM public.challenge_duels WHERE id = p_duel_id;
  
  IF v_duel IS NULL OR v_duel.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive duel');
  END IF;
  
  -- Check if duel has ended
  IF NOW() < v_duel.ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Duel not yet ended');
  END IF;
  
  v_challenger_score := (v_duel.challenger_progress->>'value')::INTEGER;
  v_opponent_score := (v_duel.opponent_progress->>'value')::INTEGER;
  
  IF v_challenger_score > v_opponent_score THEN
    v_winner_id := v_duel.challenger_id;
    v_loser_id := v_duel.opponent_id;
  ELSIF v_opponent_score > v_challenger_score THEN
    v_winner_id := v_duel.opponent_id;
    v_loser_id := v_duel.challenger_id;
  ELSE
    -- Tie - both get their coins back, challenger wins tiebreaker
    v_winner_id := v_duel.challenger_id;
    v_loser_id := v_duel.opponent_id;
  END IF;
  
  -- Update duel
  UPDATE public.challenge_duels
  SET status = 'completed', winner_id = v_winner_id, completed_at = NOW()
  WHERE id = p_duel_id;
  
  -- Handle stakes
  IF v_duel.stake_type = 'coins' AND v_duel.stake_amount > 0 THEN
    v_total_stake := v_duel.stake_amount * 2;
    -- Winner gets all
    UPDATE public.profiles SET quest_coins = quest_coins + v_total_stake
    WHERE id = v_winner_id;
  END IF;
  
  -- Award XP
  UPDATE public.profiles SET total_xp = total_xp + 100 WHERE id = v_winner_id;
  UPDATE public.profiles SET total_xp = total_xp + 25 WHERE id = v_loser_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'winner_id', v_winner_id,
    'challenger_score', v_challenger_score,
    'opponent_score', v_opponent_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get user's active duels
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_duels(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_duels JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'title', d.title,
      'description', d.description,
      'status', d.status,
      'stake_type', d.stake_type,
      'stake_amount', d.stake_amount,
      'starts_at', d.starts_at,
      'ends_at', d.ends_at,
      'is_challenger', d.challenger_id = p_user_id,
      'challenger', jsonb_build_object(
        'id', c.id,
        'display_name', c.display_name,
        'level', c.level
      ),
      'opponent', jsonb_build_object(
        'id', o.id,
        'display_name', o.display_name,
        'level', o.level
      ),
      'my_progress', CASE WHEN d.challenger_id = p_user_id THEN d.challenger_progress ELSE d.opponent_progress END,
      'opponent_progress', CASE WHEN d.challenger_id = p_user_id THEN d.opponent_progress ELSE d.challenger_progress END,
      'winner_id', d.winner_id
    )
    ORDER BY 
      CASE d.status WHEN 'active' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END,
      d.created_at DESC
  ) INTO v_duels
  FROM public.challenge_duels d
  JOIN public.profiles c ON c.id = d.challenger_id
  JOIN public.profiles o ON o.id = d.opponent_id
  WHERE d.challenger_id = p_user_id OR d.opponent_id = p_user_id;
  
  RETURN COALESCE(v_duels, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.challenge_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_challenge_participants ENABLE ROW LEVEL SECURITY;

-- Duel policies
CREATE POLICY "Users can view own duels"
ON public.challenge_duels FOR SELECT
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create duels"
ON public.challenge_duels FOR INSERT
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Participants can update duels"
ON public.challenge_duels FOR UPDATE
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Group challenge policies
CREATE POLICY "Anyone can view group challenges"
ON public.group_challenges FOR SELECT
USING (true);

CREATE POLICY "Users can create group challenges"
ON public.group_challenges FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Grant function permissions
GRANT EXECUTE ON FUNCTION create_duel TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_duel TO authenticated;
GRANT EXECUTE ON FUNCTION update_duel_progress TO authenticated;
GRANT EXECUTE ON FUNCTION complete_duel TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_duels TO authenticated;
