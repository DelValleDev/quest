-- =====================================================
-- QUEST APP - HABITS & PILLAR FOCUS SYSTEM
-- This replaces the quest-centric approach with habits
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD NEW PILLAR: SELF-CARE (Cuidado Personal)
-- =====================================================
INSERT INTO public.pillars (id, name, description, icon, color)
VALUES (
  'self_care',
  'Self-Care',
  'Personal care, hygiene, routines, and self-maintenance habits',
  '🧴',
  '#14B8A6'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

-- =====================================================
-- 2. USER PILLAR FOCUS - Which pillars user wants to focus on
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_pillar_focus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pillar_id TEXT REFERENCES public.pillars(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1, -- 1 = highest priority
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, pillar_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_pillar_focus_user 
ON public.user_pillar_focus(user_id);

-- =====================================================
-- 3. HABITS TABLE - User's daily habits
-- =====================================================
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT REFERENCES public.pillars(id),
  icon TEXT DEFAULT '✅',
  
  -- Frequency settings
  frequency TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, specific_days, multiple_times
  frequency_days TEXT[], -- For specific_days: ['monday', 'wednesday', 'friday']
  times_per_day INTEGER DEFAULT 1, -- For multiple_times frequency
  
  -- Time settings (optional)
  preferred_time TIME, -- e.g., '08:00:00' for morning habit
  time_of_day TEXT, -- 'morning', 'afternoon', 'evening', 'anytime'
  
  -- Tracking
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  
  -- Rewards
  xp_reward INTEGER DEFAULT 10,
  coin_reward INTEGER DEFAULT 2,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_ai_suggested BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_habits_user ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_pillar ON public.habits(pillar_id);

-- =====================================================
-- 4. HABIT LOGS - Track habit completions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  log_date DATE DEFAULT CURRENT_DATE,
  
  -- For habits with times_per_day > 1
  completion_number INTEGER DEFAULT 1, -- 1st, 2nd, 3rd completion of the day
  
  -- Optional notes
  notes TEXT,
  mood TEXT, -- 'great', 'good', 'okay', 'bad'
  
  UNIQUE(habit_id, log_date, completion_number)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON public.habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON public.habit_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, log_date);

-- =====================================================
-- 5. PRESET HABITS - Suggested habits by pillar
-- =====================================================
CREATE TABLE IF NOT EXISTS public.preset_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pillar_id TEXT REFERENCES public.pillars(id),
  
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_en TEXT,
  description_es TEXT,
  
  icon TEXT DEFAULT '✅',
  frequency TEXT DEFAULT 'daily',
  time_of_day TEXT DEFAULT 'anytime',
  xp_reward INTEGER DEFAULT 10,
  
  -- Categorization
  category TEXT, -- 'beginner', 'intermediate', 'advanced'
  is_popular BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert preset habits for each pillar
INSERT INTO public.preset_habits (pillar_id, title_en, title_es, description_en, description_es, icon, time_of_day, category, is_popular) VALUES
-- Self-Care / Cuidado Personal
('self_care', 'Wash face', 'Lavar la cara', 'Morning and evening face washing routine', 'Rutina de lavado facial mañana y noche', '🧼', 'morning', 'beginner', true),
('self_care', 'Brush teeth', 'Cepillar dientes', 'Brush teeth twice a day', 'Cepillar dientes dos veces al día', '🦷', 'morning', 'beginner', true),
('self_care', 'Shower', 'Ducharse', 'Take a refreshing shower', 'Tomar una ducha refrescante', '🚿', 'morning', 'beginner', true),
('self_care', 'Skincare routine', 'Rutina de skincare', 'Apply moisturizer and sunscreen', 'Aplicar hidratante y protector solar', '🧴', 'morning', 'intermediate', true),
('self_care', 'Make bed', 'Hacer la cama', 'Start the day by making your bed', 'Empezar el día haciendo la cama', '🛏️', 'morning', 'beginner', true),
('self_care', 'Tidy room', 'Ordenar habitación', 'Quick 5-minute room tidy', 'Orden rápido de 5 minutos', '🧹', 'evening', 'beginner', false),
('self_care', 'Take vitamins', 'Tomar vitaminas', 'Daily vitamins and supplements', 'Vitaminas y suplementos diarios', '💊', 'morning', 'beginner', false),

-- Physical
('physical', 'Exercise', 'Hacer ejercicio', 'Workout or physical activity', 'Entrenamiento o actividad física', '💪', 'morning', 'beginner', true),
('physical', 'Drink water', 'Tomar agua', 'Drink 8 glasses of water', 'Tomar 8 vasos de agua', '💧', 'anytime', 'beginner', true),
('physical', 'Stretch', 'Estirar', 'Morning stretching routine', 'Rutina de estiramiento matutino', '🧘', 'morning', 'beginner', true),
('physical', 'Walk 10k steps', 'Caminar 10k pasos', 'Reach 10,000 steps', 'Alcanzar 10,000 pasos', '🚶', 'anytime', 'intermediate', true),
('physical', 'No sugar', 'Sin azúcar', 'Avoid added sugars today', 'Evitar azúcares añadidos hoy', '🍎', 'anytime', 'intermediate', false),
('physical', 'Sleep 8 hours', 'Dormir 8 horas', 'Get quality sleep', 'Descansar con sueño de calidad', '😴', 'evening', 'beginner', true),

-- Mental
('mental', 'Read', 'Leer', 'Read for 20 minutes', 'Leer por 20 minutos', '📚', 'anytime', 'beginner', true),
('mental', 'Meditate', 'Meditar', '10 minutes of meditation', '10 minutos de meditación', '🧘‍♂️', 'morning', 'beginner', true),
('mental', 'Journal', 'Escribir diario', 'Write in your journal', 'Escribir en tu diario', '📝', 'evening', 'beginner', true),
('mental', 'Learn something new', 'Aprender algo nuevo', 'Watch educational content', 'Ver contenido educativo', '🎓', 'anytime', 'intermediate', false),
('mental', 'No phone first hour', 'Sin teléfono 1ra hora', 'No phone for first hour after waking', 'Sin teléfono la primera hora al despertar', '📵', 'morning', 'intermediate', false),
('mental', 'Gratitude', 'Gratitud', 'Write 3 things you are grateful for', 'Escribir 3 cosas por las que estás agradecido', '🙏', 'morning', 'beginner', true),

-- Social
('social', 'Connect with friend', 'Conectar con amigo', 'Call or message a friend', 'Llamar o escribir a un amigo', '👋', 'anytime', 'beginner', true),
('social', 'Family time', 'Tiempo en familia', 'Quality time with family', 'Tiempo de calidad con familia', '👨‍👩‍👧', 'evening', 'beginner', true),
('social', 'Random act of kindness', 'Acto de bondad', 'Do something kind for someone', 'Hacer algo amable por alguien', '💝', 'anytime', 'intermediate', false),
('social', 'Listen actively', 'Escuchar activamente', 'Practice active listening today', 'Practicar escucha activa hoy', '👂', 'anytime', 'intermediate', false),

-- Professional
('professional', 'Work on goals', 'Trabajar en metas', 'Spend time on career goals', 'Dedicar tiempo a metas profesionales', '🎯', 'anytime', 'beginner', true),
('professional', 'Learn skill', 'Aprender habilidad', 'Practice or learn a new skill', 'Practicar o aprender una habilidad nueva', '💡', 'anytime', 'intermediate', true),
('professional', 'Network', 'Networking', 'Connect with a professional contact', 'Conectar con un contacto profesional', '🤝', 'anytime', 'intermediate', false),
('professional', 'Review finances', 'Revisar finanzas', 'Check budget and expenses', 'Revisar presupuesto y gastos', '💰', 'anytime', 'beginner', false),

-- Spiritual
('spiritual', 'Pray', 'Orar', 'Spend time in prayer', 'Dedicar tiempo a la oración', '🙏', 'morning', 'beginner', true),
('spiritual', 'Read scripture', 'Leer escrituras', 'Read religious/spiritual texts', 'Leer textos religiosos/espirituales', '📖', 'morning', 'beginner', true),
('spiritual', 'Reflect', 'Reflexionar', 'Quiet reflection time', 'Tiempo de reflexión tranquila', '🌅', 'evening', 'beginner', true),
('spiritual', 'Acts of service', 'Actos de servicio', 'Help others selflessly', 'Ayudar a otros desinteresadamente', '🤲', 'anytime', 'intermediate', false),
('spiritual', 'Nature connection', 'Conexión con naturaleza', 'Spend time in nature', 'Pasar tiempo en la naturaleza', '🌿', 'anytime', 'beginner', true),

-- Creative
('creative', 'Create something', 'Crear algo', 'Draw, write, build, or make something', 'Dibujar, escribir, construir o hacer algo', '🎨', 'anytime', 'beginner', true),
('creative', 'Play music', 'Tocar música', 'Practice an instrument or sing', 'Practicar un instrumento o cantar', '🎵', 'anytime', 'intermediate', true),
('creative', 'Take photos', 'Tomar fotos', 'Capture creative photographs', 'Capturar fotografías creativas', '📸', 'anytime', 'beginner', false),
('creative', 'Cook new recipe', 'Cocinar receta nueva', 'Try a new recipe', 'Probar una receta nueva', '👨‍🍳', 'anytime', 'intermediate', false),
('creative', 'Brainstorm ideas', 'Lluvia de ideas', 'Dedicate time to creative thinking', 'Dedicar tiempo a pensar creativamente', '💭', 'anytime', 'beginner', false);

-- =====================================================
-- 6. UPDATE PROFILES TABLE FOR NEW FEATURES
-- =====================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS selected_pillars TEXT[] DEFAULT ARRAY['physical', 'mental', 'self_care'],
ADD COLUMN IF NOT EXISTS habit_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS habits_completed_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_habits_completed INTEGER DEFAULT 0;

-- =====================================================
-- 7. FUNCTIONS FOR HABIT MANAGEMENT
-- =====================================================

-- Function to complete a habit
CREATE OR REPLACE FUNCTION complete_habit(
  p_habit_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_mood TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_habit RECORD;
  v_today_completions INTEGER;
  v_xp_earned INTEGER;
  v_coins_earned INTEGER;
  v_new_streak INTEGER;
  v_result JSON;
BEGIN
  -- Get habit info
  SELECT * INTO v_habit FROM public.habits WHERE id = p_habit_id AND user_id = p_user_id;
  
  IF v_habit IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Habit not found');
  END IF;
  
  -- Check how many times completed today
  SELECT COUNT(*) INTO v_today_completions 
  FROM public.habit_logs 
  WHERE habit_id = p_habit_id AND log_date = CURRENT_DATE;
  
  -- Check if already completed enough times
  IF v_today_completions >= v_habit.times_per_day THEN
    RETURN json_build_object('success', false, 'error', 'Already completed for today');
  END IF;
  
  -- Insert log
  INSERT INTO public.habit_logs (habit_id, user_id, completion_number, notes, mood)
  VALUES (p_habit_id, p_user_id, v_today_completions + 1, p_notes, p_mood);
  
  -- Calculate rewards
  v_xp_earned := v_habit.xp_reward;
  v_coins_earned := v_habit.coin_reward;
  
  -- Update streak
  v_new_streak := v_habit.current_streak + 1;
  
  UPDATE public.habits 
  SET 
    current_streak = v_new_streak,
    best_streak = GREATEST(best_streak, v_new_streak),
    total_completions = total_completions + 1,
    updated_at = NOW()
  WHERE id = p_habit_id;
  
  -- Update user profile
  UPDATE public.profiles
  SET 
    total_xp = total_xp + v_xp_earned,
    quest_coins = quest_coins + v_coins_earned,
    habits_completed_today = habits_completed_today + 1,
    total_habits_completed = total_habits_completed + 1
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'xp_earned', v_xp_earned,
    'coins_earned', v_coins_earned,
    'new_streak', v_new_streak,
    'completions_today', v_today_completions + 1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get today's habits with status
CREATE OR REPLACE FUNCTION get_today_habits(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  pillar_id TEXT,
  icon TEXT,
  xp_reward INTEGER,
  current_streak INTEGER,
  times_per_day INTEGER,
  completions_today BIGINT,
  is_completed_today BOOLEAN,
  time_of_day TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.title,
    h.description,
    h.pillar_id,
    h.icon,
    h.xp_reward,
    h.current_streak,
    h.times_per_day,
    COALESCE((
      SELECT COUNT(*) FROM public.habit_logs hl 
      WHERE hl.habit_id = h.id AND hl.log_date = CURRENT_DATE
    ), 0) as completions_today,
    COALESCE((
      SELECT COUNT(*) FROM public.habit_logs hl 
      WHERE hl.habit_id = h.id AND hl.log_date = CURRENT_DATE
    ), 0) >= h.times_per_day as is_completed_today,
    h.time_of_day
  FROM public.habits h
  WHERE h.user_id = p_user_id 
    AND h.is_active = true
    AND (
      h.frequency = 'daily' 
      OR (h.frequency = 'specific_days' AND LOWER(to_char(CURRENT_DATE, 'day')) = ANY(h.frequency_days))
    )
  ORDER BY 
    CASE h.time_of_day 
      WHEN 'morning' THEN 1 
      WHEN 'afternoon' THEN 2 
      WHEN 'evening' THEN 3 
      ELSE 4 
    END,
    h.created_at;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================
ALTER TABLE public.user_pillar_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- User pillar focus policies
DROP POLICY IF EXISTS "Users can view own pillar focus" ON public.user_pillar_focus;
DROP POLICY IF EXISTS "Users can manage own pillar focus" ON public.user_pillar_focus;

CREATE POLICY "Users can view own pillar focus" ON public.user_pillar_focus
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own pillar focus" ON public.user_pillar_focus
FOR ALL USING (auth.uid() = user_id);

-- Habits policies
DROP POLICY IF EXISTS "Users can view own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can manage own habits" ON public.habits;

CREATE POLICY "Users can view own habits" ON public.habits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own habits" ON public.habits
FOR ALL USING (auth.uid() = user_id);

-- Habit logs policies
DROP POLICY IF EXISTS "Users can view own habit logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Users can insert own habit logs" ON public.habit_logs;

CREATE POLICY "Users can view own habit logs" ON public.habit_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habit logs" ON public.habit_logs
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Preset habits - everyone can read
DROP POLICY IF EXISTS "Anyone can view preset habits" ON public.preset_habits;
CREATE POLICY "Anyone can view preset habits" ON public.preset_habits
FOR SELECT USING (true);
