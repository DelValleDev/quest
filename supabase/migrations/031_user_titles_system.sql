-- =====================================================
-- Migration 031: User Titles System
-- Description: Sistema de títulos según nivel y logros
-- =====================================================

-- Tabla de títulos disponibles
CREATE TABLE IF NOT EXISTS public.user_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description TEXT,
  description_es TEXT,
  level_required INTEGER DEFAULT 1,
  achievement_required TEXT, -- achievement key requerido (opcional)
  is_premium BOOLEAN DEFAULT false,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
  icon TEXT, -- emoji o icono
  color TEXT DEFAULT '#6B7280',
  unlocked_message TEXT,
  unlocked_message_es TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de títulos desbloqueados por usuario
CREATE TABLE IF NOT EXISTS public.user_unlocked_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.user_titles(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, title_id)
);

-- Agregar columna de título activo al perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_title_id UUID REFERENCES public.user_titles(id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_titles_level ON user_titles(level_required);
CREATE INDEX IF NOT EXISTS idx_user_titles_rarity ON user_titles(rarity);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_titles_user ON user_unlocked_titles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active_title ON profiles(active_title_id);

-- RLS
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_titles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view titles" ON public.user_titles;
CREATE POLICY "Anyone can view titles" ON public.user_titles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own unlocked titles" ON public.user_unlocked_titles;
CREATE POLICY "Users can view own unlocked titles" ON public.user_unlocked_titles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert unlocked titles" ON public.user_unlocked_titles;
CREATE POLICY "System can insert unlocked titles" ON public.user_unlocked_titles
  FOR INSERT WITH CHECK (true);

-- Seed de títulos según nivel
INSERT INTO public.user_titles (title_key, name, name_es, description, description_es, level_required, rarity, icon, color) VALUES
-- Niveles 1-10 (Common)
('rookie', 'Rookie', 'Novato', 'Just starting out', 'Recién comenzando', 1, 'common', '🌱', '#6B7280'),
('apprentice', 'Apprentice', 'Aprendiz', 'Learning the ropes', 'Aprendiendo las bases', 5, 'common', '📚', '#6B7280'),
('trainee', 'Trainee', 'En Entrenamiento', 'Getting stronger', 'Haciéndose más fuerte', 10, 'common', '💪', '#6B7280'),

-- Niveles 11-20 (Rare)
('warrior', 'Warrior', 'Guerrero', 'Battle-tested', 'Probado en batalla', 15, 'rare', '⚔️', '#3B82F6'),
('champion', 'Champion', 'Campeón', 'Proven winner', 'Ganador probado', 20, 'rare', '🏆', '#3B82F6'),

-- Niveles 21-35 (Epic)
('veteran', 'Veteran', 'Veterano', 'Experienced warrior', 'Guerrero experimentado', 25, 'epic', '🛡️', '#8B5CF6'),
('master', 'Master', 'Maestro', 'True expertise', 'Verdadera maestría', 30, 'epic', '🎯', '#8B5CF6'),
('elite', 'Elite', 'Élite', 'Among the best', 'Entre los mejores', 35, 'epic', '💎', '#8B5CF6'),

-- Niveles 36-50 (Legendary)
('legend', 'Legend', 'Leyenda', 'Legendary status', 'Estado legendario', 40, 'legendary', '⭐', '#F59E0B'),
('grandmaster', 'Grandmaster', 'Gran Maestro', 'Peak performance', 'Rendimiento máximo', 45, 'legendary', '👑', '#F59E0B'),
('immortal', 'Immortal', 'Inmortal', 'Beyond mortal limits', 'Más allá de límites mortales', 50, 'legendary', '🔥', '#F59E0B'),

-- Niveles 51+ (Mythic)
('ascended', 'Ascended', 'Ascendido', 'Transcended reality', 'Trascendió la realidad', 60, 'mythic', '✨', '#EC4899'),
('divine', 'Divine', 'Divino', 'Godlike power', 'Poder divino', 70, 'mythic', '🌟', '#EC4899'),
('eternal', 'Eternal', 'Eterno', 'Forever remembered', 'Recordado para siempre', 80, 'mythic', '♾️', '#EC4899'),
('cosmic', 'Cosmic', 'Cósmico', 'Universe bends to you', 'El universo se inclina ante ti', 90, 'mythic', '🌌', '#EC4899'),
('omnipotent', 'Omnipotent', 'Omnipotente', 'All-powerful being', 'Ser todopoderoso', 100, 'mythic', '💫', '#EC4899'),

-- Títulos especiales por logros (no por nivel)
('ironwill', 'Iron Will', 'Voluntad de Hierro', 'Never missed a day', 'Nunca perdió un día', 1, 'legendary', '🔗', '#F59E0B'),
('speedster', 'Speedster', 'Velocista', 'Lightning fast', 'Rápido como el rayo', 1, 'epic', '⚡', '#8B5CF6'),
('unstoppable', 'Unstoppable', 'Imparable', 'Nothing can stop you', 'Nada puede detenerte', 1, 'legendary', '🚀', '#F59E0B'),
('perfectionist', 'Perfectionist', 'Perfeccionista', '100% completion', 'Completado al 100%', 1, 'epic', '💯', '#8B5CF6'),
('socialbutterfly', 'Social Butterfly', 'Mariposa Social', 'Friend to all', 'Amigo de todos', 1, 'rare', '🦋', '#3B82F6'),

-- Títulos premium
('vip', 'VIP', 'VIP', 'Premium member', 'Miembro premium', 1, 'legendary', '💳', '#F59E0B'),
('founder', 'Founder', 'Fundador', 'Early adopter', 'Adoptador temprano', 1, 'mythic', '🏛️', '#EC4899'),
('patron', 'Patron', 'Mecenas', 'Supports the cause', 'Apoya la causa', 1, 'legendary', '🎖️', '#F59E0B')

ON CONFLICT (title_key) DO NOTHING;

-- Función para desbloquear título automáticamente al subir de nivel
CREATE OR REPLACE FUNCTION unlock_level_titles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title RECORD;
BEGIN
  -- Buscar títulos que el usuario puede desbloquear con su nuevo nivel
  FOR v_title IN
    SELECT t.id, t.title_key, t.name_es
    FROM user_titles t
    WHERE t.level_required <= NEW.level
      AND t.achievement_required IS NULL -- Solo títulos por nivel
      AND NOT EXISTS (
        SELECT 1 FROM user_unlocked_titles ut
        WHERE ut.user_id = NEW.id AND ut.title_id = t.id
      )
  LOOP
    -- Desbloquear título
    INSERT INTO user_unlocked_titles (user_id, title_id)
    VALUES (NEW.id, v_title.id);
    
    -- Notificar al usuario (podría enviar push notification aquí)
    RAISE NOTICE 'Unlocked title: % for user %', v_title.name_es, NEW.id;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger para desbloquear títulos al subir de nivel
DROP TRIGGER IF EXISTS on_level_up_unlock_titles ON public.profiles;
CREATE TRIGGER on_level_up_unlock_titles
  AFTER UPDATE OF level ON public.profiles
  FOR EACH ROW
  WHEN (NEW.level IS DISTINCT FROM OLD.level)
  EXECUTE FUNCTION unlock_level_titles();

-- Función para desbloquear título por logro
CREATE OR REPLACE FUNCTION unlock_achievement_title(
  p_user_id UUID,
  p_achievement_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title_id UUID;
BEGIN
  -- Buscar título asociado al logro
  SELECT id INTO v_title_id
  FROM user_titles
  WHERE achievement_required = p_achievement_key;
  
  IF v_title_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Desbloquear título si no lo tiene ya
  INSERT INTO user_unlocked_titles (user_id, title_id)
  VALUES (p_user_id, v_title_id)
  ON CONFLICT (user_id, title_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Función para obtener títulos disponibles para un usuario
CREATE OR REPLACE FUNCTION get_available_titles(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  title_key TEXT,
  name TEXT,
  name_es TEXT,
  description TEXT,
  description_es TEXT,
  level_required INTEGER,
  rarity TEXT,
  icon TEXT,
  color TEXT,
  is_unlocked BOOLEAN,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title_key,
    t.name,
    t.name_es,
    t.description,
    t.description_es,
    t.level_required,
    t.rarity,
    t.icon,
    t.color,
    EXISTS(
      SELECT 1 FROM user_unlocked_titles ut 
      WHERE ut.user_id = p_user_id AND ut.title_id = t.id
    ) as is_unlocked,
    EXISTS(
      SELECT 1 FROM profiles p
      WHERE p.id = p_user_id AND p.active_title_id = t.id
    ) as is_active
  FROM user_titles t
  ORDER BY t.level_required ASC, t.rarity DESC;
END;
$$;

-- Función para equipar título
CREATE OR REPLACE FUNCTION equip_title(
  p_user_id UUID,
  p_title_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario tiene el título desbloqueado
  IF NOT EXISTS(
    SELECT 1 FROM user_unlocked_titles
    WHERE user_id = p_user_id AND title_id = p_title_id
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Equipar título
  UPDATE profiles
  SET active_title_id = p_title_id
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$;
