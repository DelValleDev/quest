/**
 * Quest AI - Proactive Messages Service
 *
 * Generates motivational and helpful messages that appear occasionally
 * when users complete important actions. Includes cooldown system to
 * avoid being annoying.
 *
 * Message Types:
 * - quest_complete: Celebration when completing a quest
 * - habit_complete: Motivation when completing a habit
 * - level_up: Epic message when leveling up
 * - streak: Motivation when maintaining streaks
 * - achievement: Recognition when unlocking achievements
 * - badge: Celebration when earning badges
 * - duel_win: Celebration when winning duels
 * - stake_win: Congratulations when winning stakes
 */

import { supabase } from "./supabase";
import questAI from "./openai";

export type MessageType =
  | "quest_complete"
  | "habit_complete"
  | "level_up"
  | "streak"
  | "achievement"
  | "badge"
  | "duel_win"
  | "stake_win"
  | "all_quests_complete";

export interface ProactiveMessage {
  id: string;
  message: string;
  emoji: string;
  type: MessageType;
}

interface MessageContext {
  userId: string;
  type: MessageType;
  data?: {
    questTitle?: string;
    habitTitle?: string;
    newLevel?: number;
    streakDays?: number;
    achievementName?: string;
    badgeName?: string;
    xpEarned?: number;
    coinsEarned?: number;
    opponentName?: string;
    allQuestsCompleted?: boolean;
    isPositiveActivity?: boolean;
  };
}

// Message templates for when AI is unavailable or for simple cases
const MESSAGE_TEMPLATES: Record<MessageType, string[]> = {
  quest_complete: [
    "¡Increíble trabajo! 🎯",
    "¡Eso es lo que llamo determinación! 💪",
    "¡Sigue así, campeón! ⚡",
    "¡Quest completado como un pro! 🌟",
    "¡Estás en fuego! 🔥",
  ],
  habit_complete: [
    "¡Un día más de progreso! 📈",
    "¡La consistencia es tu superpoder! ✨",
    "¡Paso a paso hacia la grandeza! 🚀",
    "¡Construyendo el futuro que quieres! 🏗️",
    "¡Cada día cuenta! 💪",
  ],
  level_up: [
    "¡LEVEL UP! ¡Eres imparable! 🎉",
    "¡Nuevo nivel desbloqueado! 🏆",
    "¡Tu esfuerzo está dando frutos! 🌱",
    "¡Sigue subiendo, estás brillando! ⭐",
    "¡Cada nivel es un nuevo tú! 🚀",
  ],
  streak: [
    "¡Racha en llamas! 🔥",
    "¡La consistencia es clave! 📅",
    "¡No pares ahora! 💪",
    "¡Imparable! ⚡",
    "¡Esa disciplina es admirable! 🎯",
  ],
  achievement: [
    "¡Logro desbloqueado! 🏅",
    "¡Eres una leyenda! 👑",
    "¡Esto merece celebrarse! 🎊",
    "¡Nuevo hito alcanzado! 🎯",
    "¡Historia en construcción! 📜",
  ],
  badge: [
    "¡Nueva insignia ganada! 🏆",
    "¡Tu colección crece! 🎖️",
    "¡Te lo ganaste! 💎",
    "¡Badge desbloqueada! ⭐",
    "¡Reconocimiento bien merecido! 🌟",
  ],
  duel_win: [
    "¡Victoria épica! ⚔️",
    "¡Duelo ganado! 🏆",
    "¡Eres un guerrero! 💪",
    "¡Invencible! 👊",
    "¡Rival derrotado! 🎯",
  ],
  stake_win: [
    "¡Compromiso cumplido! 💰",
    "¡Te lo ganaste de vuelta! 🎉",
    "¡Disciplina premiada! 💪",
    "¡Stake ganado! ⚡",
    "¡Palabra cumplida! 🤝",
  ],
  all_quests_complete: [
    "¡DÍA PERFECTO! ¡Completaste TODO! 🏆",
    "¡LEYENDA! ¡100% de quests hoy! 👑",
    "¡IMPARABLE! ¡Día completado al 100%! 🌟",
    "¡PERFECCIÓN! ¡Todas las misiones cumplidas! ⚡",
    "¡ÉPICO! ¡No dejaste nada sin hacer! 💎",
  ],
};

/**
 * Check if we should show a proactive message based on cooldowns and preferences
 */
export async function shouldShowMessage(
  userId: string,
  messageType: MessageType
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("should_show_ai_message", {
      p_user_id: userId,
      p_message_type: messageType,
    });

    if (error) throw error;
    return data === true;
  } catch (err) {
    console.error("Error checking if should show message:", err);
    return false;
  }
}

/**
 * Generate a contextual proactive message using AI or templates
 */
export async function generateProactiveMessage(
  context: MessageContext,
  useAI: boolean = true
): Promise<ProactiveMessage | null> {
  // Check if we should show a message
  const shouldShow = await shouldShowMessage(context.userId, context.type);
  if (!shouldShow) {
    return null;
  }

  let message = "";
  const emoji = getEmojiForType(context.type);

  // Try AI generation for more personalized messages
  if (useAI) {
    try {
      message = await generateAIMessage(context);
    } catch (err) {
      console.error(
        "Error generating AI message, falling back to template:",
        err
      );
    }
  }

  // Fallback to templates if AI fails or is disabled
  if (!message) {
    const templates = MESSAGE_TEMPLATES[context.type];
    message = templates[Math.floor(Math.random() * templates.length)];

    // Add context if available
    if (context.data) {
      message = enrichMessageWithContext(message, context);
    }
  }

  // Log the message
  const { data, error } = await supabase.rpc("log_ai_message", {
    p_user_id: context.userId,
    p_message_type: context.type,
    p_message_content: message,
    p_context_data: context.data || {},
  });

  if (error) {
    console.error("Error logging AI message:", error);
  }

  return {
    id: data || crypto.randomUUID?.() || Math.random().toString(),
    message,
    emoji,
    type: context.type,
  };
}

/**
 * Generate AI-powered message based on user context
 */
async function generateAIMessage(context: MessageContext): Promise<string> {
  // Get user profile for personalization
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, user_class, level, current_streak")
    .eq("id", context.userId)
    .single();

  const prompt = buildPromptForContext(context, profile);

  const response = await questAI.generateText(prompt, {
    max_tokens: 60, // Keep messages short
    temperature: 0.9, // More creative and varied
  });

  return response.trim();
}

/**
 * Build AI prompt based on message type and context
 */
function buildPromptForContext(context: MessageContext, profile: any): string {
  const userName = profile?.display_name || "Adventurer";
  const userClass = profile?.user_class || "warrior";

  const basePrompt = `You are Quest, a motivational AI coach. Generate a SHORT (max 2 sentences), enthusiastic message for ${userName} (a ${userClass}).`;

  switch (context.type) {
    case "quest_complete":
      if (context.data?.isPositiveActivity) {
        return `${basePrompt} They took INITIATIVE and logged a positive activity they did: "${context.data?.questTitle}". This shows PROACTIVITY! Celebrate that they're going above and beyond! Make them feel proud of taking extra steps.`;
      }
      return `${basePrompt} They just completed a quest: "${context.data?.questTitle}". Celebrate their achievement! Be specific about the quest if possible.`;

    case "habit_complete":
      return `${basePrompt} They just completed their habit: "${context.data?.habitTitle}". Motivate them to keep the consistency!`;

    case "level_up":
      return `${basePrompt} They just reached level ${context.data?.newLevel}! Make it EPIC and exciting!`;

    case "streak":
      return `${basePrompt} They're maintaining a ${context.data?.streakDays}-day streak! Encourage them to keep going!`;

    case "achievement":
      return `${basePrompt} They unlocked achievement: "${context.data?.achievementName}". Recognize this milestone!`;

    case "badge":
      return `${basePrompt} They earned a new badge: "${context.data?.badgeName}". Celebrate this recognition!`;

    case "duel_win":
      return `${basePrompt} They just won a duel against ${context.data?.opponentName}! Victory message!`;

    case "stake_win":
      return `${basePrompt} They completed their stake commitment! Congratulate their discipline!`;

    default:
      return `${basePrompt} Celebrate their progress!`;
  }
}

/**
 * Add context details to template messages
 */
function enrichMessageWithContext(
  baseMessage: string,
  context: MessageContext
): string {
  const { data } = context;
  if (!data) return baseMessage;

  switch (context.type) {
    case "quest_complete":
      if (data.xpEarned) {
        return `${baseMessage} +${data.xpEarned} XP`;
      }
      break;
    case "level_up":
      if (data.newLevel) {
        return `${baseMessage} Nivel ${data.newLevel}`;
      }
      break;
    case "streak":
      if (data.streakDays) {
        return `${baseMessage} ${data.streakDays} días`;
      }
      break;
  }

  return baseMessage;
}

/**
 * Get emoji for message type
 */
function getEmojiForType(type: MessageType): string {
  const emojiMap: Record<MessageType, string> = {
    quest_complete: "🎯",
    habit_complete: "✨",
    level_up: "🎉",
    streak: "🔥",
    achievement: "🏅",
    badge: "🏆",
    duel_win: "⚔️",
    stake_win: "💰",
    all_quests_complete: "🏆",
  };

  return emojiMap[type] || "🎉";
}

/**
 * Get user's AI message preferences
 */
export async function getMessagePreferences(userId: string) {
  const { data, error } = await supabase
    .from("ai_message_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // Not found is ok, we'll create defaults
    console.error("Error fetching AI preferences:", error);
  }

  // Return defaults if not found
  if (!data) {
    return {
      proactive_messages_enabled: true,
      smart_recommendations_enabled: false,
      max_messages_per_day: 5,
      message_types_enabled: [
        "quest_complete",
        "habit_complete",
        "level_up",
        "streak",
        "achievement",
        "badge",
        "duel_win",
        "stake_win",
        "all_quests_complete",
      ],
    };
  }

  return data;
}

/**
 * Update user's AI message preferences
 */
export async function updateMessagePreferences(
  userId: string,
  preferences: Partial<{
    proactive_messages_enabled: boolean;
    smart_recommendations_enabled: boolean;
    max_messages_per_day: number;
    message_types_enabled: string[];
  }>
) {
  const { data, error } = await supabase
    .from("ai_message_preferences")
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get recent AI messages for user
 */
export async function getRecentMessages(userId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from("ai_message_log")
    .select("*")
    .eq("user_id", userId)
    .order("shown_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export const ProactiveAI = {
  shouldShow: shouldShowMessage,
  generate: generateProactiveMessage,
  getPreferences: getMessagePreferences,
  updatePreferences: updateMessagePreferences,
  getRecent: getRecentMessages,
};

export default ProactiveAI;
