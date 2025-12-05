-- =====================================================
-- QUEST APP - LIFE PATHS SYSTEM
-- Goals → Milestones → Weekly Plans → Daily Habits
-- AI helps break down big dreams into actionable steps
-- =====================================================

-- =====================================================
-- 1. LIFE PATHS (Long-term goals/visions - 1 year+)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.life_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Path info
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT REFERENCES public.pillars(id),
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#8B5CF6',
  
  -- Vision
  vision_statement TEXT, -- "In 1 year, I want to be..."
  why_important TEXT, -- Motivation behind this goal
  
  -- Timeline
  target_date DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'active', -- active, paused, completed, abandoned
  progress_percentage INTEGER DEFAULT 0,
  
  -- AI generated
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_analysis JSONB, -- AI insights about this path
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. MILESTONES (Monthly/Quarterly checkpoints)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  life_path_id UUID REFERENCES public.life_paths(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Milestone info
  title TEXT NOT NULL,
  description TEXT,
  success_criteria TEXT, -- How to know it's complete
  
  -- Timeline
  target_date DATE,
  sort_order INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, skipped
  completed_at TIMESTAMPTZ,
  
  -- AI
  ai_suggested BOOLEAN DEFAULT FALSE,
  ai_tips JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. WEEKLY PLANS (What to focus on this week)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.path_milestones(id) ON DELETE SET NULL,
  
  -- Week info
  week_start DATE NOT NULL, -- Monday of the week
  week_number INTEGER, -- Week of year
  year INTEGER,
  
  -- Focus
  main_focus TEXT, -- "This week I will focus on..."
  secondary_goals TEXT[],
  
  -- AI plan
  ai_generated_plan JSONB, -- Full weekly plan from AI
  
  -- Review
  weekly_reflection TEXT, -- End of week notes
  satisfaction_score INTEGER, -- 1-10 how well it went
  
  -- Status
  status TEXT DEFAULT 'active', -- planning, active, completed
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(user_id, week_start)
);

-- =====================================================
-- 4. WEEKLY OBJECTIVES (Specific goals for the week)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.weekly_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_plan_id UUID REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Objective
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT REFERENCES public.pillars(id),
  
  -- Target
  target_type TEXT DEFAULT 'completion', -- completion, count, time
  target_value INTEGER, -- e.g., 5 workouts, 10 hours study
  current_value INTEGER DEFAULT 0,
  unit TEXT, -- "workouts", "hours", "pages"
  
  -- Status
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  
  -- Link to habits
  linked_habit_ids UUID[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. LIFE PATH HABITS (Recurring habits for a path)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  life_path_id UUID REFERENCES public.life_paths(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Habit info (references user_habits if exists)
  habit_id UUID, -- Reference to user_habits table
  
  -- Or standalone
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT,
  
  -- Frequency
  frequency TEXT DEFAULT 'daily', -- daily, weekly, specific_days
  frequency_days INTEGER[], -- [1,3,5] for Mon/Wed/Fri
  target_per_period INTEGER DEFAULT 1, -- How many times
  
  -- Time
  preferred_time TEXT, -- morning, afternoon, evening, specific
  duration_minutes INTEGER,
  
  -- Importance
  is_keystone BOOLEAN DEFAULT FALSE, -- Critical habit for the path
  priority INTEGER DEFAULT 5, -- 1-10
  
  -- Status
  status TEXT DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. AI LIFE PATH GENERATION
-- =====================================================
CREATE OR REPLACE FUNCTION generate_life_path_from_aspirations(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_aspirations JSONB;
  v_profile RECORD;
  v_paths_created INTEGER := 0;
BEGIN
  -- Get user aspirational answers
  SELECT jsonb_agg(
    jsonb_build_object(
      'pillar', q.pillar,
      'question', q.question_text,
      'answer_text', a.answer_text,
      'answer_choice', a.answer_choice,
      'answer_choices', a.answer_choices
    )
  ) INTO v_aspirations
  FROM user_aspirational_answers a
  JOIN aspirational_questions q ON q.id = a.question_id
  WHERE a.user_id = p_user_id;
  
  -- Get user profile
  SELECT display_name, age_range, pillar_scores INTO v_profile
  FROM profiles WHERE id = p_user_id;
  
  -- Return data for AI to process
  -- The actual AI call happens in the app
  RETURN jsonb_build_object(
    'user_name', v_profile.display_name,
    'age_range', v_profile.age_range,
    'pillar_scores', v_profile.pillar_scores,
    'aspirations', v_aspirations,
    'message', 'Ready for AI life path generation'
  );
END;
$$;

-- =====================================================
-- 7. WEEKLY PLAN GENERATION HELPER
-- =====================================================
CREATE OR REPLACE FUNCTION get_weekly_plan_context(
  p_user_id UUID,
  p_week_start DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_week_start DATE;
  v_active_paths JSONB;
  v_current_milestones JSONB;
  v_habits JSONB;
  v_last_week_review JSONB;
BEGIN
  -- Default to current week's Monday
  v_week_start := COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::DATE);
  
  -- Get active life paths
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'pillar', pillar_id,
      'progress', progress_percentage,
      'target_date', target_date
    )
  ) INTO v_active_paths
  FROM life_paths
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Get current milestones (due within next 30 days)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'title', m.title,
      'path_title', p.title,
      'target_date', m.target_date,
      'status', m.status
    )
  ) INTO v_current_milestones
  FROM path_milestones m
  JOIN life_paths p ON p.id = m.life_path_id
  WHERE m.user_id = p_user_id 
    AND m.status IN ('pending', 'in_progress')
    AND m.target_date <= CURRENT_DATE + INTERVAL '30 days';
  
  -- Get habits
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'frequency', frequency,
      'pillar', pillar_id,
      'is_keystone', is_keystone
    )
  ) INTO v_habits
  FROM path_habits
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Get last week's review
  SELECT jsonb_build_object(
    'reflection', weekly_reflection,
    'satisfaction', satisfaction_score,
    'objectives_completed', (
      SELECT COUNT(*) FROM weekly_objectives 
      WHERE weekly_plan_id = wp.id AND status = 'completed'
    )
  ) INTO v_last_week_review
  FROM weekly_plans wp
  WHERE user_id = p_user_id 
    AND week_start = v_week_start - INTERVAL '7 days';
  
  RETURN jsonb_build_object(
    'week_start', v_week_start,
    'active_paths', COALESCE(v_active_paths, '[]'::jsonb),
    'current_milestones', COALESCE(v_current_milestones, '[]'::jsonb),
    'habits', COALESCE(v_habits, '[]'::jsonb),
    'last_week', v_last_week_review
  );
END;
$$;

-- =====================================================
-- 8. CREATE DEFAULT LIFE PATHS FROM PILLARS
-- =====================================================
CREATE OR REPLACE FUNCTION create_initial_life_paths(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pillar_scores JSONB;
  v_pillar TEXT;
  v_score FLOAT;
  v_count INTEGER := 0;
  v_weakest_pillars TEXT[];
BEGIN
  -- Get pillar scores
  SELECT pillar_scores INTO v_pillar_scores
  FROM profiles WHERE id = p_user_id;
  
  IF v_pillar_scores IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Find 3 weakest pillars (areas to improve)
  SELECT ARRAY(
    SELECT key FROM jsonb_each_text(v_pillar_scores)
    ORDER BY value::FLOAT ASC
    LIMIT 3
  ) INTO v_weakest_pillars;
  
  -- Create life paths for weak areas
  FOREACH v_pillar IN ARRAY v_weakest_pillars
  LOOP
    INSERT INTO life_paths (
      user_id, 
      title, 
      pillar_id, 
      vision_statement,
      target_date,
      ai_generated
    )
    VALUES (
      p_user_id,
      CASE v_pillar
        WHEN 'physical' THEN 'Mi Mejor Versión Física'
        WHEN 'mental' THEN 'Mente Clara y Enfocada'
        WHEN 'social' THEN 'Conexiones Significativas'
        WHEN 'professional' THEN 'Éxito Profesional'
        WHEN 'spiritual' THEN 'Paz Interior'
        WHEN 'creative' THEN 'Expresión Creativa'
        ELSE 'Crecimiento Personal'
      END,
      v_pillar,
      'Quiero mejorar significativamente en esta área de mi vida',
      CURRENT_DATE + INTERVAL '1 year',
      TRUE
    )
    ON CONFLICT DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================
ALTER TABLE public.life_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_habits ENABLE ROW LEVEL SECURITY;

-- Life paths
CREATE POLICY "Users can manage own life paths" ON public.life_paths
  FOR ALL USING (auth.uid() = user_id);

-- Milestones
CREATE POLICY "Users can manage own milestones" ON public.path_milestones
  FOR ALL USING (auth.uid() = user_id);

-- Weekly plans
CREATE POLICY "Users can manage own weekly plans" ON public.weekly_plans
  FOR ALL USING (auth.uid() = user_id);

-- Weekly objectives
CREATE POLICY "Users can manage own objectives" ON public.weekly_objectives
  FOR ALL USING (auth.uid() = user_id);

-- Path habits
CREATE POLICY "Users can manage own path habits" ON public.path_habits
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 10. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_life_paths_user ON life_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_life_paths_status ON life_paths(status);
CREATE INDEX IF NOT EXISTS idx_milestones_path ON path_milestones(life_path_id);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON path_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week ON weekly_plans(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_path_habits_user ON path_habits(user_id);

-- =====================================================
-- 11. VIEW: USER'S LIFE DASHBOARD
-- =====================================================
CREATE OR REPLACE VIEW public.user_life_dashboard AS
SELECT 
  p.id AS user_id,
  p.display_name,
  -- Active paths count
  (SELECT COUNT(*) FROM life_paths lp WHERE lp.user_id = p.id AND lp.status = 'active') AS active_paths,
  -- This week's progress
  (SELECT 
    ROUND(
      COUNT(*) FILTER (WHERE wo.status = 'completed')::FLOAT / 
      NULLIF(COUNT(*), 0) * 100
    )
   FROM weekly_objectives wo
   JOIN weekly_plans wp ON wp.id = wo.weekly_plan_id
   WHERE wp.user_id = p.id 
     AND wp.week_start = date_trunc('week', CURRENT_DATE)::DATE
  ) AS weekly_progress,
  -- Active habits count
  (SELECT COUNT(*) FROM path_habits ph WHERE ph.user_id = p.id AND ph.status = 'active') AS active_habits,
  -- Upcoming milestones
  (SELECT COUNT(*) FROM path_milestones pm
   WHERE pm.user_id = p.id 
     AND pm.status = 'pending'
     AND pm.target_date <= CURRENT_DATE + INTERVAL '7 days'
  ) AS upcoming_milestones
FROM profiles p;

-- =====================================================
-- DONE! 🎯
-- =====================================================
