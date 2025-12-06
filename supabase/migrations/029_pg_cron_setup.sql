-- =====================================================
-- Migration 029: Configure pg_cron for Daily Penalties
-- Description: Set up automated daily penalty execution
-- =====================================================

-- Enable pg_cron extension (requires superuser or RDS/Supabase admin)
-- Note: On Supabase, this might already be enabled or require dashboard action
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily penalties to run every day at 00:30 UTC
-- This ensures penalties are applied for the previous day
SELECT cron.schedule(
  'apply-daily-penalties',           -- Job name
  '30 0 * * *',                      -- Cron expression: 00:30 every day
  'SELECT apply_daily_penalties();'  -- SQL command to execute
);

-- Alternative: If you prefer a different time, use one of these:
-- '0 1 * * *'    = 01:00 every day
-- '30 2 * * *'   = 02:30 every day
-- '0 0 * * *'    = Midnight every day

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';

-- Verify the job was created (for debugging)
-- Run this query to see all cron jobs:
-- SELECT * FROM cron.job;

-- To see execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To remove the job (if needed):
-- SELECT cron.unschedule('apply-daily-penalties');
