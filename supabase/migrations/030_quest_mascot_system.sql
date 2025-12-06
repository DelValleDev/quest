-- =====================================================
-- Migration 030: Quest Mascot System
-- Description: Sistema de mascota Quest con evoluciones, personalización y outfits
-- =====================================================

-- Tabla de configuración de la mascota Quest del usuario
CREATE TABLE IF NOT EXISTS public.user_quest_mascot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT DEFAULT 'Quest',
  personality TEXT DEFAULT 'balanced' CHECK (personality IN ('balanced', 'energetic', 'calm', 'sarcastic', 'motivational', 'wise')),
  evolution_stage INTEGER DEFAULT 1 CHECK (evolution_stage BETWEEN 1 AND 5),
  current_outfit_id UUID REFERENCES public.shop_items(id),
  mood TEXT DEFAULT 'happy' CHECK (mood IN ('happy', 'excited', 'sad', 'tired', 'proud', 'disappointed')),
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  interaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de outfits y accesorios para Quest
CREATE TABLE IF NOT EXISTS public.quest_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description TEXT,
  description_es TEXT,
  category TEXT NOT NULL CHECK (category IN ('outfit', 'hat', 'accessory', 'theme')),
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  qc_price INTEGER DEFAULT 0,
  premium_only BOOLEAN DEFAULT false,
  evolution_required INTEGER DEFAULT 1,
  icon_url TEXT,
  preview_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de outfits desbloqueados por el usuario
CREATE TABLE IF NOT EXISTS public.user_quest_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES public.quest_outfits(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, outfit_id)
);

-- Tabla de interacciones y diálogos de Quest
CREATE TABLE IF NOT EXISTS public.quest_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('greeting', 'celebration', 'motivation', 'reminder', 'advice', 'reaction')),
  trigger_event TEXT, -- 'quest_completed', 'level_up', 'streak_milestone', 'login', etc.
  message TEXT NOT NULL,
  mood TEXT DEFAULT 'happy',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_quest_mascot_user ON user_quest_mascot(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_outfits_category ON quest_outfits(category, rarity);
CREATE INDEX IF NOT EXISTS idx_user_quest_outfits_user ON user_quest_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_interactions_user ON quest_interactions(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.user_quest_mascot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quest_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own mascot" ON public.user_quest_mascot;
CREATE POLICY "Users can manage own mascot" ON public.user_quest_mascot
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view outfits" ON public.quest_outfits;
CREATE POLICY "Anyone can view outfits" ON public.quest_outfits
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own outfits" ON public.user_quest_outfits;
CREATE POLICY "Users can manage own outfits" ON public.user_quest_outfits
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own interactions" ON public.quest_interactions;
CREATE POLICY "Users can view own interactions" ON public.quest_interactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert interactions" ON public.quest_interactions;
CREATE POLICY "System can insert interactions" ON public.quest_interactions
  FOR INSERT WITH CHECK (true);

-- Función para actualizar la evolución de Quest basada en el nivel del usuario
CREATE OR REPLACE FUNCTION update_quest_evolution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_stage INTEGER;
BEGIN
  -- Calcular stage basado en nivel
  v_new_stage := CASE
    WHEN NEW.level >= 50 THEN 5
    WHEN NEW.level >= 35 THEN 4
    WHEN NEW.level >= 20 THEN 3
    WHEN NEW.level >= 10 THEN 2
    ELSE 1
  END;

  -- Actualizar evolution_stage si cambió
  UPDATE user_quest_mascot
  SET 
    evolution_stage = v_new_stage,
    updated_at = NOW()
  WHERE user_id = NEW.id
    AND evolution_stage != v_new_stage;

  RETURN NEW;
END;
$$;

-- Trigger para actualizar evolución cuando sube el nivel
DROP TRIGGER IF EXISTS on_level_up_update_quest ON public.profiles;
CREATE TRIGGER on_level_up_update_quest
  AFTER UPDATE OF level ON public.profiles
  FOR EACH ROW
  WHEN (NEW.level IS DISTINCT FROM OLD.level)
  EXECUTE FUNCTION update_quest_evolution();

-- Función para inicializar mascota Quest al crear usuario
CREATE OR REPLACE FUNCTION initialize_quest_mascot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_quest_mascot (user_id, name, personality, evolution_stage)
  VALUES (NEW.id, 'Quest', 'balanced', 1)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger para inicializar mascota al crear perfil
DROP TRIGGER IF EXISTS on_profile_created_init_quest ON public.profiles;
CREATE TRIGGER on_profile_created_init_quest
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_quest_mascot();

-- Seed de outfits básicos para Quest
INSERT INTO public.quest_outfits (name, name_es, description, description_es, category, rarity, qc_price, evolution_required, premium_only) VALUES
-- Outfits comunes (Etapa 1)
('Default Adventure', 'Aventura Predeterminada', 'Quest''s classic look', 'El look clásico de Quest', 'outfit', 'common', 0, 1, false),
('Casual Hoodie', 'Sudadera Casual', 'Comfy and cool', 'Cómodo y genial', 'outfit', 'common', 100, 1, false),
('Gym Outfit', 'Ropa de Gimnasio', 'Ready to work out!', '¡Listo para entrenar!', 'outfit', 'common', 150, 1, false),

-- Outfits raros (Etapa 2)
('Ninja Suit', 'Traje Ninja', 'Stealthy and focused', 'Sigiloso y enfocado', 'outfit', 'rare', 300, 2, false),
('Scholar Robe', 'Túnica de Estudiante', 'Wisdom and knowledge', 'Sabiduría y conocimiento', 'outfit', 'rare', 300, 2, false),
('Business Suit', 'Traje de Negocios', 'Professional vibes', 'Vibras profesionales', 'outfit', 'rare', 350, 2, false),

-- Outfits épicos (Etapa 3)
('Knight Armor', 'Armadura de Caballero', 'Brave and strong', 'Valiente y fuerte', 'outfit', 'epic', 500, 3, false),
('Wizard Robes', 'Túnicas de Mago', 'Magical powers', 'Poderes mágicos', 'outfit', 'epic', 500, 3, false),
('Astronaut Suit', 'Traje de Astronauta', 'Reach for the stars', 'Alcanza las estrellas', 'outfit', 'epic', 600, 3, true),

-- Outfits legendarios (Etapa 4-5)
('Dragon Knight', 'Caballero Dragón', 'Ultimate warrior', 'Guerrero definitivo', 'outfit', 'legendary', 1000, 4, true),
('Archmage Robes', 'Túnicas de Archimago', 'Master of magic', 'Maestro de la magia', 'outfit', 'legendary', 1000, 4, true),
('Galaxy Explorer', 'Explorador Galáctico', 'Beyond the cosmos', 'Más allá del cosmos', 'outfit', 'legendary', 1200, 5, true),

-- Sombreros y accesorios
('Baseball Cap', 'Gorra de Béisbol', 'Sporty style', 'Estilo deportivo', 'hat', 'common', 50, 1, false),
('Wizard Hat', 'Sombrero de Mago', 'Mystical powers', 'Poderes místicos', 'hat', 'rare', 200, 2, false),
('Crown', 'Corona', 'For the champion', 'Para el campeón', 'hat', 'epic', 400, 3, false),
('Halo', 'Halo', 'Divine blessing', 'Bendición divina', 'hat', 'legendary', 800, 4, true),

('Sunglasses', 'Lentes de Sol', 'Cool factor +100', 'Factor cool +100', 'accessory', 'common', 75, 1, false),
('Backpack', 'Mochila', 'Carry your dreams', 'Lleva tus sueños', 'accessory', 'common', 100, 1, false),
('Energy Wings', 'Alas de Energía', 'Fly high!', '¡Vuela alto!', 'accessory', 'epic', 600, 3, true),
('Phoenix Wings', 'Alas de Fénix', 'Rise from ashes', 'Renace de las cenizas', 'accessory', 'legendary', 1000, 5, true)

ON CONFLICT DO NOTHING;

-- Función para obtener mensaje personalizado de Quest según el evento
CREATE OR REPLACE FUNCTION get_quest_message(
  p_user_id UUID,
  p_event_type TEXT,
  p_context JSONB DEFAULT '{}'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_personality TEXT;
  v_evolution INTEGER;
  v_message TEXT;
BEGIN
  -- Obtener personalidad y evolución
  SELECT personality, evolution_stage
  INTO v_personality, v_evolution
  FROM user_quest_mascot
  WHERE user_id = p_user_id;

  -- Si no existe, usar defaults
  IF NOT FOUND THEN
    v_personality := 'balanced';
    v_evolution := 1;
  END IF;

  -- Generar mensaje según evento y personalidad
  -- (En producción, esto se haría con IA, pero aquí hay ejemplos)
  v_message := CASE p_event_type
    WHEN 'quest_completed' THEN
      CASE v_personality
        WHEN 'energetic' THEN '¡BOOM! 🎉 ¡Eso es lo que estoy hablando! ¡Eres increíble!'
        WHEN 'calm' THEN 'Bien hecho. El progreso constante es la clave. 🌟'
        WHEN 'sarcastic' THEN 'Oh wow, completaste algo. Impresionante. (No, en serio, buen trabajo 😏)'
        WHEN 'motivational' THEN '¡ESO ES! ¡Sigues demostrando que puedes con todo! 💪'
        WHEN 'wise' THEN 'Cada tarea completada te acerca a tu verdadero potencial. 🧘'
        ELSE '¡Genial! Sigue así, campeón! ✨'
      END
    WHEN 'level_up' THEN
      CASE v_personality
        WHEN 'energetic' THEN '¡NIVEL ' || (p_context->>'level')::TEXT || '! ¡ESTÁS EN FUEGO! 🔥🔥🔥'
        WHEN 'calm' THEN 'Nivel ' || (p_context->>'level')::TEXT || '. El viaje continúa. 🌙'
        WHEN 'sarcastic' THEN 'Felicidades por presionar botones hasta subir de nivel 🙄 (Jk, estoy orgulloso)'
        WHEN 'motivational' THEN '¡NIVEL ' || (p_context->>'level')::TEXT || '! ¡NADA TE DETIENE! 💎'
        WHEN 'wise' THEN 'Un nuevo nivel, una nueva oportunidad de crecimiento. 🌱'
        ELSE '¡Subiste a nivel ' || (p_context->>'level')::TEXT || '! 🎊'
      END
    WHEN 'streak_milestone' THEN
      CASE v_personality
        WHEN 'energetic' THEN '¡' || (p_context->>'days')::TEXT || ' DÍAS DE RACHA! ¡IMPARABLE! 🚀'
        WHEN 'calm' THEN 'La consistencia es tu superpoder. ' || (p_context->>'days')::TEXT || ' días. ✨'
        WHEN 'sarcastic' THEN 'Guau, ' || (p_context->>'days')::TEXT || ' días sin rendirte. ¿Quién lo diría? 😏'
        WHEN 'motivational' THEN '¡' || (p_context->>'days')::TEXT || ' DÍAS! ¡ERES UNA MÁQUINA! 🔥'
        WHEN 'wise' THEN 'La disciplina diaria moldea el destino. ' || (p_context->>'days')::TEXT || ' días. 🎯'
        ELSE '¡Racha de ' || (p_context->>'days')::TEXT || ' días! 🌟'
      END
    WHEN 'morning_greeting' THEN
      CASE v_personality
        WHEN 'energetic' THEN '¡BUENOS DÍAS, CAMPEÓN! ¡Hoy va a ser ÉPICO! ☀️'
        WHEN 'calm' THEN 'Buenos días. Respira hondo. Hoy es un buen día. 🌅'
        WHEN 'sarcastic' THEN 'Ah, despertaste. Sorprendente. Vamos a ver qué haces hoy. 😴'
        WHEN 'motivational' THEN '¡ARRIBA, GUERRERO! ¡EL ÉXITO TE ESPERA! 💪'
        WHEN 'wise' THEN 'Cada amanecer es una página en blanco. Escribe algo grande. 📖'
        ELSE '¡Buenos días! ¿Listo para conquistar el día? 🌟'
      END
    ELSE '¡Sigue adelante! 💫'
  END;

  -- Guardar interacción
  INSERT INTO quest_interactions (user_id, interaction_type, trigger_event, message, mood)
  VALUES (p_user_id, p_event_type, p_event_type, v_message, 'happy');

  RETURN v_message;
END;
$$;
