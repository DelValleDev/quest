import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import {
  getActivePerfectStreak,
  getPerfectStreakMilestones,
  getPerfectStreakStats,
  getPerfectStreaksHistory,
  subscribeToPerfectStreaks,
  type PerfectStreak,
  type PerfectStreakMilestone
} from '../../lib/perfectStreaks';

export default function StreaksScreen() {
  const { user } = useAuthStore();
  const [activeStreak, setActiveStreak] = useState<PerfectStreak | null>(null);
  const [milestones, setMilestones] = useState<PerfectStreakMilestone[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<PerfectStreak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
      const subscription = subscribeToPerfectStreaks(user.id, () => {
        loadData();
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [streakData, milestonesData, statsData, historyData] = await Promise.all([
        getActivePerfectStreak(user.id),
        getPerfectStreakMilestones(user.id),
        getPerfectStreakStats(user.id),
        getPerfectStreaksHistory(user.id)
      ]);

      setActiveStreak(streakData);
      setMilestones(milestonesData);
      setStats(statsData);
      setHistory(historyData.slice(0, 10)); // Últimas 10 rachas
    } catch (error) {
      console.error('Error loading streaks:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextMilestone = milestones.find(m => !m.reached);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🔥 Rachas Perfectas</Text>
          <Text style={styles.subtitle}>
            Días consecutivos completando todos tus quests
          </Text>
        </View>

        {/* Active Streak Card */}
        <View style={styles.activeStreakCard}>
          <View style={styles.streakIconContainer}>
            <Ionicons name="flame" size={60} color="#F59E0B" />
          </View>

          <View style={styles.streakInfo}>
            <Text style={styles.streakDays}>
              {activeStreak?.streak_length || 0}
            </Text>
            <Text style={styles.streakLabel}>Días de Racha</Text>

            {activeStreak && (
              <Text style={styles.streakQC}>
                {activeStreak.qc_earned} QC ganados
              </Text>
            )}
          </View>

          {nextMilestone && (
            <View style={styles.nextMilestoneCard}>
              <Text style={styles.nextMilestoneLabel}>Próximo Milestone:</Text>
              <Text style={styles.nextMilestoneValue}>
                {nextMilestone.days} días (+{nextMilestone.qc_reward} QC)
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${((activeStreak?.streak_length || 0) / nextMilestone.days) * 100}%`
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {nextMilestone.days - (activeStreak?.streak_length || 0)} días restantes
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>📊 Estadísticas</Text>
            
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.longest_streak}</Text>
                <Text style={styles.statLabel}>Récord</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_streaks}</Text>
                <Text style={styles.statLabel}>Total Rachas</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_qc_earned}</Text>
                <Text style={styles.statLabel}>QC Ganados</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_days_in_streaks}</Text>
                <Text style={styles.statLabel}>Días Totales</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.average_streak_length}</Text>
                <Text style={styles.statLabel}>Promedio</Text>
              </View>
            </View>
          </View>
        )}

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Milestones</Text>

          {milestones.map((milestone, index) => (
            <View
              key={index}
              style={[
                styles.milestoneCard,
                milestone.reached && styles.milestoneReached
              ]}
            >
              <View style={styles.milestoneIcon}>
                <Ionicons
                  name={milestone.reached ? "checkmark-circle" : "ellipse-outline"}
                  size={32}
                  color={milestone.reached ? "#10B981" : "#6B7280"}
                />
              </View>

              <View style={styles.milestoneInfo}>
                <Text style={[
                  styles.milestoneDays,
                  milestone.reached && styles.milestoneReachedText
                ]}>
                  {milestone.days} días
                </Text>
                <Text style={styles.milestoneReward}>
                  +{milestone.qc_reward} QC
                </Text>
              </View>

              {milestone.reached && milestone.date_reached && (
                <Text style={styles.milestoneDate}>
                  {new Date(milestone.date_reached).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📜 Historial</Text>

            {history.map((streak, index) => (
              <View key={streak.id} style={styles.historyCard}>
                <View style={styles.historyIcon}>
                  {streak.is_active ? (
                    <Ionicons name="flame" size={24} color="#F59E0B" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  )}
                </View>

                <View style={styles.historyInfo}>
                  <Text style={styles.historyDays}>
                    {streak.streak_length} días {streak.is_active && '(Activa)'}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(streak.start_date).toLocaleDateString()} -{' '}
                    {streak.end_date
                      ? new Date(streak.end_date).toLocaleDateString()
                      : 'Presente'}
                  </Text>
                </View>

                <View style={styles.historyQC}>
                  <Text style={styles.historyQCText}>+{streak.qc_earned} QC</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips</Text>
          <Text style={styles.tipsText}>
            • Completa todos tus Daily Quests cada día para mantener la racha
          </Text>
          <Text style={styles.tipsText}>
            • Gana bonos de QC cada 7, 14, 21, 30+ días consecutivos
          </Text>
          <Text style={styles.tipsText}>
            • Si rompes la racha, empieza de nuevo al día siguiente
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E'
  },
  scrollContent: {
    padding: 20
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF'
  },
  activeStreakCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24
  },
  streakIconContainer: {
    marginBottom: 16
  },
  streakInfo: {
    alignItems: 'center',
    marginBottom: 20
  },
  streakDays: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 8
  },
  streakLabel: {
    fontSize: 18,
    color: '#9CA3AF',
    marginBottom: 8
  },
  streakQC: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600'
  },
  nextMilestoneCard: {
    width: '100%',
    backgroundColor: '#0F0F1E',
    borderRadius: 12,
    padding: 16,
    marginTop: 16
  },
  nextMilestoneLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4
  },
  nextMilestoneValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4
  },
  progressText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center'
  },
  statsCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  milestoneReached: {
    backgroundColor: '#10B98120'
  },
  milestoneIcon: {
    marginRight: 16
  },
  milestoneInfo: {
    flex: 1
  },
  milestoneDays: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  milestoneReachedText: {
    color: '#10B981'
  },
  milestoneReward: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  milestoneDate: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  historyIcon: {
    marginRight: 16
  },
  historyInfo: {
    flex: 1
  },
  historyDays: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  historyDate: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  historyQC: {
    backgroundColor: '#10B98120',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  historyQCText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981'
  },
  tipsCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12
  },
  tipsText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
    lineHeight: 20
  }
});
