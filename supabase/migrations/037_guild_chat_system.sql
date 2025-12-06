-- Migration 037: Guild Chat System
-- Sistema de chat grupal en tiempo real para guilds (estilo WhatsApp)

-- Tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS public.guild_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columna last_read_at a guild_members si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guild_members' 
    AND column_name = 'last_read_at'
  ) THEN
    ALTER TABLE public.guild_members ADD COLUMN last_read_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_guild_messages_guild ON guild_messages(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guild_messages_user ON guild_messages(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE guild_messages ENABLE ROW LEVEL SECURITY;

-- Los miembros de la guild pueden leer todos los mensajes
CREATE POLICY guild_messages_read_policy ON guild_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = guild_messages.guild_id
      AND guild_members.user_id = auth.uid()
    )
  );

-- Los miembros pueden crear mensajes en su guild
CREATE POLICY guild_messages_create_policy ON guild_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = guild_messages.guild_id
      AND guild_members.user_id = auth.uid()
    )
  );

-- Solo el autor puede eliminar sus mensajes (o admins)
CREATE POLICY guild_messages_delete_policy ON guild_messages
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = guild_messages.guild_id
      AND guild_members.user_id = auth.uid()
      AND guild_members.role IN ('owner', 'admin')
    )
  );

-- Función para enviar notificación cuando hay mensaje nuevo (opcional)
CREATE OR REPLACE FUNCTION notify_new_guild_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar a todos los miembros excepto el autor
  INSERT INTO notifications (user_id, type, title, message, action_url)
  SELECT 
    gm.user_id,
    'new_message',
    'Nuevo mensaje en ' || g.name,
    LEFT(NEW.content, 100),
    '/guilds/' || NEW.guild_id || '/chat'
  FROM guild_members gm
  JOIN guilds g ON g.id = gm.guild_id
  WHERE gm.guild_id = NEW.guild_id
  AND gm.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificaciones (comentado por ahora para no spamear)
-- CREATE TRIGGER trigger_notify_new_message
-- AFTER INSERT ON guild_messages
-- FOR EACH ROW
-- EXECUTE FUNCTION notify_new_guild_message();

-- Comentarios
COMMENT ON TABLE guild_messages IS 'Mensajes de chat en tiempo real para guilds';
COMMENT ON COLUMN guild_messages.message_type IS 'Tipo de mensaje: text (normal), image (con imagen), system (evento del sistema)';
COMMENT ON COLUMN guild_members.last_read_at IS 'Timestamp del último mensaje leído por el usuario en esta guild';
