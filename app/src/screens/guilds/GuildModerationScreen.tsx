import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getModerationLogs, getModerationStats, type ModerationLog } from '../../lib/moderation';

interface Props {
  route: {
    params: {
      guildId: string;
    };
  };
}

export default function GuildModerationScreen({ route }: Props) {
  const { guildId } = route.params;
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [guildId]);

  const loadData = async () => {
    try {
      const [logsData, statsData] = await Promise.all([
        getModerationLogs(guildId),
        getModerationStats(guildId)
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'deleted': return '#EF4444';
      case 'warned': return '#F59E0B';
      case 'muted': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ Moderación</Text>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_actions}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.warnings}</Text>
              <Text style={styles.statLabel}>Warnings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.deletions}</Text>
              <Text style={styles.statLabel}>Deleted</Text>
            </View>
          </View>
          <Text style={styles.avgScore}>
            Avg Toxicity: {(stats.avg_toxicity_score * 100).toFixed(1)}%
          </Text>
        </View>
      )}

      {/* Logs List */}
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.logUser}>User: {item.user_id.slice(0, 8)}...</Text>
              <View style={[styles.actionBadge, { backgroundColor: getActionColor(item.action_taken) }]}>
                <Text style={styles.actionText}>{item.action_taken}</Text>
              </View>
            </View>
            <Text style={styles.logContent} numberOfLines={3}>
              {item.content}
            </Text>
            <View style={styles.logFooter}>
              <Text style={styles.toxicityText}>
                Toxicity: {(item.toxicity_score * 100).toFixed(1)}%
              </Text>
              <Text style={styles.logDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay logs de moderación</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1E' },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  statsCard: { backgroundColor: '#1A1A2E', marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#8B5CF6', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#9CA3AF' },
  avgScore: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  listContent: { padding: 20 },
  logCard: { backgroundColor: '#1A1A2E', borderRadius: 12, padding: 16, marginBottom: 12 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  logUser: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  actionBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },
  logContent: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  toxicityText: { fontSize: 12, color: '#F59E0B' },
  logDate: { fontSize: 12, color: '#6B7280' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#9CA3AF' }
});
