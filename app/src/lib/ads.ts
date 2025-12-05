/**
 * Ads Service - Voluntary Ads System
 * NO intrusive ads, only voluntary rewards
 *
 * NOTE: expo-ads-admob is deprecated and incompatible with SDK 54.
 * For now, we use mock ads. When ready for production, migrate to:
 * - react-native-google-mobile-ads (recommended)
 * - expo-dev-client with custom native code
 *
 * DEV MODE: Uses mock ads for testing without real AdMob setup
 */

import { Platform } from "react-native";
import { supabase } from "./supabase";

// ============================================
// CONFIGURATION
// ============================================

// Always use mock ads until we migrate to react-native-google-mobile-ads
const USE_MOCK_ADS = true;

// Mock ad delay to simulate real ad viewing (ms)
const MOCK_AD_DURATION = 2000; // 2 seconds

// AdMob configuration
const AD_UNIT_IDS = {
  ios: {
    rewarded: "ca-app-pub-xxxxx/rewarded-ios", // Replace with real ID for production
    banner: "", // Not used - we don't show banners
  },
  android: {
    rewarded: "ca-app-pub-xxxxx/rewarded-android", // Replace with real ID for production
    banner: "", // Not used
  },
  // Official Google Test IDs (always work, show test ads)
  test: {
    rewarded: "ca-app-pub-3940256099942544/5224354917", // Google's test rewarded ad
    banner: "ca-app-pub-3940256099942544/6300978111", // Google's test banner
  },
};

// Ad reward types available
export type AdRewardType =
  | "quest_coins"
  | "extra_duel"
  | "extra_ai_message"
  | "streak_revive"
  | "xp_boost";

export interface AdReward {
  id: string;
  name: string;
  nameEs: string;
  rewardType: AdRewardType;
  rewardAmount: number;
  cooldownMinutes: number;
  maxDaily: number;
  isActive: boolean;
}

export interface AdRewardStatus {
  available: boolean;
  timesToday: number;
  maxDaily: number;
  cooldownRemaining?: number; // minutes
  nextAvailable?: Date;
}

// AdMob is disabled - using mock ads only
// To enable real ads, migrate to react-native-google-mobile-ads
let AdMobRewarded: any = null;
let isAdMobInitialized = false;

async function initializeAdMob(): Promise<boolean> {
  // AdMob disabled - expo-ads-admob is incompatible with SDK 54
  // When ready, migrate to react-native-google-mobile-ads
  console.log("📺 Using mock ads (AdMob disabled)");
  return false;
}

/**
 * Ads Service Class
 */
class AdsServiceClass {
  private isReady = false;
  private adLoadedCallback: (() => void) | null = null;
  private adClosedCallback: ((rewarded: boolean) => void) | null = null;

  /**
   * Initialize the ads service
   */
  async initialize(): Promise<void> {
    const success = await initializeAdMob();
    if (!success) return;

    this.isReady = true;

    // Set up event listeners
    if (AdMobRewarded) {
      AdMobRewarded.addEventListener("rewardedVideoDidLoad", () => {
        console.log("📺 Rewarded ad loaded");
        this.adLoadedCallback?.();
      });

      AdMobRewarded.addEventListener(
        "rewardedVideoDidClose",
        (rewarded: boolean) => {
          console.log("📺 Rewarded ad closed, rewarded:", rewarded);
          this.adClosedCallback?.(rewarded);
        }
      );

      AdMobRewarded.addEventListener("rewardedVideoDidFailToLoad", () => {
        console.log("❌ Rewarded ad failed to load");
        this.adClosedCallback?.(false);
      });
    }
  }

  /**
   * Check if ads are available
   */
  isAvailable(): boolean {
    return this.isReady && AdMobRewarded !== null;
  }

  /**
   * Get all available ad rewards
   */
  async getAvailableRewards(): Promise<AdReward[]> {
    const { data, error } = await supabase
      .from("ad_rewards")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching ad rewards:", error);
      return [];
    }

    return (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      nameEs: r.name_es,
      rewardType: r.reward_type as AdRewardType,
      rewardAmount: r.reward_amount,
      cooldownMinutes: r.cooldown_minutes,
      maxDaily: r.max_daily,
      isActive: r.is_active,
    }));
  }

  /**
   * Check if a specific reward is available for user
   */
  async checkRewardAvailability(
    userId: string,
    rewardId: string
  ): Promise<AdRewardStatus> {
    // Get reward config
    const { data: reward } = await supabase
      .from("ad_rewards")
      .select("*")
      .eq("id", rewardId)
      .single();

    if (!reward) {
      return { available: false, timesToday: 0, maxDaily: 0 };
    }

    // Get user's history for this reward today
    const today = new Date().toISOString().split("T")[0];
    const { data: history } = await supabase
      .from("user_ad_history")
      .select("watched_at")
      .eq("user_id", userId)
      .eq("ad_reward_id", rewardId)
      .gte("watched_at", `${today}T00:00:00`)
      .order("watched_at", { ascending: false });

    const timesToday = history?.length || 0;
    const lastWatched = history?.[0]?.watched_at;

    // Check cooldown
    let cooldownRemaining = 0;
    let nextAvailable: Date | undefined;

    if (lastWatched) {
      const lastWatchedDate = new Date(lastWatched);
      const cooldownEnd = new Date(
        lastWatchedDate.getTime() + reward.cooldown_minutes * 60 * 1000
      );
      const now = new Date();

      if (cooldownEnd > now) {
        cooldownRemaining = Math.ceil(
          (cooldownEnd.getTime() - now.getTime()) / 60000
        );
        nextAvailable = cooldownEnd;
      }
    }

    const available = timesToday < reward.max_daily && cooldownRemaining === 0;

    return {
      available,
      timesToday,
      maxDaily: reward.max_daily,
      cooldownRemaining: cooldownRemaining > 0 ? cooldownRemaining : undefined,
      nextAvailable,
    };
  }

  /**
   * Show a rewarded ad and claim reward
   */
  async showRewardedAd(
    userId: string,
    rewardId: string
  ): Promise<{ success: boolean; reward?: any; error?: string }> {
    // Check availability first
    const status = await this.checkRewardAvailability(userId, rewardId);
    if (!status.available) {
      if (status.cooldownRemaining) {
        return {
          success: false,
          error: `Espera ${status.cooldownRemaining} minutos`,
        };
      }
      return { success: false, error: "Límite diario alcanzado" };
    }

    // Use mock ads for development/testing
    if (USE_MOCK_ADS) {
      console.log("🎬 [MOCK AD] Simulating rewarded ad...");
      console.log("🎬 [MOCK AD] Wait", MOCK_AD_DURATION / 1000, "seconds...");

      // Simulate watching an ad
      await new Promise((resolve) => setTimeout(resolve, MOCK_AD_DURATION));

      console.log("🎬 [MOCK AD] Ad completed! Claiming reward...");
      return this.claimReward(userId, rewardId);
    }

    // If AdMob not available (and not using mock), return error
    if (!this.isAvailable()) {
      console.warn("⚠️ AdMob not available and mock ads disabled");
      return { success: false, error: "Ads not available" };
    }

    // Load and show the real ad
    return new Promise(async (resolve) => {
      try {
        const adUnitId = __DEV__
          ? AD_UNIT_IDS.test.rewarded
          : Platform.OS === "ios"
          ? AD_UNIT_IDS.ios.rewarded
          : AD_UNIT_IDS.android.rewarded;

        await AdMobRewarded.setAdUnitID(adUnitId);

        this.adClosedCallback = async (rewarded: boolean) => {
          if (rewarded) {
            const result = await this.claimReward(userId, rewardId);
            resolve(result);
          } else {
            resolve({ success: false, error: "Ad not completed" });
          }
          this.adClosedCallback = null;
        };

        await AdMobRewarded.requestAdAsync();
        await AdMobRewarded.showAdAsync();
      } catch (error: any) {
        console.error("Error showing ad:", error);
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * Claim the reward (called after successful ad view)
   */
  private async claimReward(
    userId: string,
    rewardId: string
  ): Promise<{ success: boolean; reward?: any; error?: string }> {
    const { data, error } = await supabase.rpc("claim_ad_reward", {
      p_user_id: userId,
      p_ad_reward_id: rewardId,
    });

    if (error) {
      console.error("Error claiming reward:", error);
      return { success: false, error: error.message };
    }

    return { success: data.success, reward: data, error: data.error };
  }

  /**
   * Get user's ad stats for today
   */
  async getTodayStats(userId: string): Promise<{
    totalAdsWatched: number;
    qcEarned: number;
    rewardsById: Record<string, number>;
  }> {
    const today = new Date().toISOString().split("T")[0];

    const { data: history } = await supabase
      .from("user_ad_history")
      .select("ad_reward_id")
      .eq("user_id", userId)
      .gte("watched_at", `${today}T00:00:00`);

    const rewardsById: Record<string, number> = {};
    (history || []).forEach((h) => {
      rewardsById[h.ad_reward_id] = (rewardsById[h.ad_reward_id] || 0) + 1;
    });

    // Estimate QC earned (assuming 20 QC per ad_qc_20)
    const qcEarned = (rewardsById["ad_qc_20"] || 0) * 20;

    return {
      totalAdsWatched: history?.length || 0,
      qcEarned,
      rewardsById,
    };
  }
}

// Export singleton
export const AdsService = new AdsServiceClass();

// Export reward IDs for easy access
export const AD_REWARDS = {
  QUEST_COINS_20: "ad_qc_20",
  EXTRA_DUEL: "ad_duel",
  EXTRA_AI_MESSAGES: "ad_ai",
  REVIVE_STREAK: "ad_streak",
  XP_BOOST: "ad_xp",
} as const;
