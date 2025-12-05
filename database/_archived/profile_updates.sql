-- =====================================================
-- QUEST APP - PROFILE UPDATES FOR INITIAL SETUP
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add new columns for initial setup and AI analysis
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS initial_setup_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS age_range TEXT,
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS survey_length_preference TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS personality_summary TEXT,
ADD COLUMN IF NOT EXISTS strengths TEXT[],
ADD COLUMN IF NOT EXISTS areas_to_improve TEXT[],
ADD COLUMN IF NOT EXISTS recommended_class TEXT,
ADD COLUMN IF NOT EXISTS personalized_goals TEXT[],
ADD COLUMN IF NOT EXISTS coach_welcome_message TEXT,
ADD COLUMN IF NOT EXISTS pillar_scores JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS spirituality_type TEXT DEFAULT 'general';

-- Spirituality types: 'christian', 'meditation', 'general', 'nature', 'philosophical'
COMMENT ON COLUMN public.profiles.spirituality_type IS 'User spirituality preference: christian, meditation, general, nature, philosophical';
