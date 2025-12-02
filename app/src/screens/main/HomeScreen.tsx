import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { PILLAR_LIST, PillarType } from '../../types';

const { width } = Dimensions.get('window');

// Mock data - will be replaced with real data from Supabase
const mockUserData = {
  name: 'Adventurer',
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  streak: 0,
  qc: 0,
  pillars: {
    physical: { level: 1, xp: 0 },
    mental: { level: 1, xp: 0 },
    social: { level: 1, xp: 0 },
    professional: { level: 1, xp: 0 },
    spiritual: { level: 1, xp: 0 },
    creative: { level: 1, xp: 0 },
  },
};

const mockChallenges = [
  { id: 1, title: 'Walk 5,000 steps', pillar: 'physical', xp: 50, completed: false },
  { id: 2, title: 'Read for 20 minutes', pillar: 'mental', xp: 40, completed: false },
  { id: 3, title: 'Drink 8 glasses of water', pillar: 'physical', xp: 30, completed: true },
];

export const HomeScreen: React.FC = () => {
  const { mode, toggleTheme } = useThemeStore();
  const theme = getTheme(mode);

  const user = mockUserData;
  const challenges = mockChallenges;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.name, { color: theme.text }]}>{user.name} 👋</Text>
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
              Level {user.level}
            </Text>
            <Text style={[styles.xpText, { color: theme.textSecondary }]}>
              {user.xp} / {user.xpToNextLevel} XP
            </Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{user.streak}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statEmoji}>💎</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{user.qc}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
                width: `${(user.xp / user.xpToNextLevel) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Pillars Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Pillars</Text>
        <View style={styles.pillarsGrid}>
          {PILLAR_LIST.map((pillar) => (
            <TouchableOpacity
              key={pillar.id}
              style={[styles.pillarCard, { backgroundColor: theme.surface }]}
            >
              <Text style={styles.pillarEmoji}>{pillar.emoji}</Text>
              <Text style={[styles.pillarName, { color: theme.text }]}>
                {pillar.name}
              </Text>
              <Text style={[styles.pillarLevel, { color: pillar.color }]}>
                Lv {user.pillars[pillar.id as PillarType]?.level || 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Daily Challenges */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Today's Challenges
        </Text>
        {challenges.map((challenge) => {
          const pillar = PILLAR_LIST.find((p) => p.id === challenge.pillar);
          return (
            <TouchableOpacity
              key={challenge.id}
              style={[
                styles.challengeCard,
                { backgroundColor: theme.surface },
                challenge.completed && styles.challengeCompleted,
              ]}
            >
              <View
                style={[
                  styles.challengePillarIndicator,
                  { backgroundColor: pillar?.color },
                ]}
              />
              <View style={styles.challengeContent}>
                <Text
                  style={[
                    styles.challengeTitle,
                    { color: theme.text },
                    challenge.completed && styles.challengeTitleCompleted,
                  ]}
                >
                  {challenge.title}
                </Text>
                <Text style={[styles.challengeXp, { color: theme.accent }]}>
                  +{challenge.xp} XP
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: theme.border },
                  challenge.completed && {
                    backgroundColor: theme.success,
                    borderColor: theme.success,
                  },
                ]}
              >
                {challenge.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
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
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  challengeCompleted: {
    opacity: 0.7,
  },
  challengePillarIndicator: {
    width: 4,
    height: '100%',
  },
  challengeContent: {
    flex: 1,
    padding: 16,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  challengeTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  challengeXp: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
