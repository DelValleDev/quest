-- =====================================================
-- Migration 027: Add time_of_day to user_habits
-- Description: Allow users to specify when to do habits
-- =====================================================

-- Check if user_habits table exists, if not it might be named habits
DO $$ 
BEGIN
  -- Try adding to user_habits first
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_habits') THEN
    ALTER TABLE public.user_habits 
    ADD COLUMN IF NOT EXISTS time_of_day TEXT DEFAULT 'anytime';
    
    ALTER TABLE public.user_habits 
    ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 15;
    
    -- Add constraint if column was just created
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_habits_time_of_day_check') THEN
      ALTER TABLE public.user_habits 
      ADD CONSTRAINT user_habits_time_of_day_check 
      CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime'));
    END IF;
  END IF;
  
  -- Also try habits table if it exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'habits') THEN
    ALTER TABLE public.habits 
    ADD COLUMN IF NOT EXISTS time_of_day TEXT DEFAULT 'anytime';
    
    ALTER TABLE public.habits 
    ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 15;
    
    -- Add constraint if column was just created
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_time_of_day_check') THEN
      ALTER TABLE public.habits 
      ADD CONSTRAINT habits_time_of_day_check 
      CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime'));
    END IF;
  END IF;
END $$;

-- Add comments for both possible table names
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_habits') THEN
    COMMENT ON COLUMN public.user_habits.time_of_day IS 'Preferred time to complete the habit: morning, afternoon, evening, anytime';
    COMMENT ON COLUMN public.user_habits.xp_reward IS 'XP earned when completing this habit';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'habits') THEN
    COMMENT ON COLUMN public.habits.time_of_day IS 'Preferred time to complete the habit: morning, afternoon, evening, anytime';
    COMMENT ON COLUMN public.habits.xp_reward IS 'XP earned when completing this habit';
  END IF;
END $$;
