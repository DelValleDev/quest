-- Migration 055: AI Intelligence - Sentiment Analysis, Churn Prediction, ML Recommendations
-- Description: IA más inteligente con análisis de emociones, predicción de abandono y recomendaciones ML

-- ===============================================
-- SENTIMENT ANALYSIS
-- ===============================================

CREATE TABLE message_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID, -- ID del mensaje analizado
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sentiment TEXT CHECK (sentiment IN ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')),
  confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
  emotions JSONB, -- {"joy": 0.8, "sadness": 0.1, "anger": 0.05, "fear": 0.02, "surprise": 0.03}
  detected_at TIMESTAMP DEFAULT NOW(),
  source TEXT -- 'chat', 'task_note', 'reflection'
);

-- Tabla de análisis emocional del usuario (trends)
CREATE TABLE user_emotional_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  avg_sentiment FLOAT, -- -1 (muy negativo) a 1 (muy positivo)
  dominant_emotion TEXT,
  emotional_stability FLOAT, -- 0-1 (qué tan estable es emocionalmente)
  burnout_risk FLOAT CHECK (burnout_risk BETWEEN 0 AND 1), -- 0 = bajo riesgo, 1 = alto riesgo
  recommended_actions TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ===============================================
-- CHURN PREDICTION
-- ===============================================

CREATE TABLE user_engagement_metrics (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  last_active_at TIMESTAMP DEFAULT NOW(),
  days_since_last_active INTEGER DEFAULT 0,
  avg_daily_sessions FLOAT DEFAULT 0,
  avg_session_duration_minutes FLOAT DEFAULT 0,
  task_completion_rate FLOAT DEFAULT 0, -- 0-1
  social_engagement_score FLOAT DEFAULT 0, -- 0-100
  streak_consistency FLOAT DEFAULT 0, -- 0-1
  premium_engagement_score FLOAT DEFAULT 0, -- 0-100 (solo premium)
  churn_risk_score FLOAT CHECK (churn_risk_score BETWEEN 0 AND 1), -- 0 = muy engaged, 1 = a punto de irse
  churn_risk_level TEXT CHECK (churn_risk_level IN ('low', 'medium', 'high', 'critical')),
  last_calculated TIMESTAMP DEFAULT NOW()
);

-- Triggers de churn prevention
CREATE TABLE churn_prevention_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT, -- 'send_notification', 'offer_discount', 'personal_message', 'quest_intervention'
  message TEXT,
  qc_reward INTEGER DEFAULT 0,
  triggered_at TIMESTAMP DEFAULT NOW(),
  was_successful BOOLEAN, -- ¿El usuario volvió?
  user_response_at TIMESTAMP
);

-- ===============================================
-- ML RECOMMENDATIONS
-- ===============================================

CREATE TABLE user_similarity_matrix (
  user_a_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  similarity_score FLOAT CHECK (similarity_score BETWEEN 0 AND 1), -- 0 = completamente diferentes, 1 = gemelos
  common_habits INTEGER DEFAULT 0,
  common_interests TEXT[],
  calculated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_a_id, user_b_id)
);

CREATE TABLE ml_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_type TEXT, -- 'habit', 'challenge', 'guild', 'friend', 'content'
  item_id UUID, -- ID del item recomendado
  confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
  reasoning TEXT, -- "Usuarios similares a ti completaron este reto con éxito"
  based_on JSONB, -- {"similar_users": [...], "your_patterns": [...]}
  was_accepted BOOLEAN,
  shown_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- ===============================================
-- FUNCIONES DE IA
-- ===============================================

-- Función para analizar sentimiento de un mensaje (mock - en prod usar OpenAI/Hugging Face)
CREATE OR REPLACE FUNCTION analyze_sentiment(
  p_user_id UUID,
  p_message TEXT,
  p_source TEXT
) RETURNS JSONB AS $$
DECLARE
  v_sentiment TEXT;
  v_confidence FLOAT;
  v_emotions JSONB;
BEGIN
  -- Mock analysis - en producción llamar a API de sentiment analysis
  -- Por ahora, análisis simple basado en palabras clave
  
  IF p_message ~* '(triste|deprimido|mal|horrible|odio|fracaso)' THEN
    v_sentiment := 'negative';
    v_confidence := 0.75;
    v_emotions := '{"sadness": 0.7, "joy": 0.1, "anger": 0.1, "fear": 0.05, "surprise": 0.05}'::jsonb;
  ELSIF p_message ~* '(feliz|genial|increíble|logré|éxito|amor)' THEN
    v_sentiment := 'positive';
    v_confidence := 0.8;
    v_emotions := '{"joy": 0.8, "sadness": 0.05, "anger": 0.02, "fear": 0.03, "surprise": 0.1}'::jsonb;
  ELSE
    v_sentiment := 'neutral';
    v_confidence := 0.6;
    v_emotions := '{"joy": 0.4, "sadness": 0.2, "anger": 0.1, "fear": 0.1, "surprise": 0.2}'::jsonb;
  END IF;
  
  -- Guardar análisis
  INSERT INTO message_sentiment (user_id, sentiment, confidence_score, emotions, source)
  VALUES (p_user_id, v_sentiment, v_confidence, v_emotions, p_source);
  
  RETURN jsonb_build_object(
    'sentiment', v_sentiment,
    'confidence', v_confidence,
    'emotions', v_emotions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular churn risk
CREATE OR REPLACE FUNCTION calculate_churn_risk(p_user_id UUID)
RETURNS FLOAT AS $$
DECLARE
  v_days_inactive INTEGER;
  v_completion_rate FLOAT;
  v_social_engagement FLOAT;
  v_churn_score FLOAT := 0;
BEGIN
  -- Obtener métricas
  SELECT 
    days_since_last_active,
    task_completion_rate,
    social_engagement_score
  INTO v_days_inactive, v_completion_rate, v_social_engagement
  FROM user_engagement_metrics
  WHERE user_id = p_user_id;
  
  -- Algoritmo simple de churn risk
  -- Más días inactivo = mayor riesgo
  v_churn_score := v_churn_score + (v_days_inactive::float / 30.0) * 0.4;
  
  -- Menor completion rate = mayor riesgo
  v_churn_score := v_churn_score + (1 - COALESCE(v_completion_rate, 0)) * 0.3;
  
  -- Menor social engagement = mayor riesgo
  v_churn_score := v_churn_score + (1 - COALESCE(v_social_engagement, 0) / 100.0) * 0.3;
  
  -- Limitar entre 0 y 1
  v_churn_score := LEAST(1.0, GREATEST(0.0, v_churn_score));
  
  -- Actualizar
  UPDATE user_engagement_metrics
  SET 
    churn_risk_score = v_churn_score,
    churn_risk_level = CASE
      WHEN v_churn_score < 0.3 THEN 'low'
      WHEN v_churn_score < 0.6 THEN 'medium'
      WHEN v_churn_score < 0.8 THEN 'high'
      ELSE 'critical'
    END,
    last_calculated = NOW()
  WHERE user_id = p_user_id;
  
  RETURN v_churn_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para encontrar usuarios similares
CREATE OR REPLACE FUNCTION find_similar_users(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  similar_user_id UUID,
  similarity_score FLOAT,
  common_habits INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    user_b_id,
    similarity_score,
    common_habits
  FROM user_similarity_matrix
  WHERE user_a_id = p_user_id
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar recomendaciones ML
CREATE OR REPLACE FUNCTION generate_ml_recommendations(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_similar_users UUID[];
  v_recommendation RECORD;
BEGIN
  -- Obtener usuarios similares
  SELECT ARRAY_AGG(similar_user_id)
  INTO v_similar_users
  FROM find_similar_users(p_user_id, 20);
  
  -- Recomendar hábitos que usuarios similares tienen (pero tú no)
  FOR v_recommendation IN
    SELECT DISTINCT bh.id, bh.name
    FROM bad_habits bh
    WHERE bh.user_id = ANY(v_similar_users)
    AND NOT EXISTS (
      SELECT 1 FROM bad_habits WHERE user_id = p_user_id AND name = bh.name
    )
    LIMIT 3
  LOOP
    INSERT INTO ml_recommendations (
      user_id,
      recommendation_type,
      item_id,
      confidence_score,
      reasoning,
      based_on,
      expires_at
    ) VALUES (
      p_user_id,
      'habit',
      v_recommendation.id,
      0.75,
      'Usuarios similares a ti están trabajando en este hábito',
      jsonb_build_object('similar_users', v_similar_users),
      NOW() + INTERVAL '7 days'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes
CREATE INDEX idx_message_sentiment_user ON message_sentiment(user_id, detected_at);
CREATE INDEX idx_emotional_trends_user_week ON user_emotional_trends(user_id, week_start);
CREATE INDEX idx_churn_risk_level ON user_engagement_metrics(churn_risk_level) WHERE churn_risk_level IN ('high', 'critical');
CREATE INDEX idx_ml_recommendations_user ON ml_recommendations(user_id, recommendation_type) WHERE was_accepted IS NULL;

COMMENT ON TABLE message_sentiment IS 'Análisis de sentimientos en mensajes con IA';
COMMENT ON TABLE user_engagement_metrics IS 'Métricas de engagement para predicción de churn';
COMMENT ON TABLE ml_recommendations IS 'Recomendaciones personalizadas basadas en ML de usuarios similares';
