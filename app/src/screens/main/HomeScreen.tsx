import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Profile {
  display_name: string;
  level: number;
  total_xp: number;
  quest_coins: number;
  current_streak: number;
}

interface UserPillar {
  pillar_id: string;
  level: number;
  current_xp: number;
}

interface ActiveChallenge {
  id: string;
  challenge: {
    id: string;
    title: string;
    pillar_id: string;
    xp_reward: number;
    icon: string;
  };
}

const PILLARS = [
  { id: 'physical', name: 'Physical', emoji: '💪', color: '#EF4444' },
  { id: 'mental', name: 'Mental', emoji: '🧠', color: '#3B82F6' },
  { id: 'social', name: 'Social', emoji: '👥', color: '#EC4899' },
  { id: 'professional', name: 'Professional', emoji: '💼', color: '#10B981' },
  { id: 'spiritual', name: 'Spiritual', emoji: '✨', color: '#8B5CF6' },
  { id: 'creative', name: 'Creative', emoji: '🎨', color: '#F97316' },
];

export const HomeScreen: React.FC = () => {
  const { mode, toggleTheme } = useThemeStore();
  const theme = getTheme(mode);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pillars, setPillars] = useState<UserPillar[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, level, total_xp, quest_coins, current_streak')
        .eq('id', user.id)
        .single();

      // Create profile if doesn't exist
      if (profileError?.code === 'PGRST116') {
        const displayName = user.email?.split('@')[0] || 'Adventurer';
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ id: user.id, display_name: displayName })
          .select('display_name, level, total_xp, quest_coins, current_streak')
          .single();
        profileData = newProfile;

        // Create pillars
        await supabase.from('user_pillars').insert(
          PILLARS.map(p => ({ user_id: user.id, pillar_id: p.id }))
        );
      }

      setProfile(profileData);

      // Fetch pillars
      const { data: pillarsData } = await supabase
        .from('user_pillars')
        .select('pillar_id, level, current_xp')
        .eq('user_id', user.id);
      setPillars(pillarsData || []);

      // Fetch active challenges
      const { data: challengesData } = await supabase
        .from('user_challenges')
        .select('id, challenge:challenges(id, title, pillar_id, xp_reward, icon)')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      // Transform data - Supabase returns challenge as array, we need object
      const transformedChallenges = (challengesData || []).map((item: any) => ({
        id: item.id,
        challenge: Array.isArray(item.challenge) ? item.challenge[0] : item.challenge,
      })).filter((item: any) => item.challenge);
      
      setActiveChallenges(transformedChallenges);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const xpToNextLevel = profile ? profile.level * 100 : 100;
  const xpProgress = profile ? (profile.total_xp % 100) / 100 : 0;

  const getPillarLevel = (pillarId: string) => {
    const pillar = pillars.find(p => p.pillar_id === pillarId);
    return pillar?.level || 1;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchData} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.name, { color: theme.text }]}>
            {profile?.display_name || 'Adventurer'} 👋
          </Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
          <Text style={{ fontSize: 24 }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      {/* Level Progress */}
      <View style={[styles.levelCard, { backgroundColor: theme.surface }]}>
        <View style={styles.levelHeader}>
          <Text style={styles.mascot}>🤖</Text>
          <View style={styles.levelInfo}>
            <Text style={[styles.levelText, { color: theme.text }]}>
              Level {profile?.level || 1}
            </Text>
            <Text style={[styles.xpText, { color: theme.textSecondary }]}>
              {profile?.total_xp || 0} / {xpToNextLevel} XP
            </Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {profile?.current_streak || 0}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statEmoji}>🪙</Text>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                {profile?.quest_coins || 0}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
                width: `${xpProgress * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Pillars Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Pillars</Text>
        <View style={styles.pillarsGrid}>
          {PILLARS.map((pillar) => (
            <TouchableOpacity
              key={pillar.id}
              style={[styles.pillarCard, { backgroundColor: theme.surface }]}
            >
              <Text style={styles.pillarEmoji}>{pillar.emoji}</Text>
              <Text style={[styles.pillarName, { color: theme.text }]}>
                {pillar.name}
              </Text>
              <Text style={[styles.pillarLevel, { color: pillar.color }]}>
                Lv {getPillarLevel(pillar.id)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Active Challenges */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Active Quests ({activeChallenges.length})
        </Text>
        {activeChallenges.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Text style={styles.emptyIcon}>⚔️</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No active quests. Go to Quests tab to start one!
            </Text>
          </View>
        ) : (
          activeChallenges.map((item) => {
            const pillar = PILLARS.find((p) => p.id === item.challenge.pillar_id);
            return (
              <View
                key={item.id}
                style={[styles.challengeCard, { backgroundColor: theme.surface }]}
              >
                <View
                  style={[
                    styles.challengePillarIndicator,
                    { backgroundColor: pillar?.color },
                  ]}
                />
                <Text style={styles.challengeIcon}>{item.challenge.icon}</Text>
                <View style={styles.challengeContent}>
                  <Text style={[styles.challengeTitle, { color: theme.text }]}>
                    {item.challenge.title}
                  </Text>
                  <Text style={[styles.challengeXp, { color: theme.primary }]}>
                    +{item.challenge.xp_reward} XP
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#22C55E20' }]}>
                  <Text style={[styles.statusText, { color: '#22C55E' }]}>Active</Text>
                </View>
              </View>
            );
          })
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  themeToggle: {
    padding: 8,
  },
  levelCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mascot: {
    fontSize: 48,
    marginRight: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  xpText: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statEmoji: {
    fontSize: 16,
  },
  statValue: {
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pillarCard: {
    width: (width - 52) / 3,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pillarEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  pillarName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  pillarLevel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  challengePillarIndicator: {
    width: 4,
    height: '100%',
  },
  challengeIcon: {
    fontSize: 24,
    marginLeft: 12,
  },
  challengeContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 12,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  challengeXp: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
