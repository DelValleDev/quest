import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getGuildInsights,
  markInsightActedUpon,
  dismissInsight,
  subscribeToGuildInsights,
  type GuildInsight
} from '../../lib/questAI';

interface Props {
  route: {
    params: {
      guildId: string;
    };
  };
}

export default function GuildInsightsScreen({ route }: Props) {
  const { guildId } = route.params;
  const [insights, setInsights] = useState<GuildInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
    const subscription = subscribeToGuildInsights(guildId, () => {
      loadInsights();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [guildId]);

  const loadInsights = async () => {
    try {
      const data = await getGuildInsights(guildId);
      setInsights(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActUpon = async (insightId: string) => {
    try {
      await markInsightActedUpon(insightId);
      loadInsights();
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar el insight');
    }
  };

  const handleDismiss = async (insightId: string) => {
    try {
      await dismissInsight(insightId);
      loadInsights();
    } catch (error) {
      Alert.alert('Error', 'No se pudo descartar el insight');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      pattern: '📊',
      suggestion: '💡',
      warning: '⚠️',
      opportunity: '🎯',
      prediction: '🔮'
    };
    return iconMap[type] || '💡';
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
        <Text style={styles.title}>💡 Insights</Text>
        <Text style={styles.subtitle}>
          {insights.filter(i => i.status === 'active').length} activos
        </Text>
      </View>

      <FlatList
        data={insights}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.insightCard,
              { borderLeftColor: getPriorityColor(item.priority) }
            ]}
          >
            <View style={styles.insightHeader}>
              <Text style={styles.typeIcon}>{getTypeIcon(item.insight_type)}</Text>
              <View style={styles.insightInfo}>
                <Text style={styles.insightTitle}>{item.title}</Text>
                <Text style={styles.insightDesc}>{item.description}</Text>
              </View>
            </View>

            <View style={styles.insightFooter}>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(item.priority) + '20' }
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    { color: getPriorityColor(item.priority) }
                  ]}
                >
                  {item.priority}
                </Text>
              </View>

              {item.status === 'active' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actButton]}
                    onPress={() => handleActUpon(item.id)}
                  >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dismissButton]}
                    onPress={() => handleDismiss(item.id)}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {item.status !== 'active' && (
              <Text style={styles.statusText}>
                {item.status === 'acted_upon' ? '✅ Resuelto' : '❌ Descartado'}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💡</Text>
            <Text style={styles.emptyText}>No hay insights disponibles</Text>
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#9CA3AF' },
  listContent: { padding: 20 },
  insightCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4
  },
  insightHeader: { flexDirection: 'row', marginBottom: 12 },
  typeIcon: { fontSize: 32, marginRight: 12 },
  insightInfo: { flex: 1 },
  insightTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  insightDesc: { fontSize: 14, color: '#9CA3AF', lineHeight: 20 },
  insightFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actButton: { backgroundColor: '#10B981' },
  dismissButton: { backgroundColor: '#EF4444' },
  statusText: { fontSize: 12, color: '#9CA3AF', marginTop: 8, textAlign: 'right' },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#9CA3AF' }
});
