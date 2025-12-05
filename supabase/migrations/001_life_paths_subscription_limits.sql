-- =====================================================
-- MIGRATION 001: Life Paths Subscription Limits
-- Date: December 4, 2025
-- Description: Add Life Paths and Agenda limits to subscription tiers
-- =====================================================

-- =====================================================
-- 1. UPDATE SUBSCRIPTION TIERS FEATURES
-- =====================================================

-- Update FREE tier with Life Paths limits
UPDATE public.subscription_tiers
SET features = features || '{
  "max_life_paths": 1,
  "max_milestones_per_path": 5,
  "ai_life_path_generation": false,
  "life_path_templates": ["basic"],
  "max_agenda_events": 20
}'::jsonb
WHERE id = 'free';

-- Update PREMIUM tier with Life Paths limits (unlimited)
UPDATE public.subscription_tiers
SET features = features || '{
  "max_life_paths": -1,
  "max_milestones_per_path": -1,
  "ai_life_path_generation": true,
  "life_path_templates": ["all"],
  "max_agenda_events": -1
}'::jsonb
WHERE id = 'premium';

-- Update DEVELOPER tier with Life Paths limits (unlimited)
UPDATE public.subscription_tiers
SET features = features || '{
  "max_life_paths": -1,
  "max_milestones_per_path": -1,
  "ai_life_path_generation": true,
  "life_path_templates": ["all"],
  "max_agenda_events": -1
}'::jsonb
WHERE id = 'developer';

-- =====================================================
-- 2. FIX AMBIGUOUS STATUS COLUMN IN LIFE PATHS VIEW
-- (Only run this if life_paths tables exist)
-- =====================================================

-- Drop the view if it exists (safe to run)
DROP VIEW IF EXISTS public.user_life_dashboard;

-- The view will be created when life_paths_system.sql is run
-- This migration only updates subscription features

-- =====================================================
-- 3. VERIFY MIGRATION
-- =====================================================

DO $$
DECLARE
  free_limits jsonb;
  premium_limits jsonb;
BEGIN
  SELECT features->'max_life_paths' INTO free_limits FROM public.subscription_tiers WHERE id = 'free';
  SELECT features->'max_life_paths' INTO premium_limits FROM public.subscription_tiers WHERE id = 'premium';
  
  IF free_limits IS NULL THEN
    RAISE EXCEPTION 'Migration failed: Free tier missing max_life_paths';
  END IF;
  
  IF premium_limits IS NULL THEN
    RAISE EXCEPTION 'Migration failed: Premium tier missing max_life_paths';
  END IF;
  
  RAISE NOTICE 'Migration 001 completed successfully!';
  RAISE NOTICE 'Free tier max_life_paths: %', free_limits;
  RAISE NOTICE 'Premium tier max_life_paths: %', premium_limits;
END $$;
