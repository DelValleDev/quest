-- Migration 061: Public API for Developers
-- Description: API REST pública con rate limiting para integración de terceros

-- ===============================================
-- API KEYS
-- ===============================================

CREATE TABLE dev_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL, -- "Mi App de Productividad"
  api_key TEXT UNIQUE NOT NULL,
  api_secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  allowed_endpoints TEXT[], -- NULL = todos, o específicos ['GET /tasks', 'POST /tasks']
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP -- NULL = nunca expira
);

-- ===============================================
-- RATE LIMITING
-- ===============================================

CREATE TABLE api_rate_limits (
  api_key_id UUID REFERENCES dev_api_keys(id) ON DELETE CASCADE,
  hour_window TIMESTAMP NOT NULL, -- Truncado a hora: 2024-01-15 14:00:00
  request_count INTEGER DEFAULT 1,
  PRIMARY KEY (api_key_id, hour_window)
);

CREATE TABLE api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES dev_api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL, -- GET, POST, PUT, DELETE
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  requested_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- WEBHOOKS (para notificar a apps externas)
-- ===============================================

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES dev_api_keys(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[], -- ['task.completed', 'streak.broken', 'level.up']
  secret TEXT NOT NULL, -- Para firmar payloads
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMP DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0
);

-- ===============================================
-- API SCOPES (permisos)
-- ===============================================

CREATE TABLE api_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES dev_api_keys(id) ON DELETE CASCADE,
  scope TEXT NOT NULL, -- 'read:tasks', 'write:tasks', 'read:profile', 'write:habits'
  granted_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- FUNCIONES
-- ===============================================

-- Función para generar API key
CREATE OR REPLACE FUNCTION generate_api_key(
  p_user_id UUID,
  p_key_name TEXT,
  p_rate_limit INTEGER DEFAULT 1000
) RETURNS TABLE(api_key TEXT, api_secret TEXT) AS $$
DECLARE
  v_api_key TEXT;
  v_api_secret TEXT;
BEGIN
  -- Generar key y secret (en producción usar crypto aleatorio más seguro)
  v_api_key := 'qst_' || encode(gen_random_bytes(24), 'hex');
  v_api_secret := 'qsts_' || encode(gen_random_bytes(32), 'hex');
  
  INSERT INTO dev_api_keys (user_id, key_name, api_key, api_secret, rate_limit_per_hour)
  VALUES (p_user_id, p_key_name, v_api_key, v_api_secret, p_rate_limit);
  
  RETURN QUERY SELECT v_api_key, v_api_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar rate limit
CREATE OR REPLACE FUNCTION check_api_rate_limit(p_api_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_api_key_id UUID;
  v_rate_limit INTEGER;
  v_current_count INTEGER;
  v_hour_window TIMESTAMP;
BEGIN
  -- Obtener API key ID y límite
  SELECT id, rate_limit_per_hour
  INTO v_api_key_id, v_rate_limit
  FROM dev_api_keys
  WHERE api_key = p_api_key
  AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_api_key_id IS NULL THEN
    RETURN FALSE; -- API key inválida
  END IF;
  
  -- Ventana de hora actual
  v_hour_window := DATE_TRUNC('hour', NOW());
  
  -- Obtener count actual
  SELECT request_count INTO v_current_count
  FROM api_rate_limits
  WHERE api_key_id = v_api_key_id
  AND hour_window = v_hour_window;
  
  -- Si no existe, crear
  IF v_current_count IS NULL THEN
    INSERT INTO api_rate_limits (api_key_id, hour_window, request_count)
    VALUES (v_api_key_id, v_hour_window, 1);
    RETURN TRUE;
  END IF;
  
  -- Verificar límite
  IF v_current_count >= v_rate_limit THEN
    RETURN FALSE; -- Excedió rate limit
  END IF;
  
  -- Incrementar counter
  UPDATE api_rate_limits
  SET request_count = request_count + 1
  WHERE api_key_id = v_api_key_id
  AND hour_window = v_hour_window;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para log de request
CREATE OR REPLACE FUNCTION log_api_request(
  p_api_key TEXT,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_response_time_ms INTEGER
) RETURNS VOID AS $$
DECLARE
  v_api_key_id UUID;
BEGIN
  SELECT id INTO v_api_key_id
  FROM dev_api_keys
  WHERE api_key = p_api_key;
  
  IF v_api_key_id IS NULL THEN
    RETURN;
  END IF;
  
  INSERT INTO api_request_logs (api_key_id, endpoint, method, status_code, response_time_ms)
  VALUES (v_api_key_id, p_endpoint, p_method, p_status_code, p_response_time_ms);
  
  -- Actualizar last_used_at
  UPDATE dev_api_keys
  SET last_used_at = NOW()
  WHERE id = v_api_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- API DOCUMENTATION (metadata)
-- ===============================================

CREATE TABLE api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT UNIQUE NOT NULL, -- '/api/v1/tasks'
  method TEXT NOT NULL, -- GET, POST, PUT, DELETE
  description TEXT,
  required_scopes TEXT[], -- ['read:tasks']
  rate_limit INTEGER, -- Límite específico para este endpoint (override global)
  is_public BOOLEAN DEFAULT FALSE, -- Algunos endpoints pueden ser públicos sin auth
  created_at TIMESTAMP DEFAULT NOW()
);

-- Endpoints disponibles
INSERT INTO api_endpoints (path, method, description, required_scopes, rate_limit) VALUES
('/api/v1/tasks', 'GET', 'Obtener lista de tareas del usuario', ARRAY['read:tasks'], 100),
('/api/v1/tasks', 'POST', 'Crear nueva tarea', ARRAY['write:tasks'], 50),
('/api/v1/tasks/:id', 'PUT', 'Actualizar tarea existente', ARRAY['write:tasks'], 50),
('/api/v1/tasks/:id', 'DELETE', 'Eliminar tarea', ARRAY['write:tasks'], 50),
('/api/v1/tasks/:id/complete', 'POST', 'Marcar tarea como completada', ARRAY['write:tasks'], 100),
('/api/v1/habits', 'GET', 'Obtener lista de hábitos', ARRAY['read:habits'], 100),
('/api/v1/habits', 'POST', 'Crear nuevo hábito', ARRAY['write:habits'], 50),
('/api/v1/profile', 'GET', 'Obtener perfil del usuario', ARRAY['read:profile'], 100),
('/api/v1/stats', 'GET', 'Obtener estadísticas del usuario', ARRAY['read:stats'], 50),
('/api/v1/guilds', 'GET', 'Obtener guilds del usuario', ARRAY['read:guilds'], 100)
ON CONFLICT (path) DO NOTHING;

-- Indexes
CREATE INDEX idx_api_keys_user ON dev_api_keys(user_id, is_active);
CREATE INDEX idx_api_keys_key ON dev_api_keys(api_key) WHERE is_active = TRUE;
CREATE INDEX idx_api_rate_limits_window ON api_rate_limits(api_key_id, hour_window);
CREATE INDEX idx_api_request_logs_key_time ON api_request_logs(api_key_id, requested_at);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE dev_api_keys IS 'API keys para desarrolladores externos que quieren integrar con Quest';
COMMENT ON TABLE api_rate_limits IS 'Rate limiting por hora para prevenir abuso de API';
COMMENT ON TABLE webhooks IS 'Webhooks para notificar eventos a apps externas';
COMMENT ON TABLE api_endpoints IS 'Documentación de endpoints disponibles en la API pública';
