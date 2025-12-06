-- Migration 039: Función para obtener reacciones en bulk
-- Description: Optimización para cargar reacciones de múltiples mensajes de una vez

-- Función para obtener reacciones de múltiples mensajes
CREATE OR REPLACE FUNCTION get_bulk_message_reactions(
  p_message_ids UUID[],
  p_user_id UUID
)
RETURNS TABLE(
  message_id UUID,
  emoji TEXT,
  reaction_count BIGINT,
  user_reacted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gmr.message_id,
    gmr.emoji,
    COUNT(*)::BIGINT as reaction_count,
    BOOL_OR(gmr.user_id = p_user_id) as user_reacted
  FROM guild_message_reactions gmr
  WHERE gmr.message_id = ANY(p_message_ids)
  GROUP BY gmr.message_id, gmr.emoji
  ORDER BY gmr.message_id, reaction_count DESC, gmr.emoji;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_bulk_message_reactions IS 'Obtiene todas las reacciones para múltiples mensajes de forma optimizada';
