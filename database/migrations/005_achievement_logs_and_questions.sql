-- =====================================================
-- Migration 005: Achievement Logs + Updated Questions
-- =====================================================

-- =====================================================
-- 1. ACHIEVEMENT LOGS TABLE
-- For logging "free form" activities that earn XP
-- =====================================================
CREATE TABLE IF NOT EXISTS public.achievement_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  pillar TEXT NOT NULL DEFAULT 'general',
  xp_earned INTEGER DEFAULT 10,
  coins_earned INTEGER DEFAULT 0,
  ai_analyzed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_achievement_logs_user ON achievement_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_logs_created ON achievement_logs(created_at DESC);

-- RLS
ALTER TABLE public.achievement_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own achievement logs" ON public.achievement_logs;
CREATE POLICY "Users can manage own achievement logs" ON public.achievement_logs
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 2. HELPER FUNCTIONS
-- =====================================================

-- Function to add XP and coins to user
CREATE OR REPLACE FUNCTION add_user_rewards(p_user_id UUID, p_xp INTEGER, p_coins INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    total_xp = COALESCE(total_xp, 0) + p_xp,
    coins = COALESCE(coins, 0) + p_coins,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment a specific pillar score
CREATE OR REPLACE FUNCTION increment_pillar_score(p_user_id UUID, p_pillar TEXT, p_points INTEGER)
RETURNS void AS $$
DECLARE
  current_scores JSONB;
  new_score INTEGER;
BEGIN
  -- Get current pillar scores
  SELECT pillar_scores INTO current_scores
  FROM profiles WHERE id = p_user_id;
  
  -- Initialize if null
  IF current_scores IS NULL THEN
    current_scores := '{}'::JSONB;
  END IF;
  
  -- Calculate new score (cap at 100)
  new_score := LEAST(100, COALESCE((current_scores->>p_pillar)::INTEGER, 50) + p_points);
  
  -- Update the score
  UPDATE profiles
  SET 
    pillar_scores = jsonb_set(current_scores, ARRAY[p_pillar], to_jsonb(new_score)),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_user_rewards(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_pillar_score(UUID, TEXT, INTEGER) TO authenticated;

-- =====================================================
-- 3. UPDATE SPIRITUAL QUESTIONS (las que querías)
-- =====================================================
DELETE FROM public.assessment_questions WHERE pillar = 'spiritual';

INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order, priority) VALUES
-- Primera pregunta: elegir tipo de espiritualidad (CORE)
('spiritual', '¿Cómo describes tu espiritualidad o práctica de fe?', 'single_choice', 
 '["Cristiano/a (oración, iglesia)", "Católico/a", "Otra religión organizada", "Espiritual pero no religioso", "Meditación/Mindfulness secular", "Conexión con la naturaleza", "Filosofía de vida (estoicismo, etc.)", "No tengo prácticas espirituales", "Estoy explorando"]', 
 3, 28, 'core'),

('spiritual', '¿Con qué frecuencia practicas actividades espirituales o de reflexión?', 'single_choice', 
 '["Nunca", "Ocasionalmente (algunas veces al mes)", "Semanalmente", "Varias veces a la semana", "Diariamente"]', 
 2, 29, 'core'),

('spiritual', '¿Qué prácticas espirituales o de bienestar realizas?', 'multiple_choice', 
 '["Oración", "Lectura de textos sagrados/espirituales", "Asistencia a iglesia/templo/comunidad", "Meditación", "Mindfulness/Respiración consciente", "Journaling/Diario reflexivo", "Tiempo en naturaleza", "Gratitud diaria", "Ninguna todavía"]', 
 2, 30, 'extended'),

('spiritual', '¿Cómo calificarías tu bienestar emocional actual? (0 = muy mal, 100 = excelente)', 'slider', null, 3, 31, 'extended'),

('spiritual', '¿Con qué frecuencia te sientes estresado o ansioso?', 'single_choice', 
 '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]', 
 2, 32, 'optional'),

('spiritual', '¿Sientes que tu vida tiene propósito y dirección?', 'single_choice', 
 '["Para nada", "Muy poco", "Algo", "Bastante", "Totalmente"]', 
 3, 33, 'optional'),

('spiritual', '¿En qué áreas de tu vida interior te gustaría crecer?', 'multiple_choice', 
 '["Fe/Conexión espiritual", "Paz interior/Calma", "Gratitud", "Perdón", "Paciencia", "Propósito de vida", "Manejo del estrés", "Autoconocimiento", "Comunidad/Pertenencia"]', 
 2, 34, 'optional'),

('spiritual', '¿Qué obstáculos enfrentas en tu vida espiritual/emocional?', 'multiple_choice', 
 '["Falta de tiempo", "Dudas o incertidumbre", "No tengo comunidad/grupo", "Heridas del pasado", "Distracciones constantes", "No sé cómo empezar", "Ninguno en particular"]', 
 2, 35, 'optional');

-- =====================================================
-- 4. ADD SELF-CARE / HYGIENE QUESTIONS TO PHYSICAL
-- =====================================================
-- First, let's adjust sort_order for spiritual and creative to make room

-- Update creative questions sort order (push them after spiritual)
UPDATE public.assessment_questions 
SET sort_order = sort_order + 3 
WHERE pillar = 'creative';

-- Update spiritual questions after the new physical ones
UPDATE public.assessment_questions 
SET sort_order = sort_order + 3 
WHERE pillar = 'spiritual';

-- Now add self-care questions to physical (after existing physical questions)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order, priority) VALUES
-- Self-care / Hygiene questions for physical pillar
('physical', '¿Cómo calificarías tu rutina de cuidado personal? (higiene, skincare, etc.)', 'single_choice', 
 '["No tengo rutina", "Básica (lo mínimo)", "Regular (ducha, dientes, básico)", "Buena (incluyo skincare/grooming)", "Excelente (rutina completa)"]', 
 2, 8, 'extended'),

('physical', '¿Qué aspectos de tu cuidado personal te gustaría mejorar?', 'multiple_choice', 
 '["Cuidado de la piel (skincare)", "Cuidado del cabello", "Higiene dental", "Vestimenta/Imagen", "Postura corporal", "Hidratación", "Nada en particular"]', 
 1, 9, 'optional'),

('physical', '¿Con qué frecuencia cuidas tu apariencia personal de forma intencional?', 'single_choice', 
 '["Casi nunca", "Solo para ocasiones especiales", "Algunas veces a la semana", "Casi todos los días", "Todos los días, es prioritario"]', 
 2, 10, 'optional');

-- =====================================================
-- 5. ADD ASSESSMENT PROGRESS COLUMN TO PROFILES
-- For remembering which question user was on
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assessment_current_index INTEGER DEFAULT 0;

-- =====================================================
-- 6. VERIFY COUNTS
-- =====================================================
-- Run these to verify:
SELECT pillar, priority, COUNT(*) 
FROM assessment_questions 
GROUP BY pillar, priority 
ORDER BY pillar, priority;

SELECT 'Total questions' as check_type, COUNT(*) as count FROM assessment_questions;
