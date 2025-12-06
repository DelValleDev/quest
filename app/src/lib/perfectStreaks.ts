import { supabase } from "./supabase";

export interface PerfectStreak {
  id: string;
  user_id: string;
  streak_length: number;
  start_date: string;
  end_date: string;
  qc_earned: number;
  is_active: boolean;
  broken_at?: string;
  created_at: string;
}

export interface PerfectStreakMilestone {
  days: number;
  qc_reward: number;
  reached: boolean;
  date_reached?: string;
}

/**
 * Obtener racha perfecta activa del usuario
 */
export const getActivePerfectStreak = async (
  userId: string
): Promise<PerfectStreak | null> => {
  const { data, error } = await supabase
    .from("perfect_streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data;
};

/**
 * Obtener historial de rachas perfectas
 */
export const getPerfectStreaksHistory = async (
  userId: string
): Promise<PerfectStreak[]> => {
  const { data, error } = await supabase
    .from("perfect_streaks")
    .select("*")
    .eq("user_id", userId)
    .order("streak_length", { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Obtener mejor racha perfecta del usuario
 */
export const getBestPerfectStreak = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from("perfect_streaks")
    .select("streak_length")
    .eq("user_id", userId)
    .order("streak_length", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data?.streak_length || 0;
};

/**
 * Verificar milestones de racha perfecta
 */
export const getPerfectStreakMilestones = async (
  userId: string
): Promise<PerfectStreakMilestone[]> => {
  const activeStreak = await getActivePerfectStreak(userId);
  const currentLength = activeStreak?.streak_length || 0;

  // Milestones configurables
  const milestones = [
    { days: 7, qc_reward: 50 },
    { days: 14, qc_reward: 120 },
    { days: 21, qc_reward: 200 },
    { days: 30, qc_reward: 350 },
    { days: 60, qc_reward: 800 },
    { days: 90, qc_reward: 1500 },
    { days: 180, qc_reward: 3500 },
    { days: 365, qc_reward: 10000 },
  ];

  return milestones.map((milestone) => ({
    ...milestone,
    reached: currentLength >= milestone.days,
    date_reached:
      activeStreak && currentLength >= milestone.days
        ? activeStreak.start_date
        : undefined,
  }));
};

/**
 * Actualizar racha perfecta (llamado desde Edge Function)
 * Esta función es llamada automáticamente por el cron job diario
 */
export const updatePerfectStreak = async (
  userId: string
): Promise<{ success: boolean; message: string }> => {
  const { data, error } = await supabase.rpc("update_perfect_streak", {
    p_user_id: userId,
  });

  if (error) throw error;
  return data;
};

/**
 * Obtener estadísticas de rachas perfectas
 */
export const getPerfectStreakStats = async (userId: string) => {
  const history = await getPerfectStreaksHistory(userId);
  const activeStreak = await getActivePerfectStreak(userId);

  const totalStreaks = history.length;
  const totalDaysInStreaks = history.reduce(
    (sum, s) => sum + s.streak_length,
    0
  );
  const totalQCEarned = history.reduce((sum, s) => sum + s.qc_earned, 0);
  const longestStreak = history[0]?.streak_length || 0;

  return {
    active_streak_days: activeStreak?.streak_length || 0,
    total_streaks: totalStreaks,
    total_days_in_streaks: totalDaysInStreaks,
    total_qc_earned: totalQCEarned,
    longest_streak: longestStreak,
    average_streak_length:
      totalStreaks > 0 ? Math.round(totalDaysInStreaks / totalStreaks) : 0,
    is_active: !!activeStreak,
  };
};

/**
 * Calcular próximo milestone
 */
export const getNextMilestone = async (
  userId: string
): Promise<PerfectStreakMilestone | null> => {
  const milestones = await getPerfectStreakMilestones(userId);
  return milestones.find((m) => !m.reached) || null;
};

/**
 * Suscribirse a cambios en perfect streaks
 */
export const subscribeToPerfectStreaks = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel("perfect_streaks_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "perfect_streaks",
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};
