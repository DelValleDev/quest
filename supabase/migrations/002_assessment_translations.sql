-- =====================================================
-- Migration 002: Assessment Questions - English Columns
-- Description: Add English translation columns to assessment_questions
-- =====================================================

ALTER TABLE public.assessment_questions 
ADD COLUMN IF NOT EXISTS question_text_en TEXT;

ALTER TABLE public.assessment_questions 
ADD COLUMN IF NOT EXISTS options_en JSONB;
