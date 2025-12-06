-- Migration 033: User Context Learnings
-- Stores information Quest AI learns about users through conversations

-- Table to store learned information about users
CREATE TABLE IF NOT EXISTS user_context_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'motivation', 'obstacle', 'dream', 'fear', 'habit', 'pattern', 'preference', etc.
  key TEXT NOT NULL, -- Specific key like 'morning_routine_struggle', 'exercise_motivation'
  value TEXT NOT NULL, -- The learned information
  confidence FLOAT DEFAULT 1.0, -- How confident we are (0-1)
  learned_from TEXT, -- 'chat', 'assessment', 'behavior', etc.
  context JSONB, -- Additional context about where/when this was learned
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category, key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_context_user_id ON user_context_learnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_context_category ON user_context_learnings(user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_context_updated ON user_context_learnings(updated_at DESC);

-- RLS policies
ALTER TABLE user_context_learnings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_context_learnings' 
    AND policyname = 'Users can view their own learnings'
  ) THEN
    CREATE POLICY "Users can view their own learnings"
      ON user_context_learnings FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_context_learnings' 
    AND policyname = 'System can manage learnings'
  ) THEN
    CREATE POLICY "System can manage learnings"
      ON user_context_learnings FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Function to save or update a learning
CREATE OR REPLACE FUNCTION save_user_learning(
  p_user_id UUID,
  p_category TEXT,
  p_key TEXT,
  p_value TEXT,
  p_confidence FLOAT DEFAULT 1.0,
  p_learned_from TEXT DEFAULT 'chat',
  p_context JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learning_id UUID;
BEGIN
  INSERT INTO user_context_learnings (
    user_id, category, key, value, confidence, learned_from, context
  )
  VALUES (
    p_user_id, p_category, p_key, p_value, p_confidence, p_learned_from, p_context
  )
  ON CONFLICT (user_id, category, key) 
  DO UPDATE SET
    value = EXCLUDED.value,
    confidence = EXCLUDED.confidence,
    learned_from = EXCLUDED.learned_from,
    context = EXCLUDED.context,
    updated_at = NOW()
  RETURNING id INTO v_learning_id;
  
  RETURN v_learning_id;
END;
$$;

-- Function to get all learnings for a user (for AI context)
CREATE OR REPLACE FUNCTION get_user_learnings(
  p_user_id UUID,
  p_categories TEXT[] DEFAULT NULL
)
RETURNS TABLE(
  category TEXT,
  key TEXT,
  value TEXT,
  confidence FLOAT,
  learned_from TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ucl.category,
    ucl.key,
    ucl.value,
    ucl.confidence,
    ucl.learned_from,
    ucl.updated_at
  FROM user_context_learnings ucl
  WHERE ucl.user_id = p_user_id
    AND (p_categories IS NULL OR ucl.category = ANY(p_categories))
  ORDER BY ucl.updated_at DESC;
END;
$$;

-- Function to get learnings as JSON for AI prompt
CREATE OR REPLACE FUNCTION get_user_context_for_ai(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context JSONB;
BEGIN
  SELECT jsonb_object_agg(
    category,
    jsonb_object_agg(key, value)
  ) INTO v_context
  FROM (
    SELECT 
      category,
      key,
      value
    FROM user_context_learnings
    WHERE user_id = p_user_id
      AND confidence >= 0.5 -- Only high confidence learnings
    ORDER BY updated_at DESC
  ) learnings
  GROUP BY category;
  
  RETURN COALESCE(v_context, '{}'::jsonb);
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_learning_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_learning_timestamp_trigger ON user_context_learnings;
CREATE TRIGGER update_user_learning_timestamp_trigger
  BEFORE UPDATE ON user_context_learnings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_learning_timestamp();
