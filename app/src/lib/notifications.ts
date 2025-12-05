/**
 * Push Notifications Service for Quest App
 * Uses Expo Notifications for cross-platform push notifications
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Types
export interface NotificationData {
  type:
    | "quest_reminder"
    | "habit_reminder"
    | "duel_challenge"
    | "raid_invite"
    | "streak_warning"
    | "achievement"
    | "friend_request"
    | "daily_motivation";
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Register for push notifications
 * Returns the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  // Check if it's a physical device (required for push)
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  // Get the token
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log("No project ID found for push notifications");
      // For development, use a fallback
      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      token = tokenResponse.data;
    } else {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = tokenResponse.data;
    }
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }

  // Configure Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Quest Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B5CF6",
    });

    // Create specific channels
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      description: "Quest and habit reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });

    await Notifications.setNotificationChannelAsync("social", {
      name: "Social",
      description: "Friend requests, duels, and raids",
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    await Notifications.setNotificationChannelAsync("achievements", {
      name: "Achievements",
      description: "Achievement unlocks and rewards",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return token;
}

/**
 * Save push token to database
 */
export async function savePushToken(
  userId: string,
  token: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        push_token: token,
        push_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Error saving push token:", error);
    }
  } catch (err) {
    console.error("Error saving push token:", err);
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  notification: NotificationData,
  trigger: Notifications.NotificationTriggerInput
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: {
        type: notification.type,
        ...notification.data,
      },
      sound: true,
    },
    trigger,
  });

  return id;
}

/**
 * Schedule daily quest reminder
 */
export async function scheduleDailyQuestReminder(
  hour: number = 9,
  minute: number = 0
): Promise<string> {
  // Cancel existing daily reminder
  await Notifications.cancelScheduledNotificationAsync("daily-quest-reminder");

  return scheduleLocalNotification(
    {
      type: "quest_reminder",
      title: "🎯 Tus Quests te esperan!",
      body: "Es hora de completar tus misiones del día. ¡No pierdas tu racha!",
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    }
  );
}

/**
 * Schedule habit reminder
 */
export async function scheduleHabitReminder(
  habitId: string,
  habitTitle: string,
  hour: number,
  minute: number,
  days?: number[] // 1=Monday, 7=Sunday
): Promise<string> {
  const trigger: Notifications.NotificationTriggerInput = days
    ? {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: days[0], // For now, schedule for first day
        hour,
        minute,
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      };

  return scheduleLocalNotification(
    {
      type: "habit_reminder",
      title: `⏰ ${habitTitle}`,
      body: "Es hora de completar tu hábito. ¡Mantén tu racha!",
      data: { habitId },
    },
    trigger
  );
}

/**
 * Schedule streak warning (if user hasn't completed anything today)
 */
export async function scheduleStreakWarning(
  hour: number = 20,
  minute: number = 0
): Promise<string> {
  return scheduleLocalNotification(
    {
      type: "streak_warning",
      title: "🔥 ¡Tu racha está en peligro!",
      body: "Aún no has completado ningún quest hoy. No dejes que se rompa tu racha.",
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    }
  );
}

/**
 * Send immediate notification (for testing or instant alerts)
 */
export async function sendImmediateNotification(
  notification: NotificationData
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: {
        type: notification.type,
        ...notification.data,
      },
      sound: true,
    },
    trigger: null, // Immediate
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Setup notification listeners
 * Call this in your App.tsx or root component
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
): () => void {
  // Listener for notifications received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    onNotificationReceived
  );

  // Listener for user interaction with notification
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener(
      onNotificationResponse
    );

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Daily motivation messages
 */
const MOTIVATION_MESSAGES = [
  {
    title: "💪 ¡Nuevo día, nuevas oportunidades!",
    body: "Cada día es una chance para ser mejor. ¡Vamos!",
  },
  {
    title: "🚀 ¡Tu futuro yo te lo agradecerá!",
    body: "Los pequeños pasos de hoy crean grandes cambios mañana.",
  },
  {
    title: "🔥 ¡La constancia es tu superpoder!",
    body: "Un día más, un paso más cerca de tus metas.",
  },
  {
    title: "⭐ ¡Eres más fuerte de lo que crees!",
    body: "Sigue adelante, cada esfuerzo cuenta.",
  },
  {
    title: "🎯 ¡Enfócate en el proceso!",
    body: "No te preocupes por el destino, disfruta el camino.",
  },
];

/**
 * Schedule daily motivation notification
 */
export async function scheduleDailyMotivation(
  hour: number = 8,
  minute: number = 0
): Promise<string> {
  const randomMessage =
    MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)];

  return scheduleLocalNotification(
    {
      type: "daily_motivation",
      title: randomMessage.title,
      body: randomMessage.body,
    },
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    }
  );
}

// =====================================================
// SOCIAL NOTIFICATIONS
// =====================================================

/**
 * Send duel challenge notification
 */
export async function sendDuelChallengeNotification(
  challengerName: string,
  duelId: string
): Promise<string> {
  return sendImmediateNotification({
    type: "duel_challenge",
    title: "⚔️ ¡Te han retado a un duelo!",
    body: `${challengerName} te desafía. ¿Aceptas el reto?`,
    data: { duelId },
  });
}

/**
 * Send duel result notification
 */
export async function sendDuelResultNotification(
  won: boolean,
  opponentName: string,
  xpEarned: number
): Promise<string> {
  return sendImmediateNotification({
    type: "duel_challenge",
    title: won ? "🏆 ¡Ganaste el duelo!" : "😢 Perdiste el duelo",
    body: won
      ? `Derrotaste a ${opponentName}. +${xpEarned} XP`
      : `${opponentName} te venció. ¡La próxima será!`,
  });
}

/**
 * Send raid invite notification
 */
export async function sendRaidInviteNotification(
  guildName: string,
  raidTitle: string,
  raidId: string
): Promise<string> {
  return sendImmediateNotification({
    type: "raid_invite",
    title: "🛡️ ¡Raid disponible!",
    body: `${guildName} inició "${raidTitle}". ¡Únete!`,
    data: { raidId },
  });
}

/**
 * Send raid completion notification
 */
export async function sendRaidCompleteNotification(
  raidTitle: string,
  success: boolean,
  xpEarned: number
): Promise<string> {
  return sendImmediateNotification({
    type: "raid_invite",
    title: success ? "⚔️ ¡Raid completado!" : "💔 Raid fallido",
    body: success
      ? `"${raidTitle}" completado. +${xpEarned} XP para todos!`
      : `No completaron "${raidTitle}". ¡Inténtenlo de nuevo!`,
  });
}

/**
 * Send friend request notification
 */
export async function sendFriendRequestNotification(
  friendName: string,
  friendId: string
): Promise<string> {
  return sendImmediateNotification({
    type: "friend_request",
    title: "👋 Nueva solicitud de amistad",
    body: `${friendName} quiere ser tu amigo en Quest.`,
    data: { friendId },
  });
}

/**
 * Send achievement notification
 */
export async function sendAchievementNotification(
  achievementTitle: string,
  achievementId: string,
  xpEarned: number
): Promise<string> {
  return sendImmediateNotification({
    type: "achievement",
    title: "🏅 ¡Logro desbloqueado!",
    body: `${achievementTitle} - +${xpEarned} XP`,
    data: { achievementId },
  });
}

/**
 * Send level up notification
 */
export async function sendLevelUpNotification(
  newLevel: number,
  newTitle?: string
): Promise<string> {
  return sendImmediateNotification({
    type: "achievement",
    title: "⬆️ ¡Subiste de nivel!",
    body: newTitle
      ? `¡Nivel ${newLevel}! Nuevo título: ${newTitle}`
      : `¡Alcanzaste el nivel ${newLevel}!`,
  });
}

/**
 * Send punishment voting notification
 */
export async function sendPunishmentVoteNotification(
  guildName: string,
  targetName: string,
  voteId: string
): Promise<string> {
  return sendImmediateNotification({
    type: "raid_invite", // Reusing type for now
    title: "🗳️ ¡Votación de castigo!",
    body: `${guildName}: Vota el castigo para ${targetName}`,
    data: { voteId },
  });
}

// =====================================================
// NOTIFICATION PREFERENCES
// =====================================================

export interface NotificationPreferences {
  dailyReminder: boolean;
  dailyReminderTime: string; // "09:00"
  streakWarning: boolean;
  streakWarningTime: string; // "20:00"
  socialNotifications: boolean;
  achievementNotifications: boolean;
  dailyMotivation: boolean;
  dailyMotivationTime: string; // "08:00"
}

/**
 * Apply notification preferences
 * Cancels and reschedules notifications based on preferences
 */
export async function applyNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  // Cancel all existing scheduled notifications
  await cancelAllNotifications();

  // Schedule based on preferences
  if (preferences.dailyReminder) {
    const [hour, minute] = preferences.dailyReminderTime.split(":").map(Number);
    await scheduleDailyQuestReminder(hour, minute);
  }

  if (preferences.streakWarning) {
    const [hour, minute] = preferences.streakWarningTime.split(":").map(Number);
    await scheduleStreakWarning(hour, minute);
  }

  if (preferences.dailyMotivation) {
    const [hour, minute] = preferences.dailyMotivationTime
      .split(":")
      .map(Number);
    await scheduleDailyMotivation(hour, minute);
  }
}

/**
 * Save notification preferences to database
 */
export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences
): Promise<void> {
  await supabase
    .from("profiles")
    .update({
      notification_preferences: preferences,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  await applyNotificationPreferences(preferences);
}

/**
 * Get default notification preferences
 */
export function getDefaultNotificationPreferences(): NotificationPreferences {
  return {
    dailyReminder: true,
    dailyReminderTime: "09:00",
    streakWarning: true,
    streakWarningTime: "20:00",
    socialNotifications: true,
    achievementNotifications: true,
    dailyMotivation: true,
    dailyMotivationTime: "08:00",
  };
}

export default {
  // Core
  registerForPushNotifications,
  savePushToken,
  scheduleLocalNotification,
  sendImmediateNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  setupNotificationListeners,
  getBadgeCount,
  setBadgeCount,

  // Scheduled
  scheduleDailyQuestReminder,
  scheduleHabitReminder,
  scheduleStreakWarning,
  scheduleDailyMotivation,

  // Social
  sendDuelChallengeNotification,
  sendDuelResultNotification,
  sendRaidInviteNotification,
  sendRaidCompleteNotification,
  sendFriendRequestNotification,
  sendAchievementNotification,
  sendLevelUpNotification,
  sendPunishmentVoteNotification,

  // Preferences
  applyNotificationPreferences,
  saveNotificationPreferences,
  getDefaultNotificationPreferences,
};
