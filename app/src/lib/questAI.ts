import { supabase } from "./supabase";

export interface GuildAnalysis {
  guild_id: string;
  analysis: {
    participation_rate: number;
    avg_completion_rate: number;
    most_active_pillar: string;
    engagement_trend: "increasing" | "stable" | "decreasing";
    top_performers: string[];
    members_needing_support: string[];
  };
  patterns?: {
    low_activity_days: string[];
    peak_activity_hours: number[];
    common_challenges: string[];
  };
  recommendations?: string[];
  generated_at: string;
}

export interface ChallengesSuggestion {
  guild_id: string;
  suggestions: {
    raids: Array<{
      title: string;
      description: string;
      duration_days: number;
      difficulty: "easy" | "medium" | "hard";
      pillar: string;
      xp_reward: number;
    }>;
    duels: Array<{
      title: string;
      recommended_participants: string[];
      pillar: string;
    }>;
    habits: Array<{
      title: string;
      frequency: string;
      pillar: string;
    }>;
  };
}

export interface GuildInsight {
  id: string;
  guild_id: string;
  insight_type:
    | "pattern"
    | "suggestion"
    | "warning"
    | "opportunity"
    | "prediction";
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "active" | "dismissed" | "acted_upon";
  expires_at?: string;
  created_at: string;
}

/**
 * Analizar guild con detalle completo
 */
export const analyzeGuild = async (guildId: string): Promise<GuildAnalysis> => {
  const { data, error } = await supabase.rpc("quest_analyze_guild_detailed", {
    p_guild_id: guildId,
  });

  if (error) throw error;
  return data;
};

/**
 * Sugerir retos para el guild
 */
export const suggestChallenges = async (
  guildId: string
): Promise<ChallengesSuggestion> => {
  const { data, error } = await supabase.rpc("quest_suggest_challenge", {
    p_guild_id: guildId,
  });

  if (error) throw error;
  return data;
};

/**
 * Crear insight automático para el guild
 */
export const createGuildInsight = async (
  guildId: string,
  insightType: GuildInsight["insight_type"],
  title: string,
  description: string,
  priority: GuildInsight["priority"],
  expiresInDays?: number
): Promise<GuildInsight> => {
  const { data, error } = await supabase.rpc("create_guild_insight", {
    p_guild_id: guildId,
    p_insight_type: insightType,
    p_title: title,
    p_description: description,
    p_priority: priority,
    p_expires_in_days: expiresInDays || null,
  });

  if (error) throw error;
  return data;
};

/**
 * Obtener insights activos del guild
 */
export const getGuildInsights = async (
  guildId: string,
  includeExpired: boolean = false
): Promise<GuildInsight[]> => {
  let query = supabase
    .from("guild_ai_insights")
    .select("*")
    .eq("guild_id", guildId)
    .neq("status", "dismissed")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (!includeExpired) {
    query = query.or("expires_at.is.null,expires_at.gt.now()");
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

/**
 * Marcar insight como acted upon
 */
export const markInsightActedUpon = async (
  insightId: string
): Promise<void> => {
  const { error } = await supabase
    .from("guild_ai_insights")
    .update({ status: "acted_upon" })
    .eq("id", insightId);

  if (error) throw error;
};

/**
 * Dismiss insight
 */
export const dismissInsight = async (insightId: string): Promise<void> => {
  const { error } = await supabase
    .from("guild_ai_insights")
    .update({ status: "dismissed" })
    .eq("id", insightId);

  if (error) throw error;
};

/**
 * Obtener configuración de Quest AI del guild
 */
export const getGuildQuestConfig = async (guildId: string) => {
  const { data, error } = await supabase
    .from("guilds")
    .select("quest_config")
    .eq("id", guildId)
    .single();

  if (error) throw error;
  return (
    data?.quest_config || {
      enabled: false,
      personality: "motivational",
      features: {},
      moderation: {},
      scheduling: {},
      limits: {},
    }
  );
};

/**
 * Actualizar configuración de Quest AI del guild
 */
export const updateGuildQuestConfig = async (
  guildId: string,
  config: any
): Promise<void> => {
  const { error } = await supabase.rpc("update_guild_quest_config", {
    p_guild_id: guildId,
    p_config: config,
  });

  if (error) throw error;
};

/**
 * Validar respuesta de Quest AI antes de enviarla al grupo
 * Filtra contenido sensible para proteger privacidad
 */
export const validateAIResponse = async (
  guildId: string,
  response: string
): Promise<{
  filtered_response: string;
  violations: string[];
  safe: boolean;
}> => {
  const { data, error } = await supabase.rpc("validate_quest_ai_response", {
    p_guild_id: guildId,
    p_response: response,
  });

  if (error) throw error;
  return data;
};

/**
 * Agregar tema privado que Quest AI NO debe mencionar en grupos
 */
export const addPrivateTopic = async (
  userId: string,
  topic: string,
  keywords: string[],
  neverMentionInGuilds?: string[]
): Promise<void> => {
  const { error } = await supabase.from("user_private_topics").insert({
    user_id: userId,
    topic,
    keywords,
    never_mention_in_guilds: neverMentionInGuilds || [],
  });

  if (error) throw error;
};

/**
 * Obtener temas privados del usuario
 */
export const getUserPrivateTopics = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_private_topics")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
};

/**
 * Registrar interacción de Quest AI
 */
export const logQuestInteraction = async (
  guildId: string,
  interactionType:
    | "message"
    | "moderation"
    | "analysis"
    | "suggestion"
    | "celebration"
    | "warning",
  content: string,
  metadata?: any
): Promise<void> => {
  const { error } = await supabase.from("guild_quest_interactions").insert({
    guild_id: guildId,
    interaction_type: interactionType,
    content,
    metadata: metadata || {},
  });

  if (error) throw error;
};

/**
 * Obtener historial de interacciones de Quest AI
 */
export const getQuestInteractions = async (
  guildId: string,
  limit: number = 50
) => {
  const { data, error } = await supabase
    .from("guild_quest_interactions")
    .select("*")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

/**
 * Obtener logs de moderación del guild
 */
export const getModerationLogs = async (
  guildId: string,
  limit: number = 100
) => {
  const { data, error } = await supabase
    .from("guild_moderation_logs")
    .select("*")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

/**
 * Generar resumen diario del guild (llamado desde Edge Function)
 */
export const generateDailySummary = async (
  guildId: string
): Promise<{ summary: string; insights: string[] }> => {
  const analysis = await analyzeGuild(guildId);
  const insights = await getGuildInsights(guildId);

  // Aquí integrarías con OpenAI para generar el resumen en lenguaje natural
  const summary = `
📊 Resumen Diario del ${new Date().toLocaleDateString()}

Participación: ${analysis.analysis.participation_rate}%
Tasa de Completitud: ${analysis.analysis.avg_completion_rate}%
Tendencia: ${analysis.analysis.engagement_trend}

Top Performers: ${analysis.analysis.top_performers.join(", ")}
Miembros que necesitan apoyo: ${analysis.analysis.members_needing_support.join(
    ", "
  )}
  `.trim();

  return {
    summary,
    insights: insights.map((i) => i.title),
  };
};

/**
 * Suscribirse a cambios en insights del guild
 */
export const subscribeToGuildInsights = (
  guildId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel("guild_insights_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "guild_ai_insights",
        filter: `guild_id=eq.${guildId}`,
      },
      callback
    )
    .subscribe();
};
