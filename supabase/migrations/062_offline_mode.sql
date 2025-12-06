-- Migration 062: Offline Mode Support
-- Description: Sistema de sincronización para uso offline

-- ===============================================
-- OFFLINE QUEUE
-- ===============================================

CREATE TABLE offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'create_task', 'complete_task', 'update_habit', etc.
  table_name TEXT NOT NULL,
  record_id UUID,
  payload JSONB NOT NULL, -- Datos de la acción
  status TEXT CHECK (status IN ('pending', 'syncing', 'synced', 'failed')) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP
);

-- ===============================================
-- CACHED DATA (para lectura offline)
-- ===============================================

CREATE TABLE offline_cache_metadata (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  last_full_sync TIMESTAMP,
  cached_tables TEXT[], -- Tablas que tiene cacheadas
  cache_version INTEGER DEFAULT 1,
  cache_size_kb INTEGER DEFAULT 0
);

-- ===============================================
-- CONFLICT RESOLUTION
-- ===============================================

CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  local_data JSONB, -- Datos del dispositivo
  server_data JSONB, -- Datos del servidor
  resolution TEXT CHECK (resolution IN ('pending', 'use_local', 'use_server', 'merged', 'manual')),
  resolved_data JSONB,
  detected_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- ===============================================
-- FUNCIONES
-- ===============================================

-- Función para agregar acción a cola offline
CREATE OR REPLACE FUNCTION queue_offline_action(
  p_user_id UUID,
  p_action_type TEXT,
  p_table_name TEXT,
  p_payload JSONB
) RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  INSERT INTO offline_sync_queue (user_id, action_type, table_name, payload)
  VALUES (p_user_id, p_action_type, p_table_name, p_payload)
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para procesar cola de sincronización
CREATE OR REPLACE FUNCTION process_sync_queue(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_item RECORD;
  v_success_count INTEGER := 0;
BEGIN
  FOR v_item IN
    SELECT * FROM offline_sync_queue
    WHERE user_id = p_user_id
    AND status = 'pending'
    AND attempts < max_attempts
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Marcar como syncing
      UPDATE offline_sync_queue
      SET status = 'syncing', attempts = attempts + 1
      WHERE id = v_item.id;
      
      -- Aquí iría la lógica específica según action_type
      -- Por ahora solo marcar como synced
      
      -- Marcar como synced
      UPDATE offline_sync_queue
      SET status = 'synced', synced_at = NOW()
      WHERE id = v_item.id;
      
      v_success_count := v_success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Marcar como failed si excede intentos
      UPDATE offline_sync_queue
      SET 
        status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
        error_message = SQLERRM
      WHERE id = v_item.id;
    END;
  END LOOP;
  
  RETURN v_success_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para detectar conflictos
CREATE OR REPLACE FUNCTION detect_sync_conflicts(
  p_user_id UUID,
  p_table_name TEXT,
  p_record_id UUID,
  p_local_data JSONB,
  p_local_updated_at TIMESTAMP
) RETURNS BOOLEAN AS $$
DECLARE
  v_server_updated_at TIMESTAMP;
  v_server_data JSONB;
BEGIN
  -- Obtener timestamp del servidor (esto varía según tabla)
  -- Por simplicidad, asumimos que hay un updated_at
  
  -- Si server_updated_at > local_updated_at, hay conflicto
  IF v_server_updated_at > p_local_updated_at THEN
    INSERT INTO sync_conflicts (
      user_id,
      table_name,
      record_id,
      local_data,
      server_data
    ) VALUES (
      p_user_id,
      p_table_name,
      p_record_id,
      p_local_data,
      v_server_data
    );
    
    RETURN TRUE; -- Hay conflicto
  END IF;
  
  RETURN FALSE; -- Sin conflictos
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes
CREATE INDEX idx_offline_queue_user_status ON offline_sync_queue(user_id, status) WHERE status = 'pending';
CREATE INDEX idx_sync_conflicts_user_pending ON sync_conflicts(user_id, resolution) WHERE resolution = 'pending';

COMMENT ON TABLE offline_sync_queue IS 'Cola de acciones realizadas offline pendientes de sincronizar';
COMMENT ON TABLE sync_conflicts IS 'Conflictos detectados durante sincronización offline/online';
