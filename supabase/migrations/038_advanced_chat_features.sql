-- Migration 038: Advanced Chat Features
-- Reacciones, typing indicators, message replies, read receipts

-- Tabla de reacciones a mensajes
CREATE TABLE IF NOT EXISTS public.guild_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.guild_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Tabla de indicadores de "escribiendo..."
CREATE TABLE IF NOT EXISTS public.guild_typing_indicators (
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id)
);

-- Agregar columnas para respuestas y traducciones
DO $$ 
BEGIN
  -- Columna para mensaje al que se responde
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_messages' 
    AND column_name = 'reply_to_id'
  ) THEN
    ALTER TABLE public.guild_messages ADD COLUMN reply_to_id UUID REFERENCES public.guild_messages(id) ON DELETE SET NULL;
  END IF;

  -- Columna para guardar traducciones cacheadas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_messages' 
    AND column_name = 'translations'
  ) THEN
    ALTER TABLE public.guild_messages ADD COLUMN translations JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Columna para idioma detectado del mensaje
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_messages' 
    AND column_name = 'detected_language'
  ) THEN
    ALTER TABLE public.guild_messages ADD COLUMN detected_language TEXT;
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON guild_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON guild_message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_guild ON guild_typing_indicators(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_messages_reply ON guild_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- RLS Policies para reacciones
ALTER TABLE guild_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY guild_message_reactions_read_policy ON guild_message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_messages gm
      JOIN guild_members gmem ON gmem.guild_id = gm.guild_id
      WHERE gm.id = guild_message_reactions.message_id
      AND gmem.user_id = auth.uid()
    )
  );

CREATE POLICY guild_message_reactions_create_policy ON guild_message_reactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY guild_message_reactions_delete_policy ON guild_message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies para typing indicators
ALTER TABLE guild_typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY guild_typing_indicators_read_policy ON guild_typing_indicators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = guild_typing_indicators.guild_id
      AND guild_members.user_id = auth.uid()
    )
  );

CREATE POLICY guild_typing_indicators_write_policy ON guild_typing_indicators
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Función para limpiar typing indicators antiguos (más de 10 segundos)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM guild_typing_indicators
  WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener contador de reacciones por mensaje
CREATE OR REPLACE FUNCTION get_message_reactions_summary(p_message_id UUID)
RETURNS TABLE(emoji TEXT, count BIGINT, user_reacted BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gmr.emoji,
    COUNT(*)::BIGINT as count,
    BOOL_OR(gmr.user_id = auth.uid()) as user_reacted
  FROM guild_message_reactions gmr
  WHERE gmr.message_id = p_message_id
  GROUP BY gmr.emoji
  ORDER BY count DESC, emoji;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE guild_message_reactions IS 'Reacciones emoji a mensajes del chat';
COMMENT ON TABLE guild_typing_indicators IS 'Indicadores de usuarios escribiendo en tiempo real';
COMMENT ON COLUMN guild_messages.reply_to_id IS 'ID del mensaje al que se está respondiendo';
COMMENT ON COLUMN guild_messages.translations IS 'Traducciones cacheadas del mensaje en diferentes idiomas';
COMMENT ON COLUMN guild_messages.detected_language IS 'Idioma detectado automáticamente del mensaje';
