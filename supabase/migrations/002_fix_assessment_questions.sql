-- =====================================================
-- FIX: ASSESSMENT QUESTIONS CLEANUP
-- This migration cleans up duplicate questions and ensures proper priority values
-- Expected counts after running:
--   Short: 12 questions (core only)
--   Medium: 24 questions (core + extended)
--   Complete: 40 questions (all)
-- =====================================================

-- Add aspirations_completed column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aspirations_completed BOOLEAN DEFAULT FALSE;

-- First, let's see what we have (run this query first to check)
-- SELECT priority, COUNT(*) FROM assessment_questions GROUP BY priority;

-- Step 1: Delete ALL assessment questions to start fresh
TRUNCATE TABLE public.user_assessment_answers CASCADE;
DELETE FROM public.assessment_questions;

-- Step 2: Re-insert all 40 questions with correct priorities
-- 💪 FÍSICO (7 preguntas: 2 core, 2 extended, 3 optional)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order, priority) VALUES
('physical', '¿Con qué frecuencia haces ejercicio?', 'single_choice', '["Nunca", "1-2 veces al mes", "1-2 veces por semana", "3-4 veces por semana", "5+ veces por semana"]', 3, 1, 'core'),
('physical', '¿Qué tipo de ejercicio prefieres?', 'multiple_choice', '["Gimnasio/Pesas", "Cardio (correr, nadar)", "Deportes de equipo", "Yoga/Pilates", "Calistenia", "Ninguno todavía"]', 1, 2, 'optional'),
('physical', '¿Cómo calificarías tu alimentación actual? (0 = muy mala, 100 = excelente)', 'slider', null, 2, 3, 'core'),
('physical', '¿Cuántas horas duermes en promedio por noche?', 'single_choice', '["Menos de 5", "5-6 horas", "6-7 horas", "7-8 horas", "Más de 8"]', 2, 4, 'extended'),
('physical', '¿Cuántos vasos de agua bebes al día?', 'single_choice', '["0-2", "3-4", "5-6", "7-8", "9+"]', 1, 5, 'optional'),
('physical', '¿Cómo te sientes físicamente en general? (0 = terrible, 100 = excelente)', 'slider', null, 2, 6, 'extended'),
('physical', '¿Cuáles son tus principales obstáculos para estar más activo?', 'multiple_choice', '["Falta de tiempo", "Falta de motivación", "No sé por dónde empezar", "Lesiones/dolor", "Costo de gimnasio", "Ninguno"]', 2, 7, 'optional');

-- 🧠 MENTAL (7 preguntas: 2 core, 2 extended, 3 optional)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order, priority) VALUES
('mental', '¿Con qué frecuencia lees libros, artículos o contenido educativo?', 'single_choice', '["Nunca", "Pocas veces al mes", "Una vez a la semana", "Varias veces a la semana", "Diariamente"]', 2, 8, 'core'),
('mental', '¿Estás aprendiendo algo nuevo activamente?', 'single_choice', '["No", "Lo intenté pero lo dejé", "Sí, ocasionalmente", "Sí, regularmente", "Sí, múltiples cosas"]', 2, 9, 'extended'),
('mental', '¿Qué tan productivo te sientes día a día? (0 = nada productivo, 100 = muy productivo)', 'slider', null, 3, 10, 'core'),
('mental', '¿Con qué frecuencia te distraes con redes sociales/entretenimiento?', 'single_choice', '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]', 2, 11, 'optional'),
('mental', '¿Qué áreas te gustaría aprender o mejorar?', 'multiple_choice', '["Idiomas", "Programación/Tech", "Negocios/Finanzas", "Arte/Creatividad", "Ciencias", "Habilidades sociales", "Otro"]', 1, 12, 'optional'),
('mental', '¿Cómo calificarías tu concentración y memoria? (0 = muy mala, 100 = excelente)', 'slider', null, 2, 13, 'extended'),
('mental', '¿Qué te impide ser más productivo?', 'multiple_choice', '["Procrastinación", "Falta de objetivos claros", "Distracciones constantes", "Cansancio mental", "Demasiadas responsabilidades", "Nada en particular"]', 2, 14, 'optional');

-- ❤️ SOCIAL (6 preguntas: 2 core, 2 extended, 2 optional)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order, priority) VALUES
('social', '¿Cómo te describes socialmente? (0 = muy introvertido, 100 = muy extrovertido)', 'slider', null, 1, 15, 'core'),
('social', '¿Con qué frecuencia sales con amigos o conocidos?', 'single_choice', '["Nunca o casi nunca", "Una vez al mes", "1-2 veces por semana", "3-4 veces por semana", "Casi todos los días"]', 2, 16, 'core'),
('social', '¿Cuántos amigos cercanos consideras que tienes?', 'single_choice', '["0-1", "2-3", "4-6", "7-10", "Más de 10"]', 2, 17, 'extended'),
('social', '¿Cómo es tu relación con tu familia?', 'single_choice', '["Muy distante", "Algo distante", "Normal", "Cercana", "Muy cercana"]', 1, 18, 'optional'),
('social', '¿Disfrutas conocer gente nueva?', 'single_choice', '["Para nada", "No mucho", "Es indiferente", "Sí, me gusta", "Me encanta"]', 1, 19, 'extended'),
('social', '¿En qué áreas sociales te gustaría mejorar?', 'multiple_choice', '["Hacer nuevos amigos", "Mantener amistades", "Hablar en público", "Ser más sociable", "Networking profesional", "Ninguna, estoy bien"]', 2, 20, 'optional');

-- 💰 PROFESIONAL (7 preguntas: 2 core, 2 extended, 3 optional)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order, priority) VALUES
('professional', '¿Cuál es tu situación profesional actual?', 'single_choice', '["Estudiante", "Empleado tiempo completo", "Empleado medio tiempo", "Freelancer/Autónomo", "Emprendedor", "Desempleado buscando", "Otro"]', 1, 21, 'core'),
('professional', '¿Qué tan satisfecho estás con tu situación profesional/financiera? (0 = nada, 100 = totalmente)', 'slider', null, 3, 22, 'core'),
('professional', '¿Tienes metas profesionales claras a largo plazo?', 'single_choice', '["No tengo ni idea", "Tengo algunas ideas vagas", "Tengo ideas pero sin plan", "Tengo metas claras", "Tengo plan detallado"]', 2, 23, 'extended'),
('professional', '¿Cuánto tiempo dedicas a tu desarrollo profesional por semana?', 'single_choice', '["0 horas", "1-2 horas", "3-5 horas", "6-10 horas", "Más de 10 horas"]', 2, 24, 'optional'),
('professional', '¿Qué habilidades profesionales te gustaría desarrollar?', 'multiple_choice', '["Liderazgo", "Comunicación", "Habilidades técnicas", "Ventas/Marketing", "Finanzas personales", "Emprendimiento", "Gestión del tiempo"]', 2, 25, 'optional'),
('professional', '¿Tienes un sistema para gestionar tus finanzas personales?', 'single_choice', '["No, ninguno", "Reviso mi cuenta ocasionalmente", "Sé cuánto gasto", "Tengo presupuesto básico", "Presupuesto detallado + ahorros"]', 2, 26, 'extended'),
('professional', '¿Qué te impide alcanzar tus metas profesionales?', 'multiple_choice', '["Falta de experiencia", "Falta de educación", "Falta de oportunidades", "Miedo al fracaso", "No sé por dónde empezar", "Nada, voy por buen camino"]', 2, 27, 'optional');

-- 🕉️ ESPIRITUAL/EMOCIONAL (6 preguntas: 2 core, 2 extended, 2 optional)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order, priority) VALUES
('spiritual', '¿Practicas meditación, mindfulness o actividades similares?', 'single_choice', '["Nunca", "Lo intenté pero lo dejé", "Ocasionalmente", "Regularmente (1-2/semana)", "Diariamente"]', 2, 28, 'core'),
('spiritual', '¿Cómo calificarías tu bienestar emocional actual? (0 = muy mal, 100 = excelente)', 'slider', null, 3, 29, 'core'),
('spiritual', '¿Con qué frecuencia te sientes estresado o ansioso?', 'single_choice', '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]', 2, 30, 'extended'),
('spiritual', '¿Tienes prácticas de autocuidado o bienestar regular?', 'multiple_choice', '["Meditación", "Journaling/Diario", "Terapia", "Tiempo en naturaleza", "Hobbies relajantes", "Ninguna todavía"]', 2, 31, 'optional'),
('spiritual', '¿Sientes que tu vida tiene propósito y dirección?', 'single_choice', '["Para nada", "Muy poco", "Algo", "Bastante", "Totalmente"]', 2, 32, 'extended'),
('spiritual', '¿Qué áreas emocionales/espirituales te gustaría trabajar?', 'multiple_choice', '["Ansiedad/Estrés", "Autoestima", "Gratitud", "Paciencia", "Propósito de vida", "Espiritualidad", "Ninguna en particular"]', 2, 33, 'optional');

-- 🎨 CREATIVO (7 preguntas: 2 core, 2 extended, 3 optional)
INSERT INTO public.assessment_questions (pillar, question_text, question_type, options, weight, sort_order, priority) VALUES
('creative', '¿Practicas alguna actividad creativa?', 'multiple_choice', '["Música", "Arte/Dibujo", "Escritura", "Fotografía/Video", "Diseño", "Cocina", "Crafts/DIY", "Ninguna"]', 2, 34, 'core'),
('creative', '¿Con qué frecuencia dedicas tiempo a hobbies creativos?', 'single_choice', '["Nunca", "Pocas veces al mes", "Una vez por semana", "Varias veces por semana", "Diariamente"]', 2, 35, 'extended'),
('creative', '¿Qué tan satisfecho estás con tu expresión creativa? (0 = nada, 100 = totalmente)', 'slider', null, 2, 36, 'core'),
('creative', '¿Te gustaría aprender o mejorar en alguna disciplina creativa?', 'single_choice', '["No me interesa mucho", "Tengo curiosidad", "Sí, me gustaría intentarlo", "Sí, es una prioridad", "Ya estoy trabajando en ello"]', 1, 37, 'extended'),
('creative', '¿Qué te impide ser más creativo?', 'multiple_choice', '["Falta de tiempo", "Falta de habilidad", "Miedo al juicio", "No sé por dónde empezar", "Falta de inspiración", "Nada"]', 2, 38, 'optional'),
('creative', '¿Disfrutas probar cosas nuevas y salir de tu zona de confort?', 'single_choice', '["Para nada", "No mucho", "A veces", "Frecuentemente", "Me encanta"]', 1, 39, 'optional'),
('creative', '¿Qué áreas creativas te gustaría explorar?', 'multiple_choice', '["Música (instrumento/canto)", "Arte visual", "Escritura creativa", "Fotografía", "Video/Film", "Diseño gráfico/3D", "Cocina gourmet", "Otro"]', 1, 40, 'optional');

-- Verify the counts
-- Run these queries to verify:
-- Total questions: 40
SELECT 'Total questions' as check_type, COUNT(*) as count FROM assessment_questions;

-- Core questions (for short assessment): should be 12 (2 per pillar)
SELECT 'Core questions (short)' as check_type, COUNT(*) as count FROM assessment_questions WHERE priority = 'core';

-- Core + Extended (for medium): should be 24 (4 per pillar)
SELECT 'Core + Extended (medium)' as check_type, COUNT(*) as count FROM assessment_questions WHERE priority IN ('core', 'extended');

-- Distribution by pillar
SELECT pillar, priority, COUNT(*) 
FROM assessment_questions 
GROUP BY pillar, priority 
ORDER BY pillar, priority;
