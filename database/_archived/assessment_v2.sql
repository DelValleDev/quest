-- =====================================================
-- QUEST APP - ASSESSMENT v2 (Fixed questions distribution)
-- Short: 12 questions (2 per pillar)
-- Medium: 24 questions (4 per pillar)  
-- Complete: 40 questions (6-7 per pillar)
-- =====================================================

-- Add priority column if not exists
ALTER TABLE public.assessment_questions 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'extended';
-- priority: 'core' (always shown), 'extended' (medium+), 'optional' (complete only)

-- Update existing questions with priority based on importance
-- Core questions (12 total - 2 per pillar for short assessment)
UPDATE public.assessment_questions SET priority = 'core' WHERE sort_order IN (
  1, 3,      -- Physical: frecuencia ejercicio, alimentación
  8, 10,     -- Mental: lectura, productividad  
  15, 16,    -- Social: intro/extrovertido, frecuencia social
  21, 22,    -- Professional: situación actual, satisfacción
  28, 29,    -- Spiritual: meditación, bienestar emocional
  34, 36     -- Creative: actividades, satisfacción creativa
);

-- Extended questions (12 more = 24 total for medium)
UPDATE public.assessment_questions SET priority = 'extended' WHERE sort_order IN (
  4, 6,      -- Physical: sueño, estado físico
  9, 13,     -- Mental: aprendiendo nuevo, concentración
  17, 19,    -- Social: amigos cercanos, conocer gente
  23, 26,    -- Professional: metas, finanzas
  30, 32,    -- Spiritual: estrés, propósito
  35, 37     -- Creative: frecuencia, interés aprender
);

-- Optional questions (16 more = 40 total for complete)
UPDATE public.assessment_questions SET priority = 'optional' WHERE priority IS NULL OR priority NOT IN ('core', 'extended');

-- =====================================================
-- FIX: Professional question - make single_choice (mutual exclusivity)
-- =====================================================
UPDATE public.assessment_questions 
SET options = '["Estudiante", "Empleado tiempo completo", "Empleado medio tiempo", "Freelancer/Autónomo", "Emprendedor", "Desempleado buscando trabajo", "Retirado", "Amo de casa", "Otro"]'::jsonb
WHERE question_text LIKE '%situación profesional%';

-- =====================================================
-- CREATE FUNCTION TO GET QUESTIONS BY SURVEY LENGTH
-- =====================================================
CREATE OR REPLACE FUNCTION get_assessment_questions(
  p_survey_length TEXT DEFAULT 'complete'
)
RETURNS TABLE (
  id UUID,
  pillar TEXT,
  question_text TEXT,
  question_type TEXT,
  options JSONB,
  weight INTEGER,
  reverse_score BOOLEAN,
  sort_order INTEGER,
  priority TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.pillar,
    q.question_text,
    q.question_type,
    q.options,
    q.weight,
    q.reverse_score,
    q.sort_order,
    q.priority
  FROM public.assessment_questions q
  WHERE 
    CASE 
      WHEN p_survey_length = 'short' THEN q.priority = 'core'
      WHEN p_survey_length = 'medium' THEN q.priority IN ('core', 'extended')
      ELSE TRUE -- complete gets all
    END
  ORDER BY q.sort_order;
END;
$$;

-- =====================================================
-- ASPIRATIONAL ASSESSMENT QUESTIONS (What you want to be)
-- These are asked AFTER the main assessment
-- =====================================================
CREATE TABLE IF NOT EXISTS public.aspirational_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pillar TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'single_choice', 'multiple_choice', 'text', 'scale'
  options JSONB,
  placeholder TEXT, -- For text inputs
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.aspirational_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view aspirational questions" ON public.aspirational_questions;
CREATE POLICY "Anyone can view aspirational questions" ON public.aspirational_questions
  FOR SELECT USING (true);

-- User answers for aspirational questions
CREATE TABLE IF NOT EXISTS public.user_aspirational_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.aspirational_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_choice TEXT,
  answer_choices JSONB,
  answer_value INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE public.user_aspirational_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own aspirational answers" ON public.user_aspirational_answers;
CREATE POLICY "Users can manage own aspirational answers" ON public.user_aspirational_answers
  FOR ALL USING (auth.uid() = user_id);

-- Insert aspirational questions (one per pillar + general)
INSERT INTO public.aspirational_questions (pillar, question_text, question_type, options, placeholder, sort_order) VALUES
-- General
('general', '¿Cómo te gustaría que te describieran en 1 año?', 'text', null, 'Ej: Una persona más disciplinada, saludable y exitosa...', 1),
('general', '¿Cuál es tu mayor meta para este año?', 'text', null, 'Ej: Conseguir un mejor trabajo, bajar 10kg, aprender un idioma...', 2),

-- Physical
('physical', '¿Cómo quieres verte y sentirte físicamente?', 'text', null, 'Ej: Más delgado, con más músculo, con más energía...', 3),
('physical', '¿Qué hábitos físicos quieres tener?', 'multiple_choice', '["Hacer ejercicio diario", "Comer más saludable", "Dormir 8 horas", "Beber más agua", "Meditar/Yoga", "Dejar vicios (alcohol, cigarro, etc)"]', null, 4),

-- Mental  
('mental', '¿Qué quieres aprender o dominar?', 'text', null, 'Ej: Programación, un idioma, finanzas, un instrumento...', 5),
('mental', '¿Qué tipo de persona quieres ser mentalmente?', 'multiple_choice', '["Más enfocado/productivo", "Más tranquilo/menos ansioso", "Más creativo", "Más disciplinado", "Mejor memoria/concentración", "Más curioso/aprendiz"]', null, 6),

-- Social
('social', '¿Cómo quieres que sean tus relaciones?', 'text', null, 'Ej: Tener más amigos, mejorar mi relación de pareja, ser más sociable...', 7),
('social', '¿Qué habilidades sociales quieres desarrollar?', 'multiple_choice', '["Hablar en público", "Hacer networking", "Ser más extrovertido", "Escuchar mejor", "Resolver conflictos", "Liderar equipos"]', null, 8),

-- Professional
('professional', '¿Dónde quieres estar profesionalmente en 1 año?', 'text', null, 'Ej: Con un mejor salario, con mi propio negocio, en otra industria...', 9),
('professional', '¿Qué ingresos mensuales te gustaría tener?', 'single_choice', '["Lo mismo que ahora", "25% más", "50% más", "El doble", "Más del doble"]', null, 10),

-- Spiritual
('spiritual', '¿Qué paz interior o propósito buscas?', 'text', null, 'Ej: Menos estrés, más gratitud, encontrar mi propósito...', 11),
('spiritual', '¿Qué prácticas de bienestar te gustaría tener?', 'multiple_choice', '["Meditación diaria", "Journaling", "Gratitud", "Terapia", "Conexión espiritual", "Tiempo en naturaleza"]', null, 12),

-- Creative
('creative', '¿Qué quieres crear o expresar?', 'text', null, 'Ej: Escribir un libro, aprender música, hacer videos...', 13),
('creative', '¿Qué habilidades creativas te gustaría desarrollar?', 'multiple_choice', '["Música/instrumento", "Dibujo/pintura", "Escritura", "Fotografía/video", "Diseño", "Cocina", "Crafts/DIY"]', null, 14)

ON CONFLICT DO NOTHING;

-- =====================================================
-- TRIAL PREMIUM: First month free
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;

-- Function to activate trial for new users
CREATE OR REPLACE FUNCTION activate_premium_trial(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT trial_used, trial_started_at INTO v_profile
  FROM profiles WHERE id = p_user_id;
  
  -- Check if already used trial
  IF v_profile.trial_used = TRUE THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Trial already used'
    );
  END IF;
  
  -- Activate 30-day premium trial
  UPDATE profiles
  SET 
    subscription_tier = 'premium',
    trial_started_at = NOW(),
    subscription_expires_at = NOW() + INTERVAL '30 days',
    trial_used = TRUE,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Premium trial activated for 30 days',
    'expires_at', (NOW() + INTERVAL '30 days')::TEXT
  );
END;
$$;

-- Auto-activate trial when user completes assessment
CREATE OR REPLACE FUNCTION auto_activate_trial_on_assessment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When assessment is completed and trial not used, activate trial
  IF NEW.assessment_completed = TRUE AND 
     (OLD.assessment_completed IS NULL OR OLD.assessment_completed = FALSE) AND
     (NEW.trial_used IS NULL OR NEW.trial_used = FALSE) THEN
    
    PERFORM activate_premium_trial(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_trial_on_assessment ON profiles;
CREATE TRIGGER trigger_auto_trial_on_assessment
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.assessment_completed = TRUE)
  EXECUTE FUNCTION auto_activate_trial_on_assessment();

-- =====================================================
-- ADD SELF-CARE TO PHYSICAL PILLAR (not spiritual)
-- Self-care is about body maintenance: skincare, hygiene, grooming
-- =====================================================

-- Add self-care questions to physical pillar
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order, priority) VALUES
('physical', '¿Tienes una rutina de cuidado personal (skincare, higiene, grooming)?', 'single_choice', 
 '["No tengo rutina", "Básica (lo mínimo)", "Regular", "Buena rutina", "Rutina completa y consistente"]', 2, 41, 'extended'),
('physical', '¿Cuidas tu apariencia personal (ropa, cabello, uñas)?', 'single_choice',
 '["Casi nunca", "Solo para ocasiones especiales", "Regularmente", "Bastante", "Es importante para mí"]', 1, 42, 'optional')
ON CONFLICT DO NOTHING;

-- =====================================================
-- TRIAL NOTES:
-- - Trial activates automatically when user completes assessment
-- - NO credit card required - just 30 days free
-- - After 30 days, user downgrades to 'free' tier automatically
-- - If they want to continue Premium, THEN they pay
-- =====================================================

-- Function to check and expire trials (run daily via cron or edge function)
CREATE OR REPLACE FUNCTION check_expired_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Downgrade expired trials to free
  UPDATE profiles
  SET 
    subscription_tier = 'free',
    updated_at = NOW()
  WHERE 
    subscription_tier = 'premium' 
    AND trial_used = TRUE 
    AND subscription_expires_at < NOW()
    AND is_developer = FALSE  -- Don't downgrade developers
    AND lifetime_premium = FALSE;  -- Don't downgrade lifetime
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================
-- DONE!
-- =====================================================
