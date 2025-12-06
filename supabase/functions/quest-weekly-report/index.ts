import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import OpenAI from "https://esm.sh/openai@4.20.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

serve(async () => {
  try {
    console.log("🔄 Starting weekly report generation...");

    // Get all guilds with enabled Quest AI
    const { data: guilds } = await supabase
      .from("guild_quest_config")
      .select("guild_id, personality, weekly_report_day, weekly_report_time")
      .eq("enabled", true)
      .eq("generate_weekly_report", true);

    if (!guilds || guilds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No guilds with weekly report enabled" }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date();
    const currentDay = now
      .toLocaleDateString("en-US", {
        weekday: "long",
      })
      .toLowerCase();
    const currentHour = now.getHours();

    let processed = 0;

    for (const guild of guilds) {
      // Check if it's time for this guild's report
      if (guild.weekly_report_day !== currentDay) continue;

      const [reportHour] = guild.weekly_report_time.split(":").map(Number);
      if (currentHour !== reportHour) continue;

      try {
        // Get week data
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const [tasksData, perfectStreaksData, badHabitsData, leaderboardData] =
          await Promise.all([
            supabase
              .from("tasks")
              .select("id, completed")
              .eq("guild_id", guild.guild_id)
              .gte("created_at", weekAgo.toISOString())
              .lte("created_at", now.toISOString()),

            supabase
              .from("perfect_streaks")
              .select("current_days, total_qc_earned")
              .eq("guild_id", guild.guild_id)
              .eq("is_active", true),

            supabase
              .from("bad_habit_occurrences")
              .select("id, bad_habit:bad_habits(name, penalty_qc)")
              .eq("guild_id", guild.guild_id)
              .gte("occurred_at", weekAgo.toISOString())
              .lte("occurred_at", now.toISOString()),

            supabase
              .from("guild_leaderboard_weekly")
              .select("*")
              .eq("guild_id", guild.guild_id)
              .order("total_score", { ascending: false })
              .limit(5),
          ]);

        const totalTasks = tasksData.data?.length || 0;
        const completedTasks =
          tasksData.data?.filter((t: any) => t.completed).length || 0;
        const completionRate =
          totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;
        const activeStreaks = perfectStreaksData.data?.length || 0;
        const avgStreakDays =
          perfectStreaksData.data?.length > 0
            ? (
                perfectStreaksData.data.reduce(
                  (sum: number, s: any) => sum + s.current_days,
                  0
                ) / perfectStreaksData.data.length
              ).toFixed(1)
            : 0;
        const badHabitsCount = badHabitsData.data?.length || 0;

        // Generate AI summary
        const personalityPrompts: Record<string, string> = {
          motivational:
            "Genera un resumen motivacional y energético de la semana.",
          strict: "Genera un resumen directo y exigente de la semana.",
          funny: "Genera un resumen divertido y con humor de la semana.",
          analytical:
            "Genera un resumen analítico y basado en datos de la semana.",
        };

        const prompt = `
${personalityPrompts[guild.personality] || personalityPrompts.motivational}

Datos de la semana:
- Tareas totales: ${totalTasks}
- Tareas completadas: ${completedTasks} (${completionRate}%)
- Rachas activas: ${activeStreaks}
- Promedio de días en racha: ${avgStreakDays}
- Malos hábitos: ${badHabitsCount}

Top 5 del leaderboard:
${
  leaderboardData.data
    ?.map(
      (u: any, i: number) =>
        `${i + 1}. User ${u.user_id.slice(0, 8)}: ${u.total_score} pts`
    )
    .join("\n") || "No hay datos"
}Genera:
1. Resumen ejecutivo de la semana (2-3 oraciones)
2. Comparación con semana anterior (mejoró/empeoró)
3. Top 3 logros de la semana
4. Top 3 áreas de mejora
5. 3 recomendaciones específicas para la próxima semana
`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Eres Quest AI, un asistente virtual para gestión de tareas y hábitos.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 800,
        });

        const summary =
          completion.choices[0].message.content ||
          "No se pudo generar resumen.";

        // Save report
        await supabase.from("quest_weekly_reports").insert({
          guild_id: guild.guild_id,
          week_start: weekAgo.toISOString(),
          week_end: now.toISOString(),
          summary,
          stats: {
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            completion_rate: parseFloat(completionRate as string),
            active_streaks: activeStreaks,
            avg_streak_days: parseFloat(avgStreakDays as string),
            bad_habits_count: badHabitsCount,
            top_users:
              leaderboardData.data?.slice(0, 5).map((u: any) => u.user_id) ||
              [],
          },
        });

        // Create notification for guild members
        const { data: members } = await supabase
          .from("guild_members")
          .select("user_id")
          .eq("guild_id", guild.guild_id);

        if (members && members.length > 0) {
          await supabase.from("notifications").insert(
            members.map((m: any) => ({
              user_id: m.user_id,
              type: "weekly_report",
              title: "📊 Reporte Semanal",
              body: "El resumen de la semana ya está disponible",
              data: { guild_id: guild.guild_id },
            }))
          );
        }

        processed++;
        console.log(`✅ Weekly report generated for guild ${guild.guild_id}`);
      } catch (error) {
        console.error(
          `❌ Error processing guild ${guild.guild_id}:`,
          (error as Error).message
        );
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${processed} weekly reports` }),
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
