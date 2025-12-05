-- =====================================================
-- QUEST APP - DYNAMIC CLASS SYSTEM
-- Classes are calculated automatically based on assessment
-- answers (what you WANT to be, not what you ARE)
-- =====================================================

-- =====================================================
-- 1. ADD ASPIRATION QUESTIONS TO ASSESSMENT
-- These questions ask what the user WANTS to become
-- =====================================================

-- First, add a new column to identify aspiration vs current-state questions
ALTER TABLE public.assessment_questions 
ADD COLUMN IF NOT EXISTS question_category TEXT DEFAULT 'current_state'
  CHECK (question_category IN ('current_state', 'aspiration', 'obstacles'));

-- Add class_affinity to know which class each answer influences
ALTER TABLE public.assessment_questions 
ADD COLUMN IF NOT EXISTS class_affinity JSONB;

-- Update existing questions to categorize them
UPDATE public.assessment_questions SET question_category = 'current_state';

-- Add aspiration questions (these will determine your class)
INSERT INTO public.assessment_questions 
(pillar, question_text, question_type, options, weight, sort_order, question_category, class_affinity) 
VALUES
-- Who do you want to become?
('general', '¿En qué área te gustaría enfocarte más para mejorar?', 'single_choice', 
  '["💪 Fitness y salud física", "🧠 Aprendizaje y productividad", "❤️ Relaciones y conexiones sociales", "🎨 Creatividad y expresión artística", "💼 Carrera profesional y finanzas", "🕉️ Paz interior y bienestar emocional"]',
  5, 41, 'aspiration',
  '{"💪 Fitness y salud física": "warrior", "🧠 Aprendizaje y productividad": "sage", "❤️ Relaciones y conexiones sociales": "connector", "🎨 Creatividad y expresión artística": "creator", "💼 Carrera profesional y finanzas": "achiever", "🕉️ Paz interior y bienestar emocional": "monk"}'),

('general', '¿Qué versión de ti mismo quieres ser en 6 meses?', 'multiple_choice',
  '["Una persona físicamente fuerte y saludable", "Alguien más sabio y productivo", "Una persona más conectada con otros", "Un creador/artista que se expresa", "Un profesional exitoso", "Alguien en paz consigo mismo", "Alguien con mejor autocuidado"]',
  4, 42, 'aspiration',
  '{"Una persona físicamente fuerte y saludable": "warrior", "Alguien más sabio y productivo": "sage", "Una persona más conectada con otros": "connector", "Un creador/artista que se expresa": "creator", "Un profesional exitoso": "achiever", "Alguien en paz consigo mismo": "monk", "Alguien con mejor autocuidado": "monk"}'),

('general', '¿Qué habilidad te gustaría dominar?', 'single_choice',
  '["Disciplina física y deportiva", "Enfoque mental y aprendizaje rápido", "Comunicación y carisma", "Creatividad y expresión artística", "Liderazgo y negocios", "Mindfulness y paz interior"]',
  4, 43, 'aspiration',
  '{"Disciplina física y deportiva": "warrior", "Enfoque mental y aprendizaje rápido": "sage", "Comunicación y carisma": "connector", "Creatividad y expresión artística": "creator", "Liderazgo y negocios": "achiever", "Mindfulness y paz interior": "monk"}'),

('general', '¿Con qué ícono te identificas más para tu futuro yo?', 'single_choice',
  '["💪 El Guerrero - Fortaleza física", "🧠 El Sabio - Conocimiento", "❤️ El Conector - Relaciones", "🎨 El Creador - Arte", "💼 El Achiever - Éxito profesional", "🕉️ El Monje - Paz interior"]',
  5, 44, 'aspiration',
  '{"💪 El Guerrero - Fortaleza física": "warrior", "🧠 El Sabio - Conocimiento": "sage", "❤️ El Conector - Relaciones": "connector", "🎨 El Creador - Arte": "creator", "💼 El Achiever - Éxito profesional": "achiever", "🕉️ El Monje - Paz interior": "monk"}'),

('general', '¿Cuál de estos hábitos te emociona más adoptar?', 'multiple_choice',
  '["Entrenar todos los días", "Leer y aprender diariamente", "Cultivar relaciones profundas", "Crear algo nuevo regularmente", "Desarrollar mi carrera activamente", "Meditar y reflexionar", "Cuidar mi higiene y rutinas"]',
  3, 45, 'aspiration',
  '{"Entrenar todos los días": "warrior", "Leer y aprender diariamente": "sage", "Cultivar relaciones profundas": "connector", "Crear algo nuevo regularmente": "creator", "Desarrollar mi carrera activamente": "achiever", "Meditar y reflexionar": "monk", "Cuidar mi higiene y rutinas": "monk"}'),

('general', '¿Qué admiras más en otras personas?', 'single_choice',
  '["Su disciplina física y fuerza", "Su inteligencia y productividad", "Su habilidad para conectar con otros", "Su creatividad y originalidad", "Su éxito profesional", "Su calma y sabiduría interior"]',
  4, 46, 'aspiration',
  '{"Su disciplina física y fuerza": "warrior", "Su inteligencia y productividad": "sage", "Su habilidad para conectar con otros": "connector", "Su creatividad y originalidad": "creator", "Su éxito profesional": "achiever", "Su calma y sabiduría interior": "monk"}');

-- =====================================================
-- 2. USER CLASS AFFINITIES TABLE
-- Stores the calculated affinity % for each class
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_class_affinities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Class percentages (must sum to 100)
  warrior_pct DECIMAL(5,2) DEFAULT 0,
  sage_pct DECIMAL(5,2) DEFAULT 0,
  connector_pct DECIMAL(5,2) DEFAULT 0,
  creator_pct DECIMAL(5,2) DEFAULT 0,
  achiever_pct DECIMAL(5,2) DEFAULT 0,
  monk_pct DECIMAL(5,2) DEFAULT 0,
  
  -- Determined class (highest percentage)
  primary_class TEXT REFERENCES public.character_classes(id),
  secondary_class TEXT REFERENCES public.character_classes(id),
  
  -- Recalculated after each assessment
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- =====================================================
-- 3. FUNCTION: Calculate Class from Assessment Answers
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_class_from_assessment(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_class_scores JSONB := '{"warrior": 0, "sage": 0, "connector": 0, "creator": 0, "achiever": 0, "monk": 0}'::jsonb;
  v_total_weight DECIMAL := 0;
  v_answer RECORD;
  v_affinity JSONB;
  v_class TEXT;
  v_weight INTEGER;
  v_percentages JSONB;
  v_primary_class TEXT;
  v_secondary_class TEXT;
  v_max_score DECIMAL := 0;
  v_second_max DECIMAL := 0;
  v_selected_answer TEXT;
BEGIN
  -- Loop through aspiration questions and answers
  FOR v_answer IN 
    SELECT 
      ua.answer_choice,
      ua.answer_choices,
      q.class_affinity,
      q.weight,
      q.question_type
    FROM public.user_assessment_answers ua
    JOIN public.assessment_questions q ON q.id = ua.question_id
    WHERE ua.user_id = p_user_id 
      AND q.question_category = 'aspiration'
      AND q.class_affinity IS NOT NULL
  LOOP
    v_weight := COALESCE(v_answer.weight, 1);
    v_affinity := v_answer.class_affinity;
    
    IF v_answer.question_type = 'single_choice' AND v_answer.answer_choice IS NOT NULL THEN
      -- Get the class for this answer
      v_class := v_affinity ->> v_answer.answer_choice;
      IF v_class IS NOT NULL THEN
        v_class_scores := jsonb_set(
          v_class_scores, 
          ARRAY[v_class], 
          to_jsonb((v_class_scores ->> v_class)::decimal + v_weight)
        );
        v_total_weight := v_total_weight + v_weight;
      END IF;
      
    ELSIF v_answer.question_type = 'multiple_choice' AND v_answer.answer_choices IS NOT NULL THEN
      -- Multiple selections - each gets partial weight
      FOR v_selected_answer IN SELECT jsonb_array_elements_text(v_answer.answer_choices)
      LOOP
        v_class := v_affinity ->> v_selected_answer;
        IF v_class IS NOT NULL THEN
          v_class_scores := jsonb_set(
            v_class_scores, 
            ARRAY[v_class], 
            to_jsonb((v_class_scores ->> v_class)::decimal + (v_weight::decimal / jsonb_array_length(v_answer.answer_choices)))
          );
          v_total_weight := v_total_weight + (v_weight::decimal / jsonb_array_length(v_answer.answer_choices));
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  -- If no aspiration answers, check pillar-based questions as fallback
  IF v_total_weight = 0 THEN
    -- Use pillar scores to infer class
    SELECT 
      CASE pillar
        WHEN 'physical' THEN 'warrior'
        WHEN 'mental' THEN 'sage'
        WHEN 'social' THEN 'connector'
        WHEN 'creative' THEN 'creator'
        WHEN 'professional' THEN 'achiever'
        WHEN 'spiritual' THEN 'monk'
        ELSE NULL
      END as class_id,
      COUNT(*) * 1.0 as score
    INTO v_class, v_weight
    FROM public.user_assessment_answers ua
    JOIN public.assessment_questions q ON q.id = ua.question_id
    WHERE ua.user_id = p_user_id
    GROUP BY pillar
    ORDER BY score DESC
    LIMIT 1;
    
    IF v_class IS NOT NULL THEN
      v_class_scores := jsonb_set(v_class_scores, ARRAY[v_class], '100'::jsonb);
      v_total_weight := 100;
    END IF;
  END IF;
  
  -- Calculate percentages
  IF v_total_weight > 0 THEN
    v_percentages := jsonb_build_object(
      'warrior', ROUND(((v_class_scores ->> 'warrior')::decimal / v_total_weight * 100)::numeric, 2),
      'sage', ROUND(((v_class_scores ->> 'sage')::decimal / v_total_weight * 100)::numeric, 2),
      'connector', ROUND(((v_class_scores ->> 'connector')::decimal / v_total_weight * 100)::numeric, 2),
      'creator', ROUND(((v_class_scores ->> 'creator')::decimal / v_total_weight * 100)::numeric, 2),
      'achiever', ROUND(((v_class_scores ->> 'achiever')::decimal / v_total_weight * 100)::numeric, 2),
      'monk', ROUND(((v_class_scores ->> 'monk')::decimal / v_total_weight * 100)::numeric, 2)
    );
  ELSE
    -- Default balanced distribution
    v_percentages := jsonb_build_object(
      'warrior', 16.67, 'sage', 16.67, 'connector', 16.67,
      'creator', 16.67, 'achiever', 16.67, 'monk', 16.65
    );
  END IF;
  
  -- Find primary and secondary class
  SELECT class_id INTO v_primary_class
  FROM jsonb_each_text(v_percentages) AS x(class_id, pct)
  ORDER BY pct::decimal DESC
  LIMIT 1;
  
  SELECT class_id INTO v_secondary_class
  FROM jsonb_each_text(v_percentages) AS x(class_id, pct)
  ORDER BY pct::decimal DESC
  OFFSET 1 LIMIT 1;
  
  -- Save to user_class_affinities
  INSERT INTO public.user_class_affinities (
    user_id,
    warrior_pct, sage_pct, connector_pct, creator_pct, achiever_pct, monk_pct,
    primary_class, secondary_class,
    calculated_at
  )
  VALUES (
    p_user_id,
    (v_percentages ->> 'warrior')::decimal,
    (v_percentages ->> 'sage')::decimal,
    (v_percentages ->> 'connector')::decimal,
    (v_percentages ->> 'creator')::decimal,
    (v_percentages ->> 'achiever')::decimal,
    (v_percentages ->> 'monk')::decimal,
    v_primary_class,
    v_secondary_class,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    warrior_pct = EXCLUDED.warrior_pct,
    sage_pct = EXCLUDED.sage_pct,
    connector_pct = EXCLUDED.connector_pct,
    creator_pct = EXCLUDED.creator_pct,
    achiever_pct = EXCLUDED.achiever_pct,
    monk_pct = EXCLUDED.monk_pct,
    primary_class = EXCLUDED.primary_class,
    secondary_class = EXCLUDED.secondary_class,
    calculated_at = NOW();
  
  -- Update profile with primary class
  UPDATE public.profiles
  SET character_class = v_primary_class
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'percentages', v_percentages,
    'primary_class', v_primary_class,
    'secondary_class', v_secondary_class,
    'message', 'Class calculated based on your aspirations'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNCTION: Get User Class Details with Percentages
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_class_profile(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_affinities public.user_class_affinities%ROWTYPE;
  v_primary_class public.character_classes%ROWTYPE;
  v_secondary_class public.character_classes%ROWTYPE;
BEGIN
  -- Get affinities
  SELECT * INTO v_affinities 
  FROM public.user_class_affinities 
  WHERE user_id = p_user_id;
  
  IF v_affinities IS NULL THEN
    RETURN json_build_object(
      'has_class', false,
      'message', 'Complete the assessment to discover your class'
    );
  END IF;
  
  -- Get primary class info
  SELECT * INTO v_primary_class 
  FROM public.character_classes 
  WHERE id = v_affinities.primary_class;
  
  -- Get secondary class info
  SELECT * INTO v_secondary_class 
  FROM public.character_classes 
  WHERE id = v_affinities.secondary_class;
  
  RETURN json_build_object(
    'has_class', true,
    'primary_class', json_build_object(
      'id', v_primary_class.id,
      'name', v_primary_class.name,
      'icon', v_primary_class.icon,
      'description', v_primary_class.description,
      'color', v_primary_class.color,
      'percentage', CASE v_primary_class.id
        WHEN 'warrior' THEN v_affinities.warrior_pct
        WHEN 'sage' THEN v_affinities.sage_pct
        WHEN 'connector' THEN v_affinities.connector_pct
        WHEN 'creator' THEN v_affinities.creator_pct
        WHEN 'achiever' THEN v_affinities.achiever_pct
        WHEN 'monk' THEN v_affinities.monk_pct
      END
    ),
    'secondary_class', CASE WHEN v_secondary_class.id IS NOT NULL THEN
      json_build_object(
        'id', v_secondary_class.id,
        'name', v_secondary_class.name,
        'icon', v_secondary_class.icon,
        'percentage', CASE v_secondary_class.id
          WHEN 'warrior' THEN v_affinities.warrior_pct
          WHEN 'sage' THEN v_affinities.sage_pct
          WHEN 'connector' THEN v_affinities.connector_pct
          WHEN 'creator' THEN v_affinities.creator_pct
          WHEN 'achiever' THEN v_affinities.achiever_pct
          WHEN 'monk' THEN v_affinities.monk_pct
        END
      )
    ELSE NULL END,
    'all_affinities', json_build_object(
      'warrior', v_affinities.warrior_pct,
      'sage', v_affinities.sage_pct,
      'connector', v_affinities.connector_pct,
      'creator', v_affinities.creator_pct,
      'achiever', v_affinities.achiever_pct,
      'monk', v_affinities.monk_pct
    ),
    'calculated_at', v_affinities.calculated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================
ALTER TABLE public.user_class_affinities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own affinities" ON public.user_class_affinities;
DROP POLICY IF EXISTS "Users can manage own affinities" ON public.user_class_affinities;

CREATE POLICY "Users can view own affinities" ON public.user_class_affinities
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own affinities" ON public.user_class_affinities
FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_class_affinities_user 
ON public.user_class_affinities(user_id);
