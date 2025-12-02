import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
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
  const [loading, setLoading] = useState(true);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);

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
          // Already started today
          alert('You already started this challenge today!');
        } else {
          throw error;
        }
      } else {
        alert(`🚀 Challenge started: ${challenge.title}`);
      }
    } catch (error) {
      console.error('Error starting challenge:', error);
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
        <Text style={[styles.title, { color: theme.text }]}>Challenges</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Choose your quest for today
        </Text>
      </View>

      {/* Pillar Filter */}
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

      {/* Challenge List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchChallenges} />
        }
      >
        {challenges.map((challenge) => (
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
        ))}
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
