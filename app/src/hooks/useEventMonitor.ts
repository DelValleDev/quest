/**
 * Achievement Monitor Hook
 *
 * Monitors for achievement unlocks and triggers proactive AI messages
 */

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import ProactiveAI, { ProactiveMessage } from "../lib/proactiveAI";

interface UseAchievementMonitorProps {
  userId: string;
  onAchievementUnlocked?: (message: ProactiveMessage) => void;
}

export const useAchievementMonitor = ({
  userId,
  onAchievementUnlocked,
}: UseAchievementMonitorProps) => {
  const lastCheckedRef = useRef<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to new achievement unlocks
    const channel = supabase
      .channel("achievement_unlocks")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          const newAchievement = payload.new;

          // Avoid duplicate notifications
          if (lastCheckedRef.current.includes(newAchievement.achievement_id)) {
            return;
          }
          lastCheckedRef.current.push(newAchievement.achievement_id);

          // Get achievement details
          const { data: achievement } = await supabase
            .from("achievements")
            .select("name, icon")
            .eq("id", newAchievement.achievement_id)
            .single();

          if (achievement) {
            // Generate proactive message
            try {
              const message = await ProactiveAI.generate({
                userId,
                type: "achievement",
                data: {
                  achievementName: achievement.name,
                },
              });

              if (message && onAchievementUnlocked) {
                onAchievementUnlocked(message);
              }
            } catch (err) {
              console.error("Error generating achievement message:", err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onAchievementUnlocked]);
};

/**
 * Badge Monitor Hook
 *
 * Monitors for badge unlocks (similar to achievements but different table)
 */
export const useBadgeMonitor = ({
  userId,
  onBadgeUnlocked,
}: {
  userId: string;
  onBadgeUnlocked?: (message: ProactiveMessage) => void;
}) => {
  const lastCheckedRef = useRef<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to new badge unlocks (assuming similar structure)
    const channel = supabase
      .channel("badge_unlocks")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_badges",
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          const newBadge = payload.new;

          if (lastCheckedRef.current.includes(newBadge.badge_id)) {
            return;
          }
          lastCheckedRef.current.push(newBadge.badge_id);

          // Get badge details
          const { data: badge } = await supabase
            .from("badges")
            .select("name, icon")
            .eq("id", newBadge.badge_id)
            .single();

          if (badge) {
            try {
              const message = await ProactiveAI.generate({
                userId,
                type: "badge",
                data: {
                  badgeName: badge.name,
                },
              });

              if (message && onBadgeUnlocked) {
                onBadgeUnlocked(message);
              }
            } catch (err) {
              console.error("Error generating badge message:", err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onBadgeUnlocked]);
};
