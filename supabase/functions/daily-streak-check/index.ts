import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface StreakResult {
  user_id: string;
  success: boolean;
  message: string;
  new_streak_length?: number;
  qc_earned?: number;
}

serve(async (req) => {
  try {
    console.log("[CRON] Starting daily streak check...");

    // Obtener todos los usuarios activos
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_active", true);

    if (usersError) throw usersError;

    console.log(`[CRON] Found ${users?.length || 0} active users`);

    const results: StreakResult[] = [];

    // Procesar cada usuario
    for (const user of users || []) {
      try {
        const { data, error } = await supabase.rpc("update_perfect_streak", {
          p_user_id: user.id,
        });

        if (error) {
          console.error(`[ERROR] User ${user.id}:`, error);
          results.push({
            user_id: user.id,
            success: false,
            message: error.message,
          });
          continue;
        }

        results.push({
          user_id: user.id,
          success: true,
          message: data.message,
          new_streak_length: data.new_streak_length,
          qc_earned: data.qc_earned,
        });

        // Si rompió la racha, enviar notificación
        if (data.message.includes("rota")) {
          await sendStreakBrokenNotification(user.id, data.old_streak_length);
        }

        // Si alcanzó un milestone, enviar notificación
        if (data.milestone_reached) {
          await sendMilestoneNotification(
            user.id,
            data.new_streak_length,
            data.qc_earned
          );
        }
      } catch (error) {
        console.error(`[ERROR] Processing user ${user.id}:`, error);
        results.push({
          user_id: user.id,
          success: false,
          message: (error as Error).message,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[CRON] Completed: ${successful} success, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        total_users: users?.length || 0,
        successful,
        failed,
        results,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CRON] Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function sendStreakBrokenNotification(userId: string, oldStreak: number) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "streak_broken",
      title: "💔 Racha Rota",
      message: `Tu racha de ${oldStreak} días se ha roto. ¡Empieza de nuevo hoy!`,
      data: { old_streak: oldStreak },
    });
  } catch (error) {
    console.error("Error sending streak broken notification:", error);
  }
}

async function sendMilestoneNotification(
  userId: string,
  streakLength: number,
  qcEarned: number
) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "streak_milestone",
      title: "🔥 ¡Milestone Alcanzado!",
      message: `¡${streakLength} días de racha perfecta! Ganaste ${qcEarned} QC`,
      data: { streak_length: streakLength, qc_earned: qcEarned },
    });
  } catch (error) {
    console.error("Error sending milestone notification:", error);
  }
}
