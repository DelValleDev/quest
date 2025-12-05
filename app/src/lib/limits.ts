/**
 * Limits Service - Manage daily limits and feature purchases
 * Handles Free vs Premium feature access
 *
 * PRICING PHILOSOPHY (Productivity First):
 * - Quest is a PRODUCTIVITY tool, not a mobile game
 * - DAILY items = CHEAP (small boosts when needed)
 * - PERMANENT items = EXPENSIVE (weeks of discipline to earn)
 * - Ads = Minor bonus, NOT main income source
 *
 * Economy: ~70 QC/day = Life Path in ~20 days ($4.99 Premium)
 */

import { supabase } from "./supabase";

// Feature prices (QC) - HALF PRICES FOR $4.99 PREMIUM
export const FEATURE_PRICES = {
  // DAILY (cheap, small boosts)
  QUEST_EXTRA: 5, // Extra quest for today
  AI_MESSAGES_5: 25, // 5 extra AI messages
  DUEL_TODAY: 50, // Extra duel for today (max 2/day)

  // SPECIAL (situational)
  STREAK_REVIVE: 175, // Revive lost streak (no ads available)

  // GROUP/SOCIAL (moderately expensive)
  FRIEND_SLOT: 250, // Permanent extra friend
  RAID_TODAY: 300, // Extra raid for whole group

  // PERMANENT (expensive, weeks of work)
  HABIT_SLOT: 400, // Permanent extra habit
  LIFE_PATH: 1350, // Permanent extra life path (~20 days)
} as const;

// Free tier limits
export const FREE_LIMITS = {
  QUESTS_DAILY: 5,
  DUELS_DAILY: 3,
  AI_MESSAGES_DAILY: 5,
  RAIDS_DAILY: 1,
  LIFE_PATHS: 2,
  HABITS: 5,
  FRIENDS: 10,
  MAX_EXTRA_DUELS_DAILY: 2,
} as const;

export interface DailyLimits {
  questsUsed: number;
  questsBonus: number;
  questsMax: number;
  questsRemaining: number;

  duelsUsed: number;
  duelsBonus: number;
  duelsMax: number;
  duelsRemaining: number;

  aiMessagesUsed: number;
  aiMessagesBonus: number;
  aiMessagesMax: number;
  aiMessagesRemaining: number;

  raidsUsed: number;
  raidsBonus: number;
  raidsMax: number;
  raidsRemaining: number;

  adsWatched: number;
}

export interface ActionResult {
  allowed: boolean;
  used: number;
  max: number;
  bonus: number;
  remaining: number;
  isPremium: boolean;
  error?: string;
}

export interface PurchaseResult {
  success: boolean;
  feature?: string;
  qcSpent?: number;
  error?: string;
}

export interface PurchasedFeatures {
  extraLifePaths: number;
  extraDuelSlots: number;
  extraHabitSlots: number;
  extraFriendSlots: number;
}

/**
 * Limits Service Class
 */
class LimitsServiceClass {
  /**
   * Get user's daily limits
   */
  async getDailyLimits(userId: string): Promise<DailyLimits | null> {
    // Get or create daily limits
    const { data: limits, error } = await supabase.rpc("get_daily_limits", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error getting daily limits:", error);
      return null;
    }

    // Get user's subscription tier for max values
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    const isPremium =
      profile?.subscription_tier && profile.subscription_tier !== "free";

    // Premium = unlimited (-1)
    if (isPremium) {
      return {
        questsUsed: 0,
        questsBonus: 0,
        questsMax: -1,
        questsRemaining: -1,

        duelsUsed: 0,
        duelsBonus: 0,
        duelsMax: -1,
        duelsRemaining: -1,

        aiMessagesUsed: 0,
        aiMessagesBonus: 0,
        aiMessagesMax: -1,
        aiMessagesRemaining: -1,

        raidsUsed: 0,
        raidsBonus: 0,
        raidsMax: -1,
        raidsRemaining: -1,

        adsWatched: limits.ads_watched || 0,
      };
    }

    return {
      questsUsed: limits.quests_used || 0,
      questsBonus: limits.quests_bonus || 0,
      questsMax: FREE_LIMITS.QUESTS_DAILY,
      questsRemaining: Math.max(
        0,
        FREE_LIMITS.QUESTS_DAILY +
          (limits.quests_bonus || 0) -
          (limits.quests_used || 0)
      ),

      duelsUsed: limits.duels_used,
      duelsBonus: limits.duels_bonus,
      duelsMax: FREE_LIMITS.DUELS_DAILY,
      duelsRemaining: Math.max(
        0,
        FREE_LIMITS.DUELS_DAILY + limits.duels_bonus - limits.duels_used
      ),

      aiMessagesUsed: limits.ai_messages_used,
      aiMessagesBonus: limits.ai_messages_bonus,
      aiMessagesMax: FREE_LIMITS.AI_MESSAGES_DAILY,
      aiMessagesRemaining: Math.max(
        0,
        FREE_LIMITS.AI_MESSAGES_DAILY +
          limits.ai_messages_bonus -
          limits.ai_messages_used
      ),

      raidsUsed: limits.raids_used,
      raidsBonus: limits.raids_bonus,
      raidsMax: FREE_LIMITS.RAIDS_DAILY,
      raidsRemaining: Math.max(
        0,
        FREE_LIMITS.RAIDS_DAILY + limits.raids_bonus - limits.raids_used
      ),

      adsWatched: limits.ads_watched || 0,
    };
  }

  /**
   * Check if user can perform an action
   */
  async canPerformAction(
    userId: string,
    action: "duel" | "ai_message" | "raid"
  ): Promise<ActionResult> {
    const { data, error } = await supabase.rpc("can_perform_action", {
      p_user_id: userId,
      p_action: action,
    });

    if (error) {
      console.error("Error checking action:", error);
      return {
        allowed: false,
        used: 0,
        max: 0,
        bonus: 0,
        remaining: 0,
        isPremium: false,
        error: error.message,
      };
    }

    return {
      allowed: data.allowed,
      used: data.used || 0,
      max: data.max || 0,
      bonus: data.bonus || 0,
      remaining: data.remaining,
      isPremium: data.is_premium,
    };
  }

  /**
   * Use a daily action (duel, ai_message, raid)
   */
  async useAction(
    userId: string,
    action: "duel" | "ai_message" | "raid"
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc("use_daily_action", {
      p_user_id: userId,
      p_action: action,
    });

    if (error) {
      console.error("Error using action:", error);
      return false;
    }

    return data === true;
  }

  /**
   * Purchase a feature with Quest Coins
   */
  async purchaseFeature(
    userId: string,
    featureId: string
  ): Promise<PurchaseResult> {
    const { data, error } = await supabase.rpc("purchase_feature_with_qc", {
      p_user_id: userId,
      p_feature_id: featureId,
    });

    if (error) {
      console.error("Error purchasing feature:", error);
      return { success: false, error: error.message };
    }

    return {
      success: data.success,
      feature: data.feature,
      qcSpent: data.qc_spent,
      error: data.error,
    };
  }

  /**
   * Get user's permanently purchased features
   */
  async getPurchasedFeatures(userId: string): Promise<PurchasedFeatures> {
    const { data, error } = await supabase
      .from("user_purchased_features")
      .select("feature_type, quantity")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching purchased features:", error);
      return {
        extraLifePaths: 0,
        extraDuelSlots: 0,
        extraHabitSlots: 0,
        extraFriendSlots: 0,
      };
    }

    const counts = {
      extraLifePaths: 0,
      extraDuelSlots: 0,
      extraHabitSlots: 0,
      extraFriendSlots: 0,
    };

    (data || []).forEach((item) => {
      switch (item.feature_type) {
        case "extra_life_path":
          counts.extraLifePaths += item.quantity;
          break;
        case "extra_duel_slot":
          counts.extraDuelSlots += item.quantity;
          break;
        case "extra_habit_slot":
          counts.extraHabitSlots += item.quantity;
          break;
        case "extra_friend_slot":
          counts.extraFriendSlots += item.quantity;
          break;
      }
    });

    return counts;
  }

  /**
   * Get effective limit for a feature (base + purchased)
   */
  async getEffectiveLimit(
    userId: string,
    feature: "life_paths" | "habits" | "friends"
  ): Promise<number> {
    // Check if premium
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    if (profile?.subscription_tier && profile.subscription_tier !== "free") {
      return -1; // Unlimited
    }

    // Get base limit
    const baseLimits: Record<string, number> = {
      life_paths: FREE_LIMITS.LIFE_PATHS,
      habits: FREE_LIMITS.HABITS,
      friends: FREE_LIMITS.FRIENDS,
    };

    const baseLimit = baseLimits[feature] || 0;

    // Get purchased extras
    const featureTypeMap: Record<string, string> = {
      life_paths: "extra_life_path",
      habits: "extra_habit_slot",
      friends: "extra_friend_slot",
    };

    const { data: purchased } = await supabase
      .from("user_purchased_features")
      .select("quantity")
      .eq("user_id", userId)
      .eq("feature_type", featureTypeMap[feature]);

    const extraCount = (purchased || []).reduce(
      (sum, p) => sum + p.quantity,
      0
    );

    return baseLimit + extraCount;
  }

  /**
   * Check if user has reached a limit
   */
  async hasReachedLimit(
    userId: string,
    feature: "life_paths" | "habits" | "friends",
    currentCount: number
  ): Promise<boolean> {
    const limit = await this.getEffectiveLimit(userId, feature);

    // -1 = unlimited
    if (limit === -1) return false;

    return currentCount >= limit;
  }

  /**
   * Revive a lost streak
   */
  async reviveStreak(
    userId: string,
    useQC: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    if (useQC) {
      // Purchase with QC
      const result = await this.purchaseFeature(userId, "streak_revive");
      if (!result.success) {
        return { success: false, error: result.error };
      }
    }

    // Get last streak value from habit completions
    // This would need to be implemented based on your streak logic
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("current_streak, best_streak")
      .eq("id", userId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Restore streak to at least 1 (or previous value if stored)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        current_streak: Math.max(1, profile.current_streak || 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  }

  /**
   * Get feature prices
   */
  async getFeaturePrices(): Promise<
    Array<{
      id: string;
      name: string;
      nameEs: string;
      description: string;
      descriptionEs: string;
      qcPrice: number;
      featureType: string;
    }>
  > {
    const { data, error } = await supabase
      .from("feature_prices")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching feature prices:", error);
      return [];
    }

    return (data || []).map((f) => ({
      id: f.id,
      name: f.name,
      nameEs: f.name_es,
      description: f.description || "",
      descriptionEs: f.description_es || "",
      qcPrice: f.qc_price,
      featureType: f.feature_type,
    }));
  }
}

// Export singleton
export const LimitsService = new LimitsServiceClass();

// Export feature IDs
export const FEATURE_IDS = {
  LIFE_PATH_SLOT: "life_path_slot",
  HABIT_SLOT: "habit_slot",
  DUEL_DAILY: "duel_daily",
  RAID_DAILY: "raid_daily",
  AI_MESSAGES_10: "ai_messages_10",
  FRIEND_SLOT: "friend_slot",
  STREAK_REVIVE: "streak_revive",
} as const;
