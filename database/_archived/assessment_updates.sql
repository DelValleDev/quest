-- =====================================================
-- QUEST APP - ASSESSMENT UPDATES
-- 1. Change professional question to multiple choice
-- 2. Reorganize questions by selected pillars
-- =====================================================

-- =====================================================
-- 1. UPDATE PROFESSIONAL SITUATION QUESTION TO MULTIPLE CHOICE
-- =====================================================
UPDATE public.assessment_questions
SET 
  question_type = 'multiple_choice',
  options = '["Estudiante", "Empleado tiempo completo", "Empleado medio tiempo", "Freelancer/Autónomo", "Emprendedor", "Desempleado buscando trabajo", "Ama de casa", "Retirado", "Entre trabajos", "Otro"]'::jsonb,
  question_text = '¿Cuál es tu situación profesional actual? (puedes elegir varias)'
WHERE pillar = 'professional' 
  AND sort_order = 21;

-- =====================================================
-- 2. ADD PRIORITY COLUMN FOR QUESTION FILTERING
-- =====================================================
ALTER TABLE public.assessment_questions 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'core'
  CHECK (priority IN ('core', 'extended', 'optional'));

-- Mark core questions (2-3 per pillar - for short assessment)
-- Mark extended questions (4-5 per pillar - for medium assessment)
-- Mark optional questions (6+ per pillar - for complete assessment)

-- Physical questions priority
UPDATE public.assessment_questions SET priority = 'core' WHERE pillar = 'physical' AND sort_order IN (1, 3, 6); -- frequency, nutrition, overall
UPDATE public.assessment_questions SET priority = 'extended' WHERE pillar = 'physical' AND sort_order IN (2, 4, 5); -- type, sleep, water
UPDATE public.assessment_questions SET priority = 'optional' WHERE pillar = 'physical' AND sort_order = 7; -- obstacles

-- Mental questions priority
UPDATE public.assessment_questions SET priority = 'core' WHERE pillar = 'mental' AND sort_order IN (8, 10, 13); -- reading, productivity, concentration
UPDATE public.assessment_questions SET priority = 'extended' WHERE pillar = 'mental' AND sort_order IN (9, 11); -- learning, distractions
UPDATE public.assessment_questions SET priority = 'optional' WHERE pillar = 'mental' AND sort_order IN (12, 14); -- areas, obstacles

-- Social questions priority
UPDATE public.assessment_questions SET priority = 'core' WHERE pillar = 'social' AND sort_order IN (15, 16, 19); -- intro/extro, frequency, enjoy meeting
UPDATE public.assessment_questions SET priority = 'extended' WHERE pillar = 'social' AND sort_order IN (17, 18); -- close friends, family
UPDATE public.assessment_questions SET priority = 'optional' WHERE pillar = 'social' AND sort_order = 20; -- improve areas

-- Professional questions priority
UPDATE public.assessment_questions SET priority = 'core' WHERE pillar = 'professional' AND sort_order IN (21, 22, 23); -- situation, satisfaction, goals
UPDATE public.assessment_questions SET priority = 'extended' WHERE pillar = 'professional' AND sort_order IN (24, 26); -- time, finance
UPDATE public.assessment_questions SET priority = 'optional' WHERE pillar = 'professional' AND sort_order IN (25, 27); -- skills, obstacles

-- Spiritual questions priority
UPDATE public.assessment_questions SET priority = 'core' WHERE pillar = 'spiritual' AND sort_order IN (28, 29, 32); -- meditation, wellbeing, purpose
UPDATE public.assessment_questions SET priority = 'extended' WHERE pillar = 'spiritual' AND sort_order IN (30, 31); -- stress, self-care
UPDATE public.assessment_questions SET priority = 'optional' WHERE pillar = 'spiritual' AND sort_order = 33; -- areas to work

-- Creative questions priority
UPDATE public.assessment_questions SET priority = 'core' WHERE pillar = 'creative' AND sort_order IN (34, 35, 36); -- activities, frequency, satisfaction
UPDATE public.assessment_questions SET priority = 'extended' WHERE pillar = 'creative' AND sort_order IN (37, 39); -- want to learn, try new things
UPDATE public.assessment_questions SET priority = 'optional' WHERE pillar = 'creative' AND sort_order IN (38, 40); -- obstacles, areas to explore

-- General/Aspiration questions - all core
UPDATE public.assessment_questions SET priority = 'core' WHERE pillar = 'general';

-- =====================================================
-- 3. FUNCTION: Get Questions by Pillars and Length
-- =====================================================
CREATE OR REPLACE FUNCTION get_assessment_questions(
  p_pillars TEXT[],
  p_length TEXT DEFAULT 'medium' -- 'short', 'medium', 'complete'
)
RETURNS TABLE (
  id UUID,
  pillar TEXT,
  question_text TEXT,
  question_type TEXT,
  options JSONB,
  weight INTEGER,
  sort_order INTEGER,
  priority TEXT,
  question_category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.pillar,
    q.question_text,
    q.question_type,
    q.options,
    q.weight,
    q.sort_order,
    q.priority,
    q.question_category
  FROM public.assessment_questions q
  WHERE 
    -- Include general questions always (aspiration questions)
    (q.pillar = 'general' OR q.pillar = ANY(p_pillars))
    -- Filter by length
    AND (
      p_length = 'complete' 
      OR (p_length = 'medium' AND q.priority IN ('core', 'extended'))
      OR (p_length = 'short' AND q.priority = 'core')
    )
  ORDER BY 
    -- General/aspiration questions at the end
    CASE WHEN q.pillar = 'general' THEN 1 ELSE 0 END,
    q.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNCTION: Calculate Assessment Length
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_assessment_length(
  p_pillars TEXT[],
  p_length TEXT DEFAULT 'medium'
)
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
  v_estimated_minutes INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.assessment_questions q
  WHERE 
    (q.pillar = 'general' OR q.pillar = ANY(p_pillars))
    AND (
      p_length = 'complete' 
      OR (p_length = 'medium' AND q.priority IN ('core', 'extended'))
      OR (p_length = 'short' AND q.priority = 'core')
    );
  
  -- Estimate 30 seconds per question
  v_estimated_minutes := CEIL(v_count * 0.5);
  
  RETURN json_build_object(
    'questions_count', v_count,
    'estimated_minutes', v_estimated_minutes,
    'length_type', p_length,
    'pillars', p_pillars
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ADD SELF-CARE PILLAR TO ASSESSMENT
-- =====================================================
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order, priority) VALUES
-- Self-Care questions (new pillar)
('self_care', '¿Tienes una rutina de cuidado personal establecida?', 'single_choice', '["No, ninguna", "Algo básico", "Rutina regular", "Rutina completa", "Rutina muy elaborada"]', 2, 50, 'core'),
('self_care', '¿Qué tan satisfecho estás con tu higiene y cuidado personal? (0 = nada, 100 = totalmente)', 'slider', null, 2, 51, 'core'),
('self_care', '¿Cuáles de estos hábitos de cuidado personal practicas regularmente?', 'multiple_choice', '["Cuidado de piel", "Cuidado dental", "Arreglo personal", "Limpieza del hogar", "Organización", "Ninguno todavía"]', 1, 52, 'extended'),
('self_care', '¿Qué te impide tener mejores rutinas de autocuidado?', 'multiple_choice', '["Falta de tiempo", "Pereza", "No sé cómo", "Costo de productos", "No me importa mucho", "Nada"]', 2, 53, 'optional')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. UPDATE calculate_pillar_scores TO INCLUDE SELF_CARE
-- =====================================================
-- The existing function already handles all pillars dynamically
-- No changes needed there

-- =====================================================
-- 7. TRIGGER: Auto-calculate class after assessment
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_calculate_class()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has completed aspiration questions
  IF EXISTS (
    SELECT 1 FROM public.user_assessment_answers ua
    JOIN public.assessment_questions q ON q.id = ua.question_id
    WHERE ua.user_id = NEW.user_id AND q.question_category = 'aspiration'
  ) THEN
    -- Recalculate class
    PERFORM calculate_class_from_assessment(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_assessment_answer ON public.user_assessment_answers;

CREATE TRIGGER on_assessment_answer
AFTER INSERT OR UPDATE ON public.user_assessment_answers
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_class();
