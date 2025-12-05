// Calendar integration service
// Requires: expo-auth-session, expo-web-browser
// Install with: npx expo install expo-auth-session expo-web-browser

import { supabase } from "./supabase";

// Lazy load expo modules to avoid errors if not installed
let AuthSession: any = null;
let WebBrowser: any = null;

async function loadExpoModules() {
  if (!AuthSession) {
    try {
      // @ts-ignore - Dynamic import for optional dependencies
      AuthSession = await import("expo-auth-session");
      // @ts-ignore - Dynamic import for optional dependencies
      WebBrowser = await import("expo-web-browser");
      WebBrowser.maybeCompleteAuthSession();
    } catch (e) {
      console.warn("expo-auth-session or expo-web-browser not installed");
    }
  }
}

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || "";

// Scopes needed for calendar access
const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

// Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  is_all_day: boolean;
  source: "google" | "apple" | "notion";
}

export interface FreeTimeSlot {
  start: string;
  end: string;
  duration_minutes: number;
}

export interface CalendarIntegration {
  provider: "google" | "apple" | "notion";
  connected: boolean;
  last_sync?: string;
  access_token?: string;
  refresh_token?: string;
}

// =====================================================
// GOOGLE CALENDAR INTEGRATION
// =====================================================

/**
 * Get Google OAuth discovery document
 */
const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

/**
 * Initiate Google Calendar OAuth flow
 */
export async function connectGoogleCalendar(userId: string): Promise<boolean> {
  try {
    // Load expo modules first
    await loadExpoModules();

    if (!AuthSession || !AuthSession.makeRedirectUri) {
      throw new Error(
        "expo-auth-session not available. Please install it with: npx expo install expo-auth-session expo-web-browser"
      );
    }

    const redirectUri = AuthSession.makeRedirectUri({
      scheme: "quest",
      path: "calendar-callback",
    });

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: CALENDAR_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === "success" && result.params.code) {
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(
        result.params.code,
        redirectUri,
        request.codeVerifier!
      );

      // Save tokens to database
      await saveCalendarIntegration(userId, "google", tokens);

      // Initial sync
      await syncGoogleCalendar(userId, tokens.access_token);

      return true;
    }

    return false;
  } catch (error) {
    console.error("Google Calendar connection error:", error);
    throw error;
  }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(discovery.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  return response.json();
}

/**
 * Refresh Google access token
 */
async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const response = await fetch(discovery.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Sync events from Google Calendar
 */
export async function syncGoogleCalendar(
  userId: string,
  accessToken?: string
): Promise<CalendarEvent[]> {
  // Get token if not provided
  if (!accessToken) {
    const integration = await getCalendarIntegration(userId, "google");
    if (!integration?.access_token) {
      throw new Error("Google Calendar not connected");
    }
    accessToken = integration.access_token;

    // Refresh if needed
    if (integration.refresh_token) {
      try {
        accessToken = await refreshGoogleToken(integration.refresh_token);
        await updateAccessToken(userId, "google", accessToken);
      } catch (e) {
        console.warn("Token refresh failed, using existing token");
      }
    }
  }

  // Get events for the next 7 days
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${now.toISOString()}&` +
      `timeMax=${weekLater.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch calendar events");
  }

  const data = await response.json();
  const events: CalendarEvent[] = (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.summary || "Untitled Event",
    description: item.description,
    start_time: item.start.dateTime || item.start.date,
    end_time: item.end.dateTime || item.end.date,
    location: item.location,
    is_all_day: !item.start.dateTime,
    source: "google" as const,
  }));

  // Save events to database
  await saveCalendarEvents(userId, events);

  // Update last sync time
  await updateLastSync(userId, "google");

  return events;
}

/**
 * Create a calendar event for a quest
 */
export async function createQuestCalendarEvent(
  userId: string,
  questTitle: string,
  startTime: Date,
  durationMinutes: number
): Promise<string | null> {
  const integration = await getCalendarIntegration(userId, "google");
  if (!integration?.access_token) {
    return null;
  }

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const event = {
    summary: `🎯 Quest: ${questTitle}`,
    description: "Quest challenge from Quest App",
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 10 }],
    },
  };

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create calendar event");
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("Failed to create calendar event:", error);
    return null;
  }
}

// =====================================================
// FREE TIME ANALYSIS
// =====================================================

/**
 * Find free time slots in user's calendar for quests
 */
export async function findFreeTimeSlots(
  userId: string,
  date: Date = new Date()
): Promise<FreeTimeSlot[]> {
  // Get user's events for the day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: events } = await supabase
    .from("user_calendar_events")
    .select("start_time, end_time")
    .eq("user_id", userId)
    .gte("start_time", dayStart.toISOString())
    .lte("end_time", dayEnd.toISOString())
    .order("start_time");

  // Define working hours (9 AM - 9 PM by default)
  const workStart = new Date(date);
  workStart.setHours(9, 0, 0, 0);
  const workEnd = new Date(date);
  workEnd.setHours(21, 0, 0, 0);

  const freeSlots: FreeTimeSlot[] = [];
  let currentTime = workStart;

  for (const event of events || []) {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    // If there's a gap before this event
    if (currentTime < eventStart) {
      const duration =
        (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);
      if (duration >= 15) {
        // At least 15 minutes
        freeSlots.push({
          start: currentTime.toISOString(),
          end: eventStart.toISOString(),
          duration_minutes: duration,
        });
      }
    }

    currentTime = eventEnd > currentTime ? eventEnd : currentTime;
  }

  // Check for time after last event
  if (currentTime < workEnd) {
    const duration = (workEnd.getTime() - currentTime.getTime()) / (1000 * 60);
    if (duration >= 15) {
      freeSlots.push({
        start: currentTime.toISOString(),
        end: workEnd.toISOString(),
        duration_minutes: duration,
      });
    }
  }

  return freeSlots;
}

/**
 * Suggest best time for a quest based on calendar
 */
export async function suggestQuestTime(
  userId: string,
  questDuration: number // minutes
): Promise<Date | null> {
  const freeSlots = await findFreeTimeSlots(userId);

  // Find first slot that fits the quest
  for (const slot of freeSlots) {
    if (slot.duration_minutes >= questDuration) {
      return new Date(slot.start);
    }
  }

  return null;
}

// =====================================================
// DATABASE HELPERS
// =====================================================

async function saveCalendarIntegration(
  userId: string,
  provider: string,
  tokens: { access_token: string; refresh_token?: string; expires_in: number }
) {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await supabase.from("user_calendar_integrations").upsert({
    user_id: userId,
    provider,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt.toISOString(),
    connected: true,
    last_sync: new Date().toISOString(),
  });
}

async function getCalendarIntegration(
  userId: string,
  provider: string
): Promise<CalendarIntegration | null> {
  const { data } = await supabase
    .from("user_calendar_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();

  return data;
}

async function updateAccessToken(
  userId: string,
  provider: string,
  accessToken: string
) {
  await supabase
    .from("user_calendar_integrations")
    .update({ access_token: accessToken })
    .eq("user_id", userId)
    .eq("provider", provider);
}

async function updateLastSync(userId: string, provider: string) {
  await supabase
    .from("user_calendar_integrations")
    .update({ last_sync: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", provider);
}

async function saveCalendarEvents(userId: string, events: CalendarEvent[]) {
  // Delete old events and insert new ones
  await supabase
    .from("user_calendar_events")
    .delete()
    .eq("user_id", userId)
    .eq("source", events[0]?.source || "google");

  if (events.length > 0) {
    await supabase.from("user_calendar_events").insert(
      events.map((e) => ({
        user_id: userId,
        external_id: e.id,
        title: e.title,
        description: e.description,
        start_time: e.start_time,
        end_time: e.end_time,
        location: e.location,
        is_all_day: e.is_all_day,
        source: e.source,
      }))
    );
  }
}

// =====================================================
// GET CALENDAR STATUS
// =====================================================

export async function getCalendarStatus(
  userId: string,
  provider: string = "google"
): Promise<CalendarIntegration | null> {
  const { data, error } = await supabase
    .from("user_calendar_integrations")
    .select("provider, access_token, refresh_token, last_sync")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    provider: data.provider as "google" | "apple" | "notion",
    connected: !!data.access_token,
    last_sync: data.last_sync,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

// =====================================================
// AI CALENDAR FUNCTIONS
// These functions are designed to be called by the AI
// =====================================================

export interface CreateEventParams {
  title: string;
  description?: string;
  startTime: string; // ISO string or natural language
  endTime?: string; // ISO string or natural language
  durationMinutes?: number; // If no endTime, use duration
  location?: string;
  reminder?: number; // Minutes before event
}

/**
 * Create a calendar event from AI
 * Designed for the AI to schedule events based on user conversation
 */
export async function createCalendarEventFromAI(
  userId: string,
  params: CreateEventParams
): Promise<{
  success: boolean;
  eventId?: string;
  error?: string;
  eventUrl?: string;
}> {
  try {
    const integration = await getCalendarIntegration(userId, "google");

    if (!integration?.access_token) {
      return {
        success: false,
        error:
          "Google Calendar no está conectado. Ve a Configuración para conectarlo.",
      };
    }

    // Refresh token if needed
    let accessToken = integration.access_token;
    if (integration.refresh_token) {
      try {
        accessToken = await refreshGoogleToken(integration.refresh_token);
        await updateAccessToken(userId, "google", accessToken);
      } catch (e) {
        // Continue with existing token
      }
    }

    // Parse times
    const startTime = new Date(params.startTime);
    let endTime: Date;

    if (params.endTime) {
      endTime = new Date(params.endTime);
    } else if (params.durationMinutes) {
      endTime = new Date(
        startTime.getTime() + params.durationMinutes * 60 * 1000
      );
    } else {
      // Default 1 hour duration
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    }

    const event = {
      summary: params.title,
      description: params.description || "Creado desde Quest App",
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      location: params.location,
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: params.reminder || 10 }],
      },
    };

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Error al crear evento");
    }

    const data = await response.json();

    return {
      success: true,
      eventId: data.id,
      eventUrl: data.htmlLink,
    };
  } catch (error: any) {
    console.error("AI Calendar event creation failed:", error);
    return {
      success: false,
      error: error.message || "Error desconocido al crear evento",
    };
  }
}

/**
 * Get user's schedule for a specific day
 * Useful for AI to understand user's availability
 */
export async function getDaySchedule(
  userId: string,
  date: Date = new Date()
): Promise<{ events: CalendarEvent[]; freeSlots: FreeTimeSlot[] }> {
  // Get events from database
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: events } = await supabase
    .from("user_calendar_events")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString())
    .order("start_time");

  const calendarEvents: CalendarEvent[] = (events || []).map((e) => ({
    id: e.external_id,
    title: e.title,
    description: e.description,
    start_time: e.start_time,
    end_time: e.end_time,
    location: e.location,
    is_all_day: e.is_all_day,
    source: e.source,
  }));

  const freeSlots = await findFreeTimeSlots(userId, date);

  return { events: calendarEvents, freeSlots };
}

/**
 * Check if user has Google Calendar connected
 */
export async function isCalendarConnected(userId: string): Promise<boolean> {
  const status = await getCalendarStatus(userId, "google");
  return status?.connected || false;
}

// =====================================================
// DISCONNECT
// =====================================================

export async function disconnectCalendar(
  userId: string,
  provider: string = "google"
): Promise<void> {
  await supabase
    .from("user_calendar_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  await supabase
    .from("user_calendar_events")
    .delete()
    .eq("user_id", userId)
    .eq("source", provider);
}

// =====================================================
// EXPORTS
// =====================================================

export const CalendarService = {
  // Connection
  connectGoogleCalendar,
  disconnectCalendar,
  getCalendarStatus,
  isCalendarConnected,

  // Sync
  syncGoogleCalendar,

  // Events
  createEvent: createQuestCalendarEvent,
  createEventFromAI: createCalendarEventFromAI,
  getDaySchedule,

  // Free time
  findFreeTime: findFreeTimeSlots,
  suggestTime: suggestQuestTime,
};

export const calendarService = CalendarService;

export default CalendarService;
