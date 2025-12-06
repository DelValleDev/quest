/**
 * Strava Integration
 *
 * Connect with Strava to automatically import:
 * - Running/cycling workouts
 * - Distance, pace, calories
 * - Create quests based on activities
 *
 * OAuth Flow: https://developers.strava.com/docs/authentication/
 */

import { supabase } from "../supabase";

export interface StravaActivity {
  id: number;
  name: string;
  type: "Run" | "Ride" | "Swim" | "Walk" | "Hike" | "Other";
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  start_date: string;
  start_date_local: string;
  average_speed: number; // meters/second
  max_speed: number;
  calories: number;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
}

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
}

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID || "";
const STRAVA_CLIENT_SECRET = process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET || "";
const REDIRECT_URI = "questapp://strava-callback";

/**
 * Get Strava OAuth URL
 */
export const getStravaAuthUrl = (): string => {
  const scope = "activity:read_all,activity:write";
  return `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}`;
};

/**
 * Exchange code for tokens
 */
export const exchangeStravaCode = async (
  code: string
): Promise<StravaTokens> => {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Strava code");
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
};

/**
 * Refresh access token
 */
export const refreshStravaToken = async (
  refreshToken: string
): Promise<StravaTokens> => {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Strava token");
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
};

/**
 * Get user's Strava activities
 */
export const getStravaActivities = async (
  accessToken: string,
  after?: number, // Unix timestamp
  perPage: number = 30
): Promise<StravaActivity[]> => {
  const url = new URL("https://www.strava.com/api/v3/athlete/activities");
  url.searchParams.append("per_page", perPage.toString());
  if (after) {
    url.searchParams.append("after", after.toString());
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Strava activities");
  }

  return response.json();
};

/**
 * Save Strava tokens to database
 */
export const saveStravaTokens = async (
  userId: string,
  tokens: StravaTokens
): Promise<void> => {
  const { error } = await supabase.from("user_integrations").upsert({
    user_id: userId,
    integration_type: "strava",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    is_active: true,
  });

  if (error) throw error;
};

/**
 * Get Strava tokens from database
 */
export const getStravaTokens = async (
  userId: string
): Promise<StravaTokens | null> => {
  const { data, error } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("integration_type", "strava")
    .eq("is_active", true)
    .single();

  if (error || !data) return null;

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(data.expires_at).getTime() / 1000,
  };
};

/**
 * Check if token is expired and refresh if needed
 */
export const ensureValidStravaToken = async (
  userId: string
): Promise<string | null> => {
  const tokens = await getStravaTokens(userId);
  if (!tokens) return null;

  const now = Math.floor(Date.now() / 1000);

  // Token expires in less than 1 hour, refresh it
  if (tokens.expires_at - now < 3600) {
    const newTokens = await refreshStravaToken(tokens.refresh_token);
    await saveStravaTokens(userId, newTokens);
    return newTokens.access_token;
  }

  return tokens.access_token;
};

/**
 * Sync recent Strava activities to Quest
 * Creates automatic quests/habits based on workouts
 */
export const syncStravaActivities = async (userId: string): Promise<number> => {
  const accessToken = await ensureValidStravaToken(userId);
  if (!accessToken) {
    throw new Error("No valid Strava token found");
  }

  // Get activities from last 7 days
  const sevenDaysAgo = Math.floor(
    (Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000
  );
  const activities = await getStravaActivities(accessToken, sevenDaysAgo);

  let synced = 0;

  for (const activity of activities) {
    // Check if already synced
    const { data: existing } = await supabase
      .from("user_activity_imports")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "strava")
      .eq("external_id", activity.id.toString())
      .single();

    if (existing) continue;

    // Save activity
    await supabase.from("user_activity_imports").insert({
      user_id: userId,
      source: "strava",
      external_id: activity.id.toString(),
      activity_type: activity.type.toLowerCase(),
      distance_meters: activity.distance,
      duration_seconds: activity.moving_time,
      calories: activity.calories,
      date: activity.start_date_local,
      metadata: {
        name: activity.name,
        average_speed: activity.average_speed,
        elevation_gain: activity.total_elevation_gain,
        heartrate: activity.average_heartrate,
      },
    });

    // Auto-complete related habit if exists
    const habitType =
      activity.type === "Run"
        ? "running"
        : activity.type === "Ride"
        ? "cycling"
        : activity.type === "Swim"
        ? "swimming"
        : null;

    if (habitType) {
      const { data: habit } = await supabase
        .from("user_habits")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", `%${habitType}%`)
        .eq("is_active", true)
        .single();

      if (habit) {
        const activityDate = new Date(activity.start_date_local)
          .toISOString()
          .split("T")[0];
        await supabase.from("user_habit_completions").upsert({
          user_id: userId,
          habit_id: habit.id,
          completion_date: activityDate,
          notes: `Auto-synced from Strava: ${activity.name}`,
        });
      }
    }

    synced++;
  }

  return synced;
};

/**
 * Disconnect Strava
 */
export const disconnectStrava = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from("user_integrations")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("integration_type", "strava");

  if (error) throw error;
};
