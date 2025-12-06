import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
});

serve(async (req) => {
  try {
    console.log("[CRON] Starting quest daily summaries...");

    // Obtener todos los guilds con Quest AI habilitado
    const { data: guilds, error: guildsError } = await supabase
      .from("guilds")
      .select("id, name, quest_config")
      .filter("quest_config->>enabled", "eq", "true")
      .filter("quest_config->features->>daily_summary", "eq", "true");

    if (guildsError) throw guildsError;

    console.log(
      `[CRON] Found ${guilds?.length || 0} guilds with daily summary enabled`
    );

    const results = [];

    for (const guild of guilds || []) {
      try {
        const summaryTime =
          guild.quest_config?.scheduling?.daily_summary_time || "20:00";
        const currentHour = new Date().getHours();
        const [targetHour] = summaryTime.split(":").map(Number);

        // Solo ejecutar si es la hora configurada
        if (currentHour !== targetHour) {
          console.log(
            `[SKIP] Guild ${guild.id}: Not summary time (${currentHour} !== ${targetHour})`
          );
          continue;
        }

        // Analizar el guild
        const { data: analysis, error: analysisError } = await supabase.rpc(
          "quest_analyze_guild_detailed",
          { p_guild_id: guild.id }
        );

        if (analysisError) throw analysisError;

        // Generar resumen con IA
        const summary = await generateSummaryWithAI(guild, analysis);

        // Enviar mensaje al chat del guild
        await supabase.from("guild_messages").insert({
          guild_id: guild.id,
          user_id: null, // null = mensaje de Quest AI
          content: summary,
          message_type: "ai_summary",
        });

        // Registrar interacción
        await supabase.from("guild_quest_interactions").insert({
          guild_id: guild.id,
          interaction_type: "analysis",
          content: summary,
          metadata: { analysis },
        });

        results.push({
          guild_id: guild.id,
          guild_name: guild.name,
          success: true,
        });

        console.log(`[SUCCESS] Guild ${guild.id}: Summary sent`);
      } catch (error) {
        console.error(`[ERROR] Guild ${guild.id}:`, error);
        results.push({
          guild_id: guild.id,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        guilds_processed: results.length,
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

async function generateSummaryWithAI(guild: any, analysis: any) {
  const personality = guild.quest_config?.personality || "motivational";

  const personalityPrompts: Record<string, string> = {
    motivational:
      "Eres un coach motivador y positivo. Celebra los logros y anima en los desafíos.",
    strict:
      "Eres un entrenador estricto pero justo. Señala áreas de mejora con firmeza pero constructivamente.",
    funny:
      "Eres gracioso y sarcástico, pero siempre con buena onda. Usa memes y referencias populares.",
    analytical:
      "Eres analítico y detallado. Proporciona datos específicos y tendencias.",
  };

  const prompt = `${
    personalityPrompts[personality] || personalityPrompts.motivational
  }

Genera un resumen diario para el grupo "${guild.name}" basado en este análisis:

Participación: ${analysis.analysis.participation_rate}%
Tasa de completitud: ${analysis.analysis.avg_completion_rate}%
Tendencia: ${analysis.analysis.engagement_trend}
Pilar más activo: ${analysis.analysis.most_active_pillar}

Top performers: ${analysis.analysis.top_performers.join(", ") || "Ninguno"}
Miembros que necesitan apoyo: ${
    analysis.analysis.members_needing_support.join(", ") || "Ninguno"
  }

${
  analysis.patterns
    ? `
Patrones detectados:
- Días de baja actividad: ${
        analysis.patterns.low_activity_days?.join(", ") || "Ninguno"
      }
- Horas pico: ${analysis.patterns.peak_activity_hours?.join(", ") || "Ninguno"}
`
    : ""
}

${
  analysis.recommendations?.length > 0
    ? `
Recomendaciones:
${analysis.recommendations
  .map((r: string, i: number) => `${i + 1}. ${r}`)
  .join("\n")}
`
    : ""
}

El resumen debe ser:
- Breve (máx 200 palabras)
- Motivador pero realista
- Con emojis relevantes
- Actionable (qué pueden mejorar mañana)`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Eres Quest, el AI coach del grupo. Generas resúmenes diarios útiles y motivadores.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.8,
    max_tokens: 500,
  });

  return (
    completion.choices[0]?.message?.content || "No se pudo generar el resumen."
  );
}
