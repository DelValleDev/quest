-- Migration 023: Generate Daily Agenda Function
-- Creates a function to generate the daily agenda based on user's habits, events, and quests

-- Drop existing function if exists
DROP FUNCTION IF EXISTS generate_daily_agenda(UUID, DATE);

-- Function to generate the daily agenda based on date and user preferences
CREATE OR REPLACE FUNCTION generate_daily_agenda(p_user_id UUID, p_date DATE)
RETURNS TABLE (
  id UUID,
  start_time TIME,
  end_time TIME,
  item_type TEXT,
  title TEXT,
  description TEXT,
  icon TEXT,
  color TEXT,
  pillar_id TEXT,
  status TEXT,
  duration_minutes INTEGER,
  priority INTEGER,
  reference_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER; -- 0 = Sunday, 1 = Monday, ...
  v_day_name TEXT;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Map integer to day name (lowercase for comparison)
  v_day_name := CASE v_day_of_week
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  RETURN QUERY
  -- 1. HABITS
  SELECT 
    h.id,
    h.preferred_time,
    (h.preferred_time + (COALESCE(ph.duration_minutes, 15) || ' minutes')::INTERVAL)::TIME as end_time,
    'habit'::TEXT as item_type,
    h.title,
    h.description,
    h.icon,
    COALESCE(p.color, '#6B7280') as color,
    h.pillar_id,
    CASE 
      WHEN hl.id IS NOT NULL THEN 'completed'::TEXT
      ELSE 'pending'::TEXT 
    END as status,
    COALESCE(ph.duration_minutes, 15) as duration_minutes,
    COALESCE(ph.priority, 1) as priority,
    h.id as reference_id
  FROM public.habits h
  LEFT JOIN public.pillars p ON h.pillar_id = p.id
  LEFT JOIN public.path_habits ph ON ph.habit_id = h.id
  LEFT JOIN public.habit_logs hl ON hl.habit_id = h.id AND hl.log_date = p_date
  WHERE h.user_id = p_user_id
  AND h.is_active = true
  AND (
    h.frequency = 'daily' 
    OR (h.frequency = 'specific_days' AND v_day_name = ANY(h.frequency_days))
    OR (h.frequency = 'weekly')
  )
  
  UNION ALL

  -- 2. EVENTS (Calendar)
  SELECT 
    e.id,
    e.start_time::TIME,
    e.end_time::TIME,
    'event'::TEXT as item_type,
    e.title,
    e.description,
    e.icon,
    e.color,
    NULL as pillar_id,
    'pending'::TEXT as status,
    EXTRACT(EPOCH FROM (e.end_time - e.start_time))::INTEGER / 60 as duration_minutes,
    5 as priority,
    e.id as reference_id
  FROM public.calendar_events e
  WHERE e.user_id = p_user_id
  AND e.start_time::DATE = p_date

  UNION ALL

  -- 3. DAILY QUESTS
  SELECT 
    udq.id,
    NULL::TIME as start_time,
    NULL::TIME as end_time,
    'quest'::TEXT as item_type,
    c.title,
    c.description,
    c.icon,
    COALESCE(pl.color, '#F59E0B') as color,
    c.pillar_id,
    CASE WHEN udq.completed THEN 'completed'::TEXT ELSE 'pending'::TEXT END as status,
    COALESCE(c.duration_minutes, 15) as duration_minutes,
    3 as priority,
    c.id as reference_id
  FROM public.user_daily_quests udq
  JOIN public.challenges c ON udq.daily_quest_id = c.id
  LEFT JOIN public.pillars pl ON c.pillar_id = pl.id
  WHERE udq.user_id = p_user_id
  AND udq.assigned_date = p_date;

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_daily_agenda(UUID, DATE) TO authenticated;
