-- =====================================================
-- PREGUNTAS DE EVALUACIÓN - COMPLETO CON TRADUCCIONES
-- =====================================================
-- Este archivo contiene TODAS las preguntas de evaluación con traducciones EN/ES
-- Ejecutar DESPUÉS de schema.sql
-- =====================================================

-- Limpiar preguntas existentes para inserción limpia
DELETE FROM assessment_questions;

-- =====================================================
-- 💪 PILAR FÍSICO (10 preguntas)
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order) VALUES

-- P1: Frecuencia de ejercicio
('physical', 
 '¿Con qué frecuencia haces ejercicio?', 
 'How often do you exercise?',
 'single_choice', 
 '["Nunca", "1-2 veces al mes", "1-2 veces por semana", "3-4 veces por semana", "5+ veces por semana"]',
 '["Never", "1-2 times a month", "1-2 times a week", "3-4 times a week", "5+ times a week"]',
 3, 1),

-- P2: Tipo de ejercicio
('physical', 
 '¿Qué tipo de ejercicio prefieres?', 
 'What type of exercise do you prefer?',
 'multiple_choice', 
 '["Gimnasio/Pesas", "Cardio (correr, nadar)", "Deportes de equipo", "Yoga/Pilates", "Calistenia", "Ninguno todavía"]',
 '["Gym/Weights", "Cardio (running, swimming)", "Team sports", "Yoga/Pilates", "Calisthenics", "None yet"]',
 1, 2),

-- P3: Calificación de dieta (SLIDER)
('physical', 
 '¿Cómo calificarías tu alimentación actual?', 
 'How would you rate your current diet?',
 'slider', null, null, 2, 3),

-- P4: Horas de sueño
('physical', 
 '¿Cuántas horas duermes en promedio por noche?', 
 'How many hours do you sleep on average per night?',
 'single_choice', 
 '["Menos de 5", "5-6 horas", "6-7 horas", "7-8 horas", "Más de 8"]',
 '["Less than 5", "5-6 hours", "6-7 hours", "7-8 hours", "More than 8"]',
 2, 4),

-- P5: Consumo de agua
('physical', 
 '¿Cuántos vasos de agua bebes al día?', 
 'How many glasses of water do you drink per day?',
 'single_choice', 
 '["0-2", "3-4", "5-6", "7-8", "9+"]',
 '["0-2", "3-4", "5-6", "7-8", "9+"]',
 1, 5),

-- P6: Sentimiento físico (SLIDER)
('physical', 
 '¿Cómo te sientes físicamente en general?', 
 'How do you feel physically overall?',
 'slider', null, null, 2, 6),

-- P7: Obstáculos
('physical', 
 '¿Cuáles son tus principales obstáculos para estar más activo?', 
 'What are your main obstacles to being more active?',
 'multiple_choice', 
 '["Falta de tiempo", "Falta de motivación", "No sé por dónde empezar", "Lesiones/dolor", "Costo de gimnasio", "Ninguno"]',
 '["Lack of time", "Lack of motivation", "Don''t know where to start", "Injuries/pain", "Gym cost", "None"]',
 2, 7),

-- P8: Rutina de cuidado personal (NUEVA)
('physical', 
 '¿Cómo calificarías tu rutina de cuidado personal? (higiene, skincare, etc.)', 
 'How would you rate your personal care routine? (hygiene, skincare, etc.)',
 'single_choice', 
 '["No tengo rutina", "Básica (lo mínimo)", "Regular (ducha, dientes, básico)", "Buena (incluyo skincare/grooming)", "Excelente (rutina completa)"]',
 '["I don''t have a routine", "Basic (bare minimum)", "Regular (shower, teeth, basic)", "Good (include skincare/grooming)", "Excellent (complete routine)"]',
 2, 8),

-- P9: Áreas a mejorar (NUEVA)
('physical', 
 '¿Qué aspectos de tu cuidado personal te gustaría mejorar?', 
 'Which aspects of your personal care would you like to improve?',
 'multiple_choice', 
 '["Cuidado de la piel (skincare)", "Cuidado del cabello", "Higiene dental", "Vestimenta/Imagen", "Postura corporal", "Hidratación", "Nada en particular"]',
 '["Skin care", "Hair care", "Dental hygiene", "Clothing/Image", "Body posture", "Hydration", "Nothing in particular"]',
 1, 9),

-- P10: Frecuencia de cuidado de apariencia (NUEVA)
('physical', 
 '¿Con qué frecuencia cuidas tu apariencia personal de forma intencional?', 
 'How often do you intentionally take care of your personal appearance?',
 'single_choice', 
 '["Casi nunca", "Solo para ocasiones especiales", "Algunas veces a la semana", "Casi todos los días", "Todos los días, es prioritario"]',
 '["Almost never", "Only for special occasions", "A few times a week", "Almost every day", "Every day, it''s a priority"]',
 2, 10);

-- =====================================================
-- 🧠 PILAR MENTAL (7 preguntas)
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order) VALUES

-- M1: Frecuencia de lectura
('mental', 
 '¿Con qué frecuencia lees libros, artículos o contenido educativo?', 
 'How often do you read books, articles, or educational content?',
 'single_choice', 
 '["Nunca", "Pocas veces al mes", "Una vez a la semana", "Varias veces a la semana", "Diariamente"]',
 '["Never", "A few times a month", "Once a week", "Several times a week", "Daily"]',
 2, 11),

-- M2: Aprendiendo algo nuevo
('mental', 
 '¿Estás aprendiendo algo nuevo activamente?', 
 'Are you actively learning something new?',
 'single_choice', 
 '["No", "Lo intenté pero lo dejé", "Sí, ocasionalmente", "Sí, regularmente", "Sí, múltiples cosas"]',
 '["No", "I tried but quit", "Yes, occasionally", "Yes, regularly", "Yes, multiple things"]',
 2, 12),

-- M3: Productividad (SLIDER)
('mental', 
 '¿Qué tan productivo te sientes día a día?', 
 'How productive do you feel day to day?',
 'slider', null, null, 3, 13),

-- M4: Distracciones
('mental', 
 '¿Con qué frecuencia te distraes con redes sociales/entretenimiento?', 
 'How often do you get distracted by social media/entertainment?',
 'single_choice', 
 '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]',
 '["All the time", "Very frequently", "Sometimes", "Rarely", "Almost never"]',
 2, 14),

-- M5: Áreas de aprendizaje
('mental', 
 '¿Qué áreas te gustaría aprender o mejorar?', 
 'What areas would you like to learn or improve?',
 'multiple_choice', 
 '["Idiomas", "Programación/Tech", "Negocios/Finanzas", "Arte/Creatividad", "Ciencias", "Habilidades sociales", "Otro"]',
 '["Languages", "Programming/Tech", "Business/Finance", "Art/Creativity", "Sciences", "Social skills", "Other"]',
 1, 15),

-- M6: Concentración (SLIDER)
('mental', 
 '¿Cómo calificarías tu concentración y memoria?', 
 'How would you rate your concentration and memory?',
 'slider', null, null, 2, 16),

-- M7: Bloqueadores de productividad
('mental', 
 '¿Qué te impide ser más productivo?', 
 'What prevents you from being more productive?',
 'multiple_choice', 
 '["Procrastinación", "Falta de objetivos claros", "Distracciones constantes", "Cansancio mental", "Demasiadas responsabilidades", "Nada en particular"]',
 '["Procrastination", "Lack of clear goals", "Constant distractions", "Mental fatigue", "Too many responsibilities", "Nothing in particular"]',
 2, 17);

-- =====================================================
-- ❤️ PILAR SOCIAL (6 preguntas)
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order) VALUES

-- S1: Introvertido/Extrovertido (SLIDER)
('social', 
 '¿Cómo te describes socialmente?', 
 'How would you describe yourself socially?',
 'slider', null, null, 1, 18),

-- S2: Frecuencia de salidas
('social', 
 '¿Con qué frecuencia sales con amigos o conocidos?', 
 'How often do you go out with friends or acquaintances?',
 'single_choice', 
 '["Nunca o casi nunca", "Una vez al mes", "1-2 veces por semana", "3-4 veces por semana", "Casi todos los días"]',
 '["Never or almost never", "Once a month", "1-2 times a week", "3-4 times a week", "Almost every day"]',
 2, 19),

-- S3: Amigos cercanos
('social', 
 '¿Cuántos amigos cercanos consideras que tienes?', 
 'How many close friends do you consider you have?',
 'single_choice', 
 '["0-1", "2-3", "4-6", "7-10", "Más de 10"]',
 '["0-1", "2-3", "4-6", "7-10", "More than 10"]',
 2, 20),

-- S4: Relación familiar
('social', 
 '¿Cómo es tu relación con tu familia?', 
 'How is your relationship with your family?',
 'single_choice', 
 '["Muy distante", "Algo distante", "Normal", "Cercana", "Muy cercana"]',
 '["Very distant", "Somewhat distant", "Normal", "Close", "Very close"]',
 1, 21),

-- S5: Conocer gente nueva
('social', 
 '¿Disfrutas conocer gente nueva?', 
 'Do you enjoy meeting new people?',
 'single_choice', 
 '["Para nada", "No mucho", "Es indiferente", "Sí, me gusta", "Me encanta"]',
 '["Not at all", "Not much", "Indifferent", "Yes, I like it", "I love it"]',
 1, 22),

-- S6: Áreas de mejora social
('social', 
 '¿En qué áreas sociales te gustaría mejorar?', 
 'In which social areas would you like to improve?',
 'multiple_choice', 
 '["Hacer nuevos amigos", "Mantener amistades", "Hablar en público", "Ser más sociable", "Networking profesional", "Ninguna, estoy bien"]',
 '["Making new friends", "Maintaining friendships", "Public speaking", "Being more sociable", "Professional networking", "None, I''m fine"]',
 2, 23);

-- =====================================================
-- 💼 PILAR PROFESIONAL (7 preguntas)
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order) VALUES

-- PR1: Situación actual
('professional', 
 '¿Cuál es tu situación profesional actual?', 
 'What is your current professional situation?',
 'single_choice', 
 '["Estudiante", "Empleado tiempo completo", "Freelancer/Autónomo", "Emprendedor", "Desempleado buscando", "Otro"]',
 '["Student", "Full-time employee", "Freelancer/Self-employed", "Entrepreneur", "Unemployed looking", "Other"]',
 1, 24),

-- PR2: Satisfacción (SLIDER)
('professional', 
 '¿Qué tan satisfecho estás con tu situación profesional/financiera?', 
 'How satisfied are you with your professional/financial situation?',
 'slider', null, null, 3, 25),

-- PR3: Metas a largo plazo
('professional', 
 '¿Tienes metas profesionales claras a largo plazo?', 
 'Do you have clear long-term professional goals?',
 'single_choice', 
 '["No tengo ni idea", "Tengo algunas ideas vagas", "Tengo ideas pero sin plan", "Tengo metas claras", "Tengo plan detallado"]',
 '["I have no idea", "I have some vague ideas", "I have ideas but no plan", "I have clear goals", "I have a detailed plan"]',
 2, 26),

-- PR4: Tiempo de desarrollo
('professional', 
 '¿Cuánto tiempo dedicas a tu desarrollo profesional por semana?', 
 'How much time do you dedicate to your professional development per week?',
 'single_choice', 
 '["0 horas", "1-2 horas", "3-5 horas", "6-10 horas", "Más de 10 horas"]',
 '["0 hours", "1-2 hours", "3-5 hours", "6-10 hours", "More than 10 hours"]',
 2, 27),

-- PR5: Habilidades a desarrollar
('professional', 
 '¿Qué habilidades profesionales te gustaría desarrollar?', 
 'What professional skills would you like to develop?',
 'multiple_choice', 
 '["Liderazgo", "Comunicación", "Habilidades técnicas", "Ventas/Marketing", "Finanzas personales", "Emprendimiento", "Gestión del tiempo"]',
 '["Leadership", "Communication", "Technical skills", "Sales/Marketing", "Personal finance", "Entrepreneurship", "Time management"]',
 2, 28),

-- PR6: Gestión financiera
('professional', 
 '¿Tienes un sistema para gestionar tus finanzas personales?', 
 'Do you have a system for managing your personal finances?',
 'single_choice', 
 '["No, ninguno", "Reviso mi cuenta ocasionalmente", "Sé cuánto gasto", "Tengo presupuesto básico", "Presupuesto detallado + ahorros"]',
 '["No, none", "I check my account occasionally", "I know how much I spend", "I have a basic budget", "Detailed budget + savings"]',
 2, 29),

-- PR7: Bloqueadores de metas
('professional', 
 '¿Qué te impide alcanzar tus metas profesionales?', 
 'What prevents you from reaching your professional goals?',
 'multiple_choice', 
 '["Falta de experiencia", "Falta de educación", "Falta de oportunidades", "Miedo al fracaso", "No sé por dónde empezar", "Nada, voy por buen camino"]',
 '["Lack of experience", "Lack of education", "Lack of opportunities", "Fear of failure", "Don''t know where to start", "Nothing, I''m on track"]',
 2, 30);

-- =====================================================
-- ✨ PILAR ESPIRITUAL (8 preguntas) - ACTUALIZADO
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order) VALUES

-- SP1: Tipo de espiritualidad
('spiritual', 
 '¿Cómo describes tu espiritualidad o práctica de fe?', 
 'How would you describe your spirituality or faith practice?',
 'single_choice', 
 '["Cristiano/a (oración, iglesia)", "Católico/a", "Otra religión organizada", "Espiritual pero no religioso", "Meditación/Mindfulness secular", "Conexión con la naturaleza", "Filosofía de vida (estoicismo, etc.)", "No tengo prácticas espirituales", "Estoy explorando"]',
 '["Christian (prayer, church)", "Catholic", "Other organized religion", "Spiritual but not religious", "Secular meditation/mindfulness", "Connection with nature", "Life philosophy (stoicism, etc.)", "I don''t have spiritual practices", "I''m exploring"]',
 3, 31),

-- SP2: Frecuencia de práctica
('spiritual', 
 '¿Con qué frecuencia practicas actividades espirituales o de reflexión?', 
 'How often do you practice spiritual or reflective activities?',
 'single_choice', 
 '["Nunca", "Ocasionalmente (algunas veces al mes)", "Semanalmente", "Varias veces a la semana", "Diariamente"]',
 '["Never", "Occasionally (a few times a month)", "Weekly", "Several times a week", "Daily"]',
 2, 32),

-- SP3: Prácticas
('spiritual', 
 '¿Qué prácticas espirituales o de bienestar realizas?', 
 'What spiritual or wellness practices do you do?',
 'multiple_choice', 
 '["Oración", "Lectura de textos sagrados/espirituales", "Asistencia a iglesia/templo/comunidad", "Meditación", "Mindfulness/Respiración consciente", "Journaling/Diario reflexivo", "Tiempo en naturaleza", "Gratitud diaria", "Ninguna todavía"]',
 '["Prayer", "Reading sacred/spiritual texts", "Church/temple/community attendance", "Meditation", "Mindfulness/Conscious breathing", "Journaling/Reflective diary", "Time in nature", "Daily gratitude", "None yet"]',
 2, 33),

-- SP4: Bienestar emocional (SLIDER)
('spiritual', 
 '¿Cómo calificarías tu bienestar emocional actual?', 
 'How would you rate your current emotional wellbeing?',
 'slider', null, null, 3, 34),

-- SP5: Frecuencia de estrés
('spiritual', 
 '¿Con qué frecuencia te sientes estresado o ansioso?', 
 'How often do you feel stressed or anxious?',
 'single_choice', 
 '["Todo el tiempo", "Muy frecuentemente", "A veces", "Raramente", "Casi nunca"]',
 '["All the time", "Very frequently", "Sometimes", "Rarely", "Almost never"]',
 2, 35),

-- SP6: Propósito de vida
('spiritual', 
 '¿Sientes que tu vida tiene propósito y dirección?', 
 'Do you feel your life has purpose and direction?',
 'single_choice', 
 '["Para nada", "Muy poco", "Algo", "Bastante", "Totalmente"]',
 '["Not at all", "Very little", "Somewhat", "Quite a bit", "Completely"]',
 3, 36),

-- SP7: Áreas de crecimiento interior
('spiritual', 
 '¿En qué áreas de tu vida interior te gustaría crecer?', 
 'In which areas of your inner life would you like to grow?',
 'multiple_choice', 
 '["Fe/Conexión espiritual", "Paz interior/Calma", "Gratitud", "Perdón", "Paciencia", "Propósito de vida", "Manejo del estrés", "Autoconocimiento", "Comunidad/Pertenencia"]',
 '["Faith/Spiritual connection", "Inner peace/Calm", "Gratitude", "Forgiveness", "Patience", "Life purpose", "Stress management", "Self-awareness", "Community/Belonging"]',
 2, 37),

-- SP8: Obstáculos
('spiritual', 
 '¿Qué obstáculos enfrentas en tu vida espiritual/emocional?', 
 'What obstacles do you face in your spiritual/emotional life?',
 'multiple_choice', 
 '["Falta de tiempo", "Dudas o incertidumbre", "No tengo comunidad/grupo", "Heridas del pasado", "Distracciones constantes", "No sé cómo empezar", "Ninguno en particular"]',
 '["Lack of time", "Doubts or uncertainty", "I don''t have a community/group", "Past wounds", "Constant distractions", "I don''t know how to start", "None in particular"]',
 2, 38);

-- =====================================================
-- 🎨 PILAR CREATIVO (7 preguntas)
-- =====================================================
INSERT INTO assessment_questions (pillar, question_text, question_text_en, question_type, options, options_en, weight, sort_order) VALUES

-- C1: Actividades creativas
('creative', 
 '¿Practicas alguna actividad creativa?', 
 'Do you practice any creative activity?',
 'multiple_choice', 
 '["Música", "Arte/Dibujo", "Escritura", "Fotografía/Video", "Diseño", "Cocina", "Crafts/DIY", "Ninguna"]',
 '["Music", "Art/Drawing", "Writing", "Photography/Video", "Design", "Cooking", "Crafts/DIY", "None"]',
 2, 39),

-- C2: Frecuencia de hobby creativo
('creative', 
 '¿Con qué frecuencia dedicas tiempo a hobbies creativos?', 
 'How often do you dedicate time to creative hobbies?',
 'single_choice', 
 '["Nunca", "Pocas veces al mes", "Una vez por semana", "Varias veces por semana", "Diariamente"]',
 '["Never", "A few times a month", "Once a week", "Several times a week", "Daily"]',
 2, 40),

-- C3: Satisfacción creativa (SLIDER)
('creative', 
 '¿Qué tan satisfecho estás con tu expresión creativa?', 
 'How satisfied are you with your creative expression?',
 'slider', null, null, 2, 41),

-- C4: Aprender disciplinas creativas
('creative', 
 '¿Te gustaría aprender o mejorar en alguna disciplina creativa?', 
 'Would you like to learn or improve in any creative discipline?',
 'single_choice', 
 '["No me interesa mucho", "Tengo curiosidad", "Sí, me gustaría intentarlo", "Sí, es una prioridad", "Ya estoy trabajando en ello"]',
 '["Not very interested", "I''m curious", "Yes, I''d like to try", "Yes, it''s a priority", "Already working on it"]',
 1, 42),

-- C5: Bloqueadores creativos
('creative', 
 '¿Qué te impide ser más creativo?', 
 'What prevents you from being more creative?',
 'multiple_choice', 
 '["Falta de tiempo", "Falta de habilidad", "Miedo al juicio", "No sé por dónde empezar", "Falta de inspiración", "Nada"]',
 '["Lack of time", "Lack of skill", "Fear of judgment", "Don''t know where to start", "Lack of inspiration", "Nothing"]',
 2, 43),

-- C6: Probar cosas nuevas
('creative', 
 '¿Disfrutas probar cosas nuevas y salir de tu zona de confort?', 
 'Do you enjoy trying new things and stepping out of your comfort zone?',
 'single_choice', 
 '["Para nada", "No mucho", "A veces", "Frecuentemente", "Me encanta"]',
 '["Not at all", "Not much", "Sometimes", "Frequently", "I love it"]',
 1, 44),

-- C7: Áreas creativas a explorar
('creative', 
 '¿Qué áreas creativas te gustaría explorar?', 
 'What creative areas would you like to explore?',
 'multiple_choice', 
 '["Música (instrumento/canto)", "Arte visual", "Escritura creativa", "Fotografía", "Video/Film", "Diseño gráfico/3D", "Cocina gourmet", "Otro"]',
 '["Music (instrument/singing)", "Visual art", "Creative writing", "Photography", "Video/Film", "Graphic/3D design", "Gourmet cooking", "Other"]',
 1, 45);

-- =====================================================
-- VERIFICAR TOTALES
-- =====================================================
SELECT 
  pillar, 
  COUNT(*) as total,
  COUNT(question_text_en) as translated
FROM assessment_questions 
GROUP BY pillar 
ORDER BY MIN(sort_order);

SELECT 'TOTAL DE PREGUNTAS' as label, COUNT(*) as count FROM assessment_questions;
