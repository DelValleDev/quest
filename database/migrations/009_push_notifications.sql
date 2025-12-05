-- =====================================================
-- MIGRATION 009: Add Push Notification Support
-- Date: December 4, 2025
-- Description: Add push token column to profiles
-- =====================================================

-- Add push_token column if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add push_enabled column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;

-- Add notification preferences as JSONB
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "daily_reminder": true,
  "daily_reminder_time": "09:00",
  "streak_warning": true,
  "streak_warning_time": "20:00",
  "habit_reminders": true,
  "social_notifications": true,
  "achievement_notifications": true,
  "marketing_notifications": false
}'::jsonb;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 009 completed: Push notification support added';
END $$;
