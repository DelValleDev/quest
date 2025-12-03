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
  ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import questAI from '../../lib/openai';

const { width } = Dimensions.get('window');

interface DailyQuest {
  id: string;
  completed: boolean;
  completed_at: string | null;
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
  const [generatingAI, setGeneratingAI] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [userMood, setUserMood] = useState<string | null>(null);

  // Generate quests with AI based on user profile
  const generateAIQuests = async (mood?: string) => {
    try {
      setGeneratingAI(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call AI to generate personalized quests
      const dailyPlan = await questAI.generateQuests(user.id, mood);
      
      if (dailyPlan) {
        Alert.alert(
          dailyPlan.greeting || '¡Buenos días! 🌟',
          dailyPlan.motivation || 'Tus quests personalizados están listos',
          [{ text: '¡Vamos!' }]
        );
      }
      
      // Refresh the quests list
      await fetchDailyQuests();
    } catch (error: any) {
      console.error('Error generating AI quests:', error);
      // If AI fails, fall back to regular quest generation
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('generate_daily_quests', { p_user_id: user.id });
          await fetchDailyQuests();
        }
      } catch {}
      
      if (error.message?.includes('API key')) {
        Alert.alert(
          'IA no configurada',
          'Usando generador estándar de quests. Para quests personalizados, configura la API de OpenAI.',
          [{ text: 'Entendido' }]
        );
      }
    } finally {
      setGeneratingAI(false);
      setShowMoodPicker(false);
    }
  };

  // Show mood picker before generating
  const handleGenerateQuests = () => {
    setShowMoodPicker(true);
  };

  const selectMoodAndGenerate = (mood: string) => {
    setUserMood(mood);
    generateAIQuests(mood);
  };

  const fetchDailyQuests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use the summary function that generates and returns quests
      const { data: summary, error } = await supabase
        .rpc('get_daily_quest_summary', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching daily quests:', error);
        // Fallback to direct query if function doesn't exist
        await fetchDailyQuestsFallback(user.id);
        return;
      }

      if (summary && summary.quests) {
        setDailyQuests(summary.quests);
        setCompletedCount(summary.completed);
        setTotalCount(summary.total);
      }
    } catch (error) {
      console.error('Error fetching daily quests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fallback if the RPC function doesn't exist yet
  const fetchDailyQuestsFallback = async (userId: string) => {
    try {
      // Try generating quests first (ignore errors)
      try {
        await supabase.rpc('generate_daily_quests', { p_user_id: userId });
      } catch {}

      // Fetch from user_daily_quests table
      const { data, error } = await supabase
        .from('user_daily_quests')
        .select(`
          id,
          completed,
          completed_at,
          daily_quest:challenges!daily_quest_id(id, title, description, pillar_id, difficulty, xp_reward, coin_reward, duration_minutes, icon)
        `)
        .eq('user_id', userId)
        .eq('assigned_date', new Date().toISOString().split('T')[0]);

      if (error) {
        // Try alternative table name
        const { data: altData } = await supabase
          .from('daily_quest_pool')
          .select(`
            id,
            is_completed,
            challenge:challenges(id, title, description, pillar_id, difficulty, xp_reward, coin_reward, duration_minutes, icon)
          `)
          .eq('user_id', userId)
          .eq('date', new Date().toISOString().split('T')[0]);

        if (altData) {
          const transformed = altData.map((item: any) => ({
            id: item.id,
            completed: item.is_completed,
            completed_at: null,
            challenge: Array.isArray(item.challenge) ? item.challenge[0] : item.challenge,
          })).filter((item: any) => item.challenge);

          setDailyQuests(transformed);
          setCompletedCount(transformed.filter((q: DailyQuest) => q.completed).length);
          setTotalCount(transformed.length);
        }
        return;
      }

      const transformed = (data || []).map((item: any) => ({
        id: item.id,
        completed: item.completed,
        completed_at: item.completed_at,
        challenge: Array.isArray(item.daily_quest) ? item.daily_quest[0] : item.daily_quest,
      })).filter((item: any) => item.challenge);

      setDailyQuests(transformed);
      setCompletedCount(transformed.filter((q: DailyQuest) => q.completed).length);
      setTotalCount(transformed.length);
    } catch (err) {
      console.error('Fallback fetch error:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDailyQuests();
    }, [])
  );

  const completeQuest = async (quest: DailyQuest) => {
    if (quest.completed) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to use the new complete_daily_quest function
      const { data: result, error: rpcError } = await supabase
        .rpc('complete_daily_quest', { 
          p_user_id: user.id, 
          p_quest_assignment_id: quest.id 
        });

      if (!rpcError && result?.success) {
        Alert.alert(
          'Quest Complete! 🎉',
          `+${result.xp_earned} XP | +${result.coins_earned} 🪙${result.all_completed_bonus ? '\n🏆 All daily quests bonus!' : ''}`,
          [{ text: 'Awesome!' }]
        );
        fetchDailyQuests();
        return;
      }

      // Fallback to manual completion
      // Mark as completed in user_daily_quests or daily_quest_pool
      await supabase
        .from('user_daily_quests')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('id', quest.id)
        .then(({ error }) => {
          if (error) {
            // Try alternative table
            return supabase
              .from('daily_quest_pool')
              .update({ is_completed: true })
              .eq('id', quest.id);
          }
        });

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

      {/* Mood Picker Modal */}
      {showMoodPicker && (
        <View style={[styles.moodPickerOverlay]}>
          <View style={[styles.moodPickerCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.moodPickerTitle, { color: theme.text }]}>
              ¿Cómo te sientes hoy? 🤔
            </Text>
            <Text style={[styles.moodPickerSubtitle, { color: theme.textSecondary }]}>
              Esto ayuda a la IA a personalizar tus quests
            </Text>
            <View style={styles.moodOptions}>
              {[
                { mood: 'great', emoji: '😄', label: 'Genial' },
                { mood: 'good', emoji: '😊', label: 'Bien' },
                { mood: 'okay', emoji: '😐', label: 'Normal' },
                { mood: 'bad', emoji: '😔', label: 'Mal' },
                { mood: 'terrible', emoji: '😢', label: 'Terrible' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.mood}
                  style={[
                    styles.moodOption,
                    { backgroundColor: theme.surface },
                    userMood === option.mood && { backgroundColor: theme.primary + '30' },
                  ]}
                  onPress={() => selectMoodAndGenerate(option.mood)}
                  disabled={generatingAI}
                >
                  <Text style={styles.moodEmoji}>{option.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: theme.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {generatingAI && (
              <View style={styles.generatingContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.generatingText, { color: theme.textSecondary }]}>
                  🤖 Generando quests personalizados...
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={() => setShowMoodPicker(false)}
              disabled={generatingAI}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Generate AI Quests Button */}
      {dailyQuests.length === 0 && !loading && (
        <TouchableOpacity
          style={[styles.generateButton, { backgroundColor: theme.primary }]}
          onPress={handleGenerateQuests}
          disabled={generatingAI}
        >
          {generatingAI ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.generateButtonEmoji}>🤖</Text>
              <Text style={styles.generateButtonText}>Generar Quests con IA</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Regenerate Button (when there are quests) */}
      {dailyQuests.length > 0 && completedCount === 0 && (
        <TouchableOpacity
          style={[styles.regenerateButton, { backgroundColor: theme.surface, borderColor: theme.primary }]}
          onPress={handleGenerateQuests}
          disabled={generatingAI}
        >
          <Text style={styles.regenerateEmoji}>🔄</Text>
          <Text style={[styles.regenerateText, { color: theme.primary }]}>
            Regenerar con IA
          </Text>
        </TouchableOpacity>
      )}

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
                quest.completed && styles.questCompleted,
              ]}
              onPress={() => completeQuest(quest)}
              disabled={quest.completed}
            >
              <View
                style={[
                  styles.pillarIndicator,
                  { backgroundColor: pillar?.color || theme.primary },
                ]}
              />

              <View style={styles.questIconContainer}>
                <Text style={styles.questIcon}>{quest.challenge.icon}</Text>
                {quest.completed && (
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
                      quest.completed && styles.textCompleted,
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
                    quest.completed && styles.textCompleted,
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

              {!quest.completed && (
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
  // AI Generation styles
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  generateButtonEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  regenerateEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  regenerateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Mood Picker styles
  moodPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  moodPickerCard: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  moodPickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moodPickerSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  moodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  moodOption: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 70,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  generatingText: {
    marginLeft: 10,
    fontSize: 14,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
