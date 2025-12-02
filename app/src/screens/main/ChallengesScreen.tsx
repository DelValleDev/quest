import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

interface Challenge {
  id: string;
  title: string;
  description: string;
  pillar_id: string;
  difficulty: string;
  xp_reward: number;
  coin_reward: number;
  duration_minutes: number | null;
  is_daily: boolean;
  icon: string;
}

interface ActiveChallenge {
  id: string;
  challenge_id: string;
  status: string;
  started_at: string;
  challenge: Challenge;
}

const PILLAR_COLORS: Record<string, string> = {
  physical: '#EF4444',
  mental: '#3B82F6',
  social: '#EC4899',
  professional: '#10B981',
  spiritual: '#8B5CF6',
  creative: '#F97316',
};

const DIFFICULTY_XP: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: '#22C55E' },
  medium: { label: 'Medium', color: '#F59E0B' },
  hard: { label: 'Hard', color: '#EF4444' },
  epic: { label: 'Epic', color: '#8B5CF6' },
};

export const ChallengesScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      let query = supabase.from('challenges').select('*');
      
      if (selectedPillar) {
        query = query.eq('pillar_id', selectedPillar);
      }
      
      const { data, error } = await query.order('difficulty');
      
      if (error) throw error;
      setChallenges(data || []);

      // Fetch active challenges
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: activeData } = await supabase
          .from('user_challenges')
          .select('*, challenge:challenges(*)')
          .eq('user_id', user.id)
          .eq('status', 'active');
        
        setActiveChallenges(activeData || []);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [selectedPillar]);

  const startChallenge = async (challenge: Challenge) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('user_challenges').insert({
        user_id: user.id,
        challenge_id: challenge.id,
        status: 'active',
        scheduled_date: new Date().toISOString().split('T')[0],
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already Started', 'You already have this challenge active!');
        } else {
          throw error;
        }
      } else {
        Alert.alert('🚀 Quest Started!', `Good luck with: ${challenge.title}`);
        fetchChallenges(); // Refresh
      }
    } catch (error) {
      console.error('Error starting challenge:', error);
    }
  };

  const completeChallenge = async (activeChallenge: ActiveChallenge) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const challenge = activeChallenge.challenge;

      // Update challenge status
      await supabase
        .from('user_challenges')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', activeChallenge.id);

      // Update user profile (XP and coins)
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp, quest_coins, level')
        .eq('id', user.id)
        .single();

      if (profile) {
        const newXp = profile.total_xp + challenge.xp_reward;
        const newCoins = profile.quest_coins + challenge.coin_reward;
        const xpForNextLevel = profile.level * 100;
        const newLevel = newXp >= xpForNextLevel ? profile.level + 1 : profile.level;

        await supabase
          .from('profiles')
          .update({ 
            total_xp: newXp, 
            quest_coins: newCoins,
            level: newLevel,
          })
          .eq('id', user.id);
      }

      // Update pillar progress
      const { data: pillar } = await supabase
        .from('user_pillars')
        .select('current_xp, level, challenges_completed')
        .eq('user_id', user.id)
        .eq('pillar_id', challenge.pillar_id)
        .single();

      if (pillar) {
        const newPillarXp = pillar.current_xp + challenge.xp_reward;
        const xpNeeded = pillar.level * 100;
        const newPillarLevel = newPillarXp >= xpNeeded ? pillar.level + 1 : pillar.level;
        
        await supabase
          .from('user_pillars')
          .update({
            current_xp: newPillarXp >= xpNeeded ? newPillarXp - xpNeeded : newPillarXp,
            level: newPillarLevel,
            challenges_completed: pillar.challenges_completed + 1,
          })
          .eq('user_id', user.id)
          .eq('pillar_id', challenge.pillar_id);
      }

      Alert.alert(
        '🎉 Quest Complete!', 
        `You earned +${challenge.xp_reward} XP and +${challenge.coin_reward} 🪙!`,
        [{ text: 'Awesome!', onPress: fetchChallenges }]
      );
    } catch (error) {
      console.error('Error completing challenge:', error);
    }
  };

  const pillars = [
    { id: 'physical', icon: '💪', name: 'Physical' },
    { id: 'mental', icon: '🧠', name: 'Mental' },
    { id: 'social', icon: '👥', name: 'Social' },
    { id: 'professional', icon: '💼', name: 'Professional' },
    { id: 'spiritual', icon: '✨', name: 'Spiritual' },
    { id: 'creative', icon: '🎨', name: 'Creative' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Quests</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {activeTab === 'available' ? 'Choose your quest' : `${activeChallenges.length} active quests`}
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'available' && { backgroundColor: theme.primary },
          ]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'available' ? '#FFF' : theme.textSecondary }]}>
            Available
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'active' && { backgroundColor: theme.primary },
          ]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'active' ? '#FFF' : theme.textSecondary }]}>
            Active ({activeChallenges.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pillar Filter (only for available) */}
      {activeTab === 'available' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: !selectedPillar ? theme.primary : theme.surface },
            ]}
            onPress={() => setSelectedPillar(null)}
          >
            <Text style={[styles.filterText, { color: !selectedPillar ? '#FFF' : theme.text }]}>
              All
            </Text>
          </TouchableOpacity>
          {pillars.map((pillar) => (
            <TouchableOpacity
              key={pillar.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedPillar === pillar.id
                      ? PILLAR_COLORS[pillar.id]
                      : theme.surface,
                },
              ]}
              onPress={() => setSelectedPillar(pillar.id)}
            >
              <Text style={styles.filterIcon}>{pillar.icon}</Text>
              <Text
                style={[
                  styles.filterText,
                  { color: selectedPillar === pillar.id ? '#FFF' : theme.text },
                ]}
              >
                {pillar.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Challenge List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchChallenges} />
        }
      >
        {activeTab === 'active' ? (
          // Active Challenges
          activeChallenges.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No active quests. Start one from Available!
              </Text>
            </View>
          ) : (
            activeChallenges.map((active) => (
              <TouchableOpacity
                key={active.id}
                style={[
                  styles.challengeCard,
                  {
                    backgroundColor: theme.surface,
                    borderLeftColor: PILLAR_COLORS[active.challenge.pillar_id],
                  },
                ]}
                onPress={() => {
                  Alert.alert(
                    'Complete Quest?',
                    `Did you finish "${active.challenge.title}"?`,
                    [
                      { text: 'Not yet', style: 'cancel' },
                      { text: '✅ Complete!', onPress: () => completeChallenge(active) },
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={styles.challengeHeader}>
                  <Text style={styles.challengeIcon}>{active.challenge.icon}</Text>
                  <View style={styles.challengeInfo}>
                    <Text style={[styles.challengeTitle, { color: theme.text }]}>
                      {active.challenge.title}
                    </Text>
                    <Text style={[styles.challengeDesc, { color: theme.textSecondary }]}>
                      Tap to complete and earn rewards!
                    </Text>
                  </View>
                </View>

                <View style={styles.challengeFooter}>
                  <View style={styles.rewardContainer}>
                    <Text style={[styles.reward, { color: theme.primary }]}>
                      +{active.challenge.xp_reward} XP
                    </Text>
                    <Text style={[styles.reward, { color: '#F59E0B' }]}>
                      +{active.challenge.coin_reward} 🪙
                    </Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: '#22C55E' }]}>
                    <Text style={styles.tagText}>In Progress</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )
        ) : (
          // Available Challenges
          challenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            style={[
              styles.challengeCard,
              {
                backgroundColor: theme.surface,
                borderLeftColor: PILLAR_COLORS[challenge.pillar_id],
              },
            ]}
            onPress={() => startChallenge(challenge)}
            activeOpacity={0.7}
          >
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeIcon}>{challenge.icon}</Text>
              <View style={styles.challengeInfo}>
                <Text style={[styles.challengeTitle, { color: theme.text }]}>
                  {challenge.title}
                </Text>
                <Text style={[styles.challengeDesc, { color: theme.textSecondary }]}>
                  {challenge.description}
                </Text>
              </View>
            </View>

            <View style={styles.challengeFooter}>
              <View style={styles.rewardContainer}>
                <Text style={[styles.reward, { color: theme.primary }]}>
                  +{challenge.xp_reward} XP
                </Text>
                <Text style={[styles.reward, { color: '#F59E0B' }]}>
                  +{challenge.coin_reward} 🪙
                </Text>
              </View>

              <View style={styles.tagsContainer}>
                {challenge.is_daily && (
                  <View style={[styles.tag, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.tagText}>Daily</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.tag,
                    { backgroundColor: DIFFICULTY_XP[challenge.difficulty]?.color || '#666' },
                  ]}
                >
                  <Text style={styles.tagText}>
                    {DIFFICULTY_XP[challenge.difficulty]?.label || challenge.difficulty}
                  </Text>
                </View>
                {challenge.duration_minutes && (
                  <View style={[styles.tag, { backgroundColor: theme.border }]}>
                    <Text style={[styles.tagText, { color: theme.text }]}>
                      {challenge.duration_minutes}m
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
          ))
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  filterContainer: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  challengeCard: {
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  challengeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  rewardContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  reward: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
});
