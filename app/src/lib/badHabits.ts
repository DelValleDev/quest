import { supabase } from "./supabase";

export interface BadHabit {
  id: string;
  user_id: string;
  habit_name: string;
  description?: string;
  qc_penalty: number;
  occurrences: number;
  last_occurred_at?: string;
  created_at: string;
}

export interface BadHabitLog {
  id: string;
  user_id: string;
  bad_habit_id: string;
  qc_lost: number;
  notes?: string;
  created_at: string;
}

/**
 * Obtener todos los bad habits del usuario
 */
export const getUserBadHabits = async (userId: string): Promise<BadHabit[]> => {
  const { data, error } = await supabase
    .from("bad_habits")
    .select("*")
    .eq("user_id", userId)
    .order("occurrences", { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Crear un nuevo bad habit
 */
export const createBadHabit = async (
  userId: string,
  habitName: string,
  qcPenalty: number,
  description?: string
): Promise<BadHabit> => {
  const { data, error } = await supabase
    .from("bad_habits")
    .insert({
      user_id: userId,
      habit_name: habitName,
      description,
      qc_penalty: qcPenalty,
      occurrences: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Registrar ocurrencia de bad habit (usa función SQL)
 */
export const logBadHabit = async (
  userId: string,
  badHabitId: string,
  notes?: string
): Promise<{ success: boolean; qc_lost: number }> => {
  const { data, error } = await supabase.rpc("log_bad_habit", {
    p_user_id: userId,
    p_bad_habit_id: badHabitId,
    p_notes: notes || null,
  });

  if (error) throw error;
  return data;
};

/**
 * Obtener historial de bad habits
 */
export const getBadHabitLogs = async (
  userId: string,
  limit: number = 50
): Promise<BadHabitLog[]> => {
  const { data, error } = await supabase
    .from("bad_habit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

/**
 * Actualizar bad habit
 */
export const updateBadHabit = async (
  badHabitId: string,
  updates: {
    habit_name?: string;
    description?: string;
    qc_penalty?: number;
  }
): Promise<BadHabit> => {
  const { data, error } = await supabase
    .from("bad_habits")
    .update(updates)
    .eq("id", badHabitId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Eliminar bad habit
 */
export const deleteBadHabit = async (badHabitId: string): Promise<void> => {
  const { error } = await supabase
    .from("bad_habits")
    .delete()
    .eq("id", badHabitId);

  if (error) throw error;
};

/**
 * Obtener estadísticas de bad habits del usuario
 */
export const getBadHabitsStats = async (userId: string) => {
  const { data, error } = await supabase
    .from("bad_habits")
    .select("occurrences, qc_penalty")
    .eq("user_id", userId);

  if (error) throw error;

  const totalOccurrences =
    data?.reduce((sum, h) => sum + h.occurrences, 0) || 0;
  const totalQCLost =
    data?.reduce((sum, h) => sum + h.occurrences * h.qc_penalty, 0) || 0;

  return {
    total_bad_habits: data?.length || 0,
    total_occurrences: totalOccurrences,
    total_qc_lost: totalQCLost,
    most_frequent:
      data?.sort((a, b) => b.occurrences - a.occurrences)[0] || null,
  };
};

/**
 * Suscribirse a cambios en bad habits
 */
export const subscribeToBadHabits = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel("bad_habits_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bad_habits",
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};
