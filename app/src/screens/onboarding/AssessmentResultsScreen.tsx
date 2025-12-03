import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useAuthStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface PillarScore {
  score: number;
  answered: number;
  total: number;
  completed: boolean;
}

type PillarScores = Record<string, PillarScore>;

const PILLAR_INFO: Record<
  string,
  { emoji: string; name: string; color: string; shortName: string }
> = {
  physical: { emoji: '💪', name: 'Físico', color: '#EF4444', shortName: 'FIS' },
  mental: { emoji: '🧠', name: 'Mental', color: '#3B82F6', shortName: 'MEN' },
  social: { emoji: '❤️', name: 'Social', color: '#EC4899', shortName: 'SOC' },
  professional: {
    emoji: '💰',
    name: 'Profesional',
    color: '#10B981',
    shortName: 'PRO',
  },
  spiritual: {
    emoji: '🕉️',
    name: 'Espiritual',
    color: '#8B5CF6',
    shortName: 'ESP',
  },
  creative: {
    emoji: '🎨',
    name: 'Creativo',
    color: '#F97316',
    shortName: 'CRE',
  },
};

const PILLARS = Object.keys(PILLAR_INFO);

export const AssessmentResultsScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);
  const navigation = useNavigation();

  const [scores, setScores] = useState<PillarScores | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('pillar_scores')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setScores(data?.pillar_scores || null);
    } catch (err) {
      console.error('Error fetching scores:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthsAndWeaknesses = () => {
    if (!scores) return { strengths: [], weaknesses: [] };

    const sorted = PILLARS.map((pillar) => ({
      pillar,
      score: scores[pillar]?.score || 0,
    })).sort((a, b) => b.score - a.score);

    return {
      strengths: sorted.slice(0, 2),
      weaknesses: sorted.slice(-2),
    };
  };

  const { strengths, weaknesses } = getStrengthsAndWeaknesses();

  const renderRadarChart = () => {
    if (!scores) return null;

    const size = Math.min(width - 80, 300);
    const center = size / 2;
    const radius = size / 2 - 40;
    const levels = 5;

    // Calculate points for each pillar
    const points = PILLARS.map((pillar, index) => {
      const angle = (Math.PI * 2 * index) / PILLARS.length - Math.PI / 2;
      const score = scores[pillar]?.score || 0;
      const distance = (score / 100) * radius;
      const x = center + distance * Math.cos(angle);
      const y = center + distance * Math.sin(angle);
      return { x, y, angle, score, pillar };
    });

    const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

    return (
      <View style={styles.radarContainer}>
        <Svg width={size} height={size}>
          {/* Background circles */}
          {[...Array(levels)].map((_, i) => {
            const r = ((i + 1) / levels) * radius;
            return (
              <Circle
                key={i}
                cx={center}
                cy={center}
                r={r}
                stroke={theme.border}
                strokeWidth="1"
                fill="none"
              />
            );
          })}

          {/* Axis lines */}
          {points.map((point, index) => (
            <Line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(point.angle)}
              y2={center + radius * Math.sin(point.angle)}
              stroke={theme.border}
              strokeWidth="1"
            />
          ))}

          {/* Score polygon */}
          <Polygon
            points={polygonPoints}
            fill={theme.primary + '30'}
            stroke={theme.primary}
            strokeWidth="2"
          />

          {/* Score points */}
          {points.map((point, index) => (
            <Circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r="5"
              fill={theme.primary}
            />
          ))}

          {/* Labels */}
          {points.map((point, index) => {
            const labelDistance = radius + 25;
            const labelX = center + labelDistance * Math.cos(point.angle);
            const labelY = center + labelDistance * Math.sin(point.angle);
            const pillarInfo = PILLAR_INFO[point.pillar];

            return (
              <SvgText
                key={`label-${index}`}
                x={labelX}
                y={labelY}
                fontSize="12"
                fontWeight="bold"
                fill={pillarInfo.color}
                textAnchor="middle"
              >
                {pillarInfo.shortName}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 15,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    radarContainer: {
      alignItems: 'center',
      marginVertical: 30,
    },
    scoresGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 30,
    },
    scoreCard: {
      width: (width - 50) / 2,
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 15,
      borderLeftWidth: 4,
    },
    scoreEmoji: {
      fontSize: 32,
      marginBottom: 8,
    },
    scoreName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    scoreValue: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    scoreLabel: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 15,
      marginTop: 10,
    },
    insightCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
    },
    insightTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    insightText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    pillarsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    pillarBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    pillarBadgeEmoji: {
      fontSize: 16,
    },
    pillarBadgeText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    continueBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 20,
    },
    continueBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    loader: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tus Resultados 📊</Text>
        <Text style={styles.subtitle}>
          Aquí está tu análisis de vida en 6 dimensiones
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Radar Chart */}
        {renderRadarChart()}

        {/* Score Cards */}
        <View style={styles.scoresGrid}>
          {PILLARS.map((pillar) => {
            const pillarInfo = PILLAR_INFO[pillar];
            const pillarScore = scores?.[pillar];
            const score = pillarScore?.score || 0;

            return (
              <View
                key={pillar}
                style={[
                  styles.scoreCard,
                  { borderLeftColor: pillarInfo.color },
                ]}
              >
                <Text style={styles.scoreEmoji}>{pillarInfo.emoji}</Text>
                <Text style={styles.scoreName}>{pillarInfo.name}</Text>
                <Text
                  style={[styles.scoreValue, { color: pillarInfo.color }]}
                >
                  {score}
                </Text>
                <Text style={styles.scoreLabel}>/ 100</Text>
              </View>
            );
          })}
        </View>

        {/* Strengths */}
        <Text style={styles.sectionTitle}>💪 Tus Fortalezas</Text>
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>¡Excelente trabajo!</Text>
          <Text style={styles.insightText}>
            Destacas en estas áreas. Sigue cultivándolas para mantener el
            impulso.
          </Text>
          <View style={styles.pillarsRow}>
            {strengths.map((item) => {
              const pillarInfo = PILLAR_INFO[item.pillar];
              return (
                <View
                  key={item.pillar}
                  style={[
                    styles.pillarBadge,
                    { backgroundColor: pillarInfo.color },
                  ]}
                >
                  <Text style={styles.pillarBadgeEmoji}>
                    {pillarInfo.emoji}
                  </Text>
                  <Text style={styles.pillarBadgeText}>
                    {pillarInfo.name} ({item.score})
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Weaknesses */}
        <Text style={styles.sectionTitle}>🎯 Oportunidades de Mejora</Text>
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Áreas de enfoque</Text>
          <Text style={styles.insightText}>
            Estas áreas tienen el mayor potencial de crecimiento. Vamos a crear
            un plan para fortalecerlas.
          </Text>
          <View style={styles.pillarsRow}>
            {weaknesses.map((item) => {
              const pillarInfo = PILLAR_INFO[item.pillar];
              return (
                <View
                  key={item.pillar}
                  style={[
                    styles.pillarBadge,
                    { backgroundColor: pillarInfo.color },
                  ]}
                >
                  <Text style={styles.pillarBadgeEmoji}>
                    {pillarInfo.emoji}
                  </Text>
                  <Text style={styles.pillarBadgeText}>
                    {pillarInfo.name} ({item.score})
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.continueBtn}
        onPress={() => navigation.navigate('Home' as never)}
      >
        <Text style={styles.continueBtnText}>
          Continuar a Quest 🚀
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default AssessmentResultsScreen;
