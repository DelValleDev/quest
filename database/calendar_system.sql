-- =====================================================
-- CALENDAR INTEGRATION SYSTEM
-- Quest App - Calendar sync for personalized scheduling
-- =====================================================

-- User Calendar Integrations (OAuth tokens)
CREATE TABLE IF NOT EXISTS user_calendar_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'apple', 'notion')),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    connected BOOLEAN DEFAULT false,
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- User Calendar Events (synced from external calendars)
CREATE TABLE IF NOT EXISTS user_calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    external_id VARCHAR(255), -- ID from external calendar
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location VARCHAR(500),
    is_all_day BOOLEAN DEFAULT false,
    source VARCHAR(20) NOT NULL CHECK (source IN ('google', 'apple', 'notion')),
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quest Schedule (quests scheduled to calendar)
CREATE TABLE IF NOT EXISTS quest_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    quest_id UUID, -- Can reference daily_quests or custom quests
    quest_type VARCHAR(20) NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'custom', 'challenge')),
    quest_title VARCHAR(255) NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    reminder_minutes INTEGER DEFAULT 10,
    calendar_event_id VARCHAR(255), -- ID in external calendar
    calendar_provider VARCHAR(20),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'rescheduled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Availability Preferences
CREATE TABLE IF NOT EXISTS user_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
    available_start TIME NOT NULL DEFAULT '09:00',
    available_end TIME NOT NULL DEFAULT '21:00',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, day_of_week)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user ON user_calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON user_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON user_calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_quest_schedule_user ON quest_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_schedule_time ON quest_schedule(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_user_availability_user ON user_availability(user_id);

-- RLS Policies
ALTER TABLE user_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users manage own calendar integrations" ON user_calendar_integrations;
DROP POLICY IF EXISTS "Users manage own calendar events" ON user_calendar_events;
DROP POLICY IF EXISTS "Users manage own quest schedule" ON quest_schedule;
DROP POLICY IF EXISTS "Users manage own availability" ON user_availability;

-- Users can only see and manage their own calendar data
CREATE POLICY "Users manage own calendar integrations"
    ON user_calendar_integrations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own calendar events"
    ON user_calendar_events FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own quest schedule"
    ON quest_schedule FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own availability"
    ON user_availability FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Initialize default availability for new user (Mon-Sun 9AM-9PM)
CREATE OR REPLACE FUNCTION initialize_user_availability(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_availability (user_id, day_of_week, available_start, available_end)
    VALUES 
        (p_user_id, 0, '10:00', '20:00'), -- Sunday
        (p_user_id, 1, '06:00', '22:00'), -- Monday
        (p_user_id, 2, '06:00', '22:00'), -- Tuesday
        (p_user_id, 3, '06:00', '22:00'), -- Wednesday
        (p_user_id, 4, '06:00', '22:00'), -- Thursday
        (p_user_id, 5, '06:00', '22:00'), -- Friday
        (p_user_id, 6, '10:00', '20:00')  -- Saturday
    ON CONFLICT (user_id, day_of_week) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Find free time slots for a specific day
CREATE OR REPLACE FUNCTION find_free_time_slots(
    p_user_id UUID,
    p_date DATE,
    p_min_duration_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ,
    duration_minutes INTEGER
) AS $$
DECLARE
    v_day_of_week INTEGER;
    v_avail_start TIME;
    v_avail_end TIME;
    v_current_time TIMESTAMPTZ;
    v_day_start TIMESTAMPTZ;
    v_day_end TIMESTAMPTZ;
BEGIN
    -- Get day of week (0 = Sunday)
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Get user availability for this day
    SELECT available_start, available_end 
    INTO v_avail_start, v_avail_end
    FROM user_availability
    WHERE user_id = p_user_id 
    AND day_of_week = v_day_of_week
    AND is_active = true;
    
    -- If no availability set, use defaults
    IF v_avail_start IS NULL THEN
        v_avail_start := '09:00';
        v_avail_end := '21:00';
    END IF;
    
    -- Calculate day boundaries
    v_day_start := p_date + v_avail_start;
    v_day_end := p_date + v_avail_end;
    v_current_time := v_day_start;
    
    -- Find gaps between events
    RETURN QUERY
    WITH events AS (
        -- Get calendar events
        SELECT start_time, end_time FROM user_calendar_events
        WHERE user_id = p_user_id
        AND start_time::DATE = p_date
        UNION ALL
        -- Get scheduled quests
        SELECT scheduled_start, scheduled_end FROM quest_schedule
        WHERE user_id = p_user_id
        AND scheduled_start::DATE = p_date
        AND status IN ('scheduled', 'in_progress')
        ORDER BY start_time
    ),
    gaps AS (
        SELECT 
            COALESCE(LAG(end_time) OVER (ORDER BY start_time), v_day_start) as gap_start,
            start_time as gap_end
        FROM events
        UNION ALL
        SELECT 
            COALESCE(MAX(end_time), v_day_start),
            v_day_end
        FROM events
    )
    SELECT 
        gap_start,
        gap_end,
        EXTRACT(EPOCH FROM (gap_end - gap_start))::INTEGER / 60
    FROM gaps
    WHERE gap_end > gap_start
    AND EXTRACT(EPOCH FROM (gap_end - gap_start))::INTEGER / 60 >= p_min_duration_minutes
    ORDER BY gap_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Suggest optimal time for a quest
CREATE OR REPLACE FUNCTION suggest_quest_time(
    p_user_id UUID,
    p_duration_minutes INTEGER,
    p_preferred_date DATE DEFAULT CURRENT_DATE
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_suggested_time TIMESTAMPTZ;
BEGIN
    -- Find first available slot that fits
    SELECT slot_start INTO v_suggested_time
    FROM find_free_time_slots(p_user_id, p_preferred_date, p_duration_minutes)
    WHERE duration_minutes >= p_duration_minutes
    LIMIT 1;
    
    -- If no slot today, try tomorrow
    IF v_suggested_time IS NULL THEN
        SELECT slot_start INTO v_suggested_time
        FROM find_free_time_slots(p_user_id, p_preferred_date + 1, p_duration_minutes)
        WHERE duration_minutes >= p_duration_minutes
        LIMIT 1;
    END IF;
    
    RETURN v_suggested_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule a quest
CREATE OR REPLACE FUNCTION schedule_quest(
    p_user_id UUID,
    p_quest_id UUID,
    p_quest_type VARCHAR(20),
    p_quest_title VARCHAR(255),
    p_start_time TIMESTAMPTZ,
    p_duration_minutes INTEGER,
    p_calendar_event_id VARCHAR(255) DEFAULT NULL,
    p_calendar_provider VARCHAR(20) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_schedule_id UUID;
BEGIN
    INSERT INTO quest_schedule (
        user_id, quest_id, quest_type, quest_title,
        scheduled_start, scheduled_end,
        calendar_event_id, calendar_provider
    )
    VALUES (
        p_user_id, p_quest_id, p_quest_type, p_quest_title,
        p_start_time, p_start_time + (p_duration_minutes || ' minutes')::INTERVAL,
        p_calendar_event_id, p_calendar_provider
    )
    RETURNING id INTO v_schedule_id;
    
    RETURN v_schedule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get today's scheduled quests
CREATE OR REPLACE FUNCTION get_today_schedule(p_user_id UUID)
RETURNS TABLE (
    schedule_id UUID,
    quest_id UUID,
    quest_type VARCHAR(20),
    quest_title VARCHAR(255),
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qs.id,
        qs.quest_id,
        qs.quest_type,
        qs.quest_title,
        qs.scheduled_start,
        qs.scheduled_end,
        qs.status
    FROM quest_schedule qs
    WHERE qs.user_id = p_user_id
    AND qs.scheduled_start::DATE = CURRENT_DATE
    ORDER BY qs.scheduled_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update quest schedule status
CREATE OR REPLACE FUNCTION update_schedule_status(
    p_schedule_id UUID,
    p_status VARCHAR(20)
)
RETURNS VOID AS $$
BEGIN
    UPDATE quest_schedule
    SET status = p_status, updated_at = NOW()
    WHERE id = p_schedule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get calendar overview (events + quests for a date range)
CREATE OR REPLACE FUNCTION get_calendar_overview(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    event_id UUID,
    title VARCHAR(255),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    event_type VARCHAR(20), -- 'calendar' or 'quest'
    source VARCHAR(20),
    status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    -- Calendar events
    SELECT 
        uce.id,
        uce.title,
        uce.start_time,
        uce.end_time,
        'calendar'::VARCHAR(20),
        uce.source,
        NULL::VARCHAR(20)
    FROM user_calendar_events uce
    WHERE uce.user_id = p_user_id
    AND uce.start_time::DATE BETWEEN p_start_date AND p_end_date
    
    UNION ALL
    
    -- Scheduled quests
    SELECT 
        qs.id,
        qs.quest_title,
        qs.scheduled_start,
        qs.scheduled_end,
        'quest'::VARCHAR(20),
        qs.calendar_provider,
        qs.status
    FROM quest_schedule qs
    WHERE qs.user_id = p_user_id
    AND qs.scheduled_start::DATE BETWEEN p_start_date AND p_end_date
    
    ORDER BY start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_calendar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_integrations_timestamp
    BEFORE UPDATE ON user_calendar_integrations
    FOR EACH ROW EXECUTE FUNCTION update_calendar_timestamp();

CREATE TRIGGER update_quest_schedule_timestamp
    BEFORE UPDATE ON quest_schedule
    FOR EACH ROW EXECUTE FUNCTION update_calendar_timestamp();
