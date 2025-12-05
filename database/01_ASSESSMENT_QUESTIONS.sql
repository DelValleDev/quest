-- =====================================================
-- ASSESSMENT QUESTIONS - COMPLETE WITH TRANSLATIONS
-- =====================================================
-- This file contains ALL assessment questions with EN/ES translations
-- Run this AFTER 00_MASTER_SCHEMA.sql
-- =====================================================

-- Clear existing questions for clean insert
DELETE FROM assessment_questions;

-- =====================================================
-- 💪 PHYSICAL PILLAR (10 questions)
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order, priority) VALUES

-- P1: Exercise frequency
('physical', 
 '¿Con qué frecuencia haces ejercicio?', 
 'How often do you exercise?',
 'single_choice', 
 '["Nunca", "1-2 veces al mes", "1-2 veces por semana", "3-4 veces por semana", "5+ veces por semana"]',
 '["Never", "1-2 times a month", "1-2 times a week", "3-4 times a week", "5+ times a week"]',
 3, 1, 'core'),

-- P2: Exercise type
('physical', 
 '¿Qué tipo de ejercicio prefieres?', 
 'What type of exercise do you prefer?',
 'multiple_choice', 
 '["Gimnasio/Pesas", "Cardio (correr, nadar)", "Deportes de equipo", "Yoga/Pilates", "Calistenia", "Ninguno todavía"]',
 '["Gym/Weights", "Cardio (running, swimming)", "Team sports", "Yoga/Pilates", "Calisthenics", "None yet"]',
 1, 2, 'core'),

-- P3: Diet rating
('physical', 
 '¿Cómo calificarías tu alimentación actual? (0 = muy mala, 100 = excelente)', 
 'How would you rate your current diet? (0 = very poor, 100 = excellent)',
 'slider', null, null, 2, 3, 'extended'),

-- P4: Sleep hours
('physical', 
 '¿Cuántas horas duermes en promedio por noche?', 
 'How many hours do you sleep on average per night?',
 'single_choice', 
 '["Menos de 5", "5-6 horas", "6-7 horas", "7-8 horas", "Más de 8"]',
 '["Less than 5", "5-6 hours", "6-7 hours", "7-8 hours", "More than 8"]',
 2, 4, 'extended'),

-- P5: Water intake
('physical', 
 '¿Cuántos vasos de agua bebes al día?', 
 'How many glasses of water do you drink per day?',
 'single_choice', 
 '["0-2", "3-4", "5-6", "7-8", "9+"]',
 '["0-2", "3-4", "5-6", "7-8", "9+"]',
 1, 5, 'optional'),

-- P6: Physical feeling
('physical', 
 '¿Cómo te sientes físicamente en general? (0 = terrible, 100 = excelente)', 
 'How do you feel physically overall? (0 = terrible, 100 = excellent)',
 'slider', null, null, 2, 6, 'extended'),

-- P7: Obstacles
('physical', 
 '¿Cuáles son tus principales obstáculos para estar más activo?', 
 'What are your main obstacles to being more active?',
 'multiple_choice', 
 '["Falta de tiempo", "Falta de motivación", "No sé por dónde empezar", "Lesiones/dolor", "Costo de gimnasio", "Ninguno"]',
 '["Lack of time", "Lack of motivation", "Don''t know where to start", "Injuries/pain", "Gym cost", "None"]',
 2, 7, 'optional'),

-- P8: Self-care routine (NEW)
('physical', 
 '¿Cómo calificarías tu rutina de cuidado personal? (higiene, skincare, etc.)', 
 'How would you rate your personal care routine? (hygiene, skincare, etc.)',
 'single_choice', 
 '["No tengo rutina", "Básica (lo mínimo)", "Regular (ducha, dientes, básico)", "Buena (incluyo skincare/grooming)", "Excelente (rutina completa)"]',
 '["I don''t have a routine", "Basic (bare minimum)", "Regular (shower, teeth, basic)", "Good (include skincare/grooming)", "Excellent (complete routine)"]',
 2, 8, 'extended'),

-- P9: Areas to improve (NEW)
('physical', 
 '¿Qué aspectos de tu cuidado personal te gustaría mejorar?', 
 'Which aspects of your personal care would you like to improve?',
 'multiple_choice', 
 '["Cuidado de la piel (skincare)", "Cuidado del cabello", "Higiene dental", "Vestimenta/Imagen", "Postura corporal", "Hidratación", "Nada en particular"]',
 '["Skin care", "Hair care", "Dental hygiene", "Clothing/Image", "Body posture", "Hydration", "Nothing in particular"]',
 1, 9, 'optional'),

-- P10: Appearance care frequency (NEW)
('physical', 
 '¿Con qué frecuencia cuidas tu apariencia personal de forma intencional?', 
 'How often do you intentionally take care of your personal appearance?',
 'single_choice', 
 '["Casi nunca", "Solo para ocasiones especiales", "Algunas veces a la semana", "Casi todos los días", "Todos los días, es prioritario"]',
 '["Almost never", "Only for special occasions", "A few times a week", "Almost every day", "Every day, it''s a priority"]',
 2, 10, 'optional');

-- =====================================================
-- 🧠 MENTAL PILLAR (7 questions)
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order, priority) VALUES

-- M1: Reading frequency
('mental', 
 '¿Con qué frecuencia lees libros, artículos o contenido educativo?', 
 'How often do you read books, articles, or educational content?',
 'single_choice', 
 '["Nunca", "Pocas veces al mes", "Una vez a la semana", "Varias veces a la semana", "Diariamente"]',
 '["Never", "A few times a month", "Once a week", "Several times a week", "Daily"]',
 2, 11, 'core'),

-- M2: Learning something new
('mental', 
 '¿Estás aprendiendo algo nuevo activamente?', 
 'Are you actively learning something new?',
 'single_choice', 
 '["No", "Lo intenté pero lo dejé", "Sí, ocasionalmente", "Sí, regularmente", "Sí, múltiples cosas"]',
 '["No", "I tried but quit", "Yes, occasionally", "Yes, regularly", "Yes, multiple things"]',
 2, 12, 'core'),

-- M3: Productivity
('mental', 
 '¿Qué tan productivo te sientes día a día? (0 = nada productivo, 100 = muy productivo)', 
 'How productive do you feel day to day? (0 = not at all, 100 = very productive)',
 'slider', null, null, 3, 13, 'extended'),

-- M4: Distractions
('mental', 
 '¿Con qué frecuencia te distraes con redes sociales/entretenimiento?', 
 'How often do you get distracted by social media/entertainment?',
 'single_choice', 
 '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]',
 '["All the time", "Very frequently", "Sometimes", "Rarely", "Almost never"]',
 2, 14, 'extended'),

-- M5: Learning areas
('mental', 
 '¿Qué áreas te gustaría aprender o mejorar?', 
 'What areas would you like to learn or improve?',
 'multiple_choice', 
 '["Idiomas", "Programación/Tech", "Negocios/Finanzas", "Arte/Creatividad", "Ciencias", "Habilidades sociales", "Otro"]',
 '["Languages", "Programming/Tech", "Business/Finance", "Art/Creativity", "Sciences", "Social skills", "Other"]',
 1, 15, 'optional'),

-- M6: Concentration
('mental', 
 '¿Cómo calificarías tu concentración y memoria? (0 = muy mala, 100 = excelente)', 
 'How would you rate your concentration and memory? (0 = very poor, 100 = excellent)',
 'slider', null, null, 2, 16, 'optional'),

-- M7: Productivity blockers
('mental', 
 '¿Qué te impide ser más productivo?', 
 'What prevents you from being more productive?',
 'multiple_choice', 
 '["Procrastinación", "Falta de objetivos claros", "Distracciones constantes", "Cansancio mental", "Demasiadas responsabilidades", "Nada en particular"]',
 '["Procrastination", "Lack of clear goals", "Constant distractions", "Mental fatigue", "Too many responsibilities", "Nothing in particular"]',
 2, 17, 'optional');

-- =====================================================
-- ❤️ SOCIAL PILLAR (6 questions)
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order, priority) VALUES

-- S1: Introvert/Extrovert
('social', 
 '¿Cómo te describes socialmente? (0 = muy introvertido, 100 = muy extrovertido)', 
 'How would you describe yourself socially? (0 = very introverted, 100 = very extroverted)',
 'slider', null, null, 1, 18, 'core'),

-- S2: Going out frequency
('social', 
 '¿Con qué frecuencia sales con amigos o conocidos?', 
 'How often do you go out with friends or acquaintances?',
 'single_choice', 
 '["Nunca o casi nunca", "Una vez al mes", "1-2 veces por semana", "3-4 veces por semana", "Casi todos los días"]',
 '["Never or almost never", "Once a month", "1-2 times a week", "3-4 times a week", "Almost every day"]',
 2, 19, 'core'),

-- S3: Close friends
('social', 
 '¿Cuántos amigos cercanos consideras que tienes?', 
 'How many close friends do you consider you have?',
 'single_choice', 
 '["0-1", "2-3", "4-6", "7-10", "Más de 10"]',
 '["0-1", "2-3", "4-6", "7-10", "More than 10"]',
 2, 20, 'extended'),

-- S4: Family relationship
('social', 
 '¿Cómo es tu relación con tu familia?', 
 'How is your relationship with your family?',
 'single_choice', 
 '["Muy distante", "Algo distante", "Normal", "Cercana", "Muy cercana"]',
 '["Very distant", "Somewhat distant", "Normal", "Close", "Very close"]',
 1, 21, 'extended'),

-- S5: Meeting new people
('social', 
 '¿Disfrutas conocer gente nueva?', 
 'Do you enjoy meeting new people?',
 'single_choice', 
 '["Para nada", "No mucho", "Es indiferente", "Sí, me gusta", "Me encanta"]',
 '["Not at all", "Not much", "Indifferent", "Yes, I like it", "I love it"]',
 1, 22, 'optional'),

-- S6: Social improvement areas
('social', 
 '¿En qué áreas sociales te gustaría mejorar?', 
 'In which social areas would you like to improve?',
 'multiple_choice', 
 '["Hacer nuevos amigos", "Mantener amistades", "Hablar en público", "Ser más sociable", "Networking profesional", "Ninguna, estoy bien"]',
 '["Making new friends", "Maintaining friendships", "Public speaking", "Being more sociable", "Professional networking", "None, I''m fine"]',
 2, 23, 'optional');

-- =====================================================
-- 💼 PROFESSIONAL PILLAR (7 questions)
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order, priority) VALUES

-- PR1: Current situation
('professional', 
 '¿Cuál es tu situación profesional actual?', 
 'What is your current professional situation?',
 'single_choice', 
 '["Estudiante", "Empleado tiempo completo", "Freelancer/Autónomo", "Emprendedor", "Desempleado buscando", "Otro"]',
 '["Student", "Full-time employee", "Freelancer/Self-employed", "Entrepreneur", "Unemployed looking", "Other"]',
 1, 24, 'core'),

-- PR2: Satisfaction
('professional', 
 '¿Qué tan satisfecho estás con tu situación profesional/financiera? (0 = nada, 100 = totalmente)', 
 'How satisfied are you with your professional/financial situation? (0 = not at all, 100 = completely)',
 'slider', null, null, 3, 25, 'core'),

-- PR3: Long-term goals
('professional', 
 '¿Tienes metas profesionales claras a largo plazo?', 
 'Do you have clear long-term professional goals?',
 'single_choice', 
 '["No tengo ni idea", "Tengo algunas ideas vagas", "Tengo ideas pero sin plan", "Tengo metas claras", "Tengo plan detallado"]',
 '["I have no idea", "I have some vague ideas", "I have ideas but no plan", "I have clear goals", "I have a detailed plan"]',
 2, 26, 'extended'),

-- PR4: Development time
('professional', 
 '¿Cuánto tiempo dedicas a tu desarrollo profesional por semana?', 
 'How much time do you dedicate to your professional development per week?',
 'single_choice', 
 '["0 horas", "1-2 horas", "3-5 horas", "6-10 horas", "Más de 10 horas"]',
 '["0 hours", "1-2 hours", "3-5 hours", "6-10 hours", "More than 10 hours"]',
 2, 27, 'extended'),

-- PR5: Skills to develop
('professional', 
 '¿Qué habilidades profesionales te gustaría desarrollar?', 
 'What professional skills would you like to develop?',
 'multiple_choice', 
 '["Liderazgo", "Comunicación", "Habilidades técnicas", "Ventas/Marketing", "Finanzas personales", "Emprendimiento", "Gestión del tiempo"]',
 '["Leadership", "Communication", "Technical skills", "Sales/Marketing", "Personal finance", "Entrepreneurship", "Time management"]',
 2, 28, 'optional'),

-- PR6: Finance management
('professional', 
 '¿Tienes un sistema para gestionar tus finanzas personales?', 
 'Do you have a system for managing your personal finances?',
 'single_choice', 
 '["No, ninguno", "Reviso mi cuenta ocasionalmente", "Sé cuánto gasto", "Tengo presupuesto básico", "Presupuesto detallado + ahorros"]',
 '["No, none", "I check my account occasionally", "I know how much I spend", "I have a basic budget", "Detailed budget + savings"]',
 2, 29, 'optional'),

-- PR7: Goal blockers
('professional', 
 '¿Qué te impide alcanzar tus metas profesionales?', 
 'What prevents you from reaching your professional goals?',
 'multiple_choice', 
 '["Falta de experiencia", "Falta de educación", "Falta de oportunidades", "Miedo al fracaso", "No sé por dónde empezar", "Nada, voy por buen camino"]',
 '["Lack of experience", "Lack of education", "Lack of opportunities", "Fear of failure", "Don''t know where to start", "Nothing, I''m on track"]',
 2, 30, 'optional');

-- =====================================================
-- ✨ SPIRITUAL PILLAR (8 questions) - UPDATED
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order, priority) VALUES

-- SP1: Spirituality type
('spiritual', 
 '¿Cómo describes tu espiritualidad o práctica de fe?', 
 'How would you describe your spirituality or faith practice?',
 'single_choice', 
 '["Cristiano/a (oración, iglesia)", "Católico/a", "Otra religión organizada", "Espiritual pero no religioso", "Meditación/Mindfulness secular", "Conexión con la naturaleza", "Filosofía de vida (estoicismo, etc.)", "No tengo prácticas espirituales", "Estoy explorando"]',
 '["Christian (prayer, church)", "Catholic", "Other organized religion", "Spiritual but not religious", "Secular meditation/mindfulness", "Connection with nature", "Life philosophy (stoicism, etc.)", "I don''t have spiritual practices", "I''m exploring"]',
 3, 31, 'core'),

-- SP2: Practice frequency
('spiritual', 
 '¿Con qué frecuencia practicas actividades espirituales o de reflexión?', 
 'How often do you practice spiritual or reflective activities?',
 'single_choice', 
 '["Nunca", "Ocasionalmente (algunas veces al mes)", "Semanalmente", "Varias veces a la semana", "Diariamente"]',
 '["Never", "Occasionally (a few times a month)", "Weekly", "Several times a week", "Daily"]',
 2, 32, 'core'),

-- SP3: Practices
('spiritual', 
 '¿Qué prácticas espirituales o de bienestar realizas?', 
 'What spiritual or wellness practices do you do?',
 'multiple_choice', 
 '["Oración", "Lectura de textos sagrados/espirituales", "Asistencia a iglesia/templo/comunidad", "Meditación", "Mindfulness/Respiración consciente", "Journaling/Diario reflexivo", "Tiempo en naturaleza", "Gratitud diaria", "Ninguna todavía"]',
 '["Prayer", "Reading sacred/spiritual texts", "Church/temple/community attendance", "Meditation", "Mindfulness/Conscious breathing", "Journaling/Reflective diary", "Time in nature", "Daily gratitude", "None yet"]',
 2, 33, 'extended'),

-- SP4: Emotional wellbeing
('spiritual', 
 '¿Cómo calificarías tu bienestar emocional actual? (0 = muy mal, 100 = excelente)', 
 'How would you rate your current emotional wellbeing? (0 = very poor, 100 = excellent)',
 'slider', null, null, 3, 34, 'extended'),

-- SP5: Stress frequency
('spiritual', 
 '¿Con qué frecuencia te sientes estresado o ansioso?', 
 'How often do you feel stressed or anxious?',
 'single_choice', 
 '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]',
 '["All the time", "Very frequently", "Sometimes", "Rarely", "Almost never"]',
 2, 35, 'optional'),

-- SP6: Life purpose
('spiritual', 
 '¿Sientes que tu vida tiene propósito y dirección?', 
 'Do you feel your life has purpose and direction?',
 'single_choice', 
 '["Para nada", "Muy poco", "Algo", "Bastante", "Totalmente"]',
 '["Not at all", "Very little", "Somewhat", "Quite a bit", "Completely"]',
 3, 36, 'optional'),

-- SP7: Inner growth areas
('spiritual', 
 '¿En qué áreas de tu vida interior te gustaría crecer?', 
 'In which areas of your inner life would you like to grow?',
 'multiple_choice', 
 '["Fe/Conexión espiritual", "Paz interior/Calma", "Gratitud", "Perdón", "Paciencia", "Propósito de vida", "Manejo del estrés", "Autoconocimiento", "Comunidad/Pertenencia"]',
 '["Faith/Spiritual connection", "Inner peace/Calm", "Gratitude", "Forgiveness", "Patience", "Life purpose", "Stress management", "Self-awareness", "Community/Belonging"]',
 2, 37, 'optional'),

-- SP8: Obstacles
('spiritual', 
 '¿Qué obstáculos enfrentas en tu vida espiritual/emocional?', 
 'What obstacles do you face in your spiritual/emotional life?',
 'multiple_choice', 
 '["Falta de tiempo", "Dudas o incertidumbre", "No tengo comunidad/grupo", "Heridas del pasado", "Distracciones constantes", "No sé cómo empezar", "Ninguno en particular"]',
 '["Lack of time", "Doubts or uncertainty", "I don''t have a community/group", "Past wounds", "Constant distractions", "I don''t know how to start", "None in particular"]',
 2, 38, 'optional');

-- =====================================================
-- 🎨 CREATIVE PILLAR (7 questions)
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order, priority) VALUES

-- C1: Creative activities
('creative', 
 '¿Practicas alguna actividad creativa?', 
 'Do you practice any creative activity?',
 'multiple_choice', 
 '["Música", "Arte/Dibujo", "Escritura", "Fotografía/Video", "Diseño", "Cocina", "Crafts/DIY", "Ninguna"]',
 '["Music", "Art/Drawing", "Writing", "Photography/Video", "Design", "Cooking", "Crafts/DIY", "None"]',
 2, 39, 'core'),

-- C2: Creative hobby frequency
('creative', 
 '¿Con qué frecuencia dedicas tiempo a hobbies creativos?', 
 'How often do you dedicate time to creative hobbies?',
 'single_choice', 
 '["Nunca", "Pocas veces al mes", "Una vez por semana", "Varias veces por semana", "Diariamente"]',
 '["Never", "A few times a month", "Once a week", "Several times a week", "Daily"]',
 2, 40, 'core'),

-- C3: Creative satisfaction
('creative', 
 '¿Qué tan satisfecho estás con tu expresión creativa? (0 = nada, 100 = totalmente)', 
 'How satisfied are you with your creative expression? (0 = not at all, 100 = completely)',
 'slider', null, null, 2, 41, 'extended'),

-- C4: Learning creative disciplines
('creative', 
 '¿Te gustaría aprender o mejorar en alguna disciplina creativa?', 
 'Would you like to learn or improve in any creative discipline?',
 'single_choice', 
 '["No me interesa mucho", "Tengo curiosidad", "Sí, me gustaría intentarlo", "Sí, es una prioridad", "Ya estoy trabajando en ello"]',
 '["Not very interested", "I''m curious", "Yes, I''d like to try", "Yes, it''s a priority", "Already working on it"]',
 1, 42, 'extended'),

-- C5: Creative blockers
('creative', 
 '¿Qué te impide ser más creativo?', 
 'What prevents you from being more creative?',
 'multiple_choice', 
 '["Falta de tiempo", "Falta de habilidad", "Miedo al juicio", "No sé por dónde empezar", "Falta de inspiración", "Nada"]',
 '["Lack of time", "Lack of skill", "Fear of judgment", "Don''t know where to start", "Lack of inspiration", "Nothing"]',
 2, 43, 'optional'),

-- C6: Trying new things
('creative', 
 '¿Disfrutas probar cosas nuevas y salir de tu zona de confort?', 
 'Do you enjoy trying new things and stepping out of your comfort zone?',
 'single_choice', 
 '["Para nada", "No mucho", "A veces", "Frecuentemente", "Me encanta"]',
 '["Not at all", "Not much", "Sometimes", "Frequently", "I love it"]',
 1, 44, 'optional'),

-- C7: Creative areas to explore
('creative', 
 '¿Qué áreas creativas te gustaría explorar?', 
 'What creative areas would you like to explore?',
 'multiple_choice', 
 '["Música (instrumento/canto)", "Arte visual", "Escritura creativa", "Fotografía", "Video/Film", "Diseño gráfico/3D", "Cocina gourmet", "Otro"]',
 '["Music (instrument/singing)", "Visual art", "Creative writing", "Photography", "Video/Film", "Graphic/3D design", "Gourmet cooking", "Other"]',
 1, 45, 'optional');

-- =====================================================
-- VERIFY TOTALS
-- =====================================================
-- Should show:
-- physical: 10 questions
-- mental: 7 questions  
-- social: 6 questions
-- professional: 7 questions
-- spiritual: 8 questions
-- creative: 7 questions
-- TOTAL: 45 questions

SELECT 
  pillar, 
  COUNT(*) as total,
  COUNT(question_text_en) as translated,
  COUNT(*) FILTER (WHERE priority = 'core') as core,
  COUNT(*) FILTER (WHERE priority = 'extended') as extended,
  COUNT(*) FILTER (WHERE priority = 'optional') as optional
FROM assessment_questions 
GROUP BY pillar 
ORDER BY MIN(sort_order);

SELECT 'TOTAL QUESTIONS' as label, COUNT(*) as count FROM assessment_questions;
