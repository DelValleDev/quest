import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async () => {
  try {
    console.log("🧹 Starting cleanup of expired insights...");

    const now = new Date();

    // Delete expired insights
    const { data: deletedInsights, error } = await supabase
      .from("guild_insights")
      .delete()
      .lt("expires_at", now.toISOString())
      .select("id, guild_id, insight_type, priority");

    if (error) throw error;

    const count = deletedInsights?.length || 0;

    if (count > 0) {
      console.log(`✅ Deleted ${count} expired insights`);

      // Log deletion for analytics
      await supabase.from("insight_cleanup_log").insert({
        cleanup_date: now.toISOString(),
        insights_deleted: count,
        details: deletedInsights?.map((i: any) => ({
          id: i.id,
          guild_id: i.guild_id,
          type: i.insight_type,
          priority: i.priority,
        })),
      });
    } else {
      console.log("ℹ️ No expired insights to delete");
    }

    return new Response(
      JSON.stringify({
        message: `Cleanup completed`,
        deleted: count,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
