/**
 * Weekly Review Service
 *
 * Generates AI-powered weekly progress reviews and insights
 */

import questAI from "./openai";
import { getWeeklyHealthSummary } from "./healthKit";

// Types
export interface WeeklyStats {
  questsCompleted: number;
  questsTotal: number;
  habitsCompletedDays: number;
  xpEarned: number;
  currentStreak: number;
  longestStreak: number;
  missedDays: number;
  categoriesWorked: string[];
  achievementsUnlocked: string[];
  healthData?: {
    totalSteps: number;
    avgSteps: number;
    totalExerciseMinutes: number;
    avgSleepHours: number;
  };
}

export interface WeeklyReview {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  stats: WeeklyStats;
  summary: string;
  highlights: string[];
  areasToImprove: string[];
  aiInsights: string;
  motivationalMessage: string;
  nextWeekFocus: string[];
  overallScore: number; // 1-100
  createdAt: string;
}

// Calculate weekly stats from database
export const calculateWeeklyStats = async (
  userId: string,
  supabase: any,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyStats> => {
  const startStr = weekStart.toISOString();
  const endStr = weekEnd.toISOString();

  // Get completed quests
  const { data: completedQuests } = await supabase
    .from("quest_log")
    .select("id, category, xp_earned")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("completed_at", startStr)
    .lte("completed_at", endStr);

  // Get total quests (including pending/failed)
  const { data: allQuests } = await supabase
    .from("quest_log")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", startStr)
    .lte("created_at", endStr);

  // Get habit completions for the week
  const { data: habitLogs } = await supabase
    .from("habit_logs")
    .select("habit_id, completed_at")
    .eq("user_id", userId)
    .gte("completed_at", startStr)
    .lte("completed_at", endStr);

  // Get user streaks
  const { data: userStats } = await supabase
    .from("user_stats")
    .select("current_streak, longest_streak")
    .eq("user_id", userId)
    .single();

  // Get achievements unlocked this week
  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("achievement:achievements(name, title)")
    .eq("user_id", userId)
    .gte("unlocked_at", startStr)
    .lte("unlocked_at", endStr);

  // Calculate XP earned
  const xpEarned =
    completedQuests?.reduce(
      (sum: number, q: any) => sum + (q.xp_earned || 0),
      0
    ) || 0;

  // Get unique categories worked on
  const categories = [
    ...new Set(completedQuests?.map((q: any) => q.category).filter(Boolean)),
  ] as string[];

  // Calculate unique days with habit completions
  const habitDays = new Set(
    habitLogs?.map((h: any) => h.completed_at?.split("T")[0])
  );

  // Try to get health data
  let healthData;
  try {
    healthData = await getWeeklyHealthSummary();
  } catch {
    healthData = undefined;
  }

  // Calculate missed days (days with 0 activity)
  const totalDays = 7;
  const activeDays = habitDays.size;
  const missedDays = totalDays - activeDays;

  return {
    questsCompleted: completedQuests?.length || 0,
    questsTotal: allQuests?.length || 0,
    habitsCompletedDays: activeDays,
    xpEarned,
    currentStreak: userStats?.current_streak || 0,
    longestStreak: userStats?.longest_streak || 0,
    missedDays,
    categoriesWorked: categories,
    achievementsUnlocked:
      achievements?.map(
        (a: any) => a.achievement?.title || a.achievement?.name
      ) || [],
    healthData: healthData
      ? {
          totalSteps: healthData.totalSteps,
          avgSteps: healthData.avgSteps,
          totalExerciseMinutes: healthData.totalExerciseMinutes,
          avgSleepHours: healthData.avgSleepHours,
        }
      : undefined,
  };
};

// Generate AI insights for the week
export const generateWeeklyInsights = async (
  stats: WeeklyStats,
  userName: string = "Aventurero"
): Promise<{
  summary: string;
  highlights: string[];
  areasToImprove: string[];
  aiInsights: string;
  motivationalMessage: string;
  nextWeekFocus: string[];
  overallScore: number;
}> => {
  const completionRate =
    stats.questsTotal > 0
      ? Math.round((stats.questsCompleted / stats.questsTotal) * 100)
      : 0;

  const habitConsistency = Math.round((stats.habitsCompletedDays / 7) * 100);

  const prompt = `Eres el mentor gamificado de ${userName} en Quest, una app de productividad RPG. 
Analiza su semana y genera un review motivador pero honesto.

ESTADÍSTICAS DE LA SEMANA:
- Quests completadas: ${stats.questsCompleted}/${
    stats.questsTotal
  } (${completionRate}%)
- Días con hábitos completados: ${
    stats.habitsCompletedDays
  }/7 (${habitConsistency}%)
- XP ganado: ${stats.xpEarned}
- Racha actual: ${stats.currentStreak} días
- Racha más larga: ${stats.longestStreak} días
- Días sin actividad: ${stats.missedDays}
- Categorías trabajadas: ${stats.categoriesWorked.join(", ") || "Ninguna"}
- Logros desbloqueados: ${stats.achievementsUnlocked.join(", ") || "Ninguno"}
${
  stats.healthData
    ? `
DATOS DE SALUD:
- Pasos totales: ${stats.healthData.totalSteps.toLocaleString()}
- Pasos promedio/día: ${stats.healthData.avgSteps.toLocaleString()}
- Minutos de ejercicio: ${stats.healthData.totalExerciseMinutes}
- Sueño promedio: ${stats.healthData.avgSleepHours} horas
`
    : ""
}

Genera un JSON con exactamente esta estructura:
{
  "summary": "Resumen de 2-3 oraciones de la semana en tono RPG",
  "highlights": ["logro1", "logro2", "logro3"], // 2-4 highlights positivos
  "areasToImprove": ["area1", "area2"], // 1-3 áreas de mejora (constructivas)
  "aiInsights": "Análisis más profundo de patrones observados (3-4 oraciones)",
  "motivationalMessage": "Mensaje motivador personalizado para la próxima semana",
  "nextWeekFocus": ["focus1", "focus2", "focus3"], // 2-3 recomendaciones concretas
  "overallScore": 75 // Score de 1-100 basado en el desempeño
}

IMPORTANTE:
- Mantén el tono gamificado pero no cursi
- Sé específico con los datos
- El score debe reflejar objetivamente el rendimiento
- Las mejoras deben ser constructivas, no críticas
- Responde SOLO con el JSON válido, sin texto adicional`;

  try {
    const response = await questAI.generateText(prompt, {
      max_tokens: 800,
      temperature: 0.7,
    });

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || "Semana completada. ¡Sigue adelante!",
        highlights: parsed.highlights || ["Participaste en Quest"],
        areasToImprove: parsed.areasToImprove || [],
        aiInsights:
          parsed.aiInsights || "Continúa construyendo tus hábitos diarios.",
        motivationalMessage:
          parsed.motivationalMessage || "¡La próxima semana será aún mejor!",
        nextWeekFocus: parsed.nextWeekFocus || ["Mantén tu racha"],
        overallScore: Math.min(100, Math.max(1, parsed.overallScore || 50)),
      };
    }
  } catch (error) {
    console.error("Error generating weekly insights:", error);
  }

  // Fallback response
  return {
    summary: `Esta semana completaste ${stats.questsCompleted} quests y ganaste ${stats.xpEarned} XP.`,
    highlights:
      stats.questsCompleted > 0
        ? [`Completaste ${stats.questsCompleted} quests`]
        : ["Iniciaste tu aventura en Quest"],
    areasToImprove:
      stats.missedDays > 3
        ? ["Intenta ser más constante durante la semana"]
        : [],
    aiInsights:
      "Cada día es una oportunidad para mejorar. Pequeños pasos llevan a grandes victorias.",
    motivationalMessage: "¡El verdadero héroe es quien no se rinde!",
    nextWeekFocus: [
      "Completa al menos una quest diaria",
      "Mantén tu racha activa",
    ],
    overallScore: Math.round((completionRate + habitConsistency) / 2),
  };
};

// Create and save weekly review
export const createWeeklyReview = async (
  userId: string,
  supabase: any,
  userName?: string
): Promise<WeeklyReview | null> => {
  try {
    // Calculate week boundaries (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diffToMonday - 7); // Last week's Monday
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Last week's Sunday
    weekEnd.setHours(23, 59, 59, 999);

    // Check if review already exists for this week
    const { data: existing } = await supabase
      .from("weekly_reviews")
      .select("id")
      .eq("user_id", userId)
      .eq("week_start", weekStart.toISOString().split("T")[0])
      .single();

    if (existing) {
      console.log("Weekly review already exists for this week");
      return null;
    }

    // Calculate stats
    const stats = await calculateWeeklyStats(
      userId,
      supabase,
      weekStart,
      weekEnd
    );

    // Generate AI insights
    const insights = await generateWeeklyInsights(stats, userName);

    // Create review object
    const review: Omit<WeeklyReview, "id" | "createdAt"> = {
      userId,
      weekStart: weekStart.toISOString().split("T")[0],
      weekEnd: weekEnd.toISOString().split("T")[0],
      stats,
      ...insights,
    };

    // Save to database
    const { data, error } = await supabase
      .from("weekly_reviews")
      .insert({
        user_id: review.userId,
        week_start: review.weekStart,
        week_end: review.weekEnd,
        stats: review.stats,
        summary: review.summary,
        highlights: review.highlights,
        areas_to_improve: review.areasToImprove,
        ai_insights: review.aiInsights,
        motivational_message: review.motivationalMessage,
        next_week_focus: review.nextWeekFocus,
        overall_score: review.overallScore,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving weekly review:", error);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      weekStart: data.week_start,
      weekEnd: data.week_end,
      stats: data.stats,
      summary: data.summary,
      highlights: data.highlights,
      areasToImprove: data.areas_to_improve,
      aiInsights: data.ai_insights,
      motivationalMessage: data.motivational_message,
      nextWeekFocus: data.next_week_focus,
      overallScore: data.overall_score,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error("Error creating weekly review:", error);
    return null;
  }
};

// Get user's past weekly reviews
export const getWeeklyReviews = async (
  userId: string,
  supabase: any,
  limit: number = 4
): Promise<WeeklyReview[]> => {
  try {
    const { data, error } = await supabase
      .from("weekly_reviews")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching weekly reviews:", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      weekStart: d.week_start,
      weekEnd: d.week_end,
      stats: d.stats,
      summary: d.summary,
      highlights: d.highlights,
      areasToImprove: d.areas_to_improve,
      aiInsights: d.ai_insights,
      motivationalMessage: d.motivational_message,
      nextWeekFocus: d.next_week_focus,
      overallScore: d.overall_score,
      createdAt: d.created_at,
    }));
  } catch (error) {
    console.error("Error fetching weekly reviews:", error);
    return [];
  }
};

// Get latest weekly review
export const getLatestWeeklyReview = async (
  userId: string,
  supabase: any
): Promise<WeeklyReview | null> => {
  const reviews = await getWeeklyReviews(userId, supabase, 1);
  return reviews[0] || null;
};

// Check if user should see weekly review notification
export const shouldShowWeeklyReview = async (
  userId: string,
  supabase: any
): Promise<boolean> => {
  try {
    // Check if it's Monday (day 1)
    const today = new Date();
    if (today.getDay() !== 1) {
      return false;
    }

    // Check if there's a review for last week that hasn't been seen
    const { data: unseenReview } = await supabase
      .from("weekly_reviews")
      .select("id, seen_at")
      .eq("user_id", userId)
      .is("seen_at", null)
      .order("week_start", { ascending: false })
      .limit(1)
      .single();

    return !!unseenReview;
  } catch {
    return false;
  }
};

// Mark weekly review as seen
export const markWeeklyReviewSeen = async (
  reviewId: string,
  supabase: any
): Promise<void> => {
  await supabase
    .from("weekly_reviews")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", reviewId);
};

export default {
  calculateWeeklyStats,
  generateWeeklyInsights,
  createWeeklyReview,
  getWeeklyReviews,
  getLatestWeeklyReview,
  shouldShowWeeklyReview,
  markWeeklyReviewSeen,
};
