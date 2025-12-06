import { supabase } from "./supabase";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

export interface ModerationResult {
  flagged: boolean;
  toxicity_score: number; // 0.0 - 1.0
  categories: {
    harassment: boolean;
    "harassment/threatening": boolean;
    hate: boolean;
    "hate/threatening": boolean;
    "self-harm": boolean;
    "self-harm/intent": boolean;
    "self-harm/instructions": boolean;
    sexual: boolean;
    "sexual/minors": boolean;
    violence: boolean;
    "violence/graphic": boolean;
  };
  category_scores: {
    [key: string]: number;
  };
}

export interface ModerationLog {
  id: string;
  guild_id: string;
  user_id: string;
  message_id?: string;
  content: string;
  action_taken: "none" | "warned" | "deleted" | "muted";
  toxicity_score: number;
  categories: any;
  moderator: "quest_ai" | "admin" | "system";
  notes?: string;
  created_at: string;
}

/**
 * Verificar contenido con OpenAI Moderation API
 */
export const checkContentToxicity = async (
  content: string
): Promise<ModerationResult> => {
  try {
    const moderation = await openai.moderations.create({
      input: content,
    });

    const result = moderation.results[0];

    // Calcular toxicity score promedio
    const scores = Object.values(result.category_scores) as number[];
    const avgScore =
      scores.reduce((sum: number, score: number) => sum + score, 0) /
      scores.length;

    return {
      flagged: result.flagged,
      toxicity_score: avgScore,
      categories: result.categories as any,
      category_scores: result.category_scores as unknown as {
        [key: string]: number;
      },
    };
  } catch (error) {
    console.error("Error checking toxicity:", error);
    // Fallback: no flaggear si hay error
    return {
      flagged: false,
      toxicity_score: 0,
      categories: {} as any,
      category_scores: {},
    };
  }
};

/**
 * Verificar contenido con configuración del guild
 */
export const moderateContent = async (
  guildId: string,
  content: string,
  whitelist: string[] = [],
  blacklist: string[] = []
): Promise<{ should_moderate: boolean; reason?: string; score: number }> => {
  // 1. Verificar blacklist primero
  const lowerContent = content.toLowerCase();
  for (const word of blacklist) {
    if (lowerContent.includes(word.toLowerCase())) {
      return {
        should_moderate: true,
        reason: "blacklisted_word",
        score: 1.0,
      };
    }
  }

  // 2. Verificar whitelist
  const hasWhitelistedWord = whitelist.some((word) =>
    lowerContent.includes(word.toLowerCase())
  );

  // 3. Verificar con OpenAI Moderation API
  const modResult = await checkContentToxicity(content);

  // Si tiene palabra whitelisteada y no está muy flagged, permitir
  if (hasWhitelistedWord && modResult.toxicity_score < 0.8) {
    return {
      should_moderate: false,
      score: modResult.toxicity_score,
    };
  }

  return {
    should_moderate: modResult.flagged,
    reason: modResult.flagged ? "toxicity_detected" : undefined,
    score: modResult.toxicity_score,
  };
};

/**
 * Registrar acción de moderación
 */
export const logModerationAction = async (
  guildId: string,
  userId: string,
  content: string,
  actionTaken: ModerationLog["action_taken"],
  toxicityScore: number,
  categories: any,
  messageId?: string,
  notes?: string
): Promise<void> => {
  const { error } = await supabase.rpc("log_moderation_action", {
    p_guild_id: guildId,
    p_user_id: userId,
    p_message_id: messageId || null,
    p_content: content,
    p_action_taken: actionTaken,
    p_toxicity_score: toxicityScore,
    p_categories: categories,
    p_notes: notes || null,
  });

  if (error) throw error;
};

/**
 * Obtener logs de moderación del guild
 */
export const getModerationLogs = async (
  guildId: string,
  limit: number = 100
): Promise<ModerationLog[]> => {
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
 * Obtener logs de moderación de un usuario
 */
export const getUserModerationLogs = async (
  guildId: string,
  userId: string
): Promise<ModerationLog[]> => {
  const { data, error } = await supabase
    .from("guild_moderation_logs")
    .select("*")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Obtener estadísticas de moderación del guild
 */
export const getModerationStats = async (guildId: string) => {
  const logs = await getModerationLogs(guildId, 1000);

  const totalActions = logs.length;
  const warnings = logs.filter((l) => l.action_taken === "warned").length;
  const deletions = logs.filter((l) => l.action_taken === "deleted").length;
  const mutes = logs.filter((l) => l.action_taken === "muted").length;

  const avgToxicityScore =
    logs.length > 0
      ? logs.reduce((sum, l) => sum + l.toxicity_score, 0) / logs.length
      : 0;

  // Top infractores
  const userCounts = logs.reduce((acc, log) => {
    acc[log.user_id] = (acc[log.user_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topOffenders = Object.entries(userCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([userId, count]) => ({ userId, count }));

  return {
    total_actions: totalActions,
    warnings,
    deletions,
    mutes,
    avg_toxicity_score: avgToxicityScore,
    top_offenders: topOffenders,
  };
};

/**
 * Actualizar whitelist del guild
 */
export const updateWhitelist = async (
  guildId: string,
  whitelist: string[]
): Promise<void> => {
  const config = await supabase
    .from("guilds")
    .select("quest_config")
    .eq("id", guildId)
    .single();

  if (config.error) throw config.error;

  const updatedConfig = {
    ...config.data.quest_config,
    moderation: {
      ...config.data.quest_config?.moderation,
      whitelist_words: whitelist,
    },
  };

  const { error } = await supabase.rpc("update_guild_quest_config", {
    p_guild_id: guildId,
    p_config: updatedConfig,
  });

  if (error) throw error;
};

/**
 * Actualizar blacklist del guild
 */
export const updateBlacklist = async (
  guildId: string,
  blacklist: string[]
): Promise<void> => {
  const config = await supabase
    .from("guilds")
    .select("quest_config")
    .eq("id", guildId)
    .single();

  if (config.error) throw config.error;

  const updatedConfig = {
    ...config.data.quest_config,
    moderation: {
      ...config.data.quest_config?.moderation,
      blacklist_words: blacklist,
    },
  };

  const { error } = await supabase.rpc("update_guild_quest_config", {
    p_guild_id: guildId,
    p_config: updatedConfig,
  });

  if (error) throw error;
};

/**
 * Suscribirse a logs de moderación
 */
export const subscribeToModerationLogs = (
  guildId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel("moderation_logs_changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "guild_moderation_logs",
        filter: `guild_id=eq.${guildId}`,
      },
      callback
    )
    .subscribe();
};
