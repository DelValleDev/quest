-- Migration 041: Quest AI Configuración Granular y Features Individuales
-- Description: Configuración detallada de cada funcionalidad de Quest AI en grupos

-- ===============================================
-- CONFIGURACIÓN GRANULAR DE QUEST AI
-- ===============================================

-- Agregar JSONB para configuración detallada de Quest AI
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS quest_config JSONB DEFAULT '{
  "enabled": false,
  "personality": "motivational",
  "features": {
    "auto_messages": true,
    "daily_summary": true,
    "weekly_report": true,
    "moderate_content": false,
    "respond_mentions": true,
    "suggest_challenges": true,
    "arbitrate_duels": true,
    "detect_burnout": true,
    "analyze_progress": true,
    "celebrate_achievements": true,
    "coach_members": true,
    "generate_insights": true,
    "event_planning": true
  },
  "moderation": {
    "enabled": false,
    "sensitivity": "medium",
    "auto_delete": false,
    "warn_only": true,
    "whitelist_words": [],
    "blacklist_words": []
  },
  "scheduling": {
    "daily_summary_time": "20:00",
    "weekly_report_day": "sunday",
    "weekly_report_time": "18:00"
  },
  "limits": {
    "max_messages_per_day": 10,
    "cooldown_minutes": 30
  }
}'::jsonb;

-- Función para actualizar configuración de Quest AI
CREATE OR REPLACE FUNCTION update_guild_quest_config(
  p_guild_id UUID,
  p_config_key TEXT,
  p_config_value JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_updated_config JSONB;
BEGIN
  -- Actualizar configuración
  UPDATE guilds
  SET quest_config = jsonb_set(
    COALESCE(quest_config, '{}'::jsonb),
    string_to_array(p_config_key, '.'),
    p_config_value
  )
  WHERE id = p_guild_id
  RETURNING quest_config INTO v_updated_config;
  
  RETURN v_updated_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- TABLA DE INTERACCIONES DE QUEST AI
-- ===============================================

CREATE TABLE IF NOT EXISTS guild_quest_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'message', 'moderation', 'analysis', 'suggestion', 'celebration', 'warning'
  triggered_by TEXT, -- 'auto', 'mention', 'event', 'schedule'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Datos adicionales (user_id afectado, análisis completo, etc.)
  personality_used TEXT, -- Personalidad que se usó en esta interacción
  feature_used TEXT, -- Feature específico que generó esto
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_guild_quest_interactions_guild ON guild_quest_interactions(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_quest_interactions_type ON guild_quest_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_guild_quest_interactions_created ON guild_quest_interactions(created_at DESC);

-- RLS
ALTER TABLE guild_quest_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members can view Quest interactions"
ON guild_quest_interactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = guild_quest_interactions.guild_id
    AND gm.user_id = auth.uid()
  )
);

-- ===============================================
-- MODERACIÓN INTELIGENTE
-- ===============================================

-- Tabla de logs de moderación
CREATE TABLE IF NOT EXISTS guild_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  message_id UUID REFERENCES guild_messages(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  moderator TEXT DEFAULT 'quest_ai', -- 'quest_ai', 'admin', 'system'
  action TEXT NOT NULL, -- 'warning', 'deleted', 'flagged', 'timeout'
  reason TEXT NOT NULL,
  original_content TEXT,
  toxicity_score DECIMAL, -- 0.0 a 1.0 de OpenAI Moderation API
  categories JSONB, -- Categorías detectadas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_moderation_logs_guild ON guild_moderation_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user ON guild_moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON guild_moderation_logs(created_at DESC);

-- RLS
ALTER TABLE guild_moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild admins can view moderation logs"
ON guild_moderation_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = guild_moderation_logs.guild_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'owner')
  )
);

-- Función para registrar acción de moderación
CREATE OR REPLACE FUNCTION log_moderation_action(
  p_guild_id UUID,
  p_message_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_reason TEXT,
  p_original_content TEXT DEFAULT NULL,
  p_toxicity_score DECIMAL DEFAULT NULL,
  p_categories JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO guild_moderation_logs (
    guild_id, message_id, user_id, action, reason, 
    original_content, toxicity_score, categories
  )
  VALUES (
    p_guild_id, p_message_id, p_user_id, p_action, p_reason,
    p_original_content, p_toxicity_score, p_categories
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- INSIGHTS Y SUGERENCIAS INTELIGENTES
-- ===============================================

CREATE TABLE IF NOT EXISTS guild_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'pattern', 'suggestion', 'warning', 'opportunity', 'prediction'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Datos que respaldan el insight
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'active', -- 'active', 'dismissed', 'acted_upon'
  expires_at TIMESTAMP WITH TIME ZONE, -- Algunos insights son temporales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acted_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_insights_guild ON guild_ai_insights(guild_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON guild_ai_insights(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON guild_ai_insights(priority, created_at DESC);

-- RLS
ALTER TABLE guild_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members can view AI insights"
ON guild_ai_insights FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = guild_ai_insights.guild_id
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Guild admins can dismiss insights"
ON guild_ai_insights FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = guild_ai_insights.guild_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'owner')
  )
);

-- Función para crear insight
CREATE OR REPLACE FUNCTION create_guild_insight(
  p_guild_id UUID,
  p_insight_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_data JSONB DEFAULT '{}',
  p_priority TEXT DEFAULT 'medium',
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_insight_id UUID;
BEGIN
  INSERT INTO guild_ai_insights (
    guild_id, insight_type, title, description, 
    data, priority, expires_at
  )
  VALUES (
    p_guild_id, p_insight_type, p_title, p_description,
    p_data, p_priority, p_expires_at
  )
  RETURNING id INTO v_insight_id;
  
  RETURN v_insight_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- QUEST AI: ANÁLISIS AVANZADO
-- ===============================================

-- Función mejorada de análisis con insights automáticos
CREATE OR REPLACE FUNCTION quest_analyze_guild_detailed(p_guild_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_analysis JSONB;
  v_patterns JSONB;
  v_recommendations JSONB;
BEGIN
  -- Análisis base
  v_analysis := quest_analyze_guild_progress(p_guild_id);
  
  -- Detectar patrones (días de la semana con bajo rendimiento)
  SELECT jsonb_agg(jsonb_build_object(
    'day', day_name,
    'avg_completion', avg_completion
  ))
  INTO v_patterns
  FROM (
    SELECT 
      TO_CHAR(udq.quest_date, 'Day') as day_name,
      AVG(CASE WHEN udq.completed THEN 100 ELSE 0 END) as avg_completion
    FROM user_daily_quests udq
    JOIN guild_members gm ON udq.user_id = gm.user_id
    WHERE gm.guild_id = p_guild_id
    AND udq.quest_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY TO_CHAR(udq.quest_date, 'Day')
    ORDER BY avg_completion ASC
    LIMIT 3
  ) patterns;
  
  -- Generar recomendaciones automáticas
  v_recommendations := jsonb_build_array();
  
  -- Si hay bajo rendimiento los lunes
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_patterns) p
    WHERE p->>'day' LIKE 'Monday%' AND (p->>'avg_completion')::decimal < 60
  ) THEN
    v_recommendations := v_recommendations || jsonb_build_object(
      'type', 'schedule_adjustment',
      'priority', 'medium',
      'title', 'Ajustar dificultad los lunes',
      'description', 'El grupo tiene bajo rendimiento los lunes. Considerar reducir dificultad 20% o agregar más tiempo.'
    );
  END IF;
  
  -- Si hay miembros con <50% completitud
  IF jsonb_array_length(v_analysis->'struggling_members') > 0 THEN
    v_recommendations := v_recommendations || jsonb_build_object(
      'type', 'member_support',
      'priority', 'high',
      'title', 'Miembros necesitan apoyo',
      'description', format('%s miembros están luchando. Considerar: mensaje de apoyo, reducir carga, o check-in individual.',
        jsonb_array_length(v_analysis->'struggling_members'))
    );
  END IF;
  
  -- Combinar todo
  RETURN jsonb_build_object(
    'analysis', v_analysis,
    'patterns', COALESCE(v_patterns, '[]'::jsonb),
    'recommendations', v_recommendations,
    'generated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- QUEST AI: SUGERENCIAS DE RETOS
-- ===============================================

CREATE OR REPLACE FUNCTION quest_suggest_challenge(
  p_guild_id UUID,
  p_challenge_type TEXT DEFAULT 'raid' -- 'raid', 'duel', 'habit', 'event'
)
RETURNS JSONB AS $$
DECLARE
  v_avg_level DECIMAL;
  v_common_pillars TEXT[];
  v_suggestion JSONB;
BEGIN
  -- Obtener nivel promedio del grupo
  SELECT AVG(p.level)
  INTO v_avg_level
  FROM profiles p
  JOIN guild_members gm ON p.id = gm.user_id
  WHERE gm.guild_id = p_guild_id;
  
  -- Obtener pilares más comunes
  SELECT ARRAY_AGG(DISTINCT up.pillar_id ORDER BY up.pillar_id)
  INTO v_common_pillars
  FROM user_pillars up
  JOIN guild_members gm ON up.user_id = gm.user_id
  WHERE gm.guild_id = p_guild_id
  LIMIT 3;
  
  -- Generar sugerencia basada en datos
  IF p_challenge_type = 'raid' THEN
    v_suggestion := jsonb_build_object(
      'type', 'raid',
      'title', 'Raid Grupal Sugerido',
      'description', format('Basado en nivel promedio (%s) y pilares comunes del grupo', ROUND(v_avg_level)),
      'suggested_duration', CASE 
        WHEN v_avg_level < 5 THEN '3 días'
        WHEN v_avg_level < 10 THEN '5 días'
        ELSE '7 días'
      END,
      'difficulty', CASE
        WHEN v_avg_level < 5 THEN 'easy'
        WHEN v_avg_level < 15 THEN 'medium'
        ELSE 'hard'
      END,
      'reward_qc', CASE
        WHEN v_avg_level < 5 THEN 30
        WHEN v_avg_level < 10 THEN 50
        WHEN v_avg_level < 15 THEN 75
        ELSE 100
      END,
      'common_pillars', v_common_pillars
    );
  END IF;
  
  RETURN v_suggestion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE guild_quest_interactions IS 'Registro de todas las interacciones de Quest AI en grupos';
COMMENT ON TABLE guild_moderation_logs IS 'Logs de moderación automática y manual';
COMMENT ON TABLE guild_ai_insights IS 'Insights y sugerencias generadas por IA para el grupo';
COMMENT ON FUNCTION quest_analyze_guild_detailed IS 'Análisis detallado con patrones y recomendaciones automáticas';
COMMENT ON FUNCTION quest_suggest_challenge IS 'Quest AI sugiere retos basados en datos del grupo';
