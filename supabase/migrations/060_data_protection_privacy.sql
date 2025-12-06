-- Migration 060: Data Protection & Privacy - End-to-end encryption, GDPR compliance
-- Description: Protección de datos sensibles con explicación transparente al usuario

-- ===============================================
-- DATA PROTECTION
-- ===============================================

CREATE TABLE user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  data_collection_consent BOOLEAN DEFAULT TRUE,
  analytics_consent BOOLEAN DEFAULT TRUE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  data_sharing_consent BOOLEAN DEFAULT FALSE, -- Compartir stats anónimos para research
  encryption_enabled BOOLEAN DEFAULT TRUE, -- End-to-end encryption para datos sensibles
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sensitive_data_keys (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  encryption_key TEXT NOT NULL, -- Clave pública del usuario
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- GDPR COMPLIANCE
-- ===============================================

CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  export_format TEXT CHECK (export_format IN ('json', 'csv', 'zip')) DEFAULT 'json',
  download_url TEXT,
  expires_at TIMESTAMP, -- URL válida por 48 horas
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'processing', 'completed')) DEFAULT 'pending',
  confirmation_code TEXT, -- Código de 6 dígitos para confirmar
  requested_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- ===============================================
-- PRIVACY EXPLANATIONS
-- ===============================================

CREATE TABLE privacy_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT UNIQUE NOT NULL, -- 'encryption', 'data_usage', 'quest_ai_privacy', etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT, -- emoji
  display_order INTEGER DEFAULT 0
);

-- ===============================================
-- NOTIFICACIONES CONFIG
-- ===============================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agregar límites personalizables
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notification_preferences' AND column_name = 'max_notifications_per_day') THEN
    ALTER TABLE user_notification_preferences ADD COLUMN max_notifications_per_day INTEGER DEFAULT 3 CHECK (max_notifications_per_day BETWEEN 1 AND 50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notification_preferences' AND column_name = 'quiet_hours_start') THEN
    ALTER TABLE user_notification_preferences ADD COLUMN quiet_hours_start TIME DEFAULT '22:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notification_preferences' AND column_name = 'quiet_hours_end') THEN
    ALTER TABLE user_notification_preferences ADD COLUMN quiet_hours_end TIME DEFAULT '08:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notification_preferences' AND column_name = 'priority_filter') THEN
    ALTER TABLE user_notification_preferences ADD COLUMN priority_filter TEXT CHECK (priority_filter IN ('all', 'high_only', 'critical_only')) DEFAULT 'all';
  END IF;
END $$;

-- ===============================================
-- FUNCIONES
-- ===============================================

-- Función para solicitar export de datos
CREATE OR REPLACE FUNCTION request_data_export(
  p_user_id UUID,
  p_format TEXT DEFAULT 'json'
) RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
BEGIN
  INSERT INTO data_export_requests (user_id, export_format)
  VALUES (p_user_id, p_format)
  RETURNING id INTO v_request_id;
  
  -- TODO: Trigger job para generar export
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para solicitar eliminación de datos
CREATE OR REPLACE FUNCTION request_data_deletion(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_confirmation_code TEXT;
BEGIN
  -- Generar código de confirmación (6 dígitos)
  v_confirmation_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  INSERT INTO data_deletion_requests (user_id, reason, confirmation_code)
  VALUES (p_user_id, p_reason, v_confirmation_code);
  
  -- TODO: Enviar email con código de confirmación
  
  RETURN v_confirmation_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para confirmar eliminación
CREATE OR REPLACE FUNCTION confirm_data_deletion(
  p_user_id UUID,
  p_confirmation_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Verificar código
  SELECT id INTO v_request_id
  FROM data_deletion_requests
  WHERE user_id = p_user_id
  AND confirmation_code = p_confirmation_code
  AND status = 'pending'
  AND requested_at > NOW() - INTERVAL '24 hours'; -- Válido por 24 horas
  
  IF v_request_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Actualizar estado
  UPDATE data_deletion_requests
  SET status = 'confirmed', confirmed_at = NOW()
  WHERE id = v_request_id;
  
  -- TODO: Trigger job para eliminar datos (anonimizar/eliminar)
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si debe enviar notificación (respeta límites)
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_priority TEXT DEFAULT 'medium'
) RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
  v_count_today INTEGER;
  v_current_time TIME;
BEGIN
  -- Obtener preferencias
  SELECT * INTO v_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id;
  
  -- Si no hay prefs, usar defaults
  IF v_prefs IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar filtro de prioridad
  IF v_prefs.priority_filter = 'high_only' AND p_priority NOT IN ('high', 'critical') THEN
    RETURN FALSE;
  ELSIF v_prefs.priority_filter = 'critical_only' AND p_priority != 'critical' THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar quiet hours
  v_current_time := CURRENT_TIME;
  IF v_current_time BETWEEN v_prefs.quiet_hours_start AND '23:59:59'
     OR v_current_time BETWEEN '00:00:00' AND v_prefs.quiet_hours_end THEN
    -- Durante quiet hours, solo critical
    IF p_priority != 'critical' THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Verificar límite diario
  SELECT COUNT(*) INTO v_count_today
  FROM notifications
  WHERE user_id = p_user_id
  AND created_at >= CURRENT_DATE;
  
  IF v_count_today >= v_prefs.max_notifications_per_day THEN
    -- Excedió límite, solo critical
    IF p_priority != 'critical' THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- PRIVACY EXPLANATIONS DATA
-- ===============================================

INSERT INTO privacy_explanations (section, title, description, icon, display_order) VALUES
(
  'encryption',
  'Encriptación End-to-End',
  'Todos tus datos sensibles (tareas privadas, notas personales, información financiera) están encriptados con una clave que solo tú tienes. Ni siquiera nosotros podemos leer tu información privada.',
  '🔒',
  1
),
(
  'no_selling',
  'NUNCA Vendemos Tus Datos',
  'Tu información NUNCA se vende a terceros. Quest se financia con suscripciones premium, no con publicidad ni venta de datos.',
  '🚫',
  2
),
(
  'quest_ai_privacy',
  'Quest AI Respeta Tu Privacidad',
  'Quest AI solo ve mensajes en guilds donde está activado. Además, filtra automáticamente cualquier mención a temas privados que hayas marcado como sensibles.',
  '🤖',
  3
),
(
  'data_minimization',
  'Recolectamos Solo Lo Necesario',
  'Solo guardamos datos esenciales para que la app funcione. No rastreamos tu ubicación en segundo plano ni accedemos a contactos sin permiso explícito.',
  '📦',
  4
),
(
  'gdpr_compliant',
  'Cumplimiento GDPR',
  'Puedes exportar todos tus datos en cualquier momento (formato JSON/CSV) o solicitar la eliminación completa de tu cuenta.',
  '🇪🇺',
  5
),
(
  'anonymous_analytics',
  'Analytics Anónimos',
  'Usamos analytics para mejorar la app, pero son completamente anónimos. No vinculamos datos analíticos con tu identidad personal.',
  '📊',
  6
);

-- Indexes
CREATE INDEX idx_data_export_requests_user ON data_export_requests(user_id, status);
CREATE INDEX idx_data_deletion_requests_user ON data_deletion_requests(user_id, status);

COMMENT ON TABLE user_privacy_settings IS 'Configuración de privacidad por usuario con consentimientos GDPR';
COMMENT ON TABLE data_export_requests IS 'Solicitudes de export de datos (GDPR derecho de portabilidad)';
COMMENT ON TABLE data_deletion_requests IS 'Solicitudes de eliminación de datos (GDPR derecho al olvido)';
COMMENT ON TABLE privacy_explanations IS 'Explicaciones transparentes de cómo protegemos los datos del usuario';
