-- =====================================================
-- Migration 025: RLS Security Policies
-- Description: Additional security policies for all tables
-- =====================================================

-- Ensure service role bypass for Edge Functions
DO $$
BEGIN
  -- Profiles - allow service role full access for auth triggers
  DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
  
  -- User quests - ensure proper user isolation
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_quests') THEN
    ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage own quests" ON public.user_quests;
    CREATE POLICY "Users can manage own quests" ON public.user_quests
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  -- User assessments - ensure proper user isolation
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_assessments') THEN
    ALTER TABLE public.user_assessments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage own assessments" ON public.user_assessments;
    CREATE POLICY "Users can manage own assessments" ON public.user_assessments
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  -- Add default RLS on any table that might be missing it
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assessment_questions') THEN
    ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can read questions" ON public.assessment_questions;
    CREATE POLICY "Anyone can read questions" ON public.assessment_questions
      FOR SELECT USING (true);
  END IF;
END $$;
