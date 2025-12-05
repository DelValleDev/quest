-- Migration: 022_weekly_review_health_tables.sql
-- Creates tables for Weekly Reviews and Health Data Logs

-- ============================================
-- Weekly Reviews Table
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  -- Stats JSON
  stats JSONB NOT NULL DEFAULT '{}',
  
  -- AI Generated Content
  summary TEXT,
  highlights TEXT[] DEFAULT '{}',
  areas_to_improve TEXT[] DEFAULT '{}',
  ai_insights TEXT,
  motivational_message TEXT,
  next_week_focus TEXT[] DEFAULT '{}',
  overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 100),
  
  -- Tracking
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint per user per week
  UNIQUE(user_id, week_start)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_id ON weekly_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week_start ON weekly_reviews(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_unseen ON weekly_reviews(user_id) WHERE seen_at IS NULL;

-- RLS
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly reviews"
  ON weekly_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly reviews"
  ON weekly_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly reviews"
  ON weekly_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- Health Data Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS health_data_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Health Metrics
  steps INTEGER DEFAULT 0,
  distance_meters NUMERIC(10,2) DEFAULT 0,
  active_calories INTEGER DEFAULT 0,
  exercise_minutes INTEGER DEFAULT 0,
  sleep_hours NUMERIC(4,2) DEFAULT 0,
  heart_rate_avg INTEGER,
  water_intake_ml INTEGER,
  
  -- Source tracking
  source VARCHAR(50) DEFAULT 'manual', -- 'healthkit', 'googlefit', 'manual'
  synced_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint per user per day
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_health_data_user_id ON health_data_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_health_data_date ON health_data_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_health_data_user_date ON health_data_logs(user_id, date);

-- RLS
ALTER TABLE health_data_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health data"
  ON health_data_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health data"
  ON health_data_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health data"
  ON health_data_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own health data"
  ON health_data_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Cron Job for Weekly Reviews (runs every Monday at 6 AM UTC)
-- ============================================
-- Note: This requires pg_cron extension to be enabled in Supabase
-- The cron job should be scheduled manually via Supabase Dashboard:
-- Go to Database > Extensions > Enable pg_cron
-- Then go to SQL Editor and run:
/*
SELECT cron.schedule(
  'generate-weekly-reviews',
  '0 6 * * 1',
  $CRON$
  INSERT INTO weekly_reviews (user_id, week_start, week_end, stats, summary, overall_score)
  SELECT 
    p.id as user_id,
    (CURRENT_DATE - INTERVAL '7 days')::DATE as week_start,
    (CURRENT_DATE - INTERVAL '1 day')::DATE as week_end,
    jsonb_build_object(
      'questsCompleted', COALESCE((
        SELECT COUNT(*) FROM quest_log ql 
        WHERE ql.user_id = p.id 
        AND ql.status = 'completed'
        AND ql.completed_at >= CURRENT_DATE - INTERVAL '7 days'
      ), 0),
      'xpEarned', COALESCE((
        SELECT SUM(xp_earned) FROM quest_log ql 
        WHERE ql.user_id = p.id 
        AND ql.status = 'completed'
        AND ql.completed_at >= CURRENT_DATE - INTERVAL '7 days'
      ), 0)
    ) as stats,
    'Tu resumen semanal está listo. Revisa tu progreso!' as summary,
    50 as overall_score
  FROM profiles p
  WHERE p.id NOT IN (
    SELECT user_id FROM weekly_reviews 
    WHERE week_start = (CURRENT_DATE - INTERVAL '7 days')::DATE
  )
  ON CONFLICT (user_id, week_start) DO NOTHING;
  $CRON$
);
*/

-- ============================================
-- Function to get weekly stats (helper)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_weekly_stats(
  p_user_id UUID,
  p_week_start DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_stats JSONB;
BEGIN
  -- Default to last week if not specified
  IF p_week_start IS NULL THEN
    v_week_start := date_trunc('week', CURRENT_DATE - INTERVAL '7 days')::DATE;
  ELSE
    v_week_start := p_week_start;
  END IF;
  
  v_week_end := v_week_start + INTERVAL '6 days';
  
  SELECT jsonb_build_object(
    'weekStart', v_week_start,
    'weekEnd', v_week_end,
    'questsCompleted', COALESCE((
      SELECT COUNT(*) FROM quest_log 
      WHERE user_id = p_user_id 
      AND status = 'completed'
      AND completed_at::DATE BETWEEN v_week_start AND v_week_end
    ), 0),
    'questsTotal', COALESCE((
      SELECT COUNT(*) FROM quest_log 
      WHERE user_id = p_user_id 
      AND created_at::DATE BETWEEN v_week_start AND v_week_end
    ), 0),
    'xpEarned', COALESCE((
      SELECT SUM(xp_earned) FROM quest_log 
      WHERE user_id = p_user_id 
      AND status = 'completed'
      AND completed_at::DATE BETWEEN v_week_start AND v_week_end
    ), 0),
    'habitDays', COALESCE((
      SELECT COUNT(DISTINCT completed_at::DATE) FROM habit_logs 
      WHERE user_id = p_user_id 
      AND completed_at::DATE BETWEEN v_week_start AND v_week_end
    ), 0),
    'healthData', COALESCE((
      SELECT jsonb_build_object(
        'totalSteps', SUM(steps),
        'avgSteps', ROUND(AVG(steps)),
        'totalExerciseMinutes', SUM(exercise_minutes),
        'avgSleepHours', ROUND(AVG(sleep_hours)::NUMERIC, 1)
      )
      FROM health_data_logs
      WHERE user_id = p_user_id
      AND date BETWEEN v_week_start AND v_week_end
    ), '{}'::JSONB)
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_weekly_stats(UUID, DATE) TO authenticated;

COMMENT ON TABLE weekly_reviews IS 'Stores AI-generated weekly progress reviews for users';
COMMENT ON TABLE health_data_logs IS 'Stores daily health data synced from HealthKit/Google Fit';
COMMENT ON FUNCTION get_user_weekly_stats IS 'Returns aggregated weekly stats for a user';
