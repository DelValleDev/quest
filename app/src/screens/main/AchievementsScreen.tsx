import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  pillar_id: string | null;
  xp_reward: number;
  coin_reward: number;
  requirement_type: string;
  requirement_value: number;
  icon: string;
  rarity: string;
  is_hidden: boolean;
  unlocked: boolean;
  unlocked_at: string | null;
}

const RARITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  common: { bg: '#9CA3AF20', text: '#9CA3AF', border: '#9CA3AF' },
  uncommon: { bg: '#22C55E20', text: '#22C55E', border: '#22C55E' },
  rare: { bg: '#3B82F620', text: '#3B82F6', border: '#3B82F6' },
  epic: { bg: '#8B5CF620', text: '#8B5CF6', border: '#8B5CF6' },
  legendary: { bg: '#F59E0B20', text: '#F59E0B', border: '#F59E0B' },
};

const CATEGORY_LABELS: Record<string, { name: string; icon: string }> = {
  streak: { name: 'Streaks', icon: '🔥' },
  challenges: { name: 'Challenges', icon: '⚔️' },
  pillar: { name: 'Pillar Mastery', icon: '🏆' },
  special: { name: 'Special', icon: '✨' },
  milestone: { name: 'Milestones', icon: '🎯' },
};

type TabType = 'all' | 'unlocked' | 'locked';

export const AchievementsScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all achievements
      const { data: allAchievements, error } = await supabase
        .from('achievements')
        .select('*')
        .order('order_index');

      if (error) throw error;

      // Fetch user's unlocked achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id);

      const unlockedMap = new Map(
        (userAchievements || []).map((ua: any) => [ua.achievement_id, ua.unlocked_at])
      );

      // Merge data
      const merged = (allAchievements || []).map((a: any) => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlocked_at: unlockedMap.get(a.id) || null,
      }));

      setAchievements(merged);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAchievements();
    }, [])
  );

  const filteredAchievements = achievements.filter((a) => {
    // Filter by tab
    if (activeTab === 'unlocked' && !a.unlocked) return false;
    if (activeTab === 'locked' && a.unlocked) return false;

    // Filter by category
    if (selectedCategory && a.category !== selectedCategory) return false;

    // Hide hidden achievements that are locked
    if (a.is_hidden && !a.unlocked) return false;

    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.filter((a) => !a.is_hidden || a.unlocked).length;

  const categories = Object.entries(CATEGORY_LABELS);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Achievements</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {unlockedCount} / {totalCount} unlocked
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: theme.surface }]}>
        <View style={styles.progressHeader}>
          <Text style={styles.trophyEmoji}>🏆</Text>
          <Text style={[styles.progressText, { color: theme.text }]}>
            {Math.round((unlockedCount / Math.max(totalCount, 1)) * 100)}% Complete
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
                width: `${(unlockedCount / Math.max(totalCount, 1)) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['all', 'unlocked', 'locked'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              {
                backgroundColor: activeTab === tab ? theme.primary : theme.surface,
              },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? 'white' : theme.textSecondary },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            {
              backgroundColor: !selectedCategory ? theme.primary : theme.surface,
            },
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.categoryText,
              { color: !selectedCategory ? 'white' : theme.textSecondary },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map(([key, value]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.categoryChip,
              {
                backgroundColor: selectedCategory === key ? theme.primary : theme.surface,
              },
            ]}
            onPress={() => setSelectedCategory(key)}
          >
            <Text style={styles.categoryIcon}>{value.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                { color: selectedCategory === key ? 'white' : theme.textSecondary },
              ]}
            >
              {value.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Achievements List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchAchievements} />
        }
      >
        {filteredAchievements.map((achievement) => {
          const rarity = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;

          return (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: achievement.unlocked ? rarity.border : 'transparent',
                  borderWidth: achievement.unlocked ? 1 : 0,
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: achievement.unlocked ? rarity.bg : theme.border,
                  },
                ]}
              >
                <Text style={[styles.icon, !achievement.unlocked && styles.iconLocked]}>
                  {achievement.unlocked ? achievement.icon : '🔒'}
                </Text>
              </View>

              <View style={styles.achievementContent}>
                <View style={styles.achievementHeader}>
                  <Text
                    style={[
                      styles.achievementName,
                      { color: achievement.unlocked ? theme.text : theme.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {achievement.name}
                  </Text>
                  <View style={[styles.rarityBadge, { backgroundColor: rarity.bg }]}>
                    <Text style={[styles.rarityText, { color: rarity.text }]}>
                      {achievement.rarity}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.achievementDescription,
                    { color: achievement.unlocked ? theme.textSecondary : theme.textMuted },
                  ]}
                  numberOfLines={2}
                >
                  {achievement.description}
                </Text>

                <View style={styles.achievementFooter}>
                  {achievement.unlocked ? (
                    <Text style={[styles.unlockedText, { color: '#22C55E' }]}>
                      ✓ Unlocked {achievement.unlocked_at
                        ? new Date(achievement.unlocked_at).toLocaleDateString()
                        : ''}
                    </Text>
                  ) : (
                    <View style={styles.rewards}>
                      <Text style={[styles.rewardText, { color: theme.primary }]}>
                        +{achievement.xp_reward} XP
                      </Text>
                      <Text style={[styles.rewardText, { color: '#F59E0B' }]}>
                        +{achievement.coin_reward} 🪙
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {filteredAchievements.length === 0 && !loading && (
          <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <Text style={styles.emptyEmoji}>🏅</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No Achievements Found
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {activeTab === 'unlocked'
                ? 'Start completing quests to unlock achievements!'
                : 'No achievements match your filters.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  progressContainer: {
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trophyEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryScroll: {
    maxHeight: 44,
    marginBottom: 12,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 28,
  },
  iconLocked: {
    opacity: 0.5,
  },
  achievementContent: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  achievementDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  achievementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unlockedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rewards: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
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
