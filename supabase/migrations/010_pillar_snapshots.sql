-- =====================================================
-- MIGRATION 010: Pillar Level Snapshots System
-- Date: December 4, 2025
-- Description: Track historical pillar levels over time
-- =====================================================

-- Create pillar_level_snapshots table
CREATE TABLE IF NOT EXISTS public.pillar_level_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Individual pillar levels at snapshot time
  physical_level INTEGER DEFAULT 1,
  physical_xp INTEGER DEFAULT 0,
  mental_level INTEGER DEFAULT 1,
  mental_xp INTEGER DEFAULT 0,
  social_level INTEGER DEFAULT 1,
  social_xp INTEGER DEFAULT 0,
  professional_level INTEGER DEFAULT 1,
  professional_xp INTEGER DEFAULT 0,
  spiritual_level INTEGER DEFAULT 1,
  spiritual_xp INTEGER DEFAULT 0,
  creative_level INTEGER DEFAULT 1,
  creative_xp INTEGER DEFAULT 0,
  
  -- Aggregate stats at snapshot time
  total_level INTEGER GENERATED ALWAYS AS (
    physical_level + mental_level + social_level + 
    professional_level + spiritual_level + creative_level
  ) STORED,
  average_level DECIMAL(5,2) GENERATED ALWAYS AS (
    (physical_level + mental_level + social_level + 
     professional_level + spiritual_level + creative_level)::DECIMAL / 6
  ) STORED,
  
  -- User stats at snapshot time
  user_level INTEGER DEFAULT 1,
  user_total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  
  -- Metadata
  snapshot_type TEXT DEFAULT 'daily' CHECK (snapshot_type IN ('daily', 'weekly', 'monthly', 'milestone')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One snapshot per user per date per type
  UNIQUE(user_id, snapshot_date, snapshot_type)
);

-- Enable RLS
ALTER TABLE public.pillar_level_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own snapshots"
  ON public.pillar_level_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON public.pillar_level_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
  ON public.pillar_level_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_pillar_snapshots_user_date 
  ON public.pillar_level_snapshots(user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_pillar_snapshots_user_type 
  ON public.pillar_level_snapshots(user_id, snapshot_type);

-- Function to create a daily snapshot for a user
CREATE OR REPLACE FUNCTION public.create_pillar_snapshot(
  p_user_id UUID,
  p_snapshot_type TEXT DEFAULT 'daily',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id UUID;
  v_physical RECORD;
  v_mental RECORD;
  v_social RECORD;
  v_professional RECORD;
  v_spiritual RECORD;
  v_creative RECORD;
  v_profile RECORD;
BEGIN
  -- Get user profile
  SELECT level, total_xp, current_streak
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Get each pillar's current state (with defaults if not exists)
  SELECT COALESCE(level, 1) as level, COALESCE(current_xp, 0) as xp
  INTO v_physical
  FROM public.user_pillars
  WHERE user_id = p_user_id AND pillar_id = 'physical';
  
  SELECT COALESCE(level, 1) as level, COALESCE(current_xp, 0) as xp
  INTO v_mental
  FROM public.user_pillars
  WHERE user_id = p_user_id AND pillar_id = 'mental';
  
  SELECT COALESCE(level, 1) as level, COALESCE(current_xp, 0) as xp
  INTO v_social
  FROM public.user_pillars
  WHERE user_id = p_user_id AND pillar_id = 'social';
  
  SELECT COALESCE(level, 1) as level, COALESCE(current_xp, 0) as xp
  INTO v_professional
  FROM public.user_pillars
  WHERE user_id = p_user_id AND pillar_id = 'professional';
  
  SELECT COALESCE(level, 1) as level, COALESCE(current_xp, 0) as xp
  INTO v_spiritual
  FROM public.user_pillars
  WHERE user_id = p_user_id AND pillar_id = 'spiritual';
  
  SELECT COALESCE(level, 1) as level, COALESCE(current_xp, 0) as xp
  INTO v_creative
  FROM public.user_pillars
  WHERE user_id = p_user_id AND pillar_id = 'creative';
  
  -- Insert snapshot (use ON CONFLICT to update if already exists today)
  INSERT INTO public.pillar_level_snapshots (
    user_id,
    snapshot_date,
    physical_level, physical_xp,
    mental_level, mental_xp,
    social_level, social_xp,
    professional_level, professional_xp,
    spiritual_level, spiritual_xp,
    creative_level, creative_xp,
    user_level, user_total_xp, current_streak,
    snapshot_type, notes
  ) VALUES (
    p_user_id,
    CURRENT_DATE,
    COALESCE(v_physical.level, 1), COALESCE(v_physical.xp, 0),
    COALESCE(v_mental.level, 1), COALESCE(v_mental.xp, 0),
    COALESCE(v_social.level, 1), COALESCE(v_social.xp, 0),
    COALESCE(v_professional.level, 1), COALESCE(v_professional.xp, 0),
    COALESCE(v_spiritual.level, 1), COALESCE(v_spiritual.xp, 0),
    COALESCE(v_creative.level, 1), COALESCE(v_creative.xp, 0),
    COALESCE(v_profile.level, 1), COALESCE(v_profile.total_xp, 0), COALESCE(v_profile.current_streak, 0),
    p_snapshot_type, p_notes
  )
  ON CONFLICT (user_id, snapshot_date, snapshot_type) 
  DO UPDATE SET
    physical_level = EXCLUDED.physical_level,
    physical_xp = EXCLUDED.physical_xp,
    mental_level = EXCLUDED.mental_level,
    mental_xp = EXCLUDED.mental_xp,
    social_level = EXCLUDED.social_level,
    social_xp = EXCLUDED.social_xp,
    professional_level = EXCLUDED.professional_level,
    professional_xp = EXCLUDED.professional_xp,
    spiritual_level = EXCLUDED.spiritual_level,
    spiritual_xp = EXCLUDED.spiritual_xp,
    creative_level = EXCLUDED.creative_level,
    creative_xp = EXCLUDED.creative_xp,
    user_level = EXCLUDED.user_level,
    user_total_xp = EXCLUDED.user_total_xp,
    current_streak = EXCLUDED.current_streak,
    notes = EXCLUDED.notes,
    created_at = NOW()
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;

-- Function to get pillar progress over time (for charts)
CREATE OR REPLACE FUNCTION public.get_pillar_history(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30,
  p_pillar_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  snapshot_date DATE,
  physical_level INTEGER,
  mental_level INTEGER,
  social_level INTEGER,
  professional_level INTEGER,
  spiritual_level INTEGER,
  creative_level INTEGER,
  total_level INTEGER,
  average_level DECIMAL(5,2),
  user_level INTEGER,
  current_streak INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.snapshot_date,
    s.physical_level,
    s.mental_level,
    s.social_level,
    s.professional_level,
    s.spiritual_level,
    s.creative_level,
    s.total_level,
    s.average_level,
    s.user_level,
    s.current_streak
  FROM public.pillar_level_snapshots s
  WHERE s.user_id = p_user_id
    AND s.snapshot_type = 'daily'
    AND s.snapshot_date >= CURRENT_DATE - p_days
  ORDER BY s.snapshot_date ASC;
END;
$$;

-- Function to get growth comparison (this week vs last week)
CREATE OR REPLACE FUNCTION public.get_pillar_growth(p_user_id UUID)
RETURNS TABLE (
  pillar_id TEXT,
  current_level INTEGER,
  previous_level INTEGER,
  level_change INTEGER,
  growth_percentage DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current RECORD;
  v_previous RECORD;
BEGIN
  -- Get most recent snapshot
  SELECT * INTO v_current
  FROM public.pillar_level_snapshots
  WHERE user_id = p_user_id AND snapshot_type = 'daily'
  ORDER BY snapshot_date DESC
  LIMIT 1;
  
  -- Get snapshot from 7 days ago (or closest)
  SELECT * INTO v_previous
  FROM public.pillar_level_snapshots
  WHERE user_id = p_user_id 
    AND snapshot_type = 'daily'
    AND snapshot_date <= CURRENT_DATE - 7
  ORDER BY snapshot_date DESC
  LIMIT 1;
  
  -- If no previous snapshot, use current as baseline
  IF v_previous IS NULL THEN
    v_previous := v_current;
  END IF;
  
  -- Return growth for each pillar
  RETURN QUERY
  SELECT 'physical'::TEXT, 
         COALESCE(v_current.physical_level, 1),
         COALESCE(v_previous.physical_level, 1),
         COALESCE(v_current.physical_level, 1) - COALESCE(v_previous.physical_level, 1),
         CASE WHEN COALESCE(v_previous.physical_level, 1) > 0 
              THEN ((COALESCE(v_current.physical_level, 1) - COALESCE(v_previous.physical_level, 1))::DECIMAL / COALESCE(v_previous.physical_level, 1)) * 100
              ELSE 0 END
  UNION ALL
  SELECT 'mental'::TEXT,
         COALESCE(v_current.mental_level, 1),
         COALESCE(v_previous.mental_level, 1),
         COALESCE(v_current.mental_level, 1) - COALESCE(v_previous.mental_level, 1),
         CASE WHEN COALESCE(v_previous.mental_level, 1) > 0 
              THEN ((COALESCE(v_current.mental_level, 1) - COALESCE(v_previous.mental_level, 1))::DECIMAL / COALESCE(v_previous.mental_level, 1)) * 100
              ELSE 0 END
  UNION ALL
  SELECT 'social'::TEXT,
         COALESCE(v_current.social_level, 1),
         COALESCE(v_previous.social_level, 1),
         COALESCE(v_current.social_level, 1) - COALESCE(v_previous.social_level, 1),
         CASE WHEN COALESCE(v_previous.social_level, 1) > 0 
              THEN ((COALESCE(v_current.social_level, 1) - COALESCE(v_previous.social_level, 1))::DECIMAL / COALESCE(v_previous.social_level, 1)) * 100
              ELSE 0 END
  UNION ALL
  SELECT 'professional'::TEXT,
         COALESCE(v_current.professional_level, 1),
         COALESCE(v_previous.professional_level, 1),
         COALESCE(v_current.professional_level, 1) - COALESCE(v_previous.professional_level, 1),
         CASE WHEN COALESCE(v_previous.professional_level, 1) > 0 
              THEN ((COALESCE(v_current.professional_level, 1) - COALESCE(v_previous.professional_level, 1))::DECIMAL / COALESCE(v_previous.professional_level, 1)) * 100
              ELSE 0 END
  UNION ALL
  SELECT 'spiritual'::TEXT,
         COALESCE(v_current.spiritual_level, 1),
         COALESCE(v_previous.spiritual_level, 1),
         COALESCE(v_current.spiritual_level, 1) - COALESCE(v_previous.spiritual_level, 1),
         CASE WHEN COALESCE(v_previous.spiritual_level, 1) > 0 
              THEN ((COALESCE(v_current.spiritual_level, 1) - COALESCE(v_previous.spiritual_level, 1))::DECIMAL / COALESCE(v_previous.spiritual_level, 1)) * 100
              ELSE 0 END
  UNION ALL
  SELECT 'creative'::TEXT,
         COALESCE(v_current.creative_level, 1),
         COALESCE(v_previous.creative_level, 1),
         COALESCE(v_current.creative_level, 1) - COALESCE(v_previous.creative_level, 1),
         CASE WHEN COALESCE(v_previous.creative_level, 1) > 0 
              THEN ((COALESCE(v_current.creative_level, 1) - COALESCE(v_previous.creative_level, 1))::DECIMAL / COALESCE(v_previous.creative_level, 1)) * 100
              ELSE 0 END;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 010 completed: Pillar level snapshots system created';
END $$;
