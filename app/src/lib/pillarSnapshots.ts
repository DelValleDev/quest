/**
 * Pillar Snapshots Service
 * Tracks and visualizes pillar level progress over time
 */

import { supabase } from "./supabase";

// Types
export interface PillarSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  physical_level: number;
  physical_xp: number;
  mental_level: number;
  mental_xp: number;
  social_level: number;
  social_xp: number;
  professional_level: number;
  professional_xp: number;
  spiritual_level: number;
  spiritual_xp: number;
  creative_level: number;
  creative_xp: number;
  total_level: number;
  average_level: number;
  user_level: number;
  user_total_xp: number;
  current_streak: number;
  snapshot_type: "daily" | "weekly" | "monthly" | "milestone";
  notes?: string;
  created_at: string;
}

export interface PillarGrowth {
  pillar_id: string;
  current_level: number;
  previous_level: number;
  level_change: number;
  growth_percentage: number;
}

export interface ChartDataPoint {
  date: string;
  physical: number;
  mental: number;
  social: number;
  professional: number;
  spiritual: number;
  creative: number;
  total: number;
  average: number;
}

const PILLAR_COLORS: Record<string, string> = {
  physical: "#EF4444",
  mental: "#3B82F6",
  social: "#F59E0B",
  professional: "#10B981",
  spiritual: "#8B5CF6",
  creative: "#EC4899",
};

const PILLAR_ICONS: Record<string, string> = {
  physical: "💪",
  mental: "🧠",
  social: "👥",
  professional: "💼",
  spiritual: "🧘",
  creative: "🎨",
};

const PILLAR_NAMES: Record<string, string> = {
  physical: "Physical",
  mental: "Mental",
  social: "Social",
  professional: "Professional",
  spiritual: "Spiritual",
  creative: "Creative",
};

export class PillarSnapshotService {
  /**
   * Create a daily snapshot of current pillar levels
   */
  static async createDailySnapshot(
    userId: string,
    notes?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc("create_pillar_snapshot", {
        p_user_id: userId,
        p_snapshot_type: "daily",
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating snapshot:", error);
      return null;
    }
  }

  /**
   * Create a milestone snapshot (e.g., when reaching a new level)
   */
  static async createMilestoneSnapshot(
    userId: string,
    notes: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc("create_pillar_snapshot", {
        p_user_id: userId,
        p_snapshot_type: "milestone",
        p_notes: notes,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating milestone snapshot:", error);
      return null;
    }
  }

  /**
   * Get pillar history for charts
   */
  static async getPillarHistory(
    userId: string,
    days: number = 30
  ): Promise<ChartDataPoint[]> {
    try {
      const { data, error } = await supabase.rpc("get_pillar_history", {
        p_user_id: userId,
        p_days: days,
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        date: row.snapshot_date,
        physical: row.physical_level,
        mental: row.mental_level,
        social: row.social_level,
        professional: row.professional_level,
        spiritual: row.spiritual_level,
        creative: row.creative_level,
        total: row.total_level,
        average: parseFloat(row.average_level),
      }));
    } catch (error) {
      console.error("Error fetching pillar history:", error);
      return [];
    }
  }

  /**
   * Get growth comparison (this week vs last week)
   */
  static async getPillarGrowth(userId: string): Promise<PillarGrowth[]> {
    try {
      const { data, error } = await supabase.rpc("get_pillar_growth", {
        p_user_id: userId,
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        pillar_id: row.pillar_id,
        current_level: row.current_level,
        previous_level: row.previous_level,
        level_change: row.level_change,
        growth_percentage: parseFloat(row.growth_percentage),
      }));
    } catch (error) {
      console.error("Error fetching pillar growth:", error);
      return [];
    }
  }

  /**
   * Get all snapshots for a user (raw data)
   */
  static async getSnapshots(
    userId: string,
    limit: number = 30,
    type?: "daily" | "weekly" | "monthly" | "milestone"
  ): Promise<PillarSnapshot[]> {
    try {
      let query = supabase
        .from("pillar_level_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq("snapshot_type", type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      return [];
    }
  }

  /**
   * Get the latest snapshot for comparison
   */
  static async getLatestSnapshot(
    userId: string
  ): Promise<PillarSnapshot | null> {
    try {
      const { data, error } = await supabase
        .from("pillar_level_snapshots")
        .select("*")
        .eq("user_id", userId)
        .eq("snapshot_type", "daily")
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    } catch (error) {
      console.error("Error fetching latest snapshot:", error);
      return null;
    }
  }

  /**
   * Check if we need to create today's snapshot
   */
  static async needsSnapshot(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0];

    try {
      const { data, error } = await supabase
        .from("pillar_level_snapshots")
        .select("id")
        .eq("user_id", userId)
        .eq("snapshot_date", today)
        .eq("snapshot_type", "daily")
        .limit(1);

      if (error) throw error;
      return !data || data.length === 0;
    } catch (error) {
      console.error("Error checking snapshot status:", error);
      return true; // Create snapshot on error
    }
  }

  /**
   * Ensure daily snapshot exists for today
   */
  static async ensureDailySnapshot(userId: string): Promise<void> {
    const needsSnapshot = await this.needsSnapshot(userId);
    if (needsSnapshot) {
      await this.createDailySnapshot(userId);
    }
  }

  /**
   * Get stats summary for a time period
   */
  static async getStatsSummary(
    userId: string,
    days: number = 7
  ): Promise<{
    totalLevelGain: number;
    bestPillar: { id: string; gain: number } | null;
    worstPillar: { id: string; gain: number } | null;
    averageGrowth: number;
    streakChange: number;
  }> {
    const history = await this.getPillarHistory(userId, days);

    if (history.length < 2) {
      return {
        totalLevelGain: 0,
        bestPillar: null,
        worstPillar: null,
        averageGrowth: 0,
        streakChange: 0,
      };
    }

    const first = history[0];
    const last = history[history.length - 1];

    const pillarGains = [
      { id: "physical", gain: last.physical - first.physical },
      { id: "mental", gain: last.mental - first.mental },
      { id: "social", gain: last.social - first.social },
      { id: "professional", gain: last.professional - first.professional },
      { id: "spiritual", gain: last.spiritual - first.spiritual },
      { id: "creative", gain: last.creative - first.creative },
    ];

    const sorted = [...pillarGains].sort((a, b) => b.gain - a.gain);
    const totalGain = pillarGains.reduce((sum, p) => sum + p.gain, 0);

    return {
      totalLevelGain: last.total - first.total,
      bestPillar: sorted[0].gain > 0 ? sorted[0] : null,
      worstPillar: sorted[sorted.length - 1],
      averageGrowth: totalGain / 6,
      streakChange: 0, // Could calculate from snapshots
    };
  }

  /**
   * Format growth for display
   */
  static formatGrowth(change: number): { text: string; color: string } {
    if (change > 0) {
      return { text: `+${change}`, color: "#10B981" };
    } else if (change < 0) {
      return { text: `${change}`, color: "#EF4444" };
    }
    return { text: "0", color: "#6B7280" };
  }

  /**
   * Get pillar info helpers
   */
  static getPillarColor(pillarId: string): string {
    return PILLAR_COLORS[pillarId] || "#6B7280";
  }

  static getPillarIcon(pillarId: string): string {
    return PILLAR_ICONS[pillarId] || "📊";
  }

  static getPillarName(pillarId: string): string {
    return PILLAR_NAMES[pillarId] || pillarId;
  }

  /**
   * Prepare data for line chart visualization
   */
  static prepareChartData(
    history: ChartDataPoint[],
    selectedPillars: string[] = [
      "physical",
      "mental",
      "social",
      "professional",
      "spiritual",
      "creative",
    ]
  ): {
    labels: string[];
    datasets: Array<{
      data: number[];
      color: string;
      label: string;
    }>;
  } {
    const labels = history.map((h) => {
      const date = new Date(h.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const datasets = selectedPillars.map((pillarId) => ({
      data: history.map((h) => (h as any)[pillarId] || 0),
      color: PILLAR_COLORS[pillarId],
      label: PILLAR_NAMES[pillarId],
    }));

    return { labels, datasets };
  }
}

export default PillarSnapshotService;
