import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderboardEntry {
  id: string;
  username: string;
  level: number;
  xp: number;
  total_tasks_completed: number;
  total_habits_completed: number;
  quest_coins: number;
  avatar_url: string | null;
}

type LeaderboardType = 'level' | 'tasks' | 'habits' | 'coins';

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [type, setType] = useState<LeaderboardType>('level');
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [type]);

  const loadLeaderboard = async () => {
    setLoading(true);

    const orderColumn =
      type === 'level'
        ? 'level'
        : type === 'tasks'
        ? 'total_tasks_completed'
        : type === 'habits'
        ? 'total_habits_completed'
        : 'quest_coins';

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, level, xp, total_tasks_completed, total_habits_completed, quest_coins, avatar_url')
      .order(orderColumn, { ascending: false })
      .limit(100);

    if (!error && data) {
      setLeaderboard(data);
      const rank = data.findIndex((entry) => entry.id === user?.id);
      setUserRank(rank !== -1 ? rank + 1 : null);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const getStatValue = (entry: LeaderboardEntry) => {
    switch (type) {
      case 'level':
        return `Nivel ${entry.level}`;
      case 'tasks':
        return `${entry.total_tasks_completed} tareas`;
      case 'habits':
        return `${entry.total_habits_completed} hábitos`;
      case 'coins':
        return `${entry.quest_coins} QC`;
      default:
        return '';
    }
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Rankings</Text>
        {userRank && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>Tu puesto: #{userRank}</Text>
          </View>
        )}
      </View>

      {/* Type Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, type === 'level' && styles.filterButtonActive]}
            onPress={() => setType('level')}
          >
            <Text style={[styles.filterText, type === 'level' && styles.filterTextActive]}>
              📊 Nivel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, type === 'tasks' && styles.filterButtonActive]}
            onPress={() => setType('tasks')}
          >
            <Text style={[styles.filterText, type === 'tasks' && styles.filterTextActive]}>
              ✅ Tareas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, type === 'habits' && styles.filterButtonActive]}
            onPress={() => setType('habits')}
          >
            <Text style={[styles.filterText, type === 'habits' && styles.filterTextActive]}>
              🎯 Hábitos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, type === 'coins' && styles.filterButtonActive]}
            onPress={() => setType('coins')}
          >
            <Text style={[styles.filterText, type === 'coins' && styles.filterTextActive]}>
              🪙 Coins
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Leaderboard List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadLeaderboard} />}
      >
        {leaderboard.map((entry, index) => {
          const rank = index + 1;
          const isCurrentUser = entry.id === user?.id;

          return (
            <View
              key={entry.id}
              style={[styles.entryCard, isCurrentUser && styles.entryCardHighlight]}
            >
              <View style={styles.rankContainer}>
                {rank <= 3 ? (
                  <Text style={styles.medalIcon}>{getMedalIcon(rank)}</Text>
                ) : (
                  <View style={styles.rankBadgeSmall}>
                    <Text style={styles.rankNumber}>{rank}</Text>
                  </View>
                )}
              </View>

              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {entry.username?.[0]?.toUpperCase() || 'A'}
                  </Text>
                </View>
              </View>

              <View style={styles.entryContent}>
                <Text style={[styles.username, isCurrentUser && styles.usernameHighlight]}>
                  {entry.username || 'Aventurero'} {isCurrentUser && '(Tú)'}
                </Text>
                <Text style={styles.statValue}>{getStatValue(entry)}</Text>
              </View>

              {rank <= 3 && (
                <View style={styles.topBadge}>
                  <Text style={styles.topBadgeText}>TOP {rank}</Text>
                </View>
              )}
            </View>
          );
        })}

        {leaderboard.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>No hay rankings disponibles</Text>
            <Text style={styles.emptySubtext}>Sé el primero en aparecer aquí</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  rankBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filters: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  entryCardHighlight: {
    backgroundColor: '#312E81',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  rankContainer: {
    width: 48,
    alignItems: 'center',
    marginRight: 12,
  },
  medalIcon: {
    fontSize: 32,
  },
  rankBadgeSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  entryContent: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  usernameHighlight: {
    color: '#A5B4FC',
  },
  statValue: {
    fontSize: 14,
    color: '#94A3B8',
  },
  topBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  topBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
  },
});
