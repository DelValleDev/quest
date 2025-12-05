import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import {
  getLatestWeeklyReview,
  getWeeklyReviews,
  createWeeklyReview,
  markWeeklyReviewSeen,
  type WeeklyReview,
} from '../../lib/weeklyReview';

const { width } = Dimensions.get('window');

export const WeeklyReviewScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentReview, setCurrentReview] = useState<WeeklyReview | null>(null);
  const [pastReviews, setPastReviews] = useState<WeeklyReview[]>([]);
  const [showPastReviews, setShowPastReviews] = useState(false);

  const t = (en: string, es: string) => (language === 'es' ? es : en);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const latest = await getLatestWeeklyReview(user.id, supabase);
      setCurrentReview(latest);

      if (latest && !latest.createdAt) {
        // Mark as seen if first time viewing
        await markWeeklyReviewSeen(latest.id, supabase);
      }

      const past = await getWeeklyReviews(user.id, supabase, 4);
      setPastReviews(past.slice(1)); // Exclude current
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewReview = async () => {
    if (!user?.id) return;
    setGenerating(true);
    try {
      const review = await createWeeklyReview(user.id, supabase, user.email?.split('@')[0]);
      if (review) {
        setCurrentReview(review);
      }
    } catch (error) {
      console.error('Error generating review:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow
    if (score >= 40) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🏆';
    if (score >= 80) return '🌟';
    if (score >= 70) return '💪';
    if (score >= 60) return '👍';
    if (score >= 50) return '📈';
    if (score >= 40) return '🔄';
    return '💡';
  };

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', options)} - ${endDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', options)}`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
      paddingTop: 20,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
    },
    placeholder: {
      width: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noReviewContainer: {
      alignItems: 'center',
      padding: 40,
      backgroundColor: theme.surface,
      borderRadius: 20,
      marginTop: 40,
    },
    noReviewEmoji: {
      fontSize: 64,
      marginBottom: 16,
    },
    noReviewTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    noReviewText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    generateButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    generateButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    // Score Card
    scoreCard: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      marginBottom: 20,
    },
    weekRange: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 16,
      fontWeight: '600',
    },
    scoreCircle: {
      width: 140,
      height: 140,
      borderRadius: 70,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 8,
    },
    scoreNumber: {
      fontSize: 48,
      fontWeight: '800',
      color: theme.text,
    },
    scoreLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: -4,
    },
    scoreEmoji: {
      fontSize: 32,
      marginTop: 8,
    },
    summaryText: {
      fontSize: 16,
      color: theme.text,
      textAlign: 'center',
      lineHeight: 24,
      marginTop: 12,
    },
    // Stats Grid
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      width: (width - 52) / 2,
      alignItems: 'center',
    },
    statEmoji: {
      fontSize: 24,
      marginBottom: 8,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    // Sections
    section: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 10,
    },
    sectionEmoji: {
      fontSize: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 12,
    },
    listBullet: {
      fontSize: 16,
      marginTop: 2,
    },
    listText: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
      lineHeight: 22,
    },
    insightsText: {
      fontSize: 15,
      color: theme.text,
      lineHeight: 24,
    },
    motivationalCard: {
      backgroundColor: theme.primary + '15',
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    motivationalText: {
      fontSize: 16,
      color: theme.text,
      fontStyle: 'italic',
      lineHeight: 24,
    },
    // Past Reviews Toggle
    pastReviewsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
    },
    pastReviewsText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
    },
    pastReviewCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pastReviewInfo: {
      flex: 1,
    },
    pastReviewDate: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '600',
      marginBottom: 4,
    },
    pastReviewSummary: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    pastReviewScore: {
      alignItems: 'center',
    },
    pastScoreNumber: {
      fontSize: 20,
      fontWeight: '700',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            {t('Loading your review...', 'Cargando tu review...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('Weekly Review', 'Resumen Semanal')}</Text>
          <View style={styles.placeholder} />
        </View>

        {!currentReview ? (
          // No review available
          <View style={styles.noReviewContainer}>
            <Text style={styles.noReviewEmoji}>📊</Text>
            <Text style={styles.noReviewTitle}>
              {t("Your Weekly Review", "Tu Resumen Semanal")}
            </Text>
            <Text style={styles.noReviewText}>
              {t(
                "Generate an AI-powered analysis of your progress this week. See your highlights, areas for improvement, and personalized insights.",
                "Genera un análisis con IA de tu progreso esta semana. Ve tus logros, áreas de mejora e insights personalizados."
              )}
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateNewReview}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={{ fontSize: 18 }}>✨</Text>
                  <Text style={styles.generateButtonText}>
                    {t('Generate Review', 'Generar Review')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Score Card */}
            <View style={styles.scoreCard}>
              <Text style={styles.weekRange}>
                {formatWeekRange(currentReview.weekStart, currentReview.weekEnd)}
              </Text>
              <View
                style={[
                  styles.scoreCircle,
                  {
                    borderColor: getScoreColor(currentReview.overallScore) + '40',
                    backgroundColor: getScoreColor(currentReview.overallScore) + '10',
                  },
                ]}
              >
                <Text style={[styles.scoreNumber, { color: getScoreColor(currentReview.overallScore) }]}>
                  {currentReview.overallScore}
                </Text>
                <Text style={styles.scoreLabel}>{t('Score', 'Puntos')}</Text>
              </View>
              <Text style={styles.scoreEmoji}>{getScoreEmoji(currentReview.overallScore)}</Text>
              <Text style={styles.summaryText}>{currentReview.summary}</Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>⚔️</Text>
                <Text style={styles.statValue}>{currentReview.stats.questsCompleted || 0}</Text>
                <Text style={styles.statLabel}>{t('Quests Completed', 'Quests Completadas')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>⭐</Text>
                <Text style={styles.statValue}>{currentReview.stats.xpEarned || 0}</Text>
                <Text style={styles.statLabel}>{t('XP Earned', 'XP Ganado')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={styles.statValue}>{currentReview.stats.currentStreak || 0}</Text>
                <Text style={styles.statLabel}>{t('Day Streak', 'Días de Racha')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>✅</Text>
                <Text style={styles.statValue}>{currentReview.stats.habitsCompletedDays || 0}/7</Text>
                <Text style={styles.statLabel}>{t('Active Days', 'Días Activos')}</Text>
              </View>
            </View>

            {/* Health Stats (if available) */}
            {currentReview.stats.healthData && currentReview.stats.healthData.totalSteps > 0 && (
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statEmoji}>👟</Text>
                  <Text style={styles.statValue}>
                    {(currentReview.stats.healthData.avgSteps || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>{t('Avg Steps/Day', 'Pasos Prom/Día')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statEmoji}>😴</Text>
                  <Text style={styles.statValue}>{currentReview.stats.healthData.avgSleepHours || 0}h</Text>
                  <Text style={styles.statLabel}>{t('Avg Sleep', 'Sueño Prom')}</Text>
                </View>
              </View>
            )}

            {/* Highlights */}
            {currentReview.highlights && currentReview.highlights.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEmoji}>🌟</Text>
                  <Text style={styles.sectionTitle}>{t('Highlights', 'Logros')}</Text>
                </View>
                {currentReview.highlights.map((highlight, index) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.listBullet}>✓</Text>
                    <Text style={styles.listText}>{highlight}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Areas to Improve */}
            {currentReview.areasToImprove && currentReview.areasToImprove.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEmoji}>📈</Text>
                  <Text style={styles.sectionTitle}>{t('Growth Areas', 'Áreas de Mejora')}</Text>
                </View>
                {currentReview.areasToImprove.map((area, index) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.listBullet}>→</Text>
                    <Text style={styles.listText}>{area}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* AI Insights */}
            {currentReview.aiInsights && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEmoji}>🧠</Text>
                  <Text style={styles.sectionTitle}>{t('AI Insights', 'Análisis IA')}</Text>
                </View>
                <Text style={styles.insightsText}>{currentReview.aiInsights}</Text>
              </View>
            )}

            {/* Next Week Focus */}
            {currentReview.nextWeekFocus && currentReview.nextWeekFocus.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEmoji}>🎯</Text>
                  <Text style={styles.sectionTitle}>{t('Focus for Next Week', 'Enfoque Próxima Semana')}</Text>
                </View>
                {currentReview.nextWeekFocus.map((focus, index) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.listBullet}>{index + 1}.</Text>
                    <Text style={styles.listText}>{focus}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Motivational Message */}
            {currentReview.motivationalMessage && (
              <View style={styles.motivationalCard}>
                <Text style={styles.motivationalText}>"{currentReview.motivationalMessage}"</Text>
              </View>
            )}

            {/* Past Reviews Toggle */}
            {pastReviews.length > 0 && (
              <>
                <TouchableOpacity
                  style={styles.pastReviewsToggle}
                  onPress={() => setShowPastReviews(!showPastReviews)}
                >
                  <Text style={styles.pastReviewsText}>
                    {showPastReviews
                      ? t('Hide Past Reviews', 'Ocultar Anteriores')
                      : t('View Past Reviews', 'Ver Anteriores')}
                  </Text>
                  <Text style={{ color: theme.primary }}>{showPastReviews ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showPastReviews &&
                  pastReviews.map((review) => (
                    <View key={review.id} style={styles.pastReviewCard}>
                      <View style={styles.pastReviewInfo}>
                        <Text style={styles.pastReviewDate}>
                          {formatWeekRange(review.weekStart, review.weekEnd)}
                        </Text>
                        <Text style={styles.pastReviewSummary} numberOfLines={1}>
                          {review.summary}
                        </Text>
                      </View>
                      <View style={styles.pastReviewScore}>
                        <Text style={[styles.pastScoreNumber, { color: getScoreColor(review.overallScore) }]}>
                          {review.overallScore}
                        </Text>
                      </View>
                    </View>
                  ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default WeeklyReviewScreen;
