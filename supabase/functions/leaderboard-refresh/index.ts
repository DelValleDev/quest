import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  try {
    console.log("[CRON] Refreshing leaderboard materialized view...");

    const { error } = await supabase.rpc("refresh_materialized_views");

    if (error) throw error;

    console.log("[CRON] Leaderboard refreshed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        message: "Leaderboard refreshed",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CRON] Error refreshing leaderboard:", error);
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
