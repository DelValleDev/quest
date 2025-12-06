import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  try {
    console.log("[CRON] Applying daily penalties...");

    // Obtener usuarios con días de ausencia consecutivos
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, consecutive_absent_days, quest_coins")
      .gt("consecutive_absent_days", 0);

    if (profilesError) throw profilesError;

    console.log(`[CRON] Found ${profiles?.length || 0} users with absences`);

    const results = [];

    for (const profile of profiles || []) {
      try {
        // Aplicar penalización gradual
        let penalty = 0;

        if (profile.consecutive_absent_days >= 1) penalty = 20;
        if (profile.consecutive_absent_days >= 3) penalty = 50;
        if (profile.consecutive_absent_days >= 7) penalty = 100;
        if (profile.consecutive_absent_days >= 14) penalty = 200;

        if (penalty > 0) {
          // Actualizar QC
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              quest_coins: Math.max(0, profile.quest_coins - penalty),
            })
            .eq("id", profile.id);

          if (updateError) throw updateError;

          // Registrar transacción
          await supabase.from("qc_transactions").insert({
            from_user_id: profile.id,
            to_user_id: null,
            amount: -penalty,
            type: "penalty",
            concept: `Penalización por ${profile.consecutive_absent_days} días de ausencia`,
          });

          // Enviar notificación
          await supabase.from("notifications").insert({
            user_id: profile.id,
            type: "penalty_applied",
            title: "⚠️ Penalización Aplicada",
            message: `Perdiste ${penalty} QC por ${profile.consecutive_absent_days} días sin actividad. ¡Vuelve hoy!`,
            data: {
              penalty,
              absent_days: profile.consecutive_absent_days,
            },
          });

          results.push({
            user_id: profile.id,
            username: profile.username,
            absent_days: profile.consecutive_absent_days,
            penalty_applied: penalty,
            success: true,
          });

          console.log(
            `[PENALTY] ${profile.username}: -${penalty} QC (${profile.consecutive_absent_days} días)`
          );
        }
      } catch (error) {
        console.error(`[ERROR] User ${profile.id}:`, error);
        results.push({
          user_id: profile.id,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        users_penalized: results.filter((r) => r.success).length,
        total_penalties: results.reduce(
          (sum, r) => sum + (r.penalty_applied || 0),
          0
        ),
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
