import { supabase } from "./supabase";

export type QuestPersonality =
  | "balanced"
  | "energetic"
  | "calm"
  | "sarcastic"
  | "motivational"
  | "wise";
export type QuestMood =
  | "happy"
  | "excited"
  | "sad"
  | "tired"
  | "proud"
  | "disappointed";
export type QuestEvolutionStage = 1 | 2 | 3 | 4 | 5;

export interface QuestMascot {
  id: string;
  user_id: string;
  name: string;
  personality: QuestPersonality;
  evolution_stage: QuestEvolutionStage;
  current_outfit_id?: string;
  mood: QuestMood;
  last_interaction: string;
  interaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuestOutfit {
  id: string;
  name: string;
  name_es: string;
  description?: string;
  description_es?: string;
  category: "outfit" | "hat" | "accessory" | "theme";
  rarity: "common" | "rare" | "epic" | "legendary";
  qc_price: number;
  premium_only: boolean;
  evolution_required: number;
  icon_url?: string;
  preview_url?: string;
}

export interface QuestInteraction {
  id: string;
  user_id: string;
  interaction_type: string;
  trigger_event?: string;
  message: string;
  mood: QuestMood;
  created_at: string;
}

/**
 * Obtiene la mascota Quest del usuario actual
 */
export async function getUserQuestMascot(
  userId: string
): Promise<QuestMascot | null> {
  const { data, error } = await supabase
    .from("user_quest_mascot")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching Quest mascot:", error);
    return null;
  }

  return data;
}

/**
 * Actualiza la configuración de la mascota Quest
 */
export async function updateQuestMascot(
  userId: string,
  updates: Partial<
    Pick<QuestMascot, "name" | "personality" | "mood" | "current_outfit_id">
  >
): Promise<boolean> {
  const { error } = await supabase
    .from("user_quest_mascot")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating Quest mascot:", error);
    return false;
  }

  return true;
}

/**
 * Obtiene todos los outfits disponibles para Quest
 */
export async function getAvailableOutfits(
  evolutionStage: number,
  isPremium: boolean
): Promise<QuestOutfit[]> {
  let query = supabase
    .from("quest_outfits")
    .select("*")
    .lte("evolution_required", evolutionStage)
    .order("rarity", { ascending: true })
    .order("qc_price", { ascending: true });

  // Si no es premium, filtrar solo los no-premium
  if (!isPremium) {
    query = query.eq("premium_only", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching Quest outfits:", error);
    return [];
  }

  return data || [];
}

/**
 * Obtiene los outfits desbloqueados por el usuario
 */
export async function getUserUnlockedOutfits(
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_quest_outfits")
    .select("outfit_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching unlocked outfits:", error);
    return [];
  }

  return data?.map((item) => item.outfit_id) || [];
}

/**
 * Desbloquea un outfit para el usuario
 */
export async function unlockOutfit(
  userId: string,
  outfitId: string
): Promise<boolean> {
  const { error } = await supabase.from("user_quest_outfits").insert({
    user_id: userId,
    outfit_id: outfitId,
  });

  if (error) {
    console.error("Error unlocking outfit:", error);
    return false;
  }

  return true;
}

/**
 * Compra y equipa un outfit para Quest
 */
export async function purchaseAndEquipOutfit(
  userId: string,
  outfitId: string,
  qcPrice: number
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Verificar saldo de QC
    const { data: profile } = await supabase
      .from("profiles")
      .select("quest_coins")
      .eq("id", userId)
      .single();

    if (!profile || profile.quest_coins < qcPrice) {
      return {
        success: false,
        message: "Insufficient Quest Coins",
      };
    }

    // 2. Desbloquear outfit
    const unlocked = await unlockOutfit(userId, outfitId);
    if (!unlocked) {
      return {
        success: false,
        message: "Failed to unlock outfit",
      };
    }

    // 3. Deducir QC
    const { error: deductError } = await supabase
      .from("profiles")
      .update({
        quest_coins: profile.quest_coins - qcPrice,
      })
      .eq("id", userId);

    if (deductError) {
      return {
        success: false,
        message: "Failed to deduct Quest Coins",
      };
    }

    // 4. Equipar outfit
    await updateQuestMascot(userId, { current_outfit_id: outfitId });

    return {
      success: true,
      message: "Outfit purchased and equipped!",
    };
  } catch (error) {
    console.error("Error purchasing outfit:", error);
    return {
      success: false,
      message: "An error occurred",
    };
  }
}

/**
 * Obtiene un mensaje personalizado de Quest según el evento
 */
export async function getQuestMessage(
  userId: string,
  eventType: string,
  context?: Record<string, any>
): Promise<string> {
  const { data, error } = await supabase.rpc("get_quest_message", {
    p_user_id: userId,
    p_event_type: eventType,
    p_context: context || {},
  });

  if (error) {
    console.error("Error getting Quest message:", error);
    return "¡Sigue adelante! 💫";
  }

  return data || "¡Sigue adelante! 💫";
}

/**
 * Obtiene el historial de interacciones con Quest
 */
export async function getQuestInteractions(
  userId: string,
  limit: number = 50
): Promise<QuestInteraction[]> {
  const { data, error } = await supabase
    .from("quest_interactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching Quest interactions:", error);
    return [];
  }

  return data || [];
}

/**
 * Incrementa el contador de interacciones con Quest
 */
export async function incrementInteractionCount(userId: string): Promise<void> {
  await supabase.rpc("increment", {
    table_name: "user_quest_mascot",
    column_name: "interaction_count",
    row_id: userId,
    increment_by: 1,
  });
}

/**
 * Obtiene el stage de evolución recomendado según el nivel del usuario
 */
export function getEvolutionStageForLevel(level: number): QuestEvolutionStage {
  if (level >= 50) return 5;
  if (level >= 35) return 4;
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  return 1;
}

/**
 * Obtiene descripción de la evolución
 */
export function getEvolutionDescription(
  stage: QuestEvolutionStage,
  language: "en" | "es" = "es"
): string {
  const descriptions = {
    en: {
      1: "Baby Quest - Just starting the adventure",
      2: "Quest Apprentice - Learning and growing",
      3: "Quest Warrior - Strong and determined",
      4: "Quest Master - Experienced and wise",
      5: "Quest Legend - The ultimate form",
    },
    es: {
      1: "Quest Bebé - Comenzando la aventura",
      2: "Quest Aprendiz - Aprendiendo y creciendo",
      3: "Quest Guerrero - Fuerte y determinado",
      4: "Quest Maestro - Experimentado y sabio",
      5: "Quest Legendario - La forma definitiva",
    },
  };

  return descriptions[language][stage];
}

/**
 * Obtiene colores temáticos según la rareza del outfit
 */
export function getRarityColor(rarity: QuestOutfit["rarity"]): string {
  const colors = {
    common: "#9CA3AF", // gray-400
    rare: "#3B82F6", // blue-500
    epic: "#8B5CF6", // purple-500
    legendary: "#F59E0B", // amber-500
  };

  return colors[rarity];
}
