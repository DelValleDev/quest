-- =====================================================
-- QUEST APP - UPDATED SPIRITUAL QUESTIONS (Inclusive)
-- Run this AFTER assessment.sql to update spiritual questions
-- =====================================================

-- First, delete old spiritual questions
DELETE FROM public.assessment_questions WHERE pillar = 'spiritual';

-- 🕉️ ESPIRITUAL (8 preguntas - ahora inclusivas)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order) VALUES

-- Primera pregunta: elegir tipo de espiritualidad
('spiritual', '¿Cómo describes tu espiritualidad o práctica de fe?', 'single_choice', 
 '["Cristiano/a (oración, iglesia)", "Católico/a", "Otra religión organizada", "Espiritual pero no religioso", "Meditación/Mindfulness secular", "Conexión con la naturaleza", "Filosofía de vida (estoicismo, etc.)", "No tengo prácticas espirituales", "Estoy explorando"]', 
 3, 28),

('spiritual', '¿Con qué frecuencia practicas actividades espirituales o de reflexión?', 'single_choice', 
 '["Nunca", "Ocasionalmente (algunas veces al mes)", "Semanalmente", "Varias veces a la semana", "Diariamente"]', 
 2, 29),

('spiritual', '¿Qué prácticas espirituales o de bienestar realizas?', 'multiple_choice', 
 '["Oración", "Lectura de textos sagrados/espirituales", "Asistencia a iglesia/templo/comunidad", "Meditación", "Mindfulness/Respiración consciente", "Journaling/Diario reflexivo", "Tiempo en naturaleza", "Gratitud diaria", "Ninguna todavía"]', 
 2, 30),

('spiritual', '¿Cómo calificarías tu bienestar emocional actual? (0 = muy mal, 100 = excelente)', 'slider', null, 3, 31),

('spiritual', '¿Con qué frecuencia te sientes estresado o ansioso?', 'single_choice', 
 '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]', 
 2, 32),

('spiritual', '¿Sientes que tu vida tiene propósito y dirección?', 'single_choice', 
 '["Para nada", "Muy poco", "Algo", "Bastante", "Totalmente"]', 
 3, 33),

('spiritual', '¿En qué áreas de tu vida interior te gustaría crecer?', 'multiple_choice', 
 '["Fe/Conexión espiritual", "Paz interior/Calma", "Gratitud", "Perdón", "Paciencia", "Propósito de vida", "Manejo del estrés", "Autoconocimiento", "Comunidad/Pertenencia"]', 
 2, 34),

('spiritual', '¿Qué obstáculos enfrentas en tu vida espiritual/emocional?', 'multiple_choice', 
 '["Falta de tiempo", "Dudas o incertidumbre", "No tengo comunidad/grupo", "Heridas del pasado", "Distracciones constantes", "No sé cómo empezar", "Ninguno en particular"]', 
 2, 35);

-- Update sort orders for creative questions (they come after spiritual)
UPDATE public.assessment_questions 
SET sort_order = sort_order + 2 
WHERE pillar = 'creative';
