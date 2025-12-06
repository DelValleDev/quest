-- Migration 056: Quest AI Simplification - De 13 features a 3 niveles
-- Description: Simplificar configuración Quest AI a 3 niveles: Básico, Moderación, Avanzado

-- ===============================================
-- SIMPLIFICACIÓN DE QUEST AI
-- ===============================================

-- Eliminar columnas individuales y consolidar en un campo "level"
ALTER TABLE guilds 
  DROP COLUMN IF EXISTS quest_config CASCADE;

-- Agregar columna de nivel simplificado
ALTER TABLE guilds
  ADD COLUMN quest_ai_level TEXT CHECK (quest_ai_level IN ('disabled', 'basic', 'moderation', 'advanced')) DEFAULT 'disabled';

-- Tabla de configuraciones por nivel
CREATE TABLE quest_ai_level_configs (
  level TEXT PRIMARY KEY CHECK (level IN ('basic', 'moderation', 'advanced')),
  description TEXT NOT NULL,
  features JSONB NOT NULL, -- Features habilitadas en este nivel
  is_premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar configuraciones de los 3 niveles
INSERT INTO quest_ai_level_configs (level, description, features, is_premium_only) VALUES
(
  'basic',
  'Quest responde preguntas simples y da motivación',
  '{
    "can_respond": true,
    "can_motivate": true,
    "can_suggest_tasks": false,
    "can_create_tasks": false,
    "can_moderate": false,
    "can_analyze_patterns": false,
    "can_give_insights": false,
    "personality": "neutral"
  }'::jsonb,
  false
),
(
  'moderation',
  'Quest + moderación automática de mensajes inapropiados',
  '{
    "can_respond": true,
    "can_motivate": true,
    "can_suggest_tasks": false,
    "can_create_tasks": false,
    "can_moderate": true,
    "can_analyze_patterns": false,
    "can_give_insights": false,
    "personality": "neutral"
  }'::jsonb,
  false
),
(
  'advanced',
  'Quest completo: crea tareas, analiza patrones, insights semanales',
  '{
    "can_respond": true,
    "can_motivate": true,
    "can_suggest_tasks": true,
    "can_create_tasks": true,
    "can_moderate": true,
    "can_analyze_patterns": true,
    "can_give_insights": true,
    "personality": "adaptive"
  }'::jsonb,
  true
);

-- ===============================================
-- DYNAMIC PERSONALITY
-- ===============================================

CREATE TABLE user_personality_profile (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  communication_style TEXT CHECK (communication_style IN ('casual', 'professional', 'motivational', 'direct', 'empathetic')),
  preferred_tone TEXT CHECK (preferred_tone IN ('serious', 'humorous', 'balanced')),
  response_length TEXT CHECK (response_length IN ('concise', 'detailed', 'adaptive')),
  emoji_frequency TEXT CHECK (emoji_frequency IN ('none', 'low', 'medium', 'high')),
  detected_from_interactions BOOLEAN DEFAULT TRUE, -- ¿Se detectó automáticamente o el usuario lo configuró?
  confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Logs de interacciones para detectar personalidad
CREATE TABLE quest_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  quest_response TEXT NOT NULL,
  user_message_length INTEGER,
  user_used_emojis BOOLEAN DEFAULT FALSE,
  user_tone TEXT, -- Detectado por IA: 'casual', 'formal', 'enthusiastic', etc.
  interaction_at TIMESTAMP DEFAULT NOW()
);

-- Función para detectar personalidad basada en interacciones
CREATE OR REPLACE FUNCTION detect_user_personality(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_avg_message_length FLOAT;
  v_emoji_usage_rate FLOAT;
  v_casual_tone_rate FLOAT;
  v_communication_style TEXT;
  v_response_length TEXT;
  v_emoji_frequency TEXT;
BEGIN
  -- Analizar últimas 50 interacciones
  SELECT 
    AVG(user_message_length),
    AVG(CASE WHEN user_used_emojis THEN 1 ELSE 0 END),
    AVG(CASE WHEN user_tone IN ('casual', 'enthusiastic') THEN 1 ELSE 0 END)
  INTO v_avg_message_length, v_emoji_usage_rate, v_casual_tone_rate
  FROM (
    SELECT * FROM quest_interaction_logs
    WHERE user_id = p_user_id
    ORDER BY interaction_at DESC
    LIMIT 50
  ) recent;
  
  -- Detectar communication_style
  IF v_casual_tone_rate > 0.6 THEN
    v_communication_style := 'casual';
  ELSIF v_emoji_usage_rate > 0.5 THEN
    v_communication_style := 'motivational';
  ELSE
    v_communication_style := 'direct';
  END IF;
  
  -- Detectar response_length
  IF v_avg_message_length < 50 THEN
    v_response_length := 'concise';
  ELSIF v_avg_message_length > 150 THEN
    v_response_length := 'detailed';
  ELSE
    v_response_length := 'adaptive';
  END IF;
  
  -- Detectar emoji_frequency
  IF v_emoji_usage_rate < 0.1 THEN
    v_emoji_frequency := 'none';
  ELSIF v_emoji_usage_rate < 0.3 THEN
    v_emoji_frequency := 'low';
  ELSIF v_emoji_usage_rate < 0.6 THEN
    v_emoji_frequency := 'medium';
  ELSE
    v_emoji_frequency := 'high';
  END IF;
  
  -- Insertar o actualizar perfil
  INSERT INTO user_personality_profile (
    user_id,
    communication_style,
    preferred_tone,
    response_length,
    emoji_frequency,
    confidence_score
  ) VALUES (
    p_user_id,
    v_communication_style,
    'balanced',
    v_response_length,
    v_emoji_frequency,
    LEAST(1.0, (SELECT COUNT(*) FROM quest_interaction_logs WHERE user_id = p_user_id)::float / 50.0)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    communication_style = EXCLUDED.communication_style,
    response_length = EXCLUDED.response_length,
    emoji_frequency = EXCLUDED.emoji_frequency,
    confidence_score = EXCLUDED.confidence_score,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- FUNCIONES AUXILIARES
-- ===============================================

-- Función para obtener features disponibles según nivel
CREATE OR REPLACE FUNCTION get_quest_ai_features(p_guild_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_level TEXT;
  v_features JSONB;
BEGIN
  SELECT quest_ai_level INTO v_level
  FROM guilds WHERE id = p_guild_id;
  
  IF v_level = 'disabled' THEN
    RETURN '{}'::jsonb;
  END IF;
  
  SELECT features INTO v_features
  FROM quest_ai_level_configs
  WHERE level = v_level;
  
  RETURN v_features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para upgrade a nivel superior
CREATE OR REPLACE FUNCTION upgrade_quest_ai_level(
  p_guild_id UUID,
  p_new_level TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_premium_only BOOLEAN;
  v_guild_owner UUID;
  v_owner_is_premium BOOLEAN;
BEGIN
  -- Verificar si el nuevo nivel requiere premium
  SELECT is_premium_only INTO v_is_premium_only
  FROM quest_ai_level_configs
  WHERE level = p_new_level;
  
  IF v_is_premium_only THEN
    -- Verificar que el dueño del guild sea premium
    SELECT g.created_by, p.is_premium
    INTO v_guild_owner, v_owner_is_premium
    FROM guilds g
    JOIN profiles p ON p.id = g.created_by
    WHERE g.id = p_guild_id;
    
    IF NOT v_owner_is_premium THEN
      RAISE EXCEPTION 'Quest AI Advanced requiere Premium';
    END IF;
  END IF;
  
  -- Actualizar nivel
  UPDATE guilds
  SET quest_ai_level = p_new_level
  WHERE id = p_guild_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes
CREATE INDEX idx_quest_interaction_logs_user ON quest_interaction_logs(user_id, interaction_at);

COMMENT ON TABLE quest_ai_level_configs IS '3 niveles de Quest AI: básico, moderación, avanzado';
COMMENT ON TABLE user_personality_profile IS 'Perfil de personalidad detectado automáticamente por IA';
COMMENT ON FUNCTION detect_user_personality IS 'Detecta preferencias de comunicación basándose en interacciones';
