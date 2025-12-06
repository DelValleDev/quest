import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const screenWidth = Dimensions.get('window').width;

interface AnalyticsData {
  xpOverTime: { labels: string[]; data: number[] };
  tasksCompleted: { labels: string[]; data: number[] };
  qcEarnedSpent: { earned: number; spent: number };
  streaksHistory: { labels: string[]; data: number[] };
}

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // XP over time
      const { data: xpData } = await supabase
        .from('tasks')
        .select('completed_at, xp_earned')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true })
        .limit(30);

      // Tasks completed per day
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      // QC earned/spent
      const { data: profile } = await supabase
        .from('profiles')
        .select('quest_coins, total_qc_earned, total_qc_spent')
        .eq('id', user.id)
        .single();

      // Streaks history
      const { data: streaksData } = await supabase
        .from('streaks')
        .select('current_count, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: true });

      // Process data for charts
      const xpLabels = xpData?.slice(-7).map(t => 
        new Date(t.completed_at!).toLocaleDateString('es', { day: 'numeric', month: 'short' })
      ) || [];
      const xpValues = xpData?.slice(-7).map(t => t.xp_earned) || [];

      const tasksLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const tasksValues = [5, 8, 6, 10, 7, 4, 9]; // Mock - calcularlo por día

      setAnalytics({
        xpOverTime: { labels: xpLabels, data: xpValues },
        tasksCompleted: { labels: tasksLabels, data: tasksValues },
        qcEarnedSpent: { 
          earned: profile?.total_qc_earned || 0,
          spent: profile?.total_qc_spent || 0
        },
        streaksHistory: {
          labels: streaksData?.slice(-7).map(s => 
            new Date(s.updated_at).toLocaleDateString('es', { day: 'numeric' })
          ) || [],
          data: streaksData?.slice(-7).map(s => s.current_count) || []
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
  };

  if (loading || !analytics) {
    return (
      <View style={styles.container}>
        <Text>Cargando analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Analytics</Text>
        
        {/* Timeframe Selector */}
        <View style={styles.timeframeSelector}>
          {(['week', 'month', 'year'] as const).map(tf => (
            <TouchableOpacity
              key={tf}
              style={[styles.timeframeButton, timeframe === tf && styles.timeframeButtonActive]}
              onPress={() => setTimeframe(tf)}
            >
              <Text style={[styles.timeframeText, timeframe === tf && styles.timeframeTextActive]}>
                {tf === 'week' ? 'Semana' : tf === 'month' ? 'Mes' : 'Año'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* XP Over Time */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>XP Ganado</Text>
        <LineChart
          data={{
            labels: analytics.xpOverTime.labels,
            datasets: [{ data: analytics.xpOverTime.data }]
          }}
          width={screenWidth - 60}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Tasks Completed */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Tareas Completadas por Día</Text>
        <BarChart
          data={{
            labels: analytics.tasksCompleted.labels,
            datasets: [{ data: analytics.tasksCompleted.data }]
          }}
          width={screenWidth - 60}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
        />
      </View>

      {/* QC Earned/Spent */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Quest Coins</Text>
        <View style={styles.qcContainer}>
          <View style={styles.qcItem}>
            <Text style={styles.qcLabel}>Ganadas</Text>
            <Text style={[styles.qcValue, { color: '#28a745' }]}>
              +{analytics.qcEarnedSpent.earned}
            </Text>
          </View>
          <View style={styles.qcDivider} />
          <View style={styles.qcItem}>
            <Text style={styles.qcLabel}>Gastadas</Text>
            <Text style={[styles.qcValue, { color: '#dc3545' }]}>
              -{analytics.qcEarnedSpent.spent}
            </Text>
          </View>
          <View style={styles.qcDivider} />
          <View style={styles.qcItem}>
            <Text style={styles.qcLabel}>Balance</Text>
            <Text style={[styles.qcValue, { color: '#667eea' }]}>
              {analytics.qcEarnedSpent.earned - analytics.qcEarnedSpent.spent}
            </Text>
          </View>
        </View>
      </View>

      {/* Streaks History */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Historial de Rachas</Text>
        <LineChart
          data={{
            labels: analytics.streaksHistory.labels,
            datasets: [{ data: analytics.streaksHistory.data }]
          }}
          width={screenWidth - 60}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(255, 159, 64, ${opacity})`,
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Export Button */}
      <TouchableOpacity style={styles.exportButton}>
        <Text style={styles.exportButtonText}>📥 Exportar Analytics (CSV)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: '#667eea',
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  timeframeTextActive: {
    color: 'white',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  chart: {
    borderRadius: 8,
  },
  qcContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  qcItem: {
    alignItems: 'center',
  },
  qcLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  qcValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  qcDivider: {
    width: 1,
    backgroundColor: '#e9ecef',
  },
  exportButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
