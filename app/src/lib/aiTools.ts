/**
 * AI Coach Tools - Functions the AI can execute from chat
 * These enable the Quest Coach to modify user's agenda, habits, quests, and life paths
 */

import { supabase } from "./supabase";
import {
  createCalendarEventFromAI,
  getDaySchedule,
  isCalendarConnected,
  type CreateEventParams,
} from "./calendar";

export interface AIToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface AgendaEvent {
  title: string;
  date: string; // ISO date YYYY-MM-DD
  time?: string; // HH:MM
  duration_minutes?: number;
  event_type?: "work" | "personal" | "habit" | "quest" | "appointment";
  notes?: string;
}

export interface HabitData {
  title: string;
  description?: string;
  pillar_id: string;
  frequency: "daily" | "weekly" | "specific_days";
  frequency_days?: number[]; // [1,3,5] for Mon/Wed/Fri
  target_per_period?: number;
  preferred_time?: "morning" | "afternoon" | "evening";
  duration_minutes?: number;
}

export interface QuestData {
  title: string;
  description: string;
  pillar_id: string;
  difficulty: "easy" | "medium" | "hard" | "epic";
  xp_reward: number;
  coin_reward: number;
  duration_minutes?: number;
}

export interface LifePathData {
  title: string;
  pillar_id: string;
  vision_statement?: string;
  target_date?: string;
}

/**
 * AI Tools class - Contains all functions the AI can call
 */
export class AICoachTools {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ==================== GOOGLE CALENDAR TOOLS ====================

  /**
   * Create an event in Google Calendar
   * Use this when the user asks to schedule something in their calendar
   */
  async createGoogleCalendarEvent(params: {
    title: string;
    startTime: string; // ISO date-time string
    endTime?: string;
    durationMinutes?: number;
    description?: string;
    location?: string;
    reminder?: number;
  }): Promise<AIToolResult> {
    try {
      // Check if calendar is connected
      const connected = await isCalendarConnected(this.userId);
      if (!connected) {
        return {
          success: false,
          message:
            "📅 No tienes Google Calendar conectado. Ve a Configuración → Integraciones para conectarlo.",
        };
      }

      const result = await createCalendarEventFromAI(this.userId, {
        title: params.title,
        startTime: params.startTime,
        endTime: params.endTime,
        durationMinutes: params.durationMinutes || 60,
        description: params.description,
        location: params.location,
        reminder: params.reminder || 10,
      });

      if (result.success) {
        return {
          success: true,
          message: `📅 ¡Listo! Agregué "${params.title}" a tu Google Calendar.`,
          data: { eventId: result.eventId, eventUrl: result.eventUrl },
        };
      } else {
        return {
          success: false,
          message: `❌ Error al crear evento: ${result.error}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `❌ Error con Google Calendar: ${err.message}`,
      };
    }
  }

  /**
   * Get user's schedule for today or a specific date
   * Use this to understand user's availability before suggesting times
   */
  async getUserSchedule(date?: string): Promise<AIToolResult> {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const { events, freeSlots } = await getDaySchedule(
        this.userId,
        targetDate
      );

      const dateStr = targetDate.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

      if (events.length === 0) {
        return {
          success: true,
          message: `📅 No tienes eventos para ${dateStr}. ¡Día libre!`,
          data: { events: [], freeSlots },
        };
      }

      const eventList = events
        .map((e) => {
          const time = new Date(e.start_time).toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return `• ${time} - ${e.title}`;
        })
        .join("\n");

      return {
        success: true,
        message: `📅 Tu agenda para ${dateStr}:\n${eventList}`,
        data: { events, freeSlots },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `❌ Error al obtener agenda: ${err.message}`,
      };
    }
  }

  // ==================== AGENDA TOOLS ====================

  /**
   * Add an event to the user's agenda
   */
  async addAgendaEvent(event: AgendaEvent): Promise<AIToolResult> {
    try {
      const { error } = await supabase.from("agenda_events").insert({
        user_id: this.userId,
        title: event.title,
        event_date: event.date,
        event_time: event.time,
        duration_minutes: event.duration_minutes || 60,
        event_type: event.event_type || "personal",
        notes: event.notes,
        ai_generated: true,
      });

      if (error) throw error;

      return {
        success: true,
        message: `✅ Agregué "${event.title}" a tu agenda para el ${
          event.date
        }${event.time ? ` a las ${event.time}` : ""}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `❌ Error al agregar evento: ${err.message}`,
      };
    }
  }

  /**
   * Update user's work schedule
   */
  async updateWorkSchedule(schedule: {
    days: string[]; // ['monday', 'tuesday', ...]
    start_time: string;
    end_time: string;
    notes?: string;
  }): Promise<AIToolResult> {
    try {
      const { error } = await supabase.from("user_schedules").upsert(
        {
          user_id: this.userId,
          schedule_type: "work",
          days: schedule.days,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          notes: schedule.notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,schedule_type" }
      );

      if (error) throw error;

      return {
        success: true,
        message: `✅ Actualicé tu horario de trabajo: ${schedule.days.join(
          ", "
        )} de ${schedule.start_time} a ${schedule.end_time}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `❌ Error al actualizar horario: ${err.message}`,
      };
    }
  }

  /**
   * Mark a day as free/off
   */
  async markDayOff(date: string, reason?: string): Promise<AIToolResult> {
    try {
      const { error } = await supabase.from("agenda_events").insert({
        user_id: this.userId,
        title: reason || "Día libre",
        event_date: date,
        event_type: "day_off",
        is_all_day: true,
        ai_generated: true,
      });

      if (error) throw error;

      return {
        success: true,
        message: `✅ Marqué el ${date} como día libre${
          reason ? ` (${reason})` : ""
        }`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  // ==================== HABITS TOOLS ====================

  /**
   * Create a new habit
   */
  async createHabit(habit: HabitData): Promise<AIToolResult> {
    try {
      const { error } = await supabase.from("path_habits").insert({
        user_id: this.userId,
        title: habit.title,
        description: habit.description,
        pillar_id: habit.pillar_id,
        frequency: habit.frequency,
        frequency_days: habit.frequency_days,
        target_per_period: habit.target_per_period || 1,
        preferred_time: habit.preferred_time,
        duration_minutes: habit.duration_minutes,
        status: "active",
      });

      if (error) throw error;

      return {
        success: true,
        message: `✅ Creé el hábito "${habit.title}" - ${
          habit.frequency === "daily" ? "todos los días" : habit.frequency
        }`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `❌ Error al crear hábito: ${err.message}`,
      };
    }
  }

  /**
   * Pause or resume a habit
   */
  async toggleHabit(
    habitTitle: string,
    active: boolean
  ): Promise<AIToolResult> {
    try {
      const { data, error: findError } = await supabase
        .from("path_habits")
        .select("id")
        .eq("user_id", this.userId)
        .ilike("title", `%${habitTitle}%`)
        .single();

      if (findError || !data) {
        return {
          success: false,
          message: `No encontré el hábito "${habitTitle}"`,
        };
      }

      const { error } = await supabase
        .from("path_habits")
        .update({ status: active ? "active" : "paused" })
        .eq("id", data.id);

      if (error) throw error;

      return {
        success: true,
        message: active
          ? `✅ Activé el hábito "${habitTitle}"`
          : `⏸️ Pausé el hábito "${habitTitle}"`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  // ==================== QUEST TOOLS ====================

  /**
   * Create a custom quest for the user
   */
  async createQuest(quest: QuestData): Promise<AIToolResult> {
    try {
      // First create the challenge
      const { data: challenge, error: challengeError } = await supabase
        .from("challenges")
        .insert({
          title: quest.title,
          description: quest.description,
          pillar_id: quest.pillar_id,
          difficulty: quest.difficulty,
          xp_reward: quest.xp_reward,
          coin_reward: quest.coin_reward,
          duration_minutes: quest.duration_minutes,
          is_daily: false,
          is_active: true,
          tags: ["ai_generated", "custom"],
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Assign to user's daily quests
      const { error: assignError } = await supabase
        .from("user_daily_quests")
        .insert({
          user_id: this.userId,
          challenge_id: challenge.id,
          date: new Date().toISOString().split("T")[0],
          is_completed: false,
        });

      if (assignError) throw assignError;

      return {
        success: true,
        message: `✅ Creé la quest "${quest.title}" y la agregué a tus quests de hoy`,
        data: challenge,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `❌ Error al crear quest: ${err.message}`,
      };
    }
  }

  /**
   * Complete a quest by name
   */
  async completeQuest(questTitle: string): Promise<AIToolResult> {
    try {
      const { data: quest, error: findError } = await supabase
        .from("user_daily_quests")
        .select(
          "id, challenge_id, challenges!inner(title, xp_reward, coin_reward)"
        )
        .eq("user_id", this.userId)
        .eq("is_completed", false)
        .ilike("challenges.title", `%${questTitle}%`)
        .single();

      if (findError || !quest) {
        return {
          success: false,
          message: `No encontré la quest "${questTitle}" activa`,
        };
      }

      const { error } = await supabase
        .from("user_daily_quests")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", quest.id);

      if (error) throw error;

      const challenge = (quest as any).challenges;
      return {
        success: true,
        message: `🎉 ¡Quest completada! "${challenge.title}" - +${challenge.xp_reward} XP, +${challenge.coin_reward} 🪙`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  // ==================== LIFE PATH TOOLS ====================

  /**
   * Create a new life path
   */
  async createLifePath(path: LifePathData): Promise<AIToolResult> {
    try {
      const { error } = await supabase.from("life_paths").insert({
        user_id: this.userId,
        title: path.title,
        pillar_id: path.pillar_id,
        vision_statement: path.vision_statement,
        target_date:
          path.target_date ||
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        ai_generated: true,
        status: "active",
      });

      if (error) throw error;

      return {
        success: true,
        message: `🎯 Creé tu nuevo camino de vida: "${path.title}"`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  /**
   * Add a milestone to a life path
   */
  async addMilestone(
    pathTitle: string,
    milestoneTitle: string,
    targetDate?: string
  ): Promise<AIToolResult> {
    try {
      // Find the path
      const { data: path, error: findError } = await supabase
        .from("life_paths")
        .select("id")
        .eq("user_id", this.userId)
        .ilike("title", `%${pathTitle}%`)
        .single();

      if (findError || !path) {
        return {
          success: false,
          message: `No encontré el camino "${pathTitle}"`,
        };
      }

      // Get current milestone count for sort order
      const { count } = await supabase
        .from("path_milestones")
        .select("*", { count: "exact", head: true })
        .eq("life_path_id", path.id);

      const { error } = await supabase.from("path_milestones").insert({
        life_path_id: path.id,
        user_id: this.userId,
        title: milestoneTitle,
        target_date:
          targetDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        sort_order: (count || 0) + 1,
        ai_suggested: true,
      });

      if (error) throw error;

      return {
        success: true,
        message: `🏁 Agregué el hito "${milestoneTitle}" a tu camino "${pathTitle}"`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  // ==================== PROFILE TOOLS ====================

  /**
   * Update user profile info
   */
  async updateProfile(updates: {
    display_name?: string;
    bio?: string;
    goals?: string;
  }): Promise<AIToolResult> {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", this.userId);

      if (error) throw error;

      return {
        success: true,
        message: `✅ Actualicé tu perfil`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  // ==================== DELETE TOOLS ====================

  /**
   * Delete a habit
   */
  async deleteHabit(habitTitle: string): Promise<AIToolResult> {
    try {
      const { data: habit, error: findError } = await supabase
        .from("habits")
        .select("id")
        .eq("user_id", this.userId)
        .ilike("title", `%${habitTitle}%`)
        .single();

      if (findError || !habit) {
        return {
          success: false,
          message: `No encontré el hábito "${habitTitle}"`,
        };
      }

      const { error } = await supabase
        .from("habits")
        .delete()
        .eq("id", habit.id);

      if (error) throw error;

      return {
        success: true,
        message: `🗑️ Eliminé el hábito "${habitTitle}"`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  /**
   * Delete a Life Path
   */
  async deleteLifePath(pathTitle: string): Promise<AIToolResult> {
    try {
      const { data: path, error: findError } = await supabase
        .from("life_paths")
        .select("id")
        .eq("user_id", this.userId)
        .ilike("title", `%${pathTitle}%`)
        .single();

      if (findError || !path) {
        return {
          success: false,
          message: `No encontré el camino "${pathTitle}"`,
        };
      }

      const { error } = await supabase
        .from("life_paths")
        .delete()
        .eq("id", path.id);

      if (error) throw error;

      return {
        success: true,
        message: `🗑️ Eliminé el camino de vida "${pathTitle}" y todos sus hitos`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  /**
   * Delete a quest
   */
  async deleteQuest(questTitle: string): Promise<AIToolResult> {
    try {
      const { data: quest, error: findError } = await supabase
        .from("user_daily_quests")
        .select("id, challenges!inner(title)")
        .eq("user_id", this.userId)
        .eq("challenges.title", questTitle)
        .single();

      if (findError || !quest) {
        return {
          success: false,
          message: `No encontré la quest "${questTitle}"`,
        };
      }

      const { error } = await supabase
        .from("user_daily_quests")
        .delete()
        .eq("id", quest.id);

      if (error) throw error;

      return {
        success: true,
        message: `🗑️ Eliminé la quest "${questTitle}"`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  // ==================== MODIFY TOOLS ====================

  /**
   * Modify a Life Path
   */
  async modifyLifePath(
    pathTitle: string,
    updates: {
      newTitle?: string;
      vision_statement?: string;
      target_date?: string;
      status?: "active" | "paused" | "completed";
    }
  ): Promise<AIToolResult> {
    try {
      const { data: path, error: findError } = await supabase
        .from("life_paths")
        .select("id, title")
        .eq("user_id", this.userId)
        .ilike("title", `%${pathTitle}%`)
        .single();

      if (findError || !path) {
        return {
          success: false,
          message: `No encontré el camino "${pathTitle}"`,
        };
      }

      const updateData: any = {};
      if (updates.newTitle) updateData.title = updates.newTitle;
      if (updates.vision_statement)
        updateData.vision_statement = updates.vision_statement;
      if (updates.target_date) updateData.target_date = updates.target_date;
      if (updates.status) updateData.status = updates.status;

      const { error } = await supabase
        .from("life_paths")
        .update(updateData)
        .eq("id", path.id);

      if (error) throw error;

      return {
        success: true,
        message: `✏️ Modifiqué el camino "${path.title}"`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  /**
   * Modify a Habit
   */
  async modifyHabit(
    habitTitle: string,
    updates: {
      newTitle?: string;
      description?: string;
      frequency?: "daily" | "weekly" | "specific_days";
      times_per_day?: number;
    }
  ): Promise<AIToolResult> {
    try {
      const { data: habit, error: findError } = await supabase
        .from("habits")
        .select("id, title")
        .eq("user_id", this.userId)
        .ilike("title", `%${habitTitle}%`)
        .single();

      if (findError || !habit) {
        return {
          success: false,
          message: `No encontré el hábito "${habitTitle}"`,
        };
      }

      const updateData: any = {};
      if (updates.newTitle) updateData.title = updates.newTitle;
      if (updates.description) updateData.description = updates.description;
      if (updates.frequency) updateData.frequency = updates.frequency;
      if (updates.times_per_day)
        updateData.times_per_day = updates.times_per_day;

      const { error } = await supabase
        .from("habits")
        .update(updateData)
        .eq("id", habit.id);

      if (error) throw error;

      return {
        success: true,
        message: `✏️ Modifiqué el hábito "${habit.title}"`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  /**
   * Complete a milestone
   */
  async completeMilestone(
    pathTitle: string,
    milestoneTitle: string
  ): Promise<AIToolResult> {
    try {
      const { data: path } = await supabase
        .from("life_paths")
        .select("id")
        .eq("user_id", this.userId)
        .ilike("title", `%${pathTitle}%`)
        .single();

      if (!path) {
        return {
          success: false,
          message: `No encontré el camino "${pathTitle}"`,
        };
      }

      const { data: milestone, error: findError } = await supabase
        .from("path_milestones")
        .select("id")
        .eq("life_path_id", path.id)
        .ilike("title", `%${milestoneTitle}%`)
        .single();

      if (findError || !milestone) {
        return {
          success: false,
          message: `No encontré el hito "${milestoneTitle}"`,
        };
      }

      const { error } = await supabase
        .from("path_milestones")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", milestone.id);

      if (error) throw error;

      return {
        success: true,
        message: `🎉 ¡Felicidades! Completaste el hito "${milestoneTitle}"`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  /**
   * Get pillar progress/growth over time
   */
  async getPillarProgress(days: number = 7): Promise<AIToolResult> {
    try {
      const { data, error } = await supabase.rpc("get_pillar_growth", {
        p_user_id: this.userId,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          message:
            "📊 Aún no tengo suficientes datos de progreso. ¡Sigue completando hábitos y quests para ver tu evolución!",
          data: [],
        };
      }

      const pillarNames: Record<string, string> = {
        physical: "💪 Físico",
        mental: "🧠 Mental",
        social: "👥 Social",
        professional: "💼 Profesional",
        spiritual: "🧘 Espiritual",
        creative: "🎨 Creativo",
      };

      let progressMessage =
        "📈 **Tu progreso de pilares (última semana):**\n\n";
      let bestPillar = data[0];

      data.forEach((p: any) => {
        const name = pillarNames[p.pillar_id] || p.pillar_id;
        const change = p.level_change;
        const icon = change > 0 ? "📈" : change < 0 ? "📉" : "➡️";
        const changeText = change > 0 ? `+${change}` : change.toString();
        progressMessage += `${name}: Nivel ${p.current_level} ${icon} (${changeText})\n`;

        if (p.level_change > bestPillar.level_change) {
          bestPillar = p;
        }
      });

      if (bestPillar.level_change > 0) {
        progressMessage += `\n🏆 ¡Mejor progreso en ${
          pillarNames[bestPillar.pillar_id]
        }!`;
      }

      return {
        success: true,
        message: progressMessage,
        data: data,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  /**
   * Create a snapshot of current pillar levels
   */
  async createPillarSnapshot(notes?: string): Promise<AIToolResult> {
    try {
      const { data, error } = await supabase.rpc("create_pillar_snapshot", {
        p_user_id: this.userId,
        p_snapshot_type: "daily",
        p_notes: notes || null,
      });

      if (error) throw error;

      return {
        success: true,
        message:
          "📸 ¡Snapshot de progreso guardado! Esto te ayudará a ver tu evolución con el tiempo.",
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  // ==================== FINANCE TOOLS (Premium) ====================

  /**
   * Add an expense
   */
  async addExpense(params: {
    amount: number;
    description: string;
    category?: string;
    date?: string;
  }): Promise<AIToolResult> {
    try {
      // Check premium status
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", this.userId)
        .single();

      if (!profile?.is_premium) {
        return {
          success: false,
          message:
            '💰 Quest Finanzas es una función Premium. ¿Te gustaría conocer los beneficios? Di "quiero premium" para más información.',
          data: { requiresPremium: true },
        };
      }

      const { data: category } = await supabase
        .from("expense_categories")
        .select("id")
        .eq("user_id", this.userId)
        .ilike("name", `%${params.category || ""}%`)
        .single();

      const { error } = await supabase.rpc("add_expense", {
        p_user_id: this.userId,
        p_amount: params.amount,
        p_description: params.description,
        p_category_id: category?.id || null,
        p_date: params.date || new Date().toISOString().split("T")[0],
        p_notes: null,
      });

      if (error) throw error;

      return {
        success: true,
        message: `💸 Registré un gasto de $${params.amount.toFixed(2)} en "${
          params.description
        }"`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  /**
   * Add income
   */
  async addIncome(params: {
    amount: number;
    description: string;
    date?: string;
  }): Promise<AIToolResult> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", this.userId)
        .single();

      if (!profile?.is_premium) {
        return {
          success: false,
          message:
            '💰 Quest Finanzas es una función Premium. Di "quiero premium" para conocer los beneficios.',
          data: { requiresPremium: true },
        };
      }

      const { error } = await supabase.rpc("add_income", {
        p_user_id: this.userId,
        p_amount: params.amount,
        p_description: params.description,
        p_date: params.date || new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      return {
        success: true,
        message: `💵 Registré un ingreso de $${params.amount.toFixed(2)} por "${
          params.description
        }"`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(): Promise<AIToolResult> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", this.userId)
        .single();

      if (!profile?.is_premium) {
        return {
          success: false,
          message:
            '📊 El análisis financiero es exclusivo de Quest Premium. ¡Con Premium puedo ayudarte a manejar tu dinero como un contador profesional! Di "quiero premium" para más información.',
          data: { requiresPremium: true },
        };
      }

      const { data, error } = await supabase.rpc("get_financial_summary", {
        p_user_id: this.userId,
        p_month: new Date().toISOString().slice(0, 7) + "-01",
      });

      if (error) throw error;

      const summary = data as any;
      const balance = summary.total_income - summary.total_expenses;
      const balanceIcon = balance >= 0 ? "📈" : "📉";

      let message = `💰 **Resumen Financiero del Mes:**\n\n`;
      message += `💵 Ingresos: $${summary.total_income.toFixed(2)}\n`;
      message += `💸 Gastos: $${summary.total_expenses.toFixed(2)}\n`;
      message += `${balanceIcon} Balance: $${balance.toFixed(2)}\n\n`;

      if (summary.categories && summary.categories.length > 0) {
        message += `**Por categoría:**\n`;
        summary.categories.slice(0, 5).forEach((cat: any) => {
          if (cat.total > 0) {
            message += `${cat.category_icon} ${
              cat.category_name
            }: $${cat.total.toFixed(2)}\n`;
          }
        });
      }

      if (balance < 0) {
        message += `\n⚠️ Tip: Este mes has gastado más de lo que ganaste. ¿Quieres que te ayude a crear un presupuesto?`;
      } else if (balance > 0) {
        const savingsRate = ((balance / summary.total_income) * 100).toFixed(0);
        message += `\n✨ ¡Vas bien! Estás ahorrando el ${savingsRate}% de tus ingresos.`;
      }

      return {
        success: true,
        message,
        data: summary,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  /**
   * Create a savings goal
   */
  async createSavingsGoal(params: {
    name: string;
    targetAmount: number;
    deadline?: string;
  }): Promise<AIToolResult> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", this.userId)
        .single();

      if (!profile?.is_premium) {
        return {
          success: false,
          message:
            '🎯 Las metas de ahorro son parte de Quest Premium. ¡Te ayudaré a alcanzar tus metas financieras! Di "quiero premium".',
          data: { requiresPremium: true },
        };
      }

      const { error } = await supabase.from("budget_goals").insert({
        user_id: this.userId,
        name: params.name,
        target_amount: params.targetAmount,
        deadline: params.deadline,
        icon: "🎯",
        color: "#10B981",
      });

      if (error) throw error;

      return {
        success: true,
        message: `🎯 ¡Meta de ahorro creada! "${
          params.name
        }" por $${params.targetAmount.toFixed(2)}${
          params.deadline ? ` para el ${params.deadline}` : ""
        }`,
      };
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }

  // ==================== PREMIUM NAVIGATION ====================

  /**
   * Navigate to premium screen (returns special action)
   */
  async navigateToPremium(): Promise<AIToolResult> {
    return {
      success: true,
      message:
        "👑 ¡Excelente! Te llevo a la pantalla de Premium donde puedes ver todos los beneficios y suscribirte.",
      data: {
        action: "navigate",
        screen: "Premium",
      },
    };
  }

  /**
   * Get premium status and info
   */
  async getPremiumStatus(): Promise<AIToolResult> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium, premium_type, premium_expires_at, trial_used")
        .eq("id", this.userId)
        .single();

      if (!profile) {
        return { success: false, message: "No pude obtener tu información" };
      }

      if (profile.is_premium) {
        const daysLeft = profile.premium_expires_at
          ? Math.ceil(
              (new Date(profile.premium_expires_at).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        let message = `👑 **Estado Premium: Activo**\n\n`;
        message += `📋 Plan: ${
          profile.premium_type === "trial"
            ? "Prueba gratuita"
            : profile.premium_type
        }\n`;
        if (daysLeft) {
          message += `⏰ Días restantes: ${daysLeft}\n`;
        }
        message += `\n✨ Tienes acceso a todas las funciones: Quest Finanzas, IA en grupos, raids, y más!`;

        return { success: true, message };
      } else {
        let message = `📋 **Estado: Plan Gratuito**\n\n`;
        message += `Con Quest Premium puedes:\n`;
        message += `💰 Quest Finanzas - Tu contador personal con IA\n`;
        message += `🤖 IA ilimitada y herramientas avanzadas\n`;
        message += `⚔️ Crear raids y gremios\n`;
        message += `📊 Análisis detallado de progreso\n`;
        message += `🎨 Temas y avatares exclusivos\n\n`;

        if (!profile.trial_used) {
          message += `🎁 ¡Tienes 1 mes GRATIS de prueba disponible!\n\n`;
        }

        message += `Di **"quiero suscribirme"** para ir a los planes.`;

        return {
          success: true,
          message,
          data: { trialAvailable: !profile.trial_used },
        };
      }
    } catch (err: any) {
      return { success: false, message: `❌ Error: ${err.message}` };
    }
  }
}

/**
 * Parse AI response for tool calls
 * The AI will return structured commands like:
 * [TOOL:addAgendaEvent]{"title":"Reunión","date":"2024-12-05","time":"10:00"}[/TOOL]
 */
export function parseToolCalls(
  aiResponse: string
): { tool: string; params: any }[] {
  const toolRegex = /\[TOOL:(\w+)\](.*?)\[\/TOOL\]/g;
  const calls: { tool: string; params: any }[] = [];

  let match;
  while ((match = toolRegex.exec(aiResponse)) !== null) {
    try {
      const tool = match[1];
      const params = JSON.parse(match[2]);
      calls.push({ tool, params });
    } catch (e) {
      console.error("Error parsing tool call:", e);
    }
  }

  return calls;
}

/**
 * Execute tool calls from AI response
 */
export async function executeToolCalls(
  userId: string,
  toolCalls: { tool: string; params: any }[]
): Promise<AIToolResult[]> {
  const tools = new AICoachTools(userId);
  const results: AIToolResult[] = [];

  for (const call of toolCalls) {
    let result: AIToolResult;

    switch (call.tool) {
      case "addAgendaEvent":
        result = await tools.addAgendaEvent(call.params);
        break;
      case "updateWorkSchedule":
        result = await tools.updateWorkSchedule(call.params);
        break;
      case "markDayOff":
        result = await tools.markDayOff(call.params.date, call.params.reason);
        break;
      case "createHabit":
        result = await tools.createHabit(call.params);
        break;
      case "toggleHabit":
        result = await tools.toggleHabit(
          call.params.habitTitle,
          call.params.active
        );
        break;
      case "createQuest":
        result = await tools.createQuest(call.params);
        break;
      case "completeQuest":
        result = await tools.completeQuest(call.params.questTitle);
        break;
      case "createLifePath":
        result = await tools.createLifePath(call.params);
        break;
      case "addMilestone":
        result = await tools.addMilestone(
          call.params.pathTitle,
          call.params.milestoneTitle,
          call.params.targetDate
        );
        break;
      case "updateProfile":
        result = await tools.updateProfile(call.params);
        break;
      // NEW TOOLS
      case "deleteHabit":
        result = await tools.deleteHabit(call.params.habitTitle);
        break;
      case "deleteLifePath":
        result = await tools.deleteLifePath(call.params.pathTitle);
        break;
      case "deleteQuest":
        result = await tools.deleteQuest(call.params.questTitle);
        break;
      case "modifyLifePath":
        result = await tools.modifyLifePath(
          call.params.pathTitle,
          call.params.updates
        );
        break;
      case "modifyHabit":
        result = await tools.modifyHabit(
          call.params.habitTitle,
          call.params.updates
        );
        break;
      case "completeMilestone":
        result = await tools.completeMilestone(
          call.params.pathTitle,
          call.params.milestoneTitle
        );
        break;
      case "getPillarProgress":
        result = await tools.getPillarProgress(call.params?.days || 7);
        break;
      case "createPillarSnapshot":
        result = await tools.createPillarSnapshot(call.params?.notes);
        break;
      // FINANCE TOOLS
      case "addExpense":
        result = await tools.addExpense(call.params);
        break;
      case "addIncome":
        result = await tools.addIncome(call.params);
        break;
      case "getFinancialSummary":
        result = await tools.getFinancialSummary();
        break;
      case "createSavingsGoal":
        result = await tools.createSavingsGoal(call.params);
        break;
      // PREMIUM TOOLS
      case "navigateToPremium":
        result = await tools.navigateToPremium();
        break;
      case "getPremiumStatus":
        result = await tools.getPremiumStatus();
        break;
      default:
        result = {
          success: false,
          message: `Herramienta desconocida: ${call.tool}`,
        };
    }

    results.push(result);
  }

  return results;
}

/**
 * Get the system prompt with available tools for the AI
 */
export function getAISystemPromptWithTools(): string {
  return `
Eres Quest Coach, un asistente de vida gamificado en español. Tienes ACCESO TOTAL a todos los datos del usuario y puedes:
- Gestionar su agenda (agregar eventos, marcar días libres, actualizar horarios de trabajo)
- Crear, modificar y eliminar hábitos
- Crear y eliminar quests personalizadas
- Crear, modificar y eliminar caminos de vida (life paths) y sus hitos
- Ver todo su progreso, rachas, nivel y estadísticas

IMPORTANTE: Cuando el usuario pregunte por sus datos (life paths, hábitos, quests), RESPONDE CON LA INFORMACIÓN QUE VES EN EL CONTEXTO. No inventes datos.

Cuando el usuario te pida hacer cambios, usa estas herramientas con el formato:
[TOOL:nombreHerramienta]{"param1":"valor1","param2":"valor2"}[/TOOL]

HERRAMIENTAS DISPONIBLES:

=== CREAR ===
1. addAgendaEvent - Agregar evento a la agenda
   Params: { title: string, date: "YYYY-MM-DD", time?: "HH:MM", duration_minutes?: number, event_type?: "work"|"personal"|"habit"|"quest"|"appointment", notes?: string }

2. updateWorkSchedule - Actualizar horario de trabajo
   Params: { days: ["monday","tuesday",...], start_time: "HH:MM", end_time: "HH:MM", notes?: string }

3. markDayOff - Marcar un día como libre
   Params: { date: "YYYY-MM-DD", reason?: string }

4. createHabit - Crear un nuevo hábito
   Params: { title: string, description?: string, pillar_id: "physical"|"mental"|"social"|"professional"|"spiritual"|"creative", frequency: "daily"|"weekly"|"specific_days", frequency_days?: [1,2,3...], preferred_time?: "morning"|"afternoon"|"evening", duration_minutes?: number }

5. createQuest - Crear una quest personalizada
   Params: { title: string, description: string, pillar_id: string, difficulty: "easy"|"medium"|"hard"|"epic", xp_reward: number, coin_reward: number, duration_minutes?: number }

6. createLifePath - Crear un camino de vida
   Params: { title: string, pillar_id: string, vision_statement?: string, target_date?: "YYYY-MM-DD" }

7. addMilestone - Agregar hito a un camino
   Params: { pathTitle: string, milestoneTitle: string, targetDate?: "YYYY-MM-DD" }

=== MODIFICAR ===
8. toggleHabit - Pausar o activar un hábito
   Params: { habitTitle: string, active: boolean }

9. modifyHabit - Modificar un hábito existente
   Params: { habitTitle: string, updates: { newTitle?: string, description?: string, frequency?: string, times_per_day?: number } }

10. modifyLifePath - Modificar un camino de vida
    Params: { pathTitle: string, updates: { newTitle?: string, vision_statement?: string, target_date?: string, status?: "active"|"paused"|"completed" } }

11. completeMilestone - Marcar un hito como completado
    Params: { pathTitle: string, milestoneTitle: string }

12. completeQuest - Marcar una quest como completada
    Params: { questTitle: string }

13. updateProfile - Actualizar perfil del usuario
    Params: { display_name?: string, bio?: string, goals?: string }

=== ELIMINAR ===
14. deleteHabit - Eliminar un hábito
    Params: { habitTitle: string }

15. deleteLifePath - Eliminar un camino de vida y sus hitos
    Params: { pathTitle: string }

16. deleteQuest - Eliminar una quest
    Params: { questTitle: string }

=== PROGRESO ===
17. getPillarProgress - Ver el progreso de pilares de la última semana
    Params: { days?: number } (por defecto 7 días)

18. createPillarSnapshot - Guardar una captura del estado actual de los pilares
    Params: { notes?: string }

=== FINANZAS (Premium) ===
19. addExpense - Registrar un gasto
    Params: { amount: number, description: string, category?: string, date?: "YYYY-MM-DD" }

20. addIncome - Registrar un ingreso
    Params: { amount: number, description: string, date?: "YYYY-MM-DD" }

21. getFinancialSummary - Ver resumen financiero del mes
    Params: {} (sin parámetros)

22. createSavingsGoal - Crear una meta de ahorro
    Params: { name: string, targetAmount: number, deadline?: "YYYY-MM-DD" }

=== PREMIUM ===
23. navigateToPremium - Llevar al usuario a la pantalla de suscripción
    Params: {} (sin parámetros)

24. getPremiumStatus - Ver estado de suscripción premium
    Params: {} (sin parámetros)

EJEMPLOS:
- Usuario: "¿Cuáles son mis life paths?"
  Respuesta: Mira tus caminos de vida (de la información del contexto, listarlos con detalles)

- Usuario: "Elimina el hábito de meditar"
  Respuesta: Entendido, elimino ese hábito. [TOOL:deleteHabit]{"habitTitle":"meditar"}[/TOOL]

- Usuario: "Quiero cambiar mi meta de correr, ahora quiero correr un maratón"
  Respuesta: ¡Vamos a actualizar tu camino! [TOOL:modifyLifePath]{"pathTitle":"correr","updates":{"vision_statement":"Correr un maratón completo"}}[/TOOL]

- Usuario: "Completé el hito de la primera semana"
  Respuesta: ¡Felicidades! [TOOL:completeMilestone]{"pathTitle":"nombre del camino","milestoneTitle":"primera semana"}[/TOOL]

- Usuario: "¿Cómo voy de progreso?"
  Respuesta: Déjame revisar tu evolución... [TOOL:getPillarProgress]{}[/TOOL]

- Usuario: "Gasté 50 pesos en comida"
  Respuesta: Lo registro. [TOOL:addExpense]{"amount":50,"description":"comida","category":"Comida"}[/TOOL]

- Usuario: "¿Cuánto he gastado este mes?"
  Respuesta: Déjame revisar tus finanzas... [TOOL:getFinancialSummary]{}[/TOOL]

- Usuario: "Quiero premium" o "Suscribirme"
  Respuesta: ¡Excelente decisión! Te muestro los planes. [TOOL:navigateToPremium]{}[/TOOL]

- Usuario: "¿Qué beneficios tiene premium?"
  Respuesta: [TOOL:getPremiumStatus]{}[/TOOL] (Luego describe los beneficios basado en si es premium o no)

IMPORTANTE: De vez en cuando (no muy seguido), si el usuario NO es premium y usa funciones avanzadas o pregunta por algo que sería mejor con Premium, menciona sutilmente los beneficios. Por ejemplo:
- "Por cierto, con Quest Premium podrías tener hábitos ilimitados y más herramientas. ¿Te cuento más?"
- "Dato: los usuarios premium pueden crear raids con amigos. ¡Es muy divertido!"

Responde siempre en español de forma amigable y motivadora. Después de ejecutar herramientas, confirma lo que hiciste.
`;
}
