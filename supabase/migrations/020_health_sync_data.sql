-- =====================================================
-- Migration 020: Health Sync Data Table
-- Description: Store synced data from HealthKit/Google Fit
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_sync_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INTEGER DEFAULT 0,
  distance_meters DECIMAL(10,2) DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  active_minutes INTEGER DEFAULT 0,
  sleep_hours DECIMAL(4,2),
  heart_rate_avg INTEGER,
  workouts JSONB DEFAULT '[]',
  source TEXT CHECK (source IN ('healthkit', 'google_fit', 'manual')),
  raw_data JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sync_date, source)
);

CREATE INDEX IF NOT EXISTS idx_health_sync_user_date ON health_sync_data(user_id, sync_date DESC);

ALTER TABLE public.health_sync_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own health data" ON public.health_sync_data;
CREATE POLICY "Users can manage own health data" ON public.health_sync_data
  FOR ALL USING (auth.uid() = user_id);
