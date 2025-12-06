-- Migration 051: Quest AI Privacy Protection
-- Description: Sistema para que Quest AI no revele información privada en grupos

-- ===============================================
-- PRIVACY PROTECTION
-- ===============================================

-- Tabla de temas sensibles por usuario
CREATE TABLE user_private_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL, -- "mental health", "family issues", "addiction", etc.
  keywords TEXT[] DEFAULT '{}', -- palabras clave relacionadas
  never_mention_in_guilds UUID[] DEFAULT '{}', -- IDs de guilds donde NO mencionar
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- Configuración de privacidad de Quest AI por guild
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS quest_privacy_config JSONB DEFAULT '{
  "respect_private_topics": true,
  "anonymize_struggles": true,
  "ask_before_sharing": true,
  "private_mode": false
}'::jsonb;

-- Función para filtrar contenido sensible antes de que Quest AI responda
CREATE OR REPLACE FUNCTION filter_sensitive_content(
  p_user_id UUID,
  p_guild_id UUID,
  p_message TEXT
) RETURNS TEXT AS $$
DECLARE
  v_private_topics RECORD;
  v_filtered_message TEXT := p_message;
BEGIN
  -- Obtener temas privados del usuario
  FOR v_private_topics IN
    SELECT topic, keywords
    FROM user_private_topics
    WHERE user_id = p_user_id
    AND (never_mention_in_guilds IS NULL OR p_guild_id = ANY(never_mention_in_guilds))
  LOOP
    -- Reemplazar menciones específicas con versiones genéricas
    -- Ej: "struggling with anxiety" → "dealing with personal challenges"
    v_filtered_message := REGEXP_REPLACE(
      v_filtered_message,
      array_to_string(v_private_topics.keywords, '|'),
      'personal challenges',
      'gi'
    );
  END LOOP;
  
  RETURN v_filtered_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reglas de privacidad para Quest AI
CREATE TABLE quest_ai_privacy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT UNIQUE NOT NULL,
  description TEXT,
  pattern TEXT, -- Regex pattern to detect
  replacement TEXT, -- Generic replacement
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar reglas de privacidad por defecto
INSERT INTO quest_ai_privacy_rules (rule_name, description, pattern, replacement, severity) VALUES
('mental_health', 'Proteger menciones de salud mental', '(anxiety|depression|therapy|counseling|mental health)', 'personal wellness journey', 'high'),
('addiction', 'Proteger menciones de adicciones', '(addiction|rehab|recovery|sober|alcoholic)', 'personal growth journey', 'critical'),
('family_issues', 'Proteger problemas familiares', '(divorce|abuse|family problems|toxic family)', 'family situation', 'high'),
('financial_struggles', 'Proteger problemas financieros', '(bankruptcy|debt|broke|financial crisis)', 'financial planning', 'medium'),
('relationship_issues', 'Proteger problemas de pareja', '(breakup|cheating|relationship problems)', 'relationship navigation', 'medium'),
('health_conditions', 'Proteger condiciones médicas', '(cancer|diabetes|chronic illness|disease)', 'health journey', 'high'),
('legal_issues', 'Proteger problemas legales', '(lawsuit|arrested|criminal|jail)', 'legal matters', 'critical'),
('work_conflicts', 'Proteger conflictos laborales', '(fired|laid off|workplace harassment)', 'career transition', 'medium');

-- Función para que Quest AI valide su respuesta antes de enviarla al grupo
CREATE OR REPLACE FUNCTION validate_quest_ai_response(
  p_guild_id UUID,
  p_response TEXT
) RETURNS JSONB AS $$
DECLARE
  v_privacy_config JSONB;
  v_rule RECORD;
  v_filtered_response TEXT := p_response;
  v_violations TEXT[] := '{}';
BEGIN
  -- Obtener configuración de privacidad del guild
  SELECT quest_privacy_config INTO v_privacy_config
  FROM guilds
  WHERE id = p_guild_id;
  
  -- Si no está habilitado, retornar sin filtrar
  IF NOT (v_privacy_config->>'respect_private_topics')::boolean THEN
    RETURN jsonb_build_object(
      'filtered_response', v_filtered_response,
      'violations', v_violations,
      'safe', true
    );
  END IF;
  
  -- Aplicar todas las reglas de privacidad
  FOR v_rule IN
    SELECT * FROM quest_ai_privacy_rules WHERE enabled = true
  LOOP
    -- Detectar si la respuesta contiene contenido sensible
    IF v_filtered_response ~* v_rule.pattern THEN
      v_violations := array_append(v_violations, v_rule.rule_name);
      
      -- Reemplazar con versión genérica
      v_filtered_response := REGEXP_REPLACE(
        v_filtered_response,
        v_rule.pattern,
        v_rule.replacement,
        'gi'
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'filtered_response', v_filtered_response,
    'violations', v_violations,
    'safe', array_length(v_violations, 1) IS NULL OR array_length(v_violations, 1) = 0,
    'original_length', length(p_response),
    'filtered_length', length(v_filtered_response)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Logs de privacidad para auditoría
CREATE TABLE quest_ai_privacy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES guilds(id),
  original_message TEXT,
  filtered_message TEXT,
  violations TEXT[],
  severity TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index para búsqueda rápida
CREATE INDEX idx_user_private_topics_user ON user_private_topics(user_id);
CREATE INDEX idx_quest_privacy_logs_guild ON quest_ai_privacy_logs(guild_id);

COMMENT ON TABLE user_private_topics IS 'Temas sensibles por usuario que Quest AI NO debe mencionar en grupos públicos';
COMMENT ON FUNCTION validate_quest_ai_response IS 'Valida y filtra respuestas de Quest AI antes de enviarlas al grupo para proteger privacidad';
