import { supabase } from "../supabase";

export interface GuildMessage {
  id: string;
  guild_id: string;
  user_id: string;
  content: string;
  message_type: "text" | "image" | "system";
  image_url?: string | null;
  reply_to_id?: string | null;
  translations?: Record<string, string>;
  detected_language?: string | null;
  created_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
    level: number;
    class: string | null;
  };
  reply_to?: {
    id: string;
    content: string;
    author: {
      display_name: string;
    };
  } | null;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  user_reacted: boolean;
}

export interface CreateMessageData {
  guild_id: string;
  content: string;
  message_type?: "text" | "image" | "system";
  image_url?: string;
  reply_to_id?: string;
}

export interface TypingIndicator {
  user_id: string;
  display_name: string;
  started_at: string;
}

/**
 * Obtener mensajes del chat de una guild
 */
export async function getGuildMessages(
  guildId: string,
  limit: number = 50,
  beforeTimestamp?: string
): Promise<GuildMessage[]> {
  let query = supabase
    .from("guild_messages")
    .select(
      `
      *,
      author:profiles!user_id (
        display_name,
        avatar_url,
        level,
        class
      ),
      reply_to:guild_messages!reply_to_id (
        id,
        content,
        author:profiles!user_id (
          display_name
        )
      )
    `
    )
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (beforeTimestamp) {
    query = query.lt("created_at", beforeTimestamp);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Fetch reactions for all messages
  const messages = (data || []).reverse();

  if (messages.length > 0) {
    const messageIds = messages.map((m) => m.id);

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    // Fetch reactions summary for all messages using bulk function
    const { data: reactionsData } = await supabase.rpc(
      "get_bulk_message_reactions",
      {
        p_message_ids: messageIds,
        p_user_id: userId || "",
      }
    );

    // Map reactions to messages
    const reactionsMap = new Map<string, MessageReaction[]>();
    if (reactionsData) {
      reactionsData.forEach((r: any) => {
        if (!reactionsMap.has(r.message_id)) {
          reactionsMap.set(r.message_id, []);
        }
        reactionsMap.get(r.message_id)!.push({
          emoji: r.emoji,
          count: r.reaction_count,
          user_reacted: r.user_reacted,
        });
      });
    }

    // Attach reactions to messages
    messages.forEach((msg) => {
      msg.reactions = reactionsMap.get(msg.id) || [];
    });
  }

  return messages;
}

/**
 * Enviar un mensaje al chat de la guild
 */
export async function sendGuildMessage(
  messageData: CreateMessageData
): Promise<GuildMessage> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  const { data, error } = await supabase
    .from("guild_messages")
    .insert({
      guild_id: messageData.guild_id,
      user_id: user.id,
      content: messageData.content,
      message_type: messageData.message_type || "text",
      image_url: messageData.image_url || null,
    })
    .select(
      `
      *,
      author:profiles!user_id (
        display_name,
        avatar_url,
        level,
        class
      )
    `
    )
    .single();

  if (error) throw error;
  return data;
}

/**
 * Eliminar un mensaje (solo el autor o admin)
 */
export async function deleteGuildMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("guild_messages")
    .delete()
    .eq("id", messageId);

  if (error) throw error;
}

/**
 * Marcar mensajes como leídos
 */
export async function markMessagesAsRead(guildId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Actualizar timestamp de última lectura en guild_members
  const { error } = await supabase
    .from("guild_members")
    .update({ last_read_at: new Date().toISOString() })
    .match({ guild_id: guildId, user_id: user.id });

  if (error) console.error("Error marking as read:", error);
}

/**
 * Obtener contador de mensajes no leídos
 */
export async function getUnreadCount(guildId: string): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  // Obtener último timestamp de lectura
  const { data: membership } = await supabase
    .from("guild_members")
    .select("last_read_at")
    .match({ guild_id: guildId, user_id: user.id })
    .single();

  if (!membership) return 0;

  // Contar mensajes después de ese timestamp
  const { count, error } = await supabase
    .from("guild_messages")
    .select("*", { count: "exact", head: true })
    .eq("guild_id", guildId)
    .gt("created_at", membership.last_read_at || "2000-01-01");

  if (error) return 0;
  return count || 0;
}

/**
 * Agregar reacción a un mensaje
 */
export async function addReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  const { error } = await supabase.from("guild_message_reactions").insert({
    message_id: messageId,
    user_id: user.id,
    emoji: emoji,
  });

  if (error && error.code !== "23505") {
    // Ignorar duplicados
    throw error;
  }
}

/**
 * Quitar reacción de un mensaje
 */
export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  const { error } = await supabase
    .from("guild_message_reactions")
    .delete()
    .match({ message_id: messageId, user_id: user.id, emoji: emoji });

  if (error) throw error;
}

/**
 * Obtener reacciones de un mensaje
 */
export async function getMessageReactions(
  messageId: string
): Promise<MessageReaction[]> {
  const { data, error } = await supabase.rpc("get_message_reactions_summary", {
    p_message_id: messageId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Indicar que el usuario está escribiendo
 */
export async function setTypingIndicator(
  guildId: string,
  isTyping: boolean
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (isTyping) {
    await supabase.from("guild_typing_indicators").upsert(
      {
        guild_id: guildId,
        user_id: user.id,
        started_at: new Date().toISOString(),
      },
      { onConflict: "guild_id,user_id" }
    );
  } else {
    await supabase
      .from("guild_typing_indicators")
      .delete()
      .match({ guild_id: guildId, user_id: user.id });
  }
}

/**
 * Obtener usuarios que están escribiendo
 */
export async function getTypingUsers(
  guildId: string
): Promise<TypingIndicator[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Primero limpiar indicadores antiguos
  await supabase.rpc("cleanup_old_typing_indicators");

  const { data, error } = await supabase
    .from("guild_typing_indicators")
    .select(
      `
      user_id,
      started_at,
      profiles!user_id (display_name)
    `
    )
    .eq("guild_id", guildId)
    .neq("user_id", user.id);

  if (error) return [];

  return (data || []).map((item: any) => ({
    user_id: item.user_id,
    display_name: item.profiles?.display_name || "Usuario",
    started_at: item.started_at,
  }));
}

/**
 * Traducir un mensaje usando AI
 */
export async function translateMessage(
  messageId: string,
  targetLanguage: "en" | "es"
): Promise<string> {
  // Primero verificar si ya existe traducción cacheada
  const { data: message } = await supabase
    .from("guild_messages")
    .select("content, translations")
    .eq("id", messageId)
    .single();

  if (!message) throw new Error("Mensaje no encontrado");

  // Si ya existe en cache, devolverla
  if (message.translations && message.translations[targetLanguage]) {
    return message.translations[targetLanguage];
  }

  // Si no, traducir con OpenAI
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate the following text to ${
              targetLanguage === "es" ? "Spanish" : "English"
            }. Only return the translation, nothing else. Preserve emojis and formatting.`,
          },
          {
            role: "user",
            content: message.content,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const translation = data.choices[0].message.content.trim();

    // Guardar traducción en cache
    const updatedTranslations = {
      ...(message.translations || {}),
      [targetLanguage]: translation,
    };
    await supabase
      .from("guild_messages")
      .update({ translations: updatedTranslations })
      .eq("id", messageId);

    return translation;
  } catch (error) {
    console.error("Error translating:", error);
    throw new Error("Error al traducir el mensaje");
  }
}
