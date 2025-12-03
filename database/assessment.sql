-- =====================================================
-- QUEST APP - ASSESSMENT SYSTEM (Cuestionario de Personalidad)
-- Run this in Supabase SQL Editor AFTER schema.sql
-- =====================================================

-- =====================================================
-- ASSESSMENT QUESTIONS TABLE
-- =====================================================
DROP TABLE IF EXISTS public.user_assessment_answers CASCADE;
DROP TABLE IF EXISTS public.assessment_questions CASCADE;

CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  pillar TEXT NOT NULL, -- physical, mental, social, professional, spiritual, creative
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- slider, multiple_choice, single_choice
  options JSONB, -- for choice questions: ["option1", "option2", ...]
  
  -- For scoring
  weight INTEGER DEFAULT 1, -- importance of this question (1-3)
  reverse_score BOOLEAN DEFAULT false, -- for negative questions
  
  -- Order
  sort_order INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USER ASSESSMENT ANSWERS
-- =====================================================
CREATE TABLE public.user_assessment_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  
  -- Answer data
  answer_value INTEGER, -- for slider (0-100)
  answer_choice TEXT, -- for single choice
  answer_choices JSONB, -- for multiple choice: ["choice1", "choice2"]
  
  -- Metadata
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, question_id)
);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assessment_answers ENABLE ROW LEVEL SECURITY;

-- Everyone can read questions
CREATE POLICY "Anyone can view assessment questions" ON public.assessment_questions
  FOR SELECT USING (true);

-- Users can only see/modify their own answers
CREATE POLICY "Users can view own answers" ON public.user_assessment_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers" ON public.user_assessment_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers" ON public.user_assessment_answers
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- INSERT ASSESSMENT QUESTIONS (40 questions)
-- =====================================================

-- 💪 FÍSICO (7 preguntas)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order) VALUES
('physical', '¿Con qué frecuencia haces ejercicio?', 'single_choice', '["Nunca", "1-2 veces al mes", "1-2 veces por semana", "3-4 veces por semana", "5+ veces por semana"]', 3, 1),
('physical', '¿Qué tipo de ejercicio prefieres?', 'multiple_choice', '["Gimnasio/Pesas", "Cardio (correr, nadar)", "Deportes de equipo", "Yoga/Pilates", "Calistenia", "Ninguno todavía"]', 1, 2),
('physical', '¿Cómo calificarías tu alimentación actual? (0 = muy mala, 100 = excelente)', 'slider', null, 2, 3),
('physical', '¿Cuántas horas duermes en promedio por noche?', 'single_choice', '["Menos de 5", "5-6 horas", "6-7 horas", "7-8 horas", "Más de 8"]', 2, 4),
('physical', '¿Cuántos vasos de agua bebes al día?', 'single_choice', '["0-2", "3-4", "5-6", "7-8", "9+"]', 1, 5),
('physical', '¿Cómo te sientes físicamente en general? (0 = terrible, 100 = excelente)', 'slider', null, 2, 6),
('physical', '¿Cuáles son tus principales obstáculos para estar más activo?', 'multiple_choice', '["Falta de tiempo", "Falta de motivación", "No sé por dónde empezar", "Lesiones/dolor", "Costo de gimnasio", "Ninguno"]', 2, 7);

-- 🧠 MENTAL (7 preguntas)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order) VALUES
('mental', '¿Con qué frecuencia lees libros, artículos o contenido educativo?', 'single_choice', '["Nunca", "Pocas veces al mes", "Una vez a la semana", "Varias veces a la semana", "Diariamente"]', 2, 8),
('mental', '¿Estás aprendiendo algo nuevo activamente?', 'single_choice', '["No", "Lo intenté pero lo dejé", "Sí, ocasionalmente", "Sí, regularmente", "Sí, múltiples cosas"]', 2, 9),
('mental', '¿Qué tan productivo te sientes día a día? (0 = nada productivo, 100 = muy productivo)', 'slider', null, 3, 10),
('mental', '¿Con qué frecuencia te distraes con redes sociales/entretenimiento?', 'single_choice', '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]', 2, 11),
('mental', '¿Qué áreas te gustaría aprender o mejorar?', 'multiple_choice', '["Idiomas", "Programación/Tech", "Negocios/Finanzas", "Arte/Creatividad", "Ciencias", "Habilidades sociales", "Otro"]', 1, 12),
('mental', '¿Cómo calificarías tu concentración y memoria? (0 = muy mala, 100 = excelente)', 'slider', null, 2, 13),
('mental', '¿Qué te impide ser más productivo?', 'multiple_choice', '["Procrastinación", "Falta de objetivos claros", "Distracciones constantes", "Cansancio mental", "Demasiadas responsabilidades", "Nada en particular"]', 2, 14);

-- ❤️ SOCIAL (6 preguntas)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order) VALUES
('social', '¿Cómo te describes socialmente? (0 = muy introvertido, 100 = muy extrovertido)', 'slider', null, 1, 15),
('social', '¿Con qué frecuencia sales con amigos o conocidos?', 'single_choice', '["Nunca o casi nunca", "Una vez al mes", "1-2 veces por semana", "3-4 veces por semana", "Casi todos los días"]', 2, 16),
('social', '¿Cuántos amigos cercanos consideras que tienes?', 'single_choice', '["0-1", "2-3", "4-6", "7-10", "Más de 10"]', 2, 17),
('social', '¿Cómo es tu relación con tu familia?', 'single_choice', '["Muy distante", "Algo distante", "Normal", "Cercana", "Muy cercana"]', 1, 18),
('social', '¿Disfrutas conocer gente nueva?', 'single_choice', '["Para nada", "No mucho", "Es indiferente", "Sí, me gusta", "Me encanta"]', 1, 19),
('social', '¿En qué áreas sociales te gustaría mejorar?', 'multiple_choice', '["Hacer nuevos amigos", "Mantener amistades", "Hablar en público", "Ser más sociable", "Networking profesional", "Ninguna, estoy bien"]', 2, 20);

-- 💰 PROFESIONAL (7 preguntas)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order) VALUES
('professional', '¿Cuál es tu situación profesional actual?', 'single_choice', '["Estudiante", "Empleado tiempo completo", "Freelancer/Autónomo", "Emprendedor", "Desempleado buscando", "Otro"]', 1, 21),
('professional', '¿Qué tan satisfecho estás con tu situación profesional/financiera? (0 = nada, 100 = totalmente)', 'slider', null, 3, 22),
('professional', '¿Tienes metas profesionales claras a largo plazo?', 'single_choice', '["No tengo ni idea", "Tengo algunas ideas vagas", "Tengo ideas pero sin plan", "Tengo metas claras", "Tengo plan detallado"]', 2, 23),
('professional', '¿Cuánto tiempo dedicas a tu desarrollo profesional por semana?', 'single_choice', '["0 horas", "1-2 horas", "3-5 horas", "6-10 horas", "Más de 10 horas"]', 2, 24),
('professional', '¿Qué habilidades profesionales te gustaría desarrollar?', 'multiple_choice', '["Liderazgo", "Comunicación", "Habilidades técnicas", "Ventas/Marketing", "Finanzas personales", "Emprendimiento", "Gestión del tiempo"]', 2, 25),
('professional', '¿Tienes un sistema para gestionar tus finanzas personales?', 'single_choice', '["No, ninguno", "Reviso mi cuenta ocasionalmente", "Sé cuánto gasto", "Tengo presupuesto básico", "Presupuesto detallado + ahorros"]', 2, 26),
('professional', '¿Qué te impide alcanzar tus metas profesionales?', 'multiple_choice', '["Falta de experiencia", "Falta de educación", "Falta de oportunidades", "Miedo al fracaso", "No sé por dónde empezar", "Nada, voy por buen camino"]', 2, 27);

-- 🕉️ ESPIRITUAL/EMOCIONAL (6 preguntas)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order) VALUES
('spiritual', '¿Practicas meditación, mindfulness o actividades similares?', 'single_choice', '["Nunca", "Lo intenté pero lo dejé", "Ocasionalmente", "Regularmente (1-2/semana)", "Diariamente"]', 2, 28),
('spiritual', '¿Cómo calificarías tu bienestar emocional actual? (0 = muy mal, 100 = excelente)', 'slider', null, 3, 29),
('spiritual', '¿Con qué frecuencia te sientes estresado o ansioso?', 'single_choice', '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]', 2, 30),
('spiritual', '¿Tienes prácticas de autocuidado o bienestar regular?', 'multiple_choice', '["Meditación", "Journaling/Diario", "Terapia", "Tiempo en naturaleza", "Hobbies relajantes", "Ninguna todavía"]', 2, 31),
('spiritual', '¿Sientes que tu vida tiene propósito y dirección?', 'single_choice', '["Para nada", "Muy poco", "Algo", "Bastante", "Totalmente"]', 2, 32),
('spiritual', '¿Qué áreas emocionales/espirituales te gustaría trabajar?', 'multiple_choice', '["Ansiedad/Estrés", "Autoestima", "Gratitud", "Paciencia", "Propósito de vida", "Espiritualidad", "Ninguna en particular"]', 2, 33);

-- 🎨 CREATIVO (7 preguntas)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order) VALUES
('creative', '¿Practicas alguna actividad creativa?', 'multiple_choice', '["Música", "Arte/Dibujo", "Escritura", "Fotografía/Video", "Diseño", "Cocina", "Crafts/DIY", "Ninguna"]', 2, 34),
('creative', '¿Con qué frecuencia dedicas tiempo a hobbies creativos?', 'single_choice', '["Nunca", "Pocas veces al mes", "Una vez por semana", "Varias veces por semana", "Diariamente"]', 2, 35),
('creative', '¿Qué tan satisfecho estás con tu expresión creativa? (0 = nada, 100 = totalmente)', 'slider', null, 2, 36),
('creative', '¿Te gustaría aprender o mejorar en alguna disciplina creativa?', 'single_choice', '["No me interesa mucho", "Tengo curiosidad", "Sí, me gustaría intentarlo", "Sí, es una prioridad", "Ya estoy trabajando en ello"]', 1, 37),
('creative', '¿Qué te impide ser más creativo?', 'multiple_choice', '["Falta de tiempo", "Falta de habilidad", "Miedo al juicio", "No sé por dónde empezar", "Falta de inspiración", "Nada"]', 2, 38),
('creative', '¿Disfrutas probar cosas nuevas y salir de tu zona de confort?', 'single_choice', '["Para nada", "No mucho", "A veces", "Frecuentemente", "Me encanta"]', 1, 39),
('creative', '¿Qué áreas creativas te gustaría explorar?', 'multiple_choice', '["Música (instrumento/canto)", "Arte visual", "Escritura creativa", "Fotografía", "Video/Film", "Diseño gráfico/3D", "Cocina gourmet", "Otro"]', 1, 40);

-- =====================================================
-- FUNCTION TO CALCULATE PILLAR SCORES
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_pillar_scores(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scores JSONB;
  v_pillar TEXT;
  v_score NUMERIC;
  v_total_questions INTEGER;
  v_answered_questions INTEGER;
  v_sum NUMERIC;
  v_max_possible NUMERIC;
BEGIN
  v_scores := '{}'::jsonb;
  
  -- Calculate score for each pillar
  FOR v_pillar IN SELECT DISTINCT pillar FROM public.assessment_questions LOOP
    -- Get total questions for this pillar
    SELECT COUNT(*) INTO v_total_questions
    FROM public.assessment_questions
    WHERE pillar = v_pillar;
    
    -- Get answered questions
    SELECT COUNT(*) INTO v_answered_questions
    FROM public.user_assessment_answers ua
    JOIN public.assessment_questions q ON q.id = ua.question_id
    WHERE ua.user_id = p_user_id AND q.pillar = v_pillar;
    
    -- Calculate score (0-100)
    -- For sliders: use answer_value directly
    -- For choices: map to 0-100 scale based on position
    SELECT 
      COALESCE(AVG(
        CASE 
          WHEN q.question_type = 'slider' THEN ua.answer_value
          WHEN q.question_type = 'single_choice' THEN 
            -- Map choice position to 0-100
            (array_position(
              ARRAY(SELECT jsonb_array_elements_text(q.options)), 
              ua.answer_choice
            ) - 1) * 100.0 / (jsonb_array_length(q.options) - 1)
          WHEN q.question_type = 'multiple_choice' THEN 
            -- Number of selections / total options * 100
            jsonb_array_length(ua.answer_choices) * 100.0 / jsonb_array_length(q.options)
        END
      ), 0) INTO v_score
    FROM public.user_assessment_answers ua
    JOIN public.assessment_questions q ON q.id = ua.question_id
    WHERE ua.user_id = p_user_id AND q.pillar = v_pillar;
    
    -- Add to result
    v_scores := v_scores || jsonb_build_object(
      v_pillar, 
      jsonb_build_object(
        'score', ROUND(v_score),
        'answered', v_answered_questions,
        'total', v_total_questions,
        'completed', v_answered_questions >= v_total_questions
      )
    );
  END LOOP;
  
  RETURN v_scores;
END;
$$;

-- =====================================================
-- FUNCTION TO SUBMIT ASSESSMENT ANSWER
-- =====================================================
CREATE OR REPLACE FUNCTION submit_assessment_answer(
  p_user_id UUID,
  p_question_id UUID,
  p_answer_value INTEGER DEFAULT NULL,
  p_answer_choice TEXT DEFAULT NULL,
  p_answer_choices JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert answer
  INSERT INTO public.user_assessment_answers (
    user_id,
    question_id,
    answer_value,
    answer_choice,
    answer_choices,
    completed_at
  )
  VALUES (
    p_user_id,
    p_question_id,
    p_answer_value,
    p_answer_choice,
    p_answer_choices,
    NOW()
  )
  ON CONFLICT (user_id, question_id) 
  DO UPDATE SET
    answer_value = EXCLUDED.answer_value,
    answer_choice = EXCLUDED.answer_choice,
    answer_choices = EXCLUDED.answer_choices,
    completed_at = NOW();
  
  RETURN jsonb_build_object('success', true, 'message', 'Answer saved');
END;
$$;

-- =====================================================
-- ADD ASSESSMENT COMPLETED FLAG TO PROFILES
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pillar_scores JSONB;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_assessment_questions_pillar ON public.assessment_questions(pillar);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_sort ON public.assessment_questions(sort_order);
CREATE INDEX IF NOT EXISTS idx_user_assessment_user ON public.user_assessment_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assessment_question ON public.user_assessment_answers(question_id);
