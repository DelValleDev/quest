-- =====================================================
-- RAIDS SYSTEM (Mini-Raids Grupales)
-- Desafíos grupales que aparecen cuando 3+ amigos están online
-- =====================================================

-- =====================================================
-- RAIDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS raids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL, -- 'walking', 'reading', 'meditation', 'workout', 'custom'
  target_value INT NOT NULL DEFAULT 1, -- e.g., 3 for "3km", 30 for "30 pages"
  target_unit TEXT NOT NULL DEFAULT 'units', -- 'km', 'pages', 'minutes', 'reps', 'units'
  xp_reward INT NOT NULL DEFAULT 200,
  coin_reward INT NOT NULL DEFAULT 50,
  duration_hours INT NOT NULL DEFAULT 2, -- How long to complete
  min_participants INT NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'failed', 'expired'
  success_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.70, -- 70% must complete
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_duration CHECK (duration_hours >= 1 AND duration_hours <= 24),
  CONSTRAINT valid_threshold CHECK (success_threshold >= 0.5 AND success_threshold <= 1.0)
);

-- =====================================================
-- RAID PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS raid_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_id UUID NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined', -- 'joined', 'completed', 'failed'
  current_progress INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(raid_id, user_id)
);

-- =====================================================
-- RAID TEMPLATES (Pre-made raid ideas)
-- =====================================================
CREATE TABLE IF NOT EXISTS raid_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  target_value INT NOT NULL,
  target_unit TEXT NOT NULL,
  xp_reward INT NOT NULL DEFAULT 200,
  duration_hours INT NOT NULL DEFAULT 2,
  pillar_id TEXT,
  icon TEXT DEFAULT '⚡',
  is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- INSERT RAID TEMPLATES
-- =====================================================
INSERT INTO raid_templates (title, description, challenge_type, target_value, target_unit, xp_reward, duration_hours, pillar_id, icon) VALUES
-- Physical Raids
('Walk Together', 'Everyone walk 3km in the next 2 hours!', 'walking', 3, 'km', 250, 2, 'physical', '🚶'),
('Quick Workout', 'Everyone do 50 pushups!', 'workout', 50, 'reps', 200, 1, 'physical', '💪'),
('Running Rush', 'Everyone run 2km!', 'running', 2, 'km', 300, 2, 'physical', '🏃'),
('Stretch Session', '15 minutes of stretching together', 'stretching', 15, 'minutes', 150, 1, 'physical', '🧘'),
('Step Challenge', 'Everyone reach 5,000 steps!', 'steps', 5000, 'steps', 250, 3, 'physical', '👟'),

-- Mental Raids
('Reading Sprint', 'Everyone read 30 pages of a book', 'reading', 30, 'pages', 250, 3, 'mental', '📚'),
('Focus Hour', '60 minutes of deep work together', 'focus', 60, 'minutes', 300, 2, 'mental', '🎯'),
('Learning Burst', 'Watch 2 educational videos', 'learning', 2, 'videos', 200, 2, 'mental', '🧠'),
('Puzzle Time', 'Solve 5 puzzles or brain teasers', 'puzzles', 5, 'puzzles', 200, 2, 'mental', '🧩'),
('Journal Together', 'Write 1 journal entry', 'journaling', 1, 'entries', 150, 2, 'mental', '📝'),

-- Social Raids
('Check-in Chain', 'Everyone check in with a friend', 'social', 1, 'check-ins', 150, 2, 'social', '👋'),
('Gratitude Share', 'Share 3 things you are grateful for', 'gratitude', 3, 'things', 150, 1, 'social', '🙏'),
('Compliment Raid', 'Give 3 genuine compliments today', 'compliments', 3, 'compliments', 150, 3, 'social', '💬'),

-- Professional Raids
('Task Blitz', 'Everyone complete their top priority task', 'tasks', 1, 'tasks', 250, 3, 'professional', '✅'),
('Email Zero', 'Clear your inbox (or 10 emails minimum)', 'emails', 10, 'emails', 200, 2, 'professional', '📧'),
('Learning Session', 'Study/practice your skill for 30 mins', 'study', 30, 'minutes', 200, 2, 'professional', '📖'),

-- Spiritual Raids
('Meditation Moment', '15 minutes of meditation', 'meditation', 15, 'minutes', 200, 1, 'spiritual', '🧘‍♂️'),
('Reflection Time', '10 minutes of quiet reflection', 'reflection', 10, 'minutes', 150, 1, 'spiritual', '✨'),
('Mindfulness Walk', 'Take a mindful 20-minute walk', 'mindfulness', 20, 'minutes', 200, 2, 'spiritual', '🌿'),

-- Creative Raids
('Sketch Sprint', 'Create a quick sketch or drawing', 'art', 1, 'pieces', 200, 2, 'creative', '🎨'),
('Write Together', 'Write 500 words (story, blog, anything)', 'writing', 500, 'words', 250, 3, 'creative', '✍️'),
('Music Moment', 'Practice an instrument for 20 mins', 'music', 20, 'minutes', 200, 2, 'creative', '🎵'),

-- General Raids
('Hydration Hero', 'Everyone drink 8 glasses of water today', 'hydration', 8, 'glasses', 150, 6, NULL, '💧'),
('No Phone Hour', 'Everyone stay off phones for 1 hour', 'digital_detox', 60, 'minutes', 200, 2, NULL, '📵'),
('Clean Space', 'Spend 15 mins organizing your space', 'cleaning', 15, 'minutes', 150, 2, NULL, '🧹');

-- =====================================================
-- CREATE RAID FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION create_raid(
  p_creator_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_challenge_type TEXT,
  p_target_value INT,
  p_target_unit TEXT,
  p_xp_reward INT DEFAULT 200,
  p_coin_reward INT DEFAULT 50,
  p_duration_hours INT DEFAULT 2,
  p_friend_ids UUID[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_raid_id UUID;
  v_friend_id UUID;
BEGIN
  -- Check cooldown (1 raid per 6 hours per user)
  IF EXISTS (
    SELECT 1 FROM raids 
    WHERE creator_id = p_creator_id 
    AND created_at > now() - INTERVAL '6 hours'
  ) THEN
    RAISE EXCEPTION 'Raid cooldown active. Wait 6 hours between creating raids.';
  END IF;
  
  -- Create the raid
  INSERT INTO raids (
    creator_id,
    title,
    description,
    challenge_type,
    target_value,
    target_unit,
    xp_reward,
    coin_reward,
    duration_hours,
    ends_at
  ) VALUES (
    p_creator_id,
    p_title,
    p_description,
    p_challenge_type,
    p_target_value,
    p_target_unit,
    p_xp_reward,
    p_coin_reward,
    p_duration_hours,
    now() + (p_duration_hours || ' hours')::INTERVAL
  )
  RETURNING id INTO v_raid_id;
  
  -- Add creator as participant
  INSERT INTO raid_participants (raid_id, user_id) 
  VALUES (v_raid_id, p_creator_id);
  
  -- Add specified friends if provided
  IF p_friend_ids IS NOT NULL THEN
    FOREACH v_friend_id IN ARRAY p_friend_ids LOOP
      INSERT INTO raid_participants (raid_id, user_id)
      VALUES (v_raid_id, v_friend_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN v_raid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE RAID FROM TEMPLATE
-- =====================================================
CREATE OR REPLACE FUNCTION create_raid_from_template(
  p_creator_id UUID,
  p_template_id UUID,
  p_friend_ids UUID[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_template raid_templates%ROWTYPE;
BEGIN
  -- Get template
  SELECT * INTO v_template FROM raid_templates WHERE id = p_template_id AND is_active = true;
  
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Create raid from template
  RETURN create_raid(
    p_creator_id,
    v_template.title,
    v_template.description,
    v_template.challenge_type,
    v_template.target_value,
    v_template.target_unit,
    v_template.xp_reward,
    50, -- default coin reward
    v_template.duration_hours,
    p_friend_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- JOIN RAID FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION join_raid(
  p_user_id UUID,
  p_raid_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_raid raids%ROWTYPE;
BEGIN
  -- Get raid
  SELECT * INTO v_raid FROM raids WHERE id = p_raid_id;
  
  IF v_raid IS NULL THEN
    RAISE EXCEPTION 'Raid not found';
  END IF;
  
  IF v_raid.status != 'active' THEN
    RAISE EXCEPTION 'Raid is no longer active';
  END IF;
  
  IF v_raid.ends_at < now() THEN
    RAISE EXCEPTION 'Raid has expired';
  END IF;
  
  -- Join raid
  INSERT INTO raid_participants (raid_id, user_id)
  VALUES (p_raid_id, p_user_id)
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE RAID PROGRESS
-- =====================================================
CREATE OR REPLACE FUNCTION update_raid_progress(
  p_user_id UUID,
  p_raid_id UUID,
  p_progress INT
)
RETURNS JSON AS $$
DECLARE
  v_raid raids%ROWTYPE;
  v_participant raid_participants%ROWTYPE;
  v_was_completed BOOLEAN := false;
BEGIN
  -- Get raid
  SELECT * INTO v_raid FROM raids WHERE id = p_raid_id;
  
  IF v_raid IS NULL THEN
    RAISE EXCEPTION 'Raid not found';
  END IF;
  
  IF v_raid.status != 'active' THEN
    RAISE EXCEPTION 'Raid is no longer active';
  END IF;
  
  -- Get participant
  SELECT * INTO v_participant 
  FROM raid_participants 
  WHERE raid_id = p_raid_id AND user_id = p_user_id;
  
  IF v_participant IS NULL THEN
    RAISE EXCEPTION 'User not in this raid';
  END IF;
  
  -- Check if already completed
  IF v_participant.status = 'completed' THEN
    RETURN json_build_object('status', 'already_completed');
  END IF;
  
  -- Update progress
  UPDATE raid_participants
  SET 
    current_progress = p_progress,
    status = CASE WHEN p_progress >= v_raid.target_value THEN 'completed' ELSE 'joined' END,
    completed_at = CASE WHEN p_progress >= v_raid.target_value THEN now() ELSE NULL END
  WHERE raid_id = p_raid_id AND user_id = p_user_id;
  
  v_was_completed := p_progress >= v_raid.target_value;
  
  -- Check if raid should be completed
  PERFORM check_raid_completion(p_raid_id);
  
  RETURN json_build_object(
    'status', 'updated',
    'completed', v_was_completed,
    'progress', p_progress,
    'target', v_raid.target_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CHECK RAID COMPLETION
-- =====================================================
CREATE OR REPLACE FUNCTION check_raid_completion(p_raid_id UUID)
RETURNS VOID AS $$
DECLARE
  v_raid raids%ROWTYPE;
  v_total_participants INT;
  v_completed_participants INT;
  v_completion_rate DECIMAL;
  v_participant RECORD;
BEGIN
  -- Get raid
  SELECT * INTO v_raid FROM raids WHERE id = p_raid_id;
  
  IF v_raid IS NULL OR v_raid.status != 'active' THEN
    RETURN;
  END IF;
  
  -- Check if raid expired
  IF v_raid.ends_at < now() THEN
    -- Calculate completion rate
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total_participants, v_completed_participants
    FROM raid_participants WHERE raid_id = p_raid_id;
    
    v_completion_rate := v_completed_participants::DECIMAL / GREATEST(v_total_participants, 1);
    
    -- Determine outcome
    IF v_completion_rate >= v_raid.success_threshold THEN
      -- RAID SUCCESSFUL - Reward all completed participants
      UPDATE raids 
      SET status = 'completed', completed_at = now() 
      WHERE id = p_raid_id;
      
      -- Award rewards to completed participants
      FOR v_participant IN 
        SELECT rp.user_id 
        FROM raid_participants rp 
        WHERE rp.raid_id = p_raid_id AND rp.status = 'completed'
      LOOP
        UPDATE profiles
        SET 
          total_xp = total_xp + v_raid.xp_reward,
          quest_coins = quest_coins + v_raid.coin_reward
        WHERE id = v_participant.user_id;
      END LOOP;
    ELSE
      -- RAID FAILED
      UPDATE raids SET status = 'failed' WHERE id = p_raid_id;
      
      UPDATE raid_participants 
      SET status = 'failed' 
      WHERE raid_id = p_raid_id AND status = 'joined';
    END IF;
    
    RETURN;
  END IF;
  
  -- Check if all participants completed early
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_participants, v_completed_participants
  FROM raid_participants WHERE raid_id = p_raid_id;
  
  IF v_total_participants > 0 AND v_completed_participants = v_total_participants THEN
    -- Everyone completed early! Bonus XP
    UPDATE raids 
    SET status = 'completed', completed_at = now() 
    WHERE id = p_raid_id;
    
    -- Award rewards with 20% bonus for early completion
    FOR v_participant IN 
      SELECT rp.user_id FROM raid_participants rp WHERE rp.raid_id = p_raid_id
    LOOP
      UPDATE profiles
      SET 
        total_xp = total_xp + (v_raid.xp_reward * 1.2)::INT,
        quest_coins = quest_coins + (v_raid.coin_reward * 1.2)::INT
      WHERE id = v_participant.user_id;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET USER RAIDS
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_raids(p_user_id UUID)
RETURNS TABLE (
  raid_id UUID,
  title TEXT,
  description TEXT,
  challenge_type TEXT,
  target_value INT,
  target_unit TEXT,
  xp_reward INT,
  coin_reward INT,
  status TEXT,
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  my_progress INT,
  my_status TEXT,
  total_participants INT,
  completed_participants INT,
  creator_username TEXT,
  creator_display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS raid_id,
    r.title,
    r.description,
    r.challenge_type,
    r.target_value,
    r.target_unit,
    r.xp_reward,
    r.coin_reward,
    r.status,
    r.started_at,
    r.ends_at,
    rp.current_progress AS my_progress,
    rp.status AS my_status,
    (SELECT COUNT(*)::INT FROM raid_participants WHERE raid_id = r.id) AS total_participants,
    (SELECT COUNT(*)::INT FROM raid_participants WHERE raid_id = r.id AND status = 'completed') AS completed_participants,
    p.username AS creator_username,
    COALESCE(p.display_name, p.username) AS creator_display_name
  FROM raids r
  JOIN raid_participants rp ON r.id = rp.raid_id
  JOIN profiles p ON r.creator_id = p.id
  WHERE rp.user_id = p_user_id
  ORDER BY 
    CASE r.status 
      WHEN 'active' THEN 1 
      WHEN 'completed' THEN 2 
      ELSE 3 
    END,
    r.ends_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET AVAILABLE RAIDS (from friends)
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_raids(p_user_id UUID)
RETURNS TABLE (
  raid_id UUID,
  title TEXT,
  description TEXT,
  challenge_type TEXT,
  target_value INT,
  target_unit TEXT,
  xp_reward INT,
  ends_at TIMESTAMPTZ,
  current_participants INT,
  creator_username TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS raid_id,
    r.title,
    r.description,
    r.challenge_type,
    r.target_value,
    r.target_unit,
    r.xp_reward,
    r.ends_at,
    (SELECT COUNT(*)::INT FROM raid_participants WHERE raid_id = r.id) AS current_participants,
    p.username AS creator_username
  FROM raids r
  JOIN profiles p ON r.creator_id = p.id
  WHERE r.status = 'active'
    AND r.ends_at > now()
    AND r.creator_id IN (
      SELECT friend_id FROM friends WHERE user_id = p_user_id
      UNION
      SELECT user_id FROM friends WHERE friend_id = p_user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM raid_participants rp 
      WHERE rp.raid_id = r.id AND rp.user_id = p_user_id
    )
  ORDER BY r.ends_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET RAID PARTICIPANTS
-- =====================================================
CREATE OR REPLACE FUNCTION get_raid_participants(p_raid_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT,
  current_progress INT,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.user_id,
    p.username,
    COALESCE(p.display_name, p.username) AS display_name,
    p.avatar_url,
    rp.status,
    rp.current_progress,
    rp.completed_at
  FROM raid_participants rp
  JOIN profiles p ON rp.user_id = p.id
  WHERE rp.raid_id = p_raid_id
  ORDER BY 
    CASE rp.status WHEN 'completed' THEN 1 ELSE 2 END,
    rp.current_progress DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CRON JOB TO CHECK EXPIRED RAIDS
-- =====================================================
-- This should be run periodically (e.g., every 5 minutes)
CREATE OR REPLACE FUNCTION process_expired_raids()
RETURNS INT AS $$
DECLARE
  v_processed INT := 0;
  v_raid RECORD;
BEGIN
  FOR v_raid IN 
    SELECT id FROM raids 
    WHERE status = 'active' AND ends_at < now()
  LOOP
    PERFORM check_raid_completion(v_raid.id);
    v_processed := v_processed + 1;
  END LOOP;
  
  RETURN v_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE raids ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_templates ENABLE ROW LEVEL SECURITY;

-- Raids policies
CREATE POLICY "Users can view raids they participate in" ON raids
  FOR SELECT USING (
    id IN (SELECT raid_id FROM raid_participants WHERE user_id = auth.uid())
    OR creator_id IN (
      SELECT friend_id FROM friends WHERE user_id = auth.uid()
      UNION SELECT user_id FROM friends WHERE friend_id = auth.uid()
    )
  );

CREATE POLICY "Users can create raids" ON raids
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Raid participants policies
CREATE POLICY "Users can view raid participants" ON raid_participants
  FOR SELECT USING (
    raid_id IN (SELECT raid_id FROM raid_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can join raids" ON raid_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON raid_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Raid templates are public
CREATE POLICY "Anyone can view raid templates" ON raid_templates
  FOR SELECT USING (true);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_raids_creator ON raids(creator_id);
CREATE INDEX IF NOT EXISTS idx_raids_status ON raids(status);
CREATE INDEX IF NOT EXISTS idx_raids_ends_at ON raids(ends_at);
CREATE INDEX IF NOT EXISTS idx_raid_participants_raid ON raid_participants(raid_id);
CREATE INDEX IF NOT EXISTS idx_raid_participants_user ON raid_participants(user_id);
