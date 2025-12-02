import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface DailyQuest {
  id: string;
  challenge_id: string;
  is_completed: boolean;
  challenge: {
    id: string;
    title: string;
    description: string;
    pillar_id: string;
    difficulty: string;
    xp_reward: number;
    coin_reward: number;
    duration_minutes: number | null;
    icon: string;
  };
}

const PILLARS: Record<string, { name: string; emoji: string; color: string }> = {
  physical: { name: 'Physical', emoji: '💪', color: '#EF4444' },
  mental: { name: 'Mental', emoji: '🧠', color: '#3B82F6' },
  social: { name: 'Social', emoji: '👥', color: '#EC4899' },
  professional: { name: 'Professional', emoji: '💼', color: '#10B981' },
  spiritual: { name: 'Spiritual', emoji: '✨', color: '#8B5CF6' },
  creative: { name: 'Creative', emoji: '🎨', color: '#F97316' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22C55E',
  medium: '#F59E0B',
  hard: '#EF4444',
  epic: '#8B5CF6',
};

export const DailyQuestsScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);

  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);

  const fetchDailyQuests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call function to generate/get daily quests
      const { data: generated, error: genError } = await supabase
        .rpc('generate_daily_quests', { p_user_id: user.id });

      if (genError) {
        console.error('Error generating daily quests:', genError);
      }

      // Fetch daily quests with challenge details
      const { data, error } = await supabase
        .from('daily_quest_pool')
        .select(`
          id,
          challenge_id,
          is_completed,
          challenge:challenges(id, title, description, pillar_id, difficulty, xp_reward, coin_reward, duration_minutes, icon)
        `)
        .eq('user_id', user.id)
        .eq('date', new Date().toISOString().split('T')[0]);

      if (error) throw error;

      // Transform data
      const transformed = (data || []).map((item: any) => ({
        ...item,
        challenge: Array.isArray(item.challenge) ? item.challenge[0] : item.challenge,
      })).filter((item: any) => item.challenge);

      setDailyQuests(transformed);
      setCompletedCount(transformed.filter((q: DailyQuest) => q.is_completed).length);
    } catch (error) {
      console.error('Error fetching daily quests:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDailyQuests();
    }, [])
  );

  const completeQuest = async (quest: DailyQuest) => {
    if (quest.is_completed) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark as completed in daily_quest_pool
      await supabase
        .from('daily_quest_pool')
        .update({ is_completed: true })
        .eq('id', quest.id);

      // Add to user_challenges if not already started
      const { data: existing } = await supabase
        .from('user_challenges')
        .select('id')
        .eq('user_id', user.id)
        .eq('challenge_id', quest.challenge_id)
        .eq('status', 'active')
        .single();

      if (existing) {
        // Complete existing challenge
        await supabase
          .from('user_challenges')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Create and complete
        await supabase
          .from('user_challenges')
          .insert({
            user_id: user.id,
            challenge_id: quest.challenge_id,
            status: 'completed',
            completed_at: new Date().toISOString(),
          });
      }

      // Update profile XP and coins
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp, quest_coins, level, current_streak, last_activity_date')
        .eq('id', user.id)
        .single();

      if (profile) {
        const newXp = profile.total_xp + quest.challenge.xp_reward;
        const newCoins = profile.quest_coins + quest.challenge.coin_reward;
        const newLevel = Math.floor(newXp / 100) + 1;

        // Calculate streak
        const today = new Date().toISOString().split('T')[0];
        const lastActivity = profile.last_activity_date;
        let newStreak = profile.current_streak;

        if (!lastActivity || lastActivity !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastActivity === yesterdayStr) {
            newStreak = profile.current_streak + 1;
          } else if (lastActivity !== today) {
            newStreak = 1;
          }
        }

        await supabase
          .from('profiles')
          .update({
            total_xp: newXp,
            quest_coins: newCoins,
            level: newLevel,
            current_streak: newStreak,
            last_activity_date: today,
          })
          .eq('id', user.id);
      }

      // Update pillar XP
      const { data: pillarData } = await supabase
        .from('user_pillars')
        .select('current_xp, level, challenges_completed')
        .eq('user_id', user.id)
        .eq('pillar_id', quest.challenge.pillar_id)
        .single();

      if (pillarData) {
        const newPillarXp = pillarData.current_xp + quest.challenge.xp_reward;
        const xpForNextLevel = pillarData.level * 100;
        let newPillarLevel = pillarData.level;
        let remainingXp = newPillarXp;

        if (newPillarXp >= xpForNextLevel) {
          newPillarLevel++;
          remainingXp = newPillarXp - xpForNextLevel;
        }

        await supabase
          .from('user_pillars')
          .update({
            current_xp: remainingXp,
            level: newPillarLevel,
            challenges_completed: pillarData.challenges_completed + 1,
          })
          .eq('user_id', user.id)
          .eq('pillar_id', quest.challenge.pillar_id);
      }

      Alert.alert(
        'Quest Complete! 🎉',
        `+${quest.challenge.xp_reward} XP | +${quest.challenge.coin_reward} 🪙`,
        [{ text: 'Awesome!' }]
      );

      fetchDailyQuests();
    } catch (error) {
      console.error('Error completing quest:', error);
      Alert.alert('Error', 'Failed to complete quest');
    }
  };

  const progressPercentage = (completedCount / Math.max(dailyQuests.length, 1)) * 100;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchDailyQuests} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Daily Quests</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      {/* Progress Card */}
      <View style={[styles.progressCard, { backgroundColor: theme.surface }]}>
        <View style={styles.progressHeader}>
          <Text style={styles.robotEmoji}>🤖</Text>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>
              Today's Progress
            </Text>
            <Text style={[styles.progressCount, { color: theme.textSecondary }]}>
              {completedCount} / {dailyQuests.length} quests completed
            </Text>
          </View>
          {completedCount === dailyQuests.length && dailyQuests.length > 0 && (
            <Text style={styles.completeEmoji}>🏆</Text>
          )}
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: completedCount === dailyQuests.length ? '#22C55E' : theme.primary,
                width: `${progressPercentage}%`,
              },
            ]}
          />
        </View>
        {completedCount === dailyQuests.length && dailyQuests.length > 0 && (
          <Text style={[styles.bonusText, { color: '#22C55E' }]}>
            🎉 All daily quests complete! Bonus: +50 XP
          </Text>
        )}
      </View>

      {/* Quest List */}
      <View style={styles.questList}>
        {dailyQuests.map((quest) => {
          const pillar = PILLARS[quest.challenge.pillar_id];
          const difficultyColor = DIFFICULTY_COLORS[quest.challenge.difficulty];

          return (
            <TouchableOpacity
              key={quest.id}
              style={[
                styles.questCard,
                { backgroundColor: theme.surface },
                quest.is_completed && styles.questCompleted,
              ]}
              onPress={() => completeQuest(quest)}
              disabled={quest.is_completed}
            >
              <View
                style={[
                  styles.pillarIndicator,
                  { backgroundColor: pillar?.color || theme.primary },
                ]}
              />

              <View style={styles.questIconContainer}>
                <Text style={styles.questIcon}>{quest.challenge.icon}</Text>
                {quest.is_completed && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </View>

              <View style={styles.questContent}>
                <View style={styles.questHeader}>
                  <Text
                    style={[
                      styles.questTitle,
                      { color: theme.text },
                      quest.is_completed && styles.textCompleted,
                    ]}
                  >
                    {quest.challenge.title}
                  </Text>
                  <View style={[styles.difficultyBadge, { backgroundColor: `${difficultyColor}20` }]}>
                    <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                      {quest.challenge.difficulty}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.questDescription,
                    { color: theme.textSecondary },
                    quest.is_completed && styles.textCompleted,
                  ]}
                  numberOfLines={2}
                >
                  {quest.challenge.description}
                </Text>

                <View style={styles.questFooter}>
                  <View style={styles.pillarTag}>
                    <Text style={styles.pillarEmoji}>{pillar?.emoji}</Text>
                    <Text style={[styles.pillarName, { color: theme.textMuted }]}>
                      {pillar?.name}
                    </Text>
                  </View>

                  <View style={styles.rewards}>
                    <Text style={[styles.rewardText, { color: theme.primary }]}>
                      +{quest.challenge.xp_reward} XP
                    </Text>
                    <Text style={[styles.rewardText, { color: '#F59E0B' }]}>
                      +{quest.challenge.coin_reward} 🪙
                    </Text>
                  </View>
                </View>
              </View>

              {!quest.is_completed && (
                <View style={[styles.completeButton, { backgroundColor: theme.primary }]}>
                  <Text style={styles.completeButtonText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {dailyQuests.length === 0 && !loading && (
          <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No Daily Quests Yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Daily quests will appear here. Make sure the database is set up!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  progressCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  robotEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressCount: {
    fontSize: 14,
    marginTop: 2,
  },
  completeEmoji: {
    fontSize: 32,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  bonusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  questList: {
    gap: 12,
  },
  questCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
  },
  questCompleted: {
    opacity: 0.7,
  },
  pillarIndicator: {
    width: 4,
    height: '100%',
  },
  questIconContainer: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    position: 'relative',
  },
  questIcon: {
    fontSize: 32,
  },
  checkmark: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  questContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 8,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  questDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  questFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillarTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillarEmoji: {
    fontSize: 12,
  },
  pillarName: {
    fontSize: 12,
  },
  rewards: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
