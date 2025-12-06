import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Profile {
  username: string;
  level: number;
  xp: number;
  xp_to_next_level: number;
  quest_coins: number;
  streak: number;
  total_tasks_completed: number;
  total_habits_completed: number;
  class: string;
  avatar_url: string | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    
    // Profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Recent Achievements (últimos 6)
    const { data: achievementsData } = await supabase
      .from('user_achievements')
      .select('achievements(id, name, description, icon), unlocked_at')
      .eq('user_id', user?.id)
      .order('unlocked_at', { ascending: false })
      .limit(6);

    if (achievementsData) {
      setAchievements(
        achievementsData.map((ua: any) => ({
          ...ua.achievements,
          unlocked_at: ua.unlocked_at,
        }))
      );
    }

    setLoading(false);
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const xpPercentage = profile
    ? (profile.xp / profile.xp_to_next_level) * 100
    : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadProfile} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
          </Text>
        </View>
        <Text style={styles.username}>
          @{profile?.username || user?.email?.split('@')[0] || 'Aventurero'}
        </Text>
        <Text style={styles.class}>{profile?.class || 'Guerrero'}</Text>
      </View>

      {/* Level & XP */}
      <View style={styles.levelCard}>
        <View style={styles.levelHeader}>
          <Text style={styles.levelText}>Nivel {profile?.level || 1}</Text>
          <Text style={styles.xpText}>
            {profile?.xp || 0} / {profile?.xp_to_next_level || 100} XP
          </Text>
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpBarFill, { width: `${xpPercentage}%` }]} />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🪙</Text>
          <Text style={styles.statValue}>{profile?.quest_coins || 0}</Text>
          <Text style={styles.statLabel}>Quest Coins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statValue}>{profile?.streak || 0}</Text>
          <Text style={styles.statLabel}>Racha</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>✅</Text>
          <Text style={styles.statValue}>{profile?.total_tasks_completed || 0}</Text>
          <Text style={styles.statLabel}>Tareas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎯</Text>
          <Text style={styles.statValue}>{profile?.total_habits_completed || 0}</Text>
          <Text style={styles.statLabel}>Hábitos</Text>
        </View>
      </View>

      {/* Recent Achievements */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Logros Recientes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Badges')}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.achievementsGrid}>
          {achievements.length > 0 ? (
            achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={styles.achievementName}>{achievement.name}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyAchievements}>
              <Text style={styles.emptyText}>Aún no tienes logros</Text>
              <Text style={styles.emptySubtext}>Completa tareas y hábitos para desbloquearlos</Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Badges')}
        >
          <Text style={styles.menuIcon}>🏆</Text>
          <Text style={styles.menuText}>Mis Badges</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Friends')}
        >
          <Text style={styles.menuIcon}>👥</Text>
          <Text style={styles.menuText}>Amigos</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuText}>Rankings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Shop')}
        >
          <Text style={styles.menuIcon}>🛒</Text>
          <Text style={styles.menuText}>Tienda</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PrivacyExplanation')}
        >
          <Text style={styles.menuIcon}>🔒</Text>
          <Text style={styles.menuText}>Privacidad</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  class: {
    fontSize: 16,
    color: '#94A3B8',
  },
  levelCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  levelHeader: {
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
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
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
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '30%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyAchievements: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  menuArrow: {
    fontSize: 24,
    color: '#94A3B8',
  },
  signOutButton: {
    marginHorizontal: 20,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
