/**
 * PillarProgressChart Component
 * Visualizes pillar level progress over time with a simple line/bar chart
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { PillarSnapshotService, ChartDataPoint, PillarGrowth } from '../lib/pillarSnapshots';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PillarProgressChartProps {
  userId: string;
  theme: any;
  compact?: boolean;
}

const PILLARS = [
  { id: 'physical', name: 'Physical', emoji: '💪', color: '#EF4444' },
  { id: 'mental', name: 'Mental', emoji: '🧠', color: '#3B82F6' },
  { id: 'social', name: 'Social', emoji: '👥', color: '#F59E0B' },
  { id: 'professional', name: 'Professional', emoji: '💼', color: '#10B981' },
  { id: 'spiritual', name: 'Spiritual', emoji: '🧘', color: '#8B5CF6' },
  { id: 'creative', name: 'Creative', emoji: '🎨', color: '#EC4899' },
];

type TimeRange = 7 | 14 | 30;

export const PillarProgressChart: React.FC<PillarProgressChartProps> = ({
  userId,
  theme,
  compact = false,
}) => {
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  const [growth, setGrowth] = useState<PillarGrowth[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [userId, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Ensure today's snapshot exists
      await PillarSnapshotService.ensureDailySnapshot(userId);
      
      // Fetch data
      const [historyData, growthData] = await Promise.all([
        PillarSnapshotService.getPillarHistory(userId, timeRange),
        PillarSnapshotService.getPillarGrowth(userId),
      ]);
      
      setHistory(historyData);
      setGrowth(growthData);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate chart dimensions
  const chartWidth = SCREEN_WIDTH - 48;
  const chartHeight = compact ? 100 : 150;
  const maxLevel = useMemo(() => {
    if (history.length === 0) return 10;
    const allLevels = history.flatMap(h => [
      h.physical, h.mental, h.social, h.professional, h.spiritual, h.creative
    ]);
    return Math.max(...allLevels, 5) + 2;
  }, [history]);

  // Get growth for a pillar
  const getGrowthForPillar = (pillarId: string): PillarGrowth | undefined => {
    return growth.find(g => g.pillar_id === pillarId);
  };

  // Render simple bar chart for each pillar
  const renderBarChart = () => {
    if (history.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            📊 Progress tracking will appear here
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Check back tomorrow to see your growth!
          </Text>
        </View>
      );
    }

    const latestData = history[history.length - 1];
    const pillarsData = selectedPillar 
      ? PILLARS.filter(p => p.id === selectedPillar)
      : PILLARS;

    return (
      <View style={styles.barChartContainer}>
        {pillarsData.map((pillar) => {
          const level = (latestData as any)[pillar.id] || 1;
          const prevLevel = history.length > 1 
            ? (history[history.length - 2] as any)[pillar.id] || 1
            : level;
          const change = level - prevLevel;
          const barWidth = (level / maxLevel) * 100;
          const growthInfo = getGrowthForPillar(pillar.id);

          return (
            <TouchableOpacity
              key={pillar.id}
              style={styles.barRow}
              onPress={() => setSelectedPillar(
                selectedPillar === pillar.id ? null : pillar.id
              )}
              activeOpacity={0.7}
            >
              <View style={styles.barLabel}>
                <Text style={styles.barEmoji}>{pillar.emoji}</Text>
                {!compact && (
                  <Text style={[styles.barName, { color: theme.text }]} numberOfLines={1}>
                    {pillar.name}
                  </Text>
                )}
              </View>
              <View style={styles.barContainer}>
                <View style={[styles.barBackground, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.barFill,
                      { 
                        backgroundColor: pillar.color,
                        width: `${barWidth}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.barStats}>
                <Text style={[styles.levelText, { color: theme.text }]}>
                  Lv {level}
                </Text>
                {growthInfo && growthInfo.level_change !== 0 && (
                  <Text
                    style={[
                      styles.changeText,
                      { color: growthInfo.level_change > 0 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {growthInfo.level_change > 0 ? '+' : ''}{growthInfo.level_change}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render mini line chart for trend visualization
  const renderMiniTrend = () => {
    if (history.length < 2 || compact) return null;

    const points = history.slice(-7); // Last 7 days
    const pillarId = selectedPillar || 'total';
    const values = points.map(p => 
      pillarId === 'total' ? p.total : (p as any)[pillarId] || 0
    );
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const pointWidth = chartWidth / (values.length - 1 || 1);

    return (
      <View style={[styles.trendContainer, { height: 60 }]}>
        <View style={styles.trendChart}>
          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                { 
                  bottom: ratio * 50,
                  borderColor: theme.border,
                },
              ]}
            />
          ))}
          
          {/* Line connecting points */}
          <View style={styles.lineContainer}>
            {values.map((value, index) => {
              if (index === 0) return null;
              const x1 = (index - 1) * pointWidth;
              const x2 = index * pointWidth;
              const y1 = ((values[index - 1] - min) / range) * 50;
              const y2 = ((value - min) / range) * 50;
              
              return (
                <View
                  key={index}
                  style={[
                    styles.trendPoint,
                    {
                      left: x2,
                      bottom: y2,
                      backgroundColor: selectedPillar 
                        ? PillarSnapshotService.getPillarColor(selectedPillar)
                        : theme.primary,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
        
        {/* Date labels */}
        <View style={styles.dateLabels}>
          {points.map((p, i) => (
            <Text
              key={i}
              style={[
                styles.dateLabel,
                { 
                  color: theme.textSecondary,
                  width: pointWidth,
                },
              ]}
            >
              {new Date(p.date).getDate()}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  // Render time range selector
  const renderTimeSelector = () => {
    if (compact) return null;

    return (
      <View style={styles.timeSelector}>
        {([7, 14, 30] as TimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeButton,
              { 
                backgroundColor: timeRange === range ? theme.primary : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text
              style={[
                styles.timeButtonText,
                { color: timeRange === range ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {range}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Calculate summary stats
  const summary = useMemo(() => {
    if (history.length < 2) return null;
    
    const first = history[0];
    const last = history[history.length - 1];
    const totalGain = last.total - first.total;
    
    // Find best growing pillar
    let bestPillar: typeof PILLARS[0] | null = null;
    let bestGain = 0;
    PILLARS.forEach(p => {
      const gain = (last as any)[p.id] - (first as any)[p.id];
      if (gain > bestGain) {
        bestGain = gain;
        bestPillar = p;
      }
    });

    return {
      totalGain,
      bestPillar,
      bestGain,
      avgLevel: last.average,
    };
  }, [history]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>📊</Text>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading progress...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            📈 {compact ? 'Progress' : 'Pillar Progress'}
          </Text>
          {summary && !compact && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {summary.totalGain >= 0 ? '+' : ''}{summary.totalGain} total levels this {timeRange === 7 ? 'week' : timeRange === 14 ? '2 weeks' : 'month'}
            </Text>
          )}
        </View>
        {renderTimeSelector()}
      </View>

      {/* Bar Chart */}
      {renderBarChart()}

      {/* Mini Trend Chart */}
      {renderMiniTrend()}

      {/* Summary Card */}
      {summary && summary.bestPillar && !compact && (
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <Text style={styles.summaryEmoji}>🏆</Text>
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>
              Best Progress: {(summary.bestPillar as any).name}
            </Text>
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
              +{summary.bestGain} levels • Avg level: {summary.avgLevel.toFixed(1)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  timeSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  barChartContainer: {
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    gap: 6,
  },
  barEmoji: {
    fontSize: 16,
  },
  barName: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  barContainer: {
    flex: 1,
    height: 20,
  },
  barBackground: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
  },
  barStats: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    justifyContent: 'flex-end',
    gap: 4,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  changeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  trendContainer: {
    marginTop: 16,
  },
  trendChart: {
    height: 50,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  lineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  trendPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    marginBottom: -4,
  },
  dateLabels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  summaryEmoji: {
    fontSize: 24,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingEmoji: {
    fontSize: 32,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default PillarProgressChart;
