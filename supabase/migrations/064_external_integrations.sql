-- Migration: External Integrations (Strava, Spotify, GitHub, etc.)
-- Tables: user_integrations, user_activity_imports
-- Purpose: OAuth connections, activity sync, auto-complete habits

-- =============================================
-- user_integrations: OAuth connections
-- =============================================
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- 'strava', 'spotify', 'github', 'apple_health', 'google_fit', etc.
  access_token TEXT, -- Encrypted OAuth token
  refresh_token TEXT, -- Encrypted refresh token
  expires_at TIMESTAMPTZ, -- Token expiration
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb, -- Integration-specific data (username, scopes, etc.)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint: one active integration per user per type
  UNIQUE(user_id, integration_type)
);

-- Index for lookups
CREATE INDEX idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX idx_user_integrations_type ON user_integrations(integration_type);
CREATE INDEX idx_user_integrations_active ON user_integrations(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own integrations"
  ON user_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations"
  ON user_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON user_integrations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON user_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- user_activity_imports: Synced activities
-- =============================================
CREATE TABLE IF NOT EXISTS user_activity_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'strava', 'spotify', 'github', 'apple_health', etc.
  external_id TEXT NOT NULL, -- External activity ID (to prevent duplicates)
  activity_type TEXT NOT NULL, -- 'run', 'ride', 'swim', 'music_listening', 'coding', etc.
  distance_meters INT, -- For workouts
  duration_seconds INT, -- Activity duration
  calories INT, -- Calories burned
  date TIMESTAMPTZ NOT NULL, -- When activity occurred
  metadata JSONB DEFAULT '{}'::jsonb, -- Activity-specific data
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate imports
  UNIQUE(user_id, source, external_id)
);

-- Indexes for queries
CREATE INDEX idx_activity_imports_user_id ON user_activity_imports(user_id);
CREATE INDEX idx_activity_imports_source ON user_activity_imports(source);
CREATE INDEX idx_activity_imports_date ON user_activity_imports(date DESC);
CREATE INDEX idx_activity_imports_external_id ON user_activity_imports(external_id);

-- RLS Policies
ALTER TABLE user_activity_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity imports"
  ON user_activity_imports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity imports"
  ON user_activity_imports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity imports"
  ON user_activity_imports
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- Function: Get integration status summary
-- =============================================
CREATE OR REPLACE FUNCTION get_integration_status(p_user_id UUID)
RETURNS TABLE (
  integration_type TEXT,
  is_connected BOOLEAN,
  last_synced TIMESTAMPTZ,
  total_activities INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.integration_type,
    ui.is_active as is_connected,
    ui.last_synced_at as last_synced,
    COUNT(uai.id)::INT as total_activities
  FROM user_integrations ui
  LEFT JOIN user_activity_imports uai 
    ON uai.user_id = ui.user_id 
    AND uai.source = ui.integration_type
  WHERE ui.user_id = p_user_id
  GROUP BY ui.integration_type, ui.is_active, ui.last_synced_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Auto-complete habit from activity
-- =============================================
CREATE OR REPLACE FUNCTION auto_complete_habit_from_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_completion_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_habit_id UUID;
BEGIN
  -- Find matching habit by activity type
  SELECT id INTO v_habit_id
  FROM user_habits
  WHERE user_id = p_user_id
    AND is_active = true
    AND (
      name ILIKE '%' || p_activity_type || '%'
      OR (p_activity_type = 'run' AND name ILIKE '%running%')
      OR (p_activity_type = 'ride' AND name ILIKE '%cycling%')
      OR (p_activity_type = 'swim' AND name ILIKE '%swimming%')
      OR (p_activity_type = 'music_listening' AND (name ILIKE '%music%' OR name ILIKE '%meditation%'))
      OR (p_activity_type = 'coding' AND (name ILIKE '%code%' OR name ILIKE '%program%'))
    )
  LIMIT 1;

  -- If habit found, mark as completed
  IF v_habit_id IS NOT NULL THEN
    INSERT INTO user_habit_completions (user_id, habit_id, completion_date, notes)
    VALUES (p_user_id, v_habit_id, p_completion_date, p_notes)
    ON CONFLICT (user_id, habit_id, completion_date) DO NOTHING;
    
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Trigger: Update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at();

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE user_integrations IS 'OAuth connections to external apps (Strava, Spotify, GitHub, etc.)';
COMMENT ON TABLE user_activity_imports IS 'Synced activities from external integrations';
COMMENT ON FUNCTION get_integration_status IS 'Get summary of user integrations and activity counts';
COMMENT ON FUNCTION auto_complete_habit_from_activity IS 'Auto-complete matching habit when activity is imported';
