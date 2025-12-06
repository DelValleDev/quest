/**
 * Penalty Service
 * Handles penalty system for incomplete habits and quests
 */

import { supabase } from "./supabase";

export interface PenaltyLog {
  penalty_date: string;
  penalty_type: "habit" | "quest";
  item_title: string;
  xp_lost: number;
}

export interface PenaltyStats {
  total_penalties: number;
  penalty_xp_lost: number;
  recent_penalties: PenaltyLog[];
}

/**
 * Get user's penalty statistics
 */
export async function getUserPenaltyStats(
  userId: string,
  days: number = 7
): Promise<PenaltyStats | null> {
  try {
    // Get user's total penalty stats
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("total_penalties, penalty_xp_lost")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    // Get recent penalties
    const { data: penalties, error: penaltiesError } = await supabase.rpc(
      "get_user_penalties",
      {
        p_user_id: userId,
        p_days: days,
      }
    );

    if (penaltiesError) throw penaltiesError;

    return {
      total_penalties: profile?.total_penalties || 0,
      penalty_xp_lost: profile?.penalty_xp_lost || 0,
      recent_penalties: penalties || [],
    };
  } catch (error) {
    console.error("Error fetching penalty stats:", error);
    return null;
  }
}

/**
 * Check if user should be warned about potential penalties
 * (e.g., show a warning if they have incomplete tasks)
 */
export async function checkPendingPenalties(userId: string): Promise<{
  incompleteHabits: number;
  incompleteQuests: number;
  potentialXpLoss: number;
}> {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Count incomplete habits for today
    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select("id, title, frequency")
      .eq("user_id", userId)
      .eq("is_active", true)
      .in("frequency", ["daily", "weekly"]);

    if (habitsError) throw habitsError;

    // Check which habits don't have logs for today
    const { data: logs, error: logsError } = await supabase
      .from("habit_logs")
      .select("habit_id")
      .eq("user_id", userId)
      .eq("date", today);

    if (logsError) throw logsError;

    const completedHabitIds = new Set(logs?.map((l) => l.habit_id) || []);
    const incompleteHabits =
      habits?.filter((h) => !completedHabitIds.has(h.id)) || [];

    // Count incomplete quests for today
    const { data: quests, error: questsError } = await supabase
      .from("daily_quests")
      .select("id, challenge:challenges(xp_reward)")
      .eq("user_id", userId)
      .eq("date", today)
      .eq("completed", false)
      .eq("skipped", false);

    if (questsError) throw questsError;

    // Calculate potential XP loss (50% of what they'd gain)
    const habitXpLoss = incompleteHabits.length * 10; // ~50% of 20 XP base
    const questXpLoss = (quests || []).reduce((sum, q: any) => {
      return sum + Math.floor((q.challenge?.xp_reward || 0) * 0.5);
    }, 0);

    return {
      incompleteHabits: incompleteHabits.length,
      incompleteQuests: quests?.length || 0,
      potentialXpLoss: habitXpLoss + questXpLoss,
    };
  } catch (error) {
    console.error("Error checking pending penalties:", error);
    return {
      incompleteHabits: 0,
      incompleteQuests: 0,
      potentialXpLoss: 0,
    };
  }
}

/**
 * Apply penalties manually (for testing or admin purposes)
 * In production, this should be triggered by a cron job
 */
export async function applyDailyPenalties(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase.rpc("apply_daily_penalties");

    if (error) throw error;

    return {
      success: true,
      message: "Penalties applied successfully",
    };
  } catch (error: any) {
    console.error("Error applying penalties:", error);
    return {
      success: false,
      message: error.message || "Failed to apply penalties",
    };
  }
}

export const PenaltyService = {
  getUserPenaltyStats,
  checkPendingPenalties,
  applyDailyPenalties,
};

export default PenaltyService;
