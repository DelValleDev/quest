-- =====================================================
-- Migration 008: Premium Columns in Profiles
-- Description: Add premium subscription tracking columns
-- =====================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS premium_type TEXT DEFAULT 'free' 
  CHECK (premium_type IN ('free', 'trial', 'monthly', 'yearly', 'lifetime')),
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT false;
