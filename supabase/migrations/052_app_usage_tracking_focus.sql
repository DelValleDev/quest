-- Migration 052: App Usage Tracking & Focus Notifications
-- Description: Sistema para analizar qué apps usas y sugerir mejor concentración

-- ===============================================
-- HELPER FUNCTIONS
-- ===============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- APP USAGE TRACKING
-- ===============================================

-- Tabla de uso de apps por usuario
CREATE TABLE user_app_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  package_name TEXT, -- com.instagram.android
  category TEXT, -- social, productivity, entertainment, etc.
  usage_minutes INTEGER DEFAULT 0,
  opens_count INTEGER DEFAULT 0,
  tracked_date DATE DEFAULT CURRENT_DATE,
  last_opened TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, package_name, tracked_date)
);

-- Tabla de patrones de uso detectados
CREATE TABLE user_focus_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pattern_type TEXT, -- distraction_cycle, procrastination_peak, focus_hours
  description TEXT,
  detected_times TIME[], -- Horarios donde ocurre el patrón
  distraction_apps TEXT[], -- Apps que más distraen
  avg_distraction_minutes INTEGER,
  confidence_score FLOAT, -- 0-1 (qué tan seguro está el algoritmo)
  detected_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Los patrones cambian con el tiempo
  is_active BOOLEAN DEFAULT true
);

-- Configuración de focus mode
CREATE TABLE user_focus_config (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  auto_detect_distractions BOOLEAN DEFAULT true,
  send_focus_reminders BOOLEAN DEFAULT true,
  focus_hours_start TIME DEFAULT '09:00',
  focus_hours_end TIME DEFAULT '18:00',
  allowed_distraction_minutes INTEGER DEFAULT 30, -- Por sesión de trabajo
  blocked_apps TEXT[] DEFAULT '{}', -- Apps para bloquear durante focus
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Logs de notificaciones de focus enviadas
CREATE TABLE focus_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT, -- distraction_alert, focus_suggestion, break_reminder
  distraction_app TEXT,
  usage_minutes INTEGER,
  message TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  was_effective BOOLEAN, -- ¿El usuario dejó de distraerse?
  user_response TEXT -- ignore, snooze, focus_now
);

-- Función para analizar patrones de uso
CREATE OR REPLACE FUNCTION analyze_app_usage_patterns(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_total_usage INTEGER;
  v_distraction_apps RECORD;
  v_focus_score FLOAT;
  v_peak_distraction_hour INTEGER;
  v_result JSONB;
BEGIN
  -- Calcular uso total del día
  SELECT SUM(usage_minutes) INTO v_total_usage
  FROM user_app_usage
  WHERE user_id = p_user_id
  AND tracked_date = CURRENT_DATE;
  
  -- Identificar top 3 apps más distractoras (social + entertainment)
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'app_name', app_name,
        'minutes', usage_minutes,
        'opens', opens_count
      ) ORDER BY usage_minutes DESC
    ) INTO v_result
  FROM (
    SELECT app_name, SUM(usage_minutes) as usage_minutes, SUM(opens_count) as opens_count
    FROM user_app_usage
    WHERE user_id = p_user_id
    AND tracked_date = CURRENT_DATE
    AND category IN ('social', 'entertainment', 'games')
    GROUP BY app_name
    LIMIT 3
  ) t;
  
  -- Calcular focus score (0-100)
  -- 100 = 0 minutos en apps distractoras
  -- 0 = 100% del día en apps distractoras
  SELECT 
    GREATEST(0, 100 - (SUM(usage_minutes)::float / NULLIF(v_total_usage, 0) * 100))
  INTO v_focus_score
  FROM user_app_usage
  WHERE user_id = p_user_id
  AND tracked_date = CURRENT_DATE
  AND category IN ('social', 'entertainment', 'games');
  
  RETURN jsonb_build_object(
    'total_usage_minutes', v_total_usage,
    'focus_score', COALESCE(v_focus_score, 100),
    'top_distractions', COALESCE(v_result, '[]'::jsonb),
    'analyzed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para determinar si enviar notificación de focus
CREATE OR REPLACE FUNCTION should_send_focus_notification(
  p_user_id UUID,
  p_current_app TEXT
) RETURNS JSONB AS $$
DECLARE
  v_config RECORD;
  v_today_usage INTEGER;
  v_last_notification TIMESTAMP;
  v_should_send BOOLEAN := false;
  v_message TEXT;
BEGIN
  -- Obtener configuración del usuario
  SELECT * INTO v_config
  FROM user_focus_config
  WHERE user_id = p_user_id;
  
  -- Si no está habilitado, no enviar
  IF NOT v_config.enabled OR NOT v_config.auto_detect_distractions THEN
    RETURN jsonb_build_object('should_send', false, 'reason', 'disabled');
  END IF;
  
  -- Ver si es horario de focus
  IF CURRENT_TIME < v_config.focus_hours_start OR CURRENT_TIME > v_config.focus_hours_end THEN
    RETURN jsonb_build_object('should_send', false, 'reason', 'outside_focus_hours');
  END IF;
  
  -- Ver si la app actual es distractora
  IF NOT (p_current_app = ANY(v_config.blocked_apps)) THEN
    RETURN jsonb_build_object('should_send', false, 'reason', 'app_not_blocked');
  END IF;
  
  -- Ver cuántos minutos lleva hoy en apps distractoras
  SELECT COALESCE(SUM(usage_minutes), 0) INTO v_today_usage
  FROM user_app_usage
  WHERE user_id = p_user_id
  AND tracked_date = CURRENT_DATE
  AND app_name = ANY(v_config.blocked_apps);
  
  -- Si ya superó el límite, enviar notificación
  IF v_today_usage >= v_config.allowed_distraction_minutes THEN
    -- Verificar que no hayamos enviado una notificación hace menos de 1 hora
    SELECT MAX(sent_at) INTO v_last_notification
    FROM focus_notifications_log
    WHERE user_id = p_user_id
    AND notification_type = 'distraction_alert';
    
    IF v_last_notification IS NULL OR v_last_notification < NOW() - INTERVAL '1 hour' THEN
      v_should_send := true;
      v_message := format(
        '🎯 ¡Hey! Llevas %s minutos en %s hoy. Límite: %s min. ¿Volvemos al trabajo?',
        v_today_usage,
        p_current_app,
        v_config.allowed_distraction_minutes
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'should_send', v_should_send,
    'message', v_message,
    'usage_minutes', v_today_usage,
    'limit_minutes', v_config.allowed_distraction_minutes,
    'app', p_current_app
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes para performance
CREATE INDEX idx_user_app_usage_user_date ON user_app_usage(user_id, tracked_date);
CREATE INDEX idx_user_app_usage_category ON user_app_usage(category);
CREATE INDEX idx_focus_patterns_user ON user_focus_patterns(user_id) WHERE is_active = true;
CREATE INDEX idx_focus_notifications_user_date ON focus_notifications_log(user_id, sent_at);

-- Triggers para actualizar timestamps
CREATE TRIGGER update_focus_config_timestamp
BEFORE UPDATE ON user_focus_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_app_usage IS 'Tracking de uso de apps por usuario para análisis de productividad';
COMMENT ON TABLE user_focus_patterns IS 'Patrones de distracción detectados automáticamente por IA';
COMMENT ON FUNCTION should_send_focus_notification IS 'Determina si enviar notificación de focus al usuario basado en su uso actual de apps';
