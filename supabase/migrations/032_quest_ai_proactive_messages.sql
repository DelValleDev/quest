-- Migration 031: Quest AI Proactive Messages System
-- Tracks when AI messages are sent to avoid being annoying

-- Table to track AI message history and cooldowns
CREATE TABLE IF NOT EXISTS ai_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- 'quest_complete', 'habit_complete', 'level_up', 'streak', etc.
  message_content TEXT NOT NULL,
  context_data JSONB, -- Additional context about the trigger (quest_id, habit_id, etc.)
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_message_log_user_id ON ai_message_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_message_log_shown_at ON ai_message_log(shown_at);

-- Table to track user AI preferences
CREATE TABLE IF NOT EXISTS ai_message_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  proactive_messages_enabled BOOLEAN NOT NULL DEFAULT true,
  smart_recommendations_enabled BOOLEAN NOT NULL DEFAULT false, -- Premium only
  max_messages_per_day INT NOT NULL DEFAULT 5,
  message_types_enabled JSONB NOT NULL DEFAULT '["quest_complete", "habit_complete", "level_up", "streak", "achievement", "badge", "duel_win", "stake_win"]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies for ai_message_log
ALTER TABLE ai_message_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_message_log' 
    AND policyname = 'Users can view their own AI messages'
  ) THEN
    CREATE POLICY "Users can view their own AI messages"
      ON ai_message_log FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_message_log' 
    AND policyname = 'Users can insert their own AI messages'
  ) THEN
    CREATE POLICY "Users can insert their own AI messages"
      ON ai_message_log FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- RLS policies for ai_message_preferences
ALTER TABLE ai_message_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_message_preferences' 
    AND policyname = 'Users can view their own AI preferences'
  ) THEN
    CREATE POLICY "Users can view their own AI preferences"
      ON ai_message_preferences FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_message_preferences' 
    AND policyname = 'Users can update their own AI preferences'
  ) THEN
    CREATE POLICY "Users can update their own AI preferences"
      ON ai_message_preferences FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_message_preferences' 
    AND policyname = 'Users can insert their own AI preferences'
  ) THEN
    CREATE POLICY "Users can insert their own AI preferences"
      ON ai_message_preferences FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Function to check if we should show a proactive message
CREATE OR REPLACE FUNCTION should_show_ai_message(
  p_user_id UUID,
  p_message_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_preferences RECORD;
  v_messages_today INT;
  v_last_message_time TIMESTAMPTZ;
  v_cooldown_minutes INT := 30; -- Minimum 30 minutes between messages
BEGIN
  -- Get user preferences (create default if doesn't exist)
  SELECT * INTO v_preferences
  FROM ai_message_preferences
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO ai_message_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_preferences;
  END IF;
  
  -- Check if proactive messages are enabled
  IF NOT v_preferences.proactive_messages_enabled THEN
    RETURN false;
  END IF;
  
  -- Check if this message type is enabled
  IF NOT (v_preferences.message_types_enabled ? p_message_type) THEN
    RETURN false;
  END IF;
  
  -- Check daily limit
  SELECT COUNT(*) INTO v_messages_today
  FROM ai_message_log
  WHERE user_id = p_user_id
    AND shown_at >= CURRENT_DATE;
  
  IF v_messages_today >= v_preferences.max_messages_per_day THEN
    RETURN false;
  END IF;
  
  -- Check cooldown (no message in last 30 minutes)
  SELECT MAX(shown_at) INTO v_last_message_time
  FROM ai_message_log
  WHERE user_id = p_user_id;
  
  IF v_last_message_time IS NOT NULL 
     AND v_last_message_time > NOW() - INTERVAL '30 minutes' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to log an AI message
CREATE OR REPLACE FUNCTION log_ai_message(
  p_user_id UUID,
  p_message_type TEXT,
  p_message_content TEXT,
  p_context_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO ai_message_log (user_id, message_type, message_content, context_data)
  VALUES (p_user_id, p_message_type, p_message_content, p_context_data)
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;

-- Seed default preferences for existing users
INSERT INTO ai_message_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
