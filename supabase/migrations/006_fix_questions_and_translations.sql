-- =====================================================
-- Migration 006: Fix duplicate questions + Add translations
-- RUN THIS TO FIX THE DUPLICATE ISSUE
-- =====================================================

-- =====================================================
-- 1. ADD ENGLISH TRANSLATION COLUMN
-- =====================================================
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS question_text_en TEXT;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS options_en JSONB;

-- =====================================================
-- 2. DELETE ALL PHYSICAL SELF-CARE QUESTIONS (duplicated)
-- Then re-insert correctly
-- =====================================================
DELETE FROM assessment_questions 
WHERE pillar = 'physical' 
AND question_text LIKE '%rutina de cuidado personal%';

DELETE FROM assessment_questions 
WHERE pillar = 'physical' 
AND question_text LIKE '%aspectos de tu cuidado personal%';

DELETE FROM assessment_questions 
WHERE pillar = 'physical' 
AND question_text LIKE '%cuidas tu apariencia personal%';

-- =====================================================
-- 3. DELETE AND RE-INSERT SPIRITUAL QUESTIONS (clean slate)
-- =====================================================
DELETE FROM assessment_questions WHERE pillar = 'spiritual';

-- =====================================================
-- 4. INSERT SPIRITUAL QUESTIONS WITH TRANSLATIONS
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order, priority) VALUES
-- Q1: Spirituality type
('spiritual', 
 '¿Cómo describes tu espiritualidad o práctica de fe?', 
 'How would you describe your spirituality or faith practice?',
 'single_choice', 
 '["Cristiano/a (oración, iglesia)", "Católico/a", "Otra religión organizada", "Espiritual pero no religioso", "Meditación/Mindfulness secular", "Conexión con la naturaleza", "Filosofía de vida (estoicismo, etc.)", "No tengo prácticas espirituales", "Estoy explorando"]',
 '["Christian (prayer, church)", "Catholic", "Other organized religion", "Spiritual but not religious", "Secular meditation/mindfulness", "Connection with nature", "Life philosophy (stoicism, etc.)", "I don''t have spiritual practices", "I''m exploring"]',
 3, 28, 'core'),

-- Q2: Frequency
('spiritual', 
 '¿Con qué frecuencia practicas actividades espirituales o de reflexión?', 
 'How often do you practice spiritual or reflective activities?',
 'single_choice', 
 '["Nunca", "Ocasionalmente (algunas veces al mes)", "Semanalmente", "Varias veces a la semana", "Diariamente"]',
 '["Never", "Occasionally (a few times a month)", "Weekly", "Several times a week", "Daily"]',
 2, 29, 'core'),

-- Q3: Practices
('spiritual', 
 '¿Qué prácticas espirituales o de bienestar realizas?', 
 'What spiritual or wellness practices do you do?',
 'multiple_choice', 
 '["Oración", "Lectura de textos sagrados/espirituales", "Asistencia a iglesia/templo/comunidad", "Meditación", "Mindfulness/Respiración consciente", "Journaling/Diario reflexivo", "Tiempo en naturaleza", "Gratitud diaria", "Ninguna todavía"]',
 '["Prayer", "Reading sacred/spiritual texts", "Church/temple/community attendance", "Meditation", "Mindfulness/Conscious breathing", "Journaling/Reflective diary", "Time in nature", "Daily gratitude", "None yet"]',
 2, 30, 'extended'),

-- Q4: Emotional wellbeing (slider)
('spiritual', 
 '¿Cómo calificarías tu bienestar emocional actual? (0 = muy mal, 100 = excelente)', 
 'How would you rate your current emotional wellbeing? (0 = very poor, 100 = excellent)',
 'slider', null, null, 3, 31, 'extended'),

-- Q5: Stress frequency
('spiritual', 
 '¿Con qué frecuencia te sientes estresado o ansioso?', 
 'How often do you feel stressed or anxious?',
 'single_choice', 
 '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]',
 '["All the time", "Very frequently", "Sometimes", "Rarely", "Almost never"]',
 2, 32, 'optional'),

-- Q6: Life purpose
('spiritual', 
 '¿Sientes que tu vida tiene propósito y dirección?', 
 'Do you feel your life has purpose and direction?',
 'single_choice', 
 '["Para nada", "Muy poco", "Algo", "Bastante", "Totalmente"]',
 '["Not at all", "Very little", "Somewhat", "Quite a bit", "Completely"]',
 3, 33, 'optional'),

-- Q7: Growth areas
('spiritual', 
 '¿En qué áreas de tu vida interior te gustaría crecer?', 
 'In which areas of your inner life would you like to grow?',
 'multiple_choice', 
 '["Fe/Conexión espiritual", "Paz interior/Calma", "Gratitud", "Perdón", "Paciencia", "Propósito de vida", "Manejo del estrés", "Autoconocimiento", "Comunidad/Pertenencia"]',
 '["Faith/Spiritual connection", "Inner peace/Calm", "Gratitude", "Forgiveness", "Patience", "Life purpose", "Stress management", "Self-awareness", "Community/Belonging"]',
 2, 34, 'optional'),

-- Q8: Obstacles
('spiritual', 
 '¿Qué obstáculos enfrentas en tu vida espiritual/emocional?', 
 'What obstacles do you face in your spiritual/emotional life?',
 'multiple_choice', 
 '["Falta de tiempo", "Dudas o incertidumbre", "No tengo comunidad/grupo", "Heridas del pasado", "Distracciones constantes", "No sé cómo empezar", "Ninguno en particular"]',
 '["Lack of time", "Doubts or uncertainty", "I don''t have a community/group", "Past wounds", "Constant distractions", "I don''t know how to start", "None in particular"]',
 2, 35, 'optional');

-- =====================================================
-- 5. INSERT PHYSICAL SELF-CARE QUESTIONS WITH TRANSLATIONS
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order, priority) VALUES
-- Self-care routine
('physical', 
 '¿Cómo calificarías tu rutina de cuidado personal? (higiene, skincare, etc.)', 
 'How would you rate your personal care routine? (hygiene, skincare, etc.)',
 'single_choice', 
 '["No tengo rutina", "Básica (lo mínimo)", "Regular (ducha, dientes, básico)", "Buena (incluyo skincare/grooming)", "Excelente (rutina completa)"]',
 '["I don''t have a routine", "Basic (bare minimum)", "Regular (shower, teeth, basic)", "Good (include skincare/grooming)", "Excellent (complete routine)"]',
 2, 8, 'extended'),

-- Areas to improve
('physical', 
 '¿Qué aspectos de tu cuidado personal te gustaría mejorar?', 
 'Which aspects of your personal care would you like to improve?',
 'multiple_choice', 
 '["Cuidado de la piel (skincare)", "Cuidado del cabello", "Higiene dental", "Vestimenta/Imagen", "Postura corporal", "Hidratación", "Nada en particular"]',
 '["Skin care (skincare)", "Hair care", "Dental hygiene", "Clothing/Image", "Body posture", "Hydration", "Nothing in particular"]',
 1, 9, 'optional'),

-- Frequency of care
('physical', 
 '¿Con qué frecuencia cuidas tu apariencia personal de forma intencional?', 
 'How often do you intentionally take care of your personal appearance?',
 'single_choice', 
 '["Casi nunca", "Solo para ocasiones especiales", "Algunas veces a la semana", "Casi todos los días", "Todos los días, es prioritario"]',
 '["Almost never", "Only for special occasions", "A few times a week", "Almost every day", "Every day, it''s a priority"]',
 2, 10, 'optional');

-- =====================================================
-- 6. UPDATE ALL EXISTING QUESTIONS WITH TRANSLATIONS
-- =====================================================

-- 💪 PHYSICAL QUESTIONS (original 7)
UPDATE assessment_questions SET 
  question_text_en = 'How often do you exercise?',
  options_en = '["Never", "1-2 times a month", "1-2 times a week", "3-4 times a week", "5+ times a week"]'
WHERE question_text = '¿Con qué frecuencia haces ejercicio?';

UPDATE assessment_questions SET 
  question_text_en = 'What type of exercise do you prefer?',
  options_en = '["Gym/Weights", "Cardio (running, swimming)", "Team sports", "Yoga/Pilates", "Calisthenics", "None yet"]'
WHERE question_text = '¿Qué tipo de ejercicio prefieres?';

UPDATE assessment_questions SET 
  question_text_en = 'How would you rate your current diet? (0 = very poor, 100 = excellent)'
WHERE question_text LIKE '%Cómo calificarías tu alimentación actual%';

UPDATE assessment_questions SET 
  question_text_en = 'How many hours do you sleep on average per night?',
  options_en = '["Less than 5", "5-6 hours", "6-7 hours", "7-8 hours", "More than 8"]'
WHERE question_text = '¿Cuántas horas duermes en promedio por noche?';

UPDATE assessment_questions SET 
  question_text_en = 'How many glasses of water do you drink per day?',
  options_en = '["0-2", "3-4", "5-6", "7-8", "9+"]'
WHERE question_text = '¿Cuántos vasos de agua bebes al día?';

UPDATE assessment_questions SET 
  question_text_en = 'How do you feel physically overall? (0 = terrible, 100 = excellent)'
WHERE question_text LIKE '%Cómo te sientes físicamente en general%';

UPDATE assessment_questions SET 
  question_text_en = 'What are your main obstacles to being more active?',
  options_en = '["Lack of time", "Lack of motivation", "Don''t know where to start", "Injuries/pain", "Gym cost", "None"]'
WHERE question_text LIKE '%obstáculos para estar más activo%';

-- 🧠 MENTAL QUESTIONS (7)
UPDATE assessment_questions SET 
  question_text_en = 'How often do you read books, articles, or educational content?',
  options_en = '["Never", "A few times a month", "Once a week", "Several times a week", "Daily"]'
WHERE question_text LIKE '%frecuencia lees libros%';

UPDATE assessment_questions SET 
  question_text_en = 'Are you actively learning something new?',
  options_en = '["No", "I tried but quit", "Yes, occasionally", "Yes, regularly", "Yes, multiple things"]'
WHERE question_text = '¿Estás aprendiendo algo nuevo activamente?';

UPDATE assessment_questions SET 
  question_text_en = 'How productive do you feel day to day? (0 = not at all, 100 = very productive)'
WHERE question_text LIKE '%productivo te sientes día a día%';

UPDATE assessment_questions SET 
  question_text_en = 'How often do you get distracted by social media/entertainment?',
  options_en = '["All the time", "Very frequently", "Sometimes", "Rarely", "Almost never"]'
WHERE question_text LIKE '%distraes con redes sociales%';

UPDATE assessment_questions SET 
  question_text_en = 'What areas would you like to learn or improve?',
  options_en = '["Languages", "Programming/Tech", "Business/Finance", "Art/Creativity", "Sciences", "Social skills", "Other"]'
WHERE question_text LIKE '%áreas te gustaría aprender%';

UPDATE assessment_questions SET 
  question_text_en = 'How would you rate your concentration and memory? (0 = very poor, 100 = excellent)'
WHERE question_text LIKE '%concentración y memoria%';

UPDATE assessment_questions SET 
  question_text_en = 'What prevents you from being more productive?',
  options_en = '["Procrastination", "Lack of clear goals", "Constant distractions", "Mental fatigue", "Too many responsibilities", "Nothing in particular"]'
WHERE question_text LIKE '%impide ser más productivo%';

-- ❤️ SOCIAL QUESTIONS (6)
UPDATE assessment_questions SET 
  question_text_en = 'How would you describe yourself socially? (0 = very introverted, 100 = very extroverted)'
WHERE question_text LIKE '%describes socialmente%';

UPDATE assessment_questions SET 
  question_text_en = 'How often do you go out with friends or acquaintances?',
  options_en = '["Never or almost never", "Once a month", "1-2 times a week", "3-4 times a week", "Almost every day"]'
WHERE question_text LIKE '%frecuencia sales con amigos%';

UPDATE assessment_questions SET 
  question_text_en = 'How many close friends do you consider you have?',
  options_en = '["0-1", "2-3", "4-6", "7-10", "More than 10"]'
WHERE question_text LIKE '%amigos cercanos consideras%';

UPDATE assessment_questions SET 
  question_text_en = 'How is your relationship with your family?',
  options_en = '["Very distant", "Somewhat distant", "Normal", "Close", "Very close"]'
WHERE question_text LIKE '%relación con tu familia%';

UPDATE assessment_questions SET 
  question_text_en = 'Do you enjoy meeting new people?',
  options_en = '["Not at all", "Not much", "Indifferent", "Yes, I like it", "I love it"]'
WHERE question_text = '¿Disfrutas conocer gente nueva?';

UPDATE assessment_questions SET 
  question_text_en = 'In which social areas would you like to improve?',
  options_en = '["Making new friends", "Maintaining friendships", "Public speaking", "Being more sociable", "Professional networking", "None, I''m fine"]'
WHERE question_text LIKE '%áreas sociales te gustaría mejorar%';

-- 💼 PROFESSIONAL QUESTIONS (7)
UPDATE assessment_questions SET 
  question_text_en = 'What is your current professional situation?',
  options_en = '["Student", "Full-time employee", "Freelancer/Self-employed", "Entrepreneur", "Unemployed looking", "Other"]'
WHERE question_text LIKE '%situación profesional actual%';

UPDATE assessment_questions SET 
  question_text_en = 'How satisfied are you with your professional/financial situation? (0 = not at all, 100 = completely)'
WHERE question_text LIKE '%satisfecho estás con tu situación profesional%';

UPDATE assessment_questions SET 
  question_text_en = 'Do you have clear long-term professional goals?',
  options_en = '["I have no idea", "I have some vague ideas", "I have ideas but no plan", "I have clear goals", "I have a detailed plan"]'
WHERE question_text LIKE '%metas profesionales claras%';

UPDATE assessment_questions SET 
  question_text_en = 'How much time do you dedicate to your professional development per week?',
  options_en = '["0 hours", "1-2 hours", "3-5 hours", "6-10 hours", "More than 10 hours"]'
WHERE question_text LIKE '%tiempo dedicas a tu desarrollo profesional%';

UPDATE assessment_questions SET 
  question_text_en = 'What professional skills would you like to develop?',
  options_en = '["Leadership", "Communication", "Technical skills", "Sales/Marketing", "Personal finance", "Entrepreneurship", "Time management"]'
WHERE question_text LIKE '%habilidades profesionales te gustaría desarrollar%';

UPDATE assessment_questions SET 
  question_text_en = 'Do you have a system for managing your personal finances?',
  options_en = '["No, none", "I check my account occasionally", "I know how much I spend", "I have a basic budget", "Detailed budget + savings"]'
WHERE question_text LIKE '%sistema para gestionar tus finanzas%';

UPDATE assessment_questions SET 
  question_text_en = 'What prevents you from reaching your professional goals?',
  options_en = '["Lack of experience", "Lack of education", "Lack of opportunities", "Fear of failure", "Don''t know where to start", "Nothing, I''m on track"]'
WHERE question_text LIKE '%impide alcanzar tus metas profesionales%';

-- 🎨 CREATIVE QUESTIONS (7)
UPDATE assessment_questions SET 
  question_text_en = 'Do you practice any creative activity?',
  options_en = '["Music", "Art/Drawing", "Writing", "Photography/Video", "Design", "Cooking", "Crafts/DIY", "None"]'
WHERE question_text = '¿Practicas alguna actividad creativa?';

UPDATE assessment_questions SET 
  question_text_en = 'How often do you dedicate time to creative hobbies?',
  options_en = '["Never", "A few times a month", "Once a week", "Several times a week", "Daily"]'
WHERE question_text LIKE '%frecuencia dedicas tiempo a hobbies creativos%';

UPDATE assessment_questions SET 
  question_text_en = 'How satisfied are you with your creative expression? (0 = not at all, 100 = completely)'
WHERE question_text LIKE '%satisfecho estás con tu expresión creativa%';

UPDATE assessment_questions SET 
  question_text_en = 'Would you like to learn or improve in any creative discipline?',
  options_en = '["Not very interested", "I''m curious", "Yes, I''d like to try", "Yes, it''s a priority", "Already working on it"]'
WHERE question_text LIKE '%aprender o mejorar en alguna disciplina creativa%';

UPDATE assessment_questions SET 
  question_text_en = 'What prevents you from being more creative?',
  options_en = '["Lack of time", "Lack of skill", "Fear of judgment", "Don''t know where to start", "Lack of inspiration", "Nothing"]'
WHERE question_text LIKE '%impide ser más creativo%';

UPDATE assessment_questions SET 
  question_text_en = 'Do you enjoy trying new things and stepping out of your comfort zone?',
  options_en = '["Not at all", "Not much", "Sometimes", "Frequently", "I love it"]'
WHERE question_text LIKE '%probar cosas nuevas y salir de tu zona%';

UPDATE assessment_questions SET 
  question_text_en = 'What creative areas would you like to explore?',
  options_en = '["Music (instrument/singing)", "Visual art", "Creative writing", "Photography", "Video/Film", "Graphic/3D design", "Gourmet cooking", "Other"]'
WHERE question_text LIKE '%áreas creativas te gustaría explorar%';

-- =====================================================
-- 7. LEVEL CALCULATION BASED ON PILLARS + ASPIRATIONS
-- =====================================================

-- Add active_pillars column to track which pillars user wants to focus on
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_pillars TEXT[] DEFAULT ARRAY['physical', 'mental', 'social', 'professional', 'spiritual', 'creative'];

-- Function to calculate user level based on weighted pillar averages
CREATE OR REPLACE FUNCTION calculate_user_level(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  pillar_scores JSONB;
  active_pillars_arr TEXT[];
  total_score NUMERIC := 0;
  pillar_count INTEGER := 0;
  pillar_key TEXT;
  pillar_value INTEGER;
  avg_score NUMERIC;
  calculated_level INTEGER;
BEGIN
  -- Get user's pillar scores and active pillars
  SELECT 
    p.pillar_scores,
    COALESCE(p.active_pillars, ARRAY['physical', 'mental', 'social', 'professional', 'spiritual', 'creative'])
  INTO pillar_scores, active_pillars_arr
  FROM profiles p
  WHERE p.id = p_user_id;
  
  -- If no pillar scores, return level 1
  IF pillar_scores IS NULL THEN
    RETURN 1;
  END IF;
  
  -- Calculate weighted average of active pillars only
  FOREACH pillar_key IN ARRAY active_pillars_arr
  LOOP
    pillar_value := COALESCE((pillar_scores->>pillar_key)::INTEGER, 50);
    total_score := total_score + pillar_value;
    pillar_count := pillar_count + 1;
  END LOOP;
  
  -- Avoid division by zero
  IF pillar_count = 0 THEN
    RETURN 1;
  END IF;
  
  -- Calculate average (0-100 scale)
  avg_score := total_score / pillar_count;
  
  -- Convert to level (1-100 based on score)
  -- Score 0-10 = Level 1-10, Score 11-20 = Level 11-20, etc.
  calculated_level := GREATEST(1, LEAST(100, CEIL(avg_score)));
  
  RETURN calculated_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user level (call this after pillar changes)
CREATE OR REPLACE FUNCTION update_user_level(p_user_id UUID)
RETURNS void AS $$
DECLARE
  new_level INTEGER;
BEGIN
  new_level := calculate_user_level(p_user_id);
  
  UPDATE profiles
  SET level = new_level, updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update increment_pillar_score to also update level
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
  
  -- Also update the user's overall level
  PERFORM update_user_level(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_user_level(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_level(UUID) TO authenticated;

-- =====================================================
-- 8. VERIFY
-- =====================================================
SELECT pillar, COUNT(*) as count, 
       COUNT(question_text_en) as has_translation
FROM assessment_questions 
GROUP BY pillar 
ORDER BY pillar;
