-- Migration 050: Quest AI Premium Restrictions
-- Description: Restricción de Quest AI en grupos según plan

-- ===============================================
-- PREMIUM RESTRICTIONS
-- ===============================================

-- Tabla para trackear cuántas IAs tiene cada usuario en sus grupos
CREATE TABLE user_guild_ai_usage (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guilds_with_ai_enabled UUID[] DEFAULT '{}',
  total_ai_guilds INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- Función para verificar si usuario puede activar IA en un grupo
CREATE OR REPLACE FUNCTION can_enable_guild_ai(
  p_user_id UUID,
  p_guild_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_current_ai_count INTEGER;
BEGIN
  -- Check if user is premium
  SELECT is_premium INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;
  
  -- Premium = sin límite
  IF v_is_premium THEN
    RETURN TRUE;
  END IF;
  
  -- Free = máximo 1 guild con IA
  SELECT COUNT(*)
  INTO v_current_ai_count
  FROM guilds
  WHERE id = ANY(
    SELECT guild_id FROM guild_members WHERE user_id = p_user_id
  )
  AND (quest_config->>'enabled')::boolean = true
  AND id != p_guild_id; -- Excluir el guild actual
  
  -- Si ya tiene 1 IA activa, no puede activar otra
  RETURN v_current_ai_count < 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para validar antes de activar Quest AI
CREATE OR REPLACE FUNCTION validate_quest_ai_activation()
RETURNS TRIGGER AS $$
DECLARE
  v_guild_owner UUID;
  v_can_enable BOOLEAN;
BEGIN
  -- Solo validar si se está activando la IA
  IF (NEW.quest_config->>'enabled')::boolean = true 
     AND (OLD.quest_config IS NULL OR (OLD.quest_config->>'enabled')::boolean = false) THEN
    
    -- Obtener el owner del guild
    SELECT owner_id INTO v_guild_owner
    FROM guilds
    WHERE id = NEW.id;
    
    -- Verificar si puede activar
    SELECT can_enable_guild_ai(v_guild_owner, NEW.id) INTO v_can_enable;
    
    IF NOT v_can_enable THEN
      RAISE EXCEPTION 'Free users can only enable Quest AI in 1 guild. Upgrade to Premium for unlimited AI guilds.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_quest_ai_before_update
BEFORE UPDATE ON guilds
FOR EACH ROW
WHEN (NEW.quest_config IS DISTINCT FROM OLD.quest_config)
EXECUTE FUNCTION validate_quest_ai_activation();

-- Index para performance
CREATE INDEX idx_guilds_quest_ai_enabled 
ON guilds ((quest_config->>'enabled'));

COMMENT ON FUNCTION can_enable_guild_ai IS 'Verifica si un usuario Free puede activar Quest AI en un guild (máx 1). Premium = ilimitado.';
