-- =====================================================
-- Migration: Restore Aspirational Questions (Spanish)
-- Run this to restore the correct aspirational questions
-- =====================================================

-- First, delete all existing aspirational questions
DELETE FROM public.aspirational_questions;

-- Re-insert the correct Spanish aspirational questions
INSERT INTO public.aspirational_questions (pillar, question_text, question_type, options, placeholder, sort_order) VALUES

-- General (preguntas sobre tu visión general)
('general', '¿Cómo te gustaría que te describieran en 1 año?', 'text', null, 'Ej: Una persona más disciplinada, saludable y exitosa...', 1),
('general', '¿Cuál es tu mayor meta para este año?', 'text', null, 'Ej: Conseguir un mejor trabajo, bajar 10kg, aprender un idioma...', 2),

-- Physical (cuerpo y salud)
('physical', '¿Cómo quieres verte y sentirte físicamente?', 'text', null, 'Ej: Más delgado, con más músculo, con más energía...', 3),
('physical', '¿Qué hábitos físicos quieres tener?', 'multiple_choice', '["Hacer ejercicio diario", "Comer más saludable", "Dormir 8 horas", "Beber más agua", "Meditar/Yoga", "Dejar vicios (alcohol, cigarro, etc)"]', null, 4),

-- Mental (mente y aprendizaje)
('mental', '¿Qué quieres aprender o dominar?', 'text', null, 'Ej: Programación, un idioma, finanzas, un instrumento...', 5),
('mental', '¿Qué tipo de persona quieres ser mentalmente?', 'multiple_choice', '["Más enfocado/productivo", "Más tranquilo/menos ansioso", "Más creativo", "Más disciplinado", "Mejor memoria/concentración", "Más curioso/aprendiz"]', null, 6),

-- Social (relaciones)
('social', '¿Cómo quieres que sean tus relaciones?', 'text', null, 'Ej: Tener más amigos, mejorar mi relación de pareja, ser más sociable...', 7),
('social', '¿Qué habilidades sociales quieres desarrollar?', 'multiple_choice', '["Hablar en público", "Hacer networking", "Ser más extrovertido", "Escuchar mejor", "Resolver conflictos", "Liderar equipos"]', null, 8),

-- Professional (trabajo y dinero)
('professional', '¿Dónde quieres estar profesionalmente en 1 año?', 'text', null, 'Ej: Con un mejor salario, con mi propio negocio, en otra industria...', 9),
('professional', '¿Qué ingresos mensuales te gustaría tener?', 'single_choice', '["Lo mismo que ahora", "25% más", "50% más", "El doble", "Más del doble"]', null, 10),

-- Spiritual (paz interior y propósito)
('spiritual', '¿Qué paz interior o propósito buscas?', 'text', null, 'Ej: Menos estrés, más gratitud, encontrar mi propósito...', 11),
('spiritual', '¿Qué prácticas de bienestar te gustaría tener?', 'multiple_choice', '["Meditación diaria", "Journaling", "Gratitud", "Terapia", "Conexión espiritual", "Tiempo en naturaleza"]', null, 12),

-- Creative (expresión y creatividad)
('creative', '¿Qué quieres crear o expresar?', 'text', null, 'Ej: Escribir un libro, aprender música, hacer videos...', 13),
('creative', '¿Qué habilidades creativas te gustaría desarrollar?', 'multiple_choice', '["Música/instrumento", "Dibujo/pintura", "Escritura", "Fotografía/video", "Diseño", "Cocina", "Crafts/DIY"]', null, 14);

-- Verify the insert worked
SELECT pillar, question_text, question_type, sort_order 
FROM public.aspirational_questions 
ORDER BY sort_order;
