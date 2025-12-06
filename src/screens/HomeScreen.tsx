import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface Stats {
  level: number;
  xp: number;
  xp_to_next_level: number;
  quest_coins: number;
  streak: number;
  total_tasks_completed: number;
  total_habits_completed: number;
}

interface DailyOverview {
  pending_tasks: number;
  completed_tasks: number;
  pending_habits: number;
  completed_habits: number;
  daily_xp_earned: number;
}

interface Guild {
  id: string;
  name: string;
  icon: string;
  member_count: number;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailyOverview, setDailyOverview] = useState<DailyOverview | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');

    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadStats(), loadDailyOverview(), loadGuilds()]);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('level, xp, xp_to_next_level, quest_coins, streak, total_tasks_completed, total_habits_completed')
      .eq('id', user?.id)
      .single();

    if (!error && data) {
      setStats(data);
    }
  };

  const loadDailyOverview = async () => {
    const today = new Date().toISOString().split('T')[0];

    // Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, is_completed')
      .eq('user_id', user?.id)
      .gte('created_at', today);

    // Habits
    const { data: habits } = await supabase
      .from('habits')
      .select('id, current_streak')
      .eq('user_id', user?.id);

    const { data: habitLogs } = await supabase
      .from('habit_logs')
      .select('habit_id')
      .eq('user_id', user?.id)
      .gte('completed_at', today);

    // Daily XP
    const { data: xpLogs } = await supabase
      .from('xp_logs')
      .select('xp_amount')
      .eq('user_id', user?.id)
      .gte('earned_at', today);

    const dailyXp = xpLogs?.reduce((sum: number, log: any) => sum + log.xp_amount, 0) || 0;

    setDailyOverview({
      pending_tasks: tasks?.filter((t: any) => !t.is_completed).length || 0,
      completed_tasks: tasks?.filter((t: any) => t.is_completed).length || 0,
      pending_habits: (habits?.length || 0) - (habitLogs?.length || 0),
      completed_habits: habitLogs?.length || 0,
      daily_xp_earned: dailyXp,
    });
  };

  const loadGuilds = async () => {
    const { data } = await supabase
      .from('guild_members')
      .select('guilds(id, name, icon, member_count)')
      .eq('user_id', user?.id);

    if (data) {
      setGuilds(data.map((gm: any) => gm.guilds).filter(Boolean));
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const xpPercentage = stats ? (stats.xp / stats.xp_to_next_level) * 100 : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.username}>{user?.email?.split('@')[0] || 'Aventurero'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || 'A'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.levelRow}>
          <Text style={styles.levelText}>Nivel {stats?.level || 1}</Text>
          <Text style={styles.xpText}>
            {stats?.xp || 0} / {stats?.xp_to_next_level || 100} XP
          </Text>
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpBarFill, { width: `${xpPercentage}%` }]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🪙</Text>
            <Text style={styles.statValue}>{stats?.quest_coins || 0}</Text>
            <Text style={styles.statLabel}>QC</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>{stats?.streak || 0}</Text>
            <Text style={styles.statLabel}>Racha</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statValue}>{stats?.total_tasks_completed || 0}</Text>
            <Text style={styles.statLabel}>Tareas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🎯</Text>
            <Text style={styles.statValue}>{stats?.total_habits_completed || 0}</Text>
            <Text style={styles.statLabel}>Hábitos</Text>
          </View>
        </View>
      </View>

      {/* Daily Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hoy</Text>
        <View style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Tareas Pendientes</Text>
              <Text style={styles.overviewValue}>{dailyOverview?.pending_tasks || 0}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Tareas Completadas</Text>
              <Text style={styles.overviewValueSuccess}>{dailyOverview?.completed_tasks || 0}</Text>
            </View>
          </View>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Hábitos Pendientes</Text>
              <Text style={styles.overviewValue}>{dailyOverview?.pending_habits || 0}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Hábitos Completados</Text>
              <Text style={styles.overviewValueSuccess}>{dailyOverview?.completed_habits || 0}</Text>
            </View>
          </View>
          <View style={styles.dailyXpRow}>
            <Text style={styles.dailyXpLabel}>XP Ganado Hoy</Text>
            <Text style={styles.dailyXpValue}>+{dailyOverview?.daily_xp_earned || 0} XP ⭐</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Tasks')}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionLabel}>Tareas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Habits')}>
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionLabel}>Hábitos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Shop')}>
            <Text style={styles.actionIcon}>🛒</Text>
            <Text style={styles.actionLabel}>Tienda</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Leaderboard')}>
            <Text style={styles.actionIcon}>🏆</Text>
            <Text style={styles.actionLabel}>Rankings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Guilds */}
      {guilds.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Guilds</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Guilds')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {guilds.slice(0, 3).map((guild: any) => (
            <TouchableOpacity
              key={guild.id}
              style={styles.guildCard}
              onPress={() => navigation.navigate('GuildDetail', { guildId: guild.id })}
            >
              <Text style={styles.guildIcon}>{guild.icon}</Text>
              <View style={styles.guildInfo}>
                <Text style={styles.guildName}>{guild.name}</Text>
                <Text style={styles.guildMembers}>{guild.member_count} miembros</Text>
              </View>
              <Text style={styles.guildArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#94A3B8',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
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
  statsCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  xpText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  xpBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: '#6366F1',
  },
  overviewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overviewItem: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  overviewValueSuccess: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  dailyXpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
    marginTop: 4,
  },
  dailyXpLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  dailyXpValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - 60) / 4,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  guildCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  guildIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  guildInfo: {
    flex: 1,
  },
  guildName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  guildMembers: {
    fontSize: 12,
    color: '#94A3B8',
  },
  guildArrow: {
    fontSize: 24,
    color: '#94A3B8',
  },
});
