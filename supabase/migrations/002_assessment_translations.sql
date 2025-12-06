-- =====================================================
-- Migration 002: Assessment Translations
-- Description: Add English translation columns (if needed)
-- =====================================================

-- Add English columns if they don't exist (table created in 000_master_schema)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assessment_questions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assessment_questions' AND column_name = 'question_text_en') THEN
      ALTER TABLE public.assessment_questions ADD COLUMN question_text_en TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assessment_questions' AND column_name = 'options_en') THEN
      ALTER TABLE public.assessment_questions ADD COLUMN options_en JSONB;
    END IF;
  END IF;
END $$;
