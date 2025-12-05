/**
 * Premium Subscription Service
 * Handles all premium-related functionality
 */

import { supabase } from "./supabase";

// Premium feature definitions
export const PREMIUM_FEATURES = {
  // AI Features
  unlimited_ai_chat: {
    id: "unlimited_ai_chat",
    name: "Chat ilimitado con Quest Coach",
    description: "Habla sin límites con tu coach de IA",
    icon: "🤖",
    freeLimit: 5, // messages per day
    premiumLimit: null, // unlimited
  },
  ai_tools: {
    id: "ai_tools",
    name: "Herramientas de IA avanzadas",
    description: "Crea hábitos, quests y life paths desde el chat",
    icon: "🛠️",
    freeLimit: false,
    premiumLimit: true,
  },

  // Life Paths
  unlimited_life_paths: {
    id: "unlimited_life_paths",
    name: "Life Paths ilimitados",
    description: "Crea todos los caminos que quieras",
    icon: "🗺️",
    freeLimit: 2,
    premiumLimit: null,
  },
  milestone_tracking: {
    id: "milestone_tracking",
    name: "Seguimiento de hitos",
    description: "Añade milestones a tus caminos",
    icon: "🎯",
    freeLimit: 3, // per path
    premiumLimit: null,
  },

  // Habits
  unlimited_habits: {
    id: "unlimited_habits",
    name: "Hábitos ilimitados",
    description: "Trackea todos tus hábitos",
    icon: "🔄",
    freeLimit: 5,
    premiumLimit: null,
  },
  habit_reminders: {
    id: "habit_reminders",
    name: "Recordatorios de hábitos",
    description: "Notificaciones personalizadas",
    icon: "🔔",
    freeLimit: false,
    premiumLimit: true,
  },

  // Progress
  detailed_analytics: {
    id: "detailed_analytics",
    name: "Análisis detallado",
    description: "Gráficos y estadísticas avanzadas",
    icon: "📊",
    freeLimit: false,
    premiumLimit: true,
  },
  progress_snapshots: {
    id: "progress_snapshots",
    name: "Historial de progreso",
    description: "Ve tu evolución a lo largo del tiempo",
    icon: "📈",
    freeLimit: 7, // days
    premiumLimit: 365, // 1 year
  },

  // Social
  unlimited_friends: {
    id: "unlimited_friends",
    name: "Amigos ilimitados",
    description: "Conecta con todos",
    icon: "👥",
    freeLimit: 10,
    premiumLimit: null,
  },
  create_guilds: {
    id: "create_guilds",
    name: "Crear gremios",
    description: "Funda tu propio clan",
    icon: "⚔️",
    freeLimit: false,
    premiumLimit: true,
  },
  create_raids: {
    id: "create_raids",
    name: "Crear raids",
    description: "Organiza desafíos grupales",
    icon: "🐉",
    freeLimit: false,
    premiumLimit: true,
  },

  // Customization
  all_avatars: {
    id: "all_avatars",
    name: "Todos los avatares",
    description: "Acceso a avatares exclusivos",
    icon: "🎭",
    freeLimit: false,
    premiumLimit: true,
  },
  themes: {
    id: "themes",
    name: "Temas personalizados",
    description: "Más opciones de personalización",
    icon: "🎨",
    freeLimit: 2, // light/dark only
    premiumLimit: null, // all themes
  },

  // Quests
  custom_quests: {
    id: "custom_quests",
    name: "Quests personalizadas",
    description: "Crea tus propios desafíos",
    icon: "⚡",
    freeLimit: 1, // per week
    premiumLimit: null,
  },
  daily_quests_reroll: {
    id: "daily_quests_reroll",
    name: "Re-roll de quests diarias",
    description: "Cambia tus quests del día",
    icon: "🎲",
    freeLimit: 1, // per day
    premiumLimit: 3,
  },

  // Finance (NEW)
  quest_finanzas: {
    id: "quest_finanzas",
    name: "Quest Finanzas",
    description: "Tu contador personal con IA",
    icon: "💰",
    freeLimit: false,
    premiumLimit: true,
  },
  expense_tracking: {
    id: "expense_tracking",
    name: "Seguimiento de gastos",
    description: "Registra y categoriza tus gastos",
    icon: "📊",
    freeLimit: false,
    premiumLimit: true,
  },
  budget_goals: {
    id: "budget_goals",
    name: "Metas de ahorro",
    description: "Establece y trackea metas financieras",
    icon: "🎯",
    freeLimit: false,
    premiumLimit: true,
  },
  financial_insights: {
    id: "financial_insights",
    name: "Insights financieros",
    description: "Análisis y recomendaciones de la IA",
    icon: "💡",
    freeLimit: false,
    premiumLimit: true,
  },

  // Guild AI (NEW)
  guild_ai_member: {
    id: "guild_ai_member",
    name: "Miembro IA en gremios",
    description: "Añade una IA como participante del grupo",
    icon: "🤖",
    freeLimit: false,
    premiumLimit: true,
  },
} as const;

export type PremiumFeatureId = keyof typeof PREMIUM_FEATURES;

export interface PremiumStatus {
  isPremium: boolean;
  premiumType: "free" | "trial" | "monthly" | "yearly" | "lifetime";
  expiresAt: string | null;
  daysLeft: number | null;
  trialUsed: boolean;
  hasSeenTutorial: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  period: string;
  savings?: string;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "monthly",
    name: "Mensual",
    price: 4.99,
    priceDisplay: "$4.99",
    period: "/mes",
  },
  {
    id: "yearly",
    name: "Anual",
    price: 29.99,
    priceDisplay: "$29.99",
    period: "/año",
    savings: "Ahorra 50%",
    popular: true,
  },
  {
    id: "lifetime",
    name: "De por vida",
    price: 79.99,
    priceDisplay: "$79.99",
    period: "pago único",
    savings: "Mejor valor",
  },
];

class PremiumServiceClass {
  private cachedStatus: PremiumStatus | null = null;
  private lastCheck: number = 0;
  private CACHE_DURATION = 60000; // 1 minute

  /**
   * Get current premium status
   */
  async getStatus(
    userId: string,
    forceRefresh = false
  ): Promise<PremiumStatus> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cachedStatus &&
      now - this.lastCheck < this.CACHE_DURATION
    ) {
      return this.cachedStatus;
    }

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "is_premium, premium_type, premium_expires_at, trial_used, has_seen_tutorial"
        )
        .eq("id", userId)
        .single();

      if (error) throw error;

      // Check if expired
      const { data: checkResult } = await supabase.rpc("check_premium_status", {
        p_user_id: userId,
      });

      let daysLeft = null;
      if (profile.premium_expires_at) {
        const expiresAt = new Date(profile.premium_expires_at);
        const now = new Date();
        daysLeft = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft < 0) daysLeft = 0;
      }

      this.cachedStatus = {
        isPremium: checkResult?.is_premium || profile.is_premium || false,
        premiumType:
          checkResult?.premium_type || profile.premium_type || "free",
        expiresAt: profile.premium_expires_at,
        daysLeft,
        trialUsed: profile.trial_used || false,
        hasSeenTutorial: profile.has_seen_tutorial || false,
      };
      this.lastCheck = now;

      return this.cachedStatus;
    } catch (error) {
      console.error("Error getting premium status:", error);
      return {
        isPremium: false,
        premiumType: "free",
        expiresAt: null,
        daysLeft: null,
        trialUsed: false,
        hasSeenTutorial: false,
      };
    }
  }

  /**
   * Start free trial
   */
  async startTrial(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc("start_premium_trial", {
        p_user_id: userId,
      });

      if (error) throw error;

      // Clear cache
      this.cachedStatus = null;

      return {
        success: data?.success || false,
        message: data?.message || "Error al iniciar prueba",
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Check if a feature is available
   */
  async canUseFeature(
    userId: string,
    featureId: PremiumFeatureId
  ): Promise<{
    allowed: boolean;
    reason?: string;
    limit?: number;
    current?: number;
  }> {
    const status = await this.getStatus(userId);
    const feature = PREMIUM_FEATURES[featureId];

    if (status.isPremium) {
      return { allowed: true };
    }

    // Check free tier limits
    if (feature.freeLimit === false) {
      return {
        allowed: false,
        reason: `${feature.name} es exclusivo de Premium`,
      };
    }

    if (typeof feature.freeLimit === "number") {
      // Need to check current usage
      const usage = await this.getFeatureUsage(userId, featureId);

      if (usage >= feature.freeLimit) {
        return {
          allowed: false,
          reason: `Has alcanzado el límite de ${
            feature.freeLimit
          } para ${feature.name.toLowerCase()}`,
          limit: feature.freeLimit,
          current: usage,
        };
      }

      return {
        allowed: true,
        limit: feature.freeLimit,
        current: usage,
      };
    }

    return { allowed: true };
  }

  /**
   * Get feature usage count
   */
  async getFeatureUsage(
    userId: string,
    featureId: PremiumFeatureId
  ): Promise<number> {
    const today = new Date().toISOString().split("T")[0];

    try {
      switch (featureId) {
        case "unlimited_ai_chat": {
          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("role", "user")
            .gte("created_at", today);
          return count || 0;
        }

        case "unlimited_life_paths": {
          const { count } = await supabase
            .from("life_paths")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);
          return count || 0;
        }

        case "unlimited_habits": {
          const { count } = await supabase
            .from("user_habits")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_active", true);
          return count || 0;
        }

        case "unlimited_friends": {
          const { count } = await supabase
            .from("friendships")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "accepted");
          return count || 0;
        }

        case "custom_quests": {
          // Count quests created this week
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const { count } = await supabase
            .from("user_daily_quests")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_custom", true)
            .gte("created_at", weekAgo.toISOString());
          return count || 0;
        }

        default:
          return 0;
      }
    } catch (error) {
      console.error("Error getting feature usage:", error);
      return 0;
    }
  }

  /**
   * Mark tutorial as completed
   */
  async completeTutorial(userId: string): Promise<void> {
    try {
      await supabase.rpc("complete_tutorial", { p_user_id: userId });
      if (this.cachedStatus) {
        this.cachedStatus.hasSeenTutorial = true;
      }
    } catch (error) {
      console.error("Error completing tutorial:", error);
    }
  }

  /**
   * Update tutorial step
   */
  async updateTutorialStep(userId: string, step: number): Promise<void> {
    try {
      await supabase
        .from("profiles")
        .update({ tutorial_step: step })
        .eq("id", userId);
    } catch (error) {
      console.error("Error updating tutorial step:", error);
    }
  }

  /**
   * Get subscription history
   */
  async getSubscriptionHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("subscription_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting subscription history:", error);
      return [];
    }
  }

  /**
   * Activate premium (for testing/manual activation)
   */
  async activatePremium(
    userId: string,
    type: "monthly" | "yearly" | "lifetime",
    paymentId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc("activate_premium", {
        p_user_id: userId,
        p_type: type,
        p_payment_id: paymentId || null,
        p_payment_provider: "manual",
      });

      if (error) throw error;

      // Clear cache
      this.cachedStatus = null;

      return {
        success: data?.success || false,
        message: data?.message || "Error al activar premium",
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedStatus = null;
    this.lastCheck = 0;
  }
}

export const PremiumService = new PremiumServiceClass();
export default PremiumService;
