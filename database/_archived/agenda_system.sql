-- =====================================================
-- QUEST APP - AGENDA & SCHEDULE SYSTEM
-- For AI Coach to manage user's agenda
-- =====================================================

-- =====================================================
-- 1. AGENDA EVENTS (Calendar events)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.agenda_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Event info
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  
  -- Type
  event_type TEXT DEFAULT 'personal', -- work, personal, habit, quest, appointment, day_off
  is_all_day BOOLEAN DEFAULT FALSE,
  
  -- Recurrence (optional)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- daily, weekly, monthly
  recurrence_end_date DATE,
  
  -- Status
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  completed_at TIMESTAMPTZ,
  
  -- AI
  ai_generated BOOLEAN DEFAULT FALSE,
  notes TEXT,
  
  -- Links
  linked_quest_id UUID,
  linked_habit_id UUID,
  linked_milestone_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. USER SCHEDULES (Work/routine schedules)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Schedule type
  schedule_type TEXT NOT NULL, -- work, school, gym, etc
  
  -- Days active
  days TEXT[] NOT NULL, -- ['monday', 'tuesday', ...]
  
  -- Time
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Info
  location TEXT,
  notes TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, schedule_type)
);

-- =====================================================
-- 3. AI CONVERSATION HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  
  -- Context
  tools_used TEXT[], -- Which AI tools were called
  tool_results JSONB, -- Results of tool calls
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own agenda events" ON public.agenda_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own schedules" ON public.user_schedules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own AI conversations" ON public.ai_conversations
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 5. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_agenda_events_user_date ON agenda_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_agenda_events_type ON agenda_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_schedules_user ON user_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, created_at DESC);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Get user's schedule for a specific day
CREATE OR REPLACE FUNCTION get_user_day_schedule(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_name TEXT;
  v_events JSONB;
  v_work_schedule JSONB;
BEGIN
  -- Get day name
  v_day_name := LOWER(to_char(p_date, 'day'));
  v_day_name := TRIM(v_day_name);
  
  -- Get events for this day
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'time', event_time,
      'duration', duration_minutes,
      'type', event_type,
      'is_all_day', is_all_day
    ) ORDER BY event_time
  ) INTO v_events
  FROM agenda_events
  WHERE user_id = p_user_id 
    AND event_date = p_date
    AND status = 'scheduled';
  
  -- Get work schedule if applicable
  SELECT jsonb_build_object(
    'type', schedule_type,
    'start', start_time,
    'end', end_time,
    'location', location
  ) INTO v_work_schedule
  FROM user_schedules
  WHERE user_id = p_user_id
    AND is_active = TRUE
    AND v_day_name = ANY(days);
  
  RETURN jsonb_build_object(
    'date', p_date,
    'day', v_day_name,
    'events', COALESCE(v_events, '[]'::jsonb),
    'work_schedule', v_work_schedule
  );
END;
$$;

-- Get free time slots for a day
CREATE OR REPLACE FUNCTION get_free_time_slots(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule JSONB;
  v_day_name TEXT;
  v_work_start TIME;
  v_work_end TIME;
  v_busy_slots JSONB;
BEGIN
  v_day_name := LOWER(TRIM(to_char(p_date, 'day')));
  
  -- Get work schedule
  SELECT start_time, end_time INTO v_work_start, v_work_end
  FROM user_schedules
  WHERE user_id = p_user_id
    AND is_active = TRUE
    AND v_day_name = ANY(days)
    AND schedule_type = 'work';
  
  -- Get busy slots from events
  SELECT jsonb_agg(
    jsonb_build_object(
      'start', event_time,
      'end', event_time + (duration_minutes || ' minutes')::INTERVAL
    )
  ) INTO v_busy_slots
  FROM agenda_events
  WHERE user_id = p_user_id
    AND event_date = p_date
    AND status = 'scheduled'
    AND is_all_day = FALSE;
  
  RETURN jsonb_build_object(
    'date', p_date,
    'work_hours', CASE 
      WHEN v_work_start IS NOT NULL THEN 
        jsonb_build_object('start', v_work_start, 'end', v_work_end)
      ELSE NULL
    END,
    'busy_slots', COALESCE(v_busy_slots, '[]'::jsonb),
    'is_day_off', EXISTS (
      SELECT 1 FROM agenda_events
      WHERE user_id = p_user_id
        AND event_date = p_date
        AND event_type = 'day_off'
    )
  );
END;
$$;

-- =====================================================
-- DONE! 📅
-- =====================================================
