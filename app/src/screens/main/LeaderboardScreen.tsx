import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store';
import { supabase } from '../../lib/supabase';

// Types
interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  total_xp: number;
  current_streak: number;
  user_class: string;
  isCurrentUser: boolean;
}

type TimeFilter = 'weekly' | 'monthly' | 'allTime';
type CategoryFilter = 'xp' | 'streak' | 'challenges';

const CLASS_ICONS: Record<string, string> = {
  warrior: '⚔️',
  sage: '📚',
  connector: '🤝',
  creator: '🎨',
  achiever: '🏆',
  monk: '🧘',
};

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700', // Gold
  2: '#C0C0C0', // Silver
  3: '#CD7F32', // Bronze
};

interface LeaderboardScreenProps {
  embedded?: boolean;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ embedded = false }) => {
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('xp');
  const [userRank, setUserRank] = useState<number | null>(null);

  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F1F5F9' : '#1E293B',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    primary: '#8B5CF6',
    border: isDark ? '#334155' : '#E2E8F0',
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
  };

  useEffect(() => {
    getCurrentUser();
    fetchLeaderboard();
  }, [timeFilter, categoryFilter]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Determine order column based on category
      let orderColumn = 'total_xp';
      if (categoryFilter === 'streak') orderColumn = 'current_streak';
      if (categoryFilter === 'challenges') orderColumn = 'challenges_completed';

      // Fetch top 100 users
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, level, total_xp, current_streak, user_class, challenges_completed')
        .order(orderColumn, { ascending: false })
        .limit(100);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();

      const formattedData: LeaderboardEntry[] = (data || []).map((entry, index) => ({
        id: entry.id,
        rank: index + 1,
        username: entry.username || 'Anonymous',
        display_name: entry.display_name || entry.username || 'Anonymous',
        avatar_url: entry.avatar_url,
        level: entry.level || 1,
        total_xp: entry.total_xp || 0,
        current_streak: entry.current_streak || 0,
        user_class: entry.user_class || 'warrior',
        isCurrentUser: entry.id === user?.id,
      }));

      setLeaderboard(formattedData);

      // Find current user's rank
      const userEntry = formattedData.find(e => e.isCurrentUser);
      if (userEntry) {
        setUserRank(userEntry.rank);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const getStatValue = (entry: LeaderboardEntry): string => {
    switch (categoryFilter) {
      case 'xp':
        return `${entry.total_xp.toLocaleString()} XP`;
      case 'streak':
        return `${entry.current_streak} 🔥`;
      case 'challenges':
        return `${entry.total_xp} retos`; // Using XP as proxy
      default:
        return `${entry.total_xp} XP`;
    }
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return <Text style={styles.rankEmoji}>🥇</Text>;
    } else if (rank === 2) {
      return <Text style={styles.rankEmoji}>🥈</Text>;
    } else if (rank === 3) {
      return <Text style={styles.rankEmoji}>🥉</Text>;
    }
    return (
      <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>
        #{rank}
      </Text>
    );
  };

  const renderLeaderboardItem = (entry: LeaderboardEntry) => {
    const isTopThree = entry.rank <= 3;
    
    return (
      <View
        key={entry.id}
        style={[
          styles.leaderboardItem,
          { 
            backgroundColor: entry.isCurrentUser ? colors.primary + '20' : colors.card,
            borderColor: entry.isCurrentUser ? colors.primary : colors.border,
            borderWidth: entry.isCurrentUser ? 2 : 1,
          },
        ]}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {renderRankBadge(entry.rank)}
        </View>

        {/* Avatar */}
        <View style={[
          styles.avatarContainer,
          isTopThree && { borderColor: RANK_COLORS[entry.rank], borderWidth: 2 }
        ]}>
          {entry.avatar_url ? (
            <Image source={{ uri: entry.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {entry.display_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.classIcon}>{CLASS_ICONS[entry.user_class] || '⚔️'}</Text>
        </View>

        {/* Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
              {entry.display_name}
            </Text>
            {entry.isCurrentUser && (
              <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.youBadgeText}>TÚ</Text>
              </View>
            )}
          </View>
          <Text style={[styles.level, { color: colors.textSecondary }]}>
            Nivel {entry.level}
          </Text>
        </View>

        {/* Stat */}
        <View style={styles.statContainer}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {getStatValue(entry)}
          </Text>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Time Filter */}
      <View style={styles.filterGroup}>
        {(['weekly', 'monthly', 'allTime'] as TimeFilter[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              { 
                backgroundColor: timeFilter === filter ? colors.primary : colors.card,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setTimeFilter(filter)}
          >
            <Text style={[
              styles.filterButtonText,
              { color: timeFilter === filter ? '#FFFFFF' : colors.textSecondary }
            ]}>
              {filter === 'weekly' ? 'Semanal' : filter === 'monthly' ? 'Mensual' : 'Total'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Filter */}
      <View style={[styles.filterGroup, { marginTop: 12 }]}>
        {(['xp', 'streak', 'challenges'] as CategoryFilter[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              { 
                backgroundColor: categoryFilter === filter ? colors.primary : colors.card,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setCategoryFilter(filter)}
          >
            <Text style={[
              styles.filterButtonText,
              { color: categoryFilter === filter ? '#FFFFFF' : colors.textSecondary }
            ]}>
              {filter === 'xp' ? '⭐ XP' : filter === 'streak' ? '🔥 Racha' : '🎯 Retos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTopThree = () => {
    const top3 = leaderboard.slice(0, 3);
    if (top3.length < 3) return null;

    return (
      <View style={styles.topThreeContainer}>
        {/* Second Place */}
        <View style={styles.topThreeItem}>
          <View style={[styles.topThreePodium, styles.secondPlace, { backgroundColor: colors.card }]}>
            <Text style={styles.topThreeRank}>🥈</Text>
            <View style={[styles.topThreeAvatar, { borderColor: colors.silver }]}>
              {top3[1].avatar_url ? (
                <Image source={{ uri: top3[1].avatar_url }} style={styles.topThreeAvatarImage} />
              ) : (
                <Text style={styles.topThreeAvatarText}>
                  {top3[1].display_name.charAt(0)}
                </Text>
              )}
            </View>
            <Text style={[styles.topThreeName, { color: colors.text }]} numberOfLines={1}>
              {top3[1].display_name}
            </Text>
            <Text style={[styles.topThreeStat, { color: colors.textSecondary }]}>
              {getStatValue(top3[1])}
            </Text>
          </View>
        </View>

        {/* First Place */}
        <View style={[styles.topThreeItem, styles.firstPlaceItem]}>
          <View style={[styles.topThreePodium, styles.firstPlace, { backgroundColor: colors.card }]}>
            <Text style={styles.topThreeRank}>👑</Text>
            <View style={[styles.topThreeAvatar, styles.firstPlaceAvatar, { borderColor: colors.gold }]}>
              {top3[0].avatar_url ? (
                <Image source={{ uri: top3[0].avatar_url }} style={[styles.topThreeAvatarImage, styles.firstPlaceAvatarImage]} />
              ) : (
                <Text style={[styles.topThreeAvatarText, styles.firstPlaceAvatarText]}>
                  {top3[0].display_name.charAt(0)}
                </Text>
              )}
            </View>
            <Text style={[styles.topThreeName, { color: colors.text }]} numberOfLines={1}>
              {top3[0].display_name}
            </Text>
            <Text style={[styles.topThreeStat, { color: colors.gold }]}>
              {getStatValue(top3[0])}
            </Text>
          </View>
        </View>

        {/* Third Place */}
        <View style={styles.topThreeItem}>
          <View style={[styles.topThreePodium, styles.thirdPlace, { backgroundColor: colors.card }]}>
            <Text style={styles.topThreeRank}>🥉</Text>
            <View style={[styles.topThreeAvatar, { borderColor: colors.bronze }]}>
              {top3[2].avatar_url ? (
                <Image source={{ uri: top3[2].avatar_url }} style={styles.topThreeAvatarImage} />
              ) : (
                <Text style={styles.topThreeAvatarText}>
                  {top3[2].display_name.charAt(0)}
                </Text>
              )}
            </View>
            <Text style={[styles.topThreeName, { color: colors.text }]} numberOfLines={1}>
              {top3[2].display_name}
            </Text>
            <Text style={[styles.topThreeStat, { color: colors.textSecondary }]}>
              {getStatValue(top3[2])}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const Container = embedded ? View : SafeAreaView;

  if (loading && !refreshing) {
    return (
      <Container style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando ranking...
          </Text>
        </View>
      </Container>
    );
  }

  return (
    <Container style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🏆 Ranking</Text>
        {userRank && (
          <View style={[styles.yourRankBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.yourRankText}>Tu posición: #{userRank}</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderFilters()}
        {renderTopThree()}

        {/* Rest of leaderboard */}
        <View style={styles.listContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CLASIFICACIÓN COMPLETA
          </Text>
          {leaderboard.slice(3).map(renderLeaderboardItem)}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  yourRankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  yourRankText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  topThreeItem: {
    flex: 1,
    alignItems: 'center',
  },
  firstPlaceItem: {
    marginTop: -20,
  },
  topThreePodium: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    width: '95%',
  },
  firstPlace: {
    paddingVertical: 16,
  },
  secondPlace: {},
  thirdPlace: {},
  topThreeRank: {
    fontSize: 24,
    marginBottom: 8,
  },
  topThreeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    marginBottom: 8,
  },
  firstPlaceAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  topThreeAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  firstPlaceAvatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  topThreeAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  firstPlaceAvatarText: {
    fontSize: 24,
  },
  topThreeName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 80,
  },
  topThreeStat: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 24,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  classIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 14,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 2,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    maxWidth: 120,
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  level: {
    fontSize: 13,
    marginTop: 2,
  },
  statContainer: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default LeaderboardScreen;
