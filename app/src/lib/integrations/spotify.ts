/**
 * Spotify Integration
 *
 * OAuth flow, track listening habits, create music-based quests
 *
 * Use cases:
 * - Track time listening to uplifting/motivational music
 * - Create quests: "Listen to meditation playlist for 30 min"
 * - Detect bad habits: excessive sad music when depressed
 * - Create curation quests: "Remove 5 songs that don't align with your values"
 */

import { supabase } from "../supabase";

// Spotify OAuth config (store in env)
const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET =
  process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET || "";
const REDIRECT_URI = "quest://spotify-callback"; // Deep link

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration_ms: number;
  played_at: string;
}

export interface SpotifyAudioFeatures {
  valence: number; // 0.0-1.0 (happiness)
  energy: number; // 0.0-1.0
  danceability: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
}

export interface SpotifyListeningInsights {
  total_listening_minutes_today: number;
  top_genres: string[];
  mood_score: number; // 0-100 based on valence
  energy_level: number; // 0-100
  most_played_today: SpotifyTrack[];
}

/**
 * Generate Spotify OAuth URL
 */
export const getSpotifyAuthUrl = (): string => {
  const scopes = [
    "user-read-recently-played",
    "user-read-playback-state",
    "user-top-read",
    "playlist-read-private",
    "playlist-modify-public",
    "playlist-modify-private",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: scopes,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for tokens
 */
export const exchangeSpotifyCode = async (
  code: string
): Promise<SpotifyTokens> => {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Spotify code");
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
  };
};

/**
 * Refresh Spotify access token
 */
export const refreshSpotifyToken = async (
  refreshToken: string
): Promise<SpotifyTokens> => {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Spotify token");
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken, // Sometimes not returned
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
  };
};

/**
 * Get recently played tracks (last 50)
 */
export const getRecentlyPlayed = async (
  accessToken: string,
  after?: number // Unix timestamp in ms
): Promise<SpotifyTrack[]> => {
  const params = new URLSearchParams({
    limit: "50",
    ...(after && { after: after.toString() }),
  });

  const response = await fetch(
    `https://api.spotify.com/v1/me/player/recently-played?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch recently played tracks");
  }

  const data = await response.json();
  return data.items.map((item: any) => ({
    id: item.track.id,
    name: item.track.name,
    artists: item.track.artists.map((a: any) => a.name),
    album: item.track.album.name,
    duration_ms: item.track.duration_ms,
    played_at: item.played_at,
  }));
};

/**
 * Get audio features for tracks (mood analysis)
 */
export const getAudioFeatures = async (
  accessToken: string,
  trackIds: string[]
): Promise<Map<string, SpotifyAudioFeatures>> => {
  if (trackIds.length === 0) return new Map();

  const response = await fetch(
    `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(",")}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch audio features");
  }

  const data = await response.json();
  const featuresMap = new Map<string, SpotifyAudioFeatures>();

  data.audio_features.forEach((feature: any, index: number) => {
    if (feature) {
      featuresMap.set(trackIds[index], {
        valence: feature.valence,
        energy: feature.energy,
        danceability: feature.danceability,
        acousticness: feature.acousticness,
        instrumentalness: feature.instrumentalness,
        speechiness: feature.speechiness,
      });
    }
  });

  return featuresMap;
};

/**
 * Save Spotify tokens to database
 */
export const saveSpotifyTokens = async (
  userId: string,
  tokens: SpotifyTokens
): Promise<void> => {
  await supabase.from("user_integrations").upsert({
    user_id: userId,
    integration_type: "spotify",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    is_active: true,
  });
};

/**
 * Get Spotify tokens from database
 */
export const getSpotifyTokens = async (
  userId: string
): Promise<SpotifyTokens | null> => {
  const { data } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("integration_type", "spotify")
    .eq("is_active", true)
    .single();

  if (!data) return null;

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(new Date(data.expires_at).getTime() / 1000),
  };
};

/**
 * Ensure valid Spotify token (refresh if needed)
 */
export const ensureValidSpotifyToken = async (
  userId: string
): Promise<string | null> => {
  const tokens = await getSpotifyTokens(userId);
  if (!tokens) return null;

  const now = Math.floor(Date.now() / 1000);
  // Token expires in less than 5 minutes, refresh it
  if (tokens.expires_at - now < 300) {
    const newTokens = await refreshSpotifyToken(tokens.refresh_token);
    await saveSpotifyTokens(userId, newTokens);
    return newTokens.access_token;
  }

  return tokens.access_token;
};

/**
 * Sync Spotify listening activity
 * - Import recently played tracks
 * - Analyze mood patterns
 * - Create music-based insights
 * - Auto-complete music-related habits
 */
export const syncSpotifyActivity = async (userId: string): Promise<number> => {
  const accessToken = await ensureValidSpotifyToken(userId);
  if (!accessToken) {
    throw new Error("No valid Spotify token found");
  }

  // Get tracks from last 24 hours
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  const tracks = await getRecentlyPlayed(accessToken, yesterday);

  if (tracks.length === 0) return 0;

  let synced = 0;

  // Get audio features for mood analysis
  const trackIds = tracks
    .map((t) => t.id)
    .filter((id, index, self) => self.indexOf(id) === index);
  const audioFeatures = await getAudioFeatures(accessToken, trackIds);

  // Calculate listening insights
  const totalMinutes =
    tracks.reduce((sum, t) => sum + t.duration_ms, 0) / 60000;

  const moodScores = tracks
    .map((t) => audioFeatures.get(t.id)?.valence || 0.5)
    .filter((v) => v > 0);
  const averageMood =
    moodScores.length > 0
      ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length
      : 0.5;

  const energyScores = tracks
    .map((t) => audioFeatures.get(t.id)?.energy || 0.5)
    .filter((e) => e > 0);
  const averageEnergy =
    energyScores.length > 0
      ? energyScores.reduce((a, b) => a + b, 0) / energyScores.length
      : 0.5;

  // Save listening summary
  await supabase.from("user_activity_imports").insert({
    user_id: userId,
    source: "spotify",
    external_id: `spotify-${new Date().toISOString().split("T")[0]}`,
    activity_type: "music_listening",
    duration_seconds: Math.floor(totalMinutes * 60),
    date: new Date().toISOString(),
    metadata: {
      tracks_played: tracks.length,
      mood_score: Math.round(averageMood * 100),
      energy_level: Math.round(averageEnergy * 100),
      top_artists: getTopArtists(tracks, 5),
      listening_period: "24h",
    },
  });

  synced++;

  // Auto-complete music-related habits
  const { data: musicHabits } = await supabase
    .from("user_habits")
    .select("id, name")
    .eq("user_id", userId)
    .eq("is_active", true)
    .or(
      "name.ilike.%music%,name.ilike.%meditation%,name.ilike.%calm%,name.ilike.%focus%"
    );

  if (musicHabits && musicHabits.length > 0) {
    const today = new Date().toISOString().split("T")[0];

    for (const habit of musicHabits) {
      // If listened to 30+ minutes of calm music (low energy, high valence)
      const calmTracks = tracks.filter((t) => {
        const features = audioFeatures.get(t.id);
        return features && features.energy < 0.5 && features.valence > 0.4;
      });

      const calmMinutes =
        calmTracks.reduce((sum, t) => sum + t.duration_ms, 0) / 60000;

      if (calmMinutes >= 30) {
        await supabase.from("user_habit_completions").upsert({
          user_id: userId,
          habit_id: habit.id,
          completion_date: today,
          notes: `Auto-synced from Spotify: ${Math.round(
            calmMinutes
          )} minutes of calming music`,
        });
      }
    }
  }

  return synced;
};

/**
 * Get listening insights for today
 */
export const getTodayListeningInsights = async (
  userId: string
): Promise<SpotifyListeningInsights | null> => {
  const accessToken = await ensureValidSpotifyToken(userId);
  if (!accessToken) return null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const tracks = await getRecentlyPlayed(accessToken, startOfDay.getTime());

  if (tracks.length === 0) {
    return {
      total_listening_minutes_today: 0,
      top_genres: [],
      mood_score: 50,
      energy_level: 50,
      most_played_today: [],
    };
  }

  const totalMinutes =
    tracks.reduce((sum, t) => sum + t.duration_ms, 0) / 60000;

  // Get audio features
  const trackIds = tracks
    .map((t) => t.id)
    .filter((id, index, self) => self.indexOf(id) === index);
  const audioFeatures = await getAudioFeatures(accessToken, trackIds);

  const moodScores = tracks
    .map((t) => audioFeatures.get(t.id)?.valence || 0.5)
    .filter((v) => v > 0);
  const averageMood =
    moodScores.length > 0
      ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length
      : 0.5;

  const energyScores = tracks
    .map((t) => audioFeatures.get(t.id)?.energy || 0.5)
    .filter((e) => e > 0);
  const averageEnergy =
    energyScores.length > 0
      ? energyScores.reduce((a, b) => a + b, 0) / energyScores.length
      : 0.5;

  return {
    total_listening_minutes_today: Math.round(totalMinutes),
    top_genres: [], // TODO: Fetch genres from artists
    mood_score: Math.round(averageMood * 100),
    energy_level: Math.round(averageEnergy * 100),
    most_played_today: tracks.slice(0, 5),
  };
};

/**
 * Disconnect Spotify
 */
export const disconnectSpotify = async (userId: string): Promise<void> => {
  await supabase
    .from("user_integrations")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("integration_type", "spotify");
};

/**
 * Helper: Get top artists from tracks
 */
function getTopArtists(tracks: SpotifyTrack[], limit: number): string[] {
  const artistCounts = new Map<string, number>();

  tracks.forEach((track) => {
    track.artists.forEach((artist) => {
      artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
    });
  });

  return Array.from(artistCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([artist]) => artist);
}
