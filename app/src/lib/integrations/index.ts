/**
 * Integrations Hub
 *
 * Central management for all external integrations:
 * - Strava (workouts)
 * - Apple Health / Google Fit (health data)
 * - Spotify (music tracking)
 * - GitHub (commits for devs)
 * - Todoist (task sync)
 * - Google Calendar (events)
 * - Notion (databases)
 */

import { supabase } from "../supabase";
import * as Strava from "./strava";
import * as Spotify from "./spotify";
import * as GitHub from "./github";
import {
  getWeeklyHealthSummary,
  requestHealthPermissions,
  syncHealthDataToSupabase,
} from "../healthKit";

export type IntegrationType =
  | "strava"
  | "apple_health"
  | "google_fit"
  | "spotify"
  | "github"
  | "todoist"
  | "google_calendar"
  | "notion";

export interface Integration {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  is_connected: boolean;
  last_synced?: string;
  requires_oauth: boolean;
  benefits: string[];
  premium_only?: boolean;
}

export interface IntegrationStatus {
  user_id: string;
  integration_type: IntegrationType;
  is_active: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  last_synced_at?: string;
  sync_count: number;
  metadata?: any;
}

/**
 * Get all available integrations with connection status
 */
export const getAvailableIntegrations = async (
  userId: string
): Promise<Integration[]> => {
  // Get user's active integrations
  const { data: userIntegrations } = await supabase
    .from("user_integrations")
    .select("integration_type, is_active, last_synced_at")
    .eq("user_id", userId);

  const connected = new Map(
    (userIntegrations || []).map((i) => [
      i.integration_type,
      {
        active: i.is_active,
        lastSynced: i.last_synced_at,
      },
    ])
  );

  const integrations: Integration[] = [
    {
      type: "strava",
      name: "Strava",
      description: "Auto-sync your runs, rides, and workouts",
      icon: "🏃",
      is_connected: connected.get("strava")?.active || false,
      last_synced: connected.get("strava")?.lastSynced,
      requires_oauth: true,
      benefits: [
        "Automatically complete fitness habits",
        "Track running/cycling distance",
        "Import workout data as Quest XP",
        "Create challenges based on your routes",
      ],
    },
    {
      type: "apple_health",
      name: "Apple Health",
      description: "Import steps, sleep, heart rate, and more",
      icon: "❤️",
      is_connected: connected.get("apple_health")?.active || false,
      last_synced: connected.get("apple_health")?.lastSynced,
      requires_oauth: false,
      benefits: [
        "Track daily steps automatically",
        "Monitor sleep quality",
        "Sync workouts and active calories",
        "Complete physical pillar quests",
      ],
    },
    {
      type: "google_fit",
      name: "Google Fit",
      description: "Sync fitness data from Android",
      icon: "🤖",
      is_connected: connected.get("google_fit")?.active || false,
      last_synced: connected.get("google_fit")?.lastSynced,
      requires_oauth: false,
      benefits: [
        "Track daily steps automatically",
        "Monitor activity levels",
        "Sync workouts",
        "Complete physical pillar quests",
      ],
    },
    {
      type: "spotify",
      name: "Spotify",
      description: "Track music listening habits",
      icon: "🎵",
      is_connected: connected.get("spotify")?.active || false,
      last_synced: connected.get("spotify")?.lastSynced,
      requires_oauth: true,
      premium_only: true,
      benefits: [
        "Track time spent listening to uplifting music",
        "Create quests around music curation",
        "Identify music that aligns with your values",
        "Get insights on your listening patterns",
      ],
    },
    {
      type: "github",
      name: "GitHub",
      description: "Track coding activity and commits",
      icon: "💻",
      is_connected: connected.get("github")?.active || false,
      last_synced: connected.get("github")?.lastSynced,
      requires_oauth: true,
      benefits: [
        "Auto-complete programming habits",
        "Track daily commit streaks",
        "Create coding challenges",
        "Monitor professional pillar growth",
      ],
    },
    {
      type: "todoist",
      name: "Todoist",
      description: "Sync tasks between Quest and Todoist",
      icon: "✅",
      is_connected: connected.get("todoist")?.active || false,
      last_synced: connected.get("todoist")?.lastSynced,
      requires_oauth: true,
      premium_only: true,
      benefits: [
        "Two-way task sync",
        "Complete Todoist tasks as Quest challenges",
        "Never duplicate your task management",
        "Keep everything in one ecosystem",
      ],
    },
    {
      type: "google_calendar",
      name: "Google Calendar",
      description: "Import events as scheduled quests",
      icon: "📅",
      is_connected: connected.get("google_calendar")?.active || false,
      last_synced: connected.get("google_calendar")?.lastSynced,
      requires_oauth: true,
      premium_only: true,
      benefits: [
        "Turn calendar events into quests",
        "Auto-schedule time blocks",
        "Track time spent on activities",
        "Better time management insights",
      ],
    },
    {
      type: "notion",
      name: "Notion",
      description: "Sync databases and tasks",
      icon: "📝",
      is_connected: connected.get("notion")?.active || false,
      last_synced: connected.get("notion")?.lastSynced,
      requires_oauth: true,
      premium_only: true,
      benefits: [
        "Sync Notion databases with Quest",
        "Import tasks from Notion pages",
        "Keep your second brain connected",
        "Unified productivity system",
      ],
    },
  ];

  return integrations;
};

/**
 * Connect an integration
 */
export const connectIntegration = async (
  userId: string,
  type: IntegrationType
): Promise<{ success: boolean; authUrl?: string; message: string }> => {
  switch (type) {
    case "strava":
      const authUrl = Strava.getStravaAuthUrl();
      return {
        success: true,
        authUrl,
        message: "Redirecting to Strava authorization...",
      };

    case "apple_health":
    case "google_fit":
      try {
        const permissions = await requestHealthPermissions();
        const granted = Object.values(permissions).some((p) => p);

        if (granted) {
          await supabase.from("user_integrations").upsert({
            user_id: userId,
            integration_type: type,
            is_active: true,
          });

          // Do initial sync
          const today = new Date().toISOString().split("T")[0];
          await syncHealthDataToSupabase(userId, today);

          return {
            success: true,
            message: "Health data connected successfully!",
          };
        } else {
          return {
            success: false,
            message: "No health permissions granted",
          };
        }
      } catch (error) {
        return {
          success: false,
          message: "Failed to connect health data",
        };
      }

    case "spotify":
      const spotifyAuthUrl = Spotify.getSpotifyAuthUrl();
      return {
        success: true,
        authUrl: spotifyAuthUrl,
        message: "Redirecting to Spotify authorization...",
      };

    case "github":
      const githubAuthUrl = GitHub.getGitHubAuthUrl();
      return {
        success: true,
        authUrl: githubAuthUrl,
        message: "Redirecting to GitHub authorization...",
      };

    case "todoist":
    case "google_calendar":
    case "notion":
      return {
        success: false,
        message: `${type} integration coming soon! 🚀`,
      };

    default:
      return {
        success: false,
        message: "Unknown integration type",
      };
  }
};

/**
 * Disconnect an integration
 */
export const disconnectIntegration = async (
  userId: string,
  type: IntegrationType
): Promise<boolean> => {
  const { error } = await supabase
    .from("user_integrations")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("integration_type", type);

  return !error;
};

/**
 * Sync all active integrations
 */
export const syncAllIntegrations = async (
  userId: string
): Promise<{
  synced: number;
  errors: string[];
}> => {
  const { data: activeIntegrations } = await supabase
    .from("user_integrations")
    .select("integration_type")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!activeIntegrations || activeIntegrations.length === 0) {
    return { synced: 0, errors: [] };
  }

  let synced = 0;
  const errors: string[] = [];

  for (const integration of activeIntegrations) {
    try {
      switch (integration.integration_type) {
        case "strava":
          await Strava.syncStravaActivities(userId);
          synced++;
          break;

        case "apple_health":
        case "google_fit":
          const today = new Date().toISOString().split("T")[0];
          await syncHealthDataToSupabase(userId, today);
          synced++;
          break;

        case "spotify":
          await Spotify.syncSpotifyActivity(userId);
          synced++;
          break;

        case "github":
          await GitHub.syncGitHubActivity(userId);
          synced++;
          break;

        case "todoist":
        case "google_calendar":
        case "notion":
          // TODO: Implement these
          break;
      }

      // Update last synced timestamp
      await supabase
        .from("user_integrations")
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("integration_type", integration.integration_type);
    } catch (error) {
      errors.push(`${integration.integration_type}: ${error}`);
    }
  }

  return { synced, errors };
};

/**
 * Get sync history for an integration
 */
export const getIntegrationHistory = async (
  userId: string,
  type: IntegrationType,
  limit: number = 50
): Promise<any[]> => {
  const { data } = await supabase
    .from("user_activity_imports")
    .select("*")
    .eq("user_id", userId)
    .eq("source", type)
    .order("date", { ascending: false })
    .limit(limit);

  return data || [];
};
