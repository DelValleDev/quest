import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { questAI } from '../../lib/openai';
import { Ionicons } from '@expo/vector-icons';

/*
  AchievementLogScreen
  ====================
  Esta pantalla permite a los usuarios registrar logros "sueltos" que no son hábitos ni quests.
  Por ejemplo: "Hoy salí con un amigo", "Fui a una maratón", "Ayudé a un vecino"
  
  La IA analiza lo que escribiste y te da:
  - XP según la dificultad/impacto
  - Puntos al pilar correspondiente (social, físico, etc.)
  - Un mensaje de reconocimiento
  
  Para usuarios FREE: Es manual (no usan IA, solo registran)
  Para usuarios PREMIUM: La IA analiza y da recompensas apropiadas
*/

interface AchievementReward {
  xp: number;
  coins: number;
  pillar: string;
  pillar_points: number;
  message: string;
}

interface LogEntry {
  id: string;
  description: string;
  pillar: string;
  xp_earned: number;
  coins_earned: number;
  created_at: string;
}

const PILLAR_INFO: Record<string, { emoji: string; name: string; nameEs: string; color: string }> = {
  physical: { emoji: '💪', name: 'Physical', nameEs: 'Físico', color: '#EF4444' },
  mental: { emoji: '🧠', name: 'Mental', nameEs: 'Mental', color: '#3B82F6' },
  social: { emoji: '❤️', name: 'Social', nameEs: 'Social', color: '#EC4899' },
  professional: { emoji: '💼', name: 'Professional', nameEs: 'Profesional', color: '#10B981' },
  spiritual: { emoji: '✨', name: 'Spiritual', nameEs: 'Espiritual', color: '#8B5CF6' },
  creative: { emoji: '🎨', name: 'Creative', nameEs: 'Creativo', color: '#F97316' },
  general: { emoji: '⭐', name: 'General', nameEs: 'General', color: '#6366F1' },
};

interface AchievementLogScreenProps {
  embedded?: boolean;
}

export const AchievementLogScreen: React.FC<AchievementLogScreenProps> = ({ embedded = false }) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showSuccess, setShowSuccess] = useState<AchievementReward | null>(null);

  // Manual mode for free users (or premium who want manual)
  const [manualPillar, setManualPillar] = useState<string>('general');
  const [showPillarPicker, setShowPillarPicker] = useState(false);
  const [useManualMode, setUseManualMode] = useState(false); // Premium can toggle this

  useEffect(() => {
    checkSubscription();
    fetchRecentLogs();
  }, []);

  const checkSubscription = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    
    setIsPremium(data?.subscription_tier === 'premium');
  };

  const fetchRecentLogs = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('achievement_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setRecentLogs(data || []);
    } catch (err) {
      console.log('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithAI = async (): Promise<AchievementReward> => {
    // AI analyzes the description and returns appropriate rewards
    const prompt = `Analyze this user achievement and provide rewards. The user said: "${description}"

Return a JSON object with:
- pillar: which life area this relates to (physical, mental, social, professional, spiritual, creative, or general)
- xp: XP reward (10-100 based on effort/impact. Small things=10-25, medium=30-50, significant=60-100)
- coins: coin reward (usually 0, or 5-20 for exceptional achievements)
- pillar_points: points to add to the pillar score (1-5)
- message: a short encouraging message in ${language === 'es' ? 'Spanish' : 'English'} (max 100 chars)

Be reasonable with rewards. Daily small actions = small rewards. Big achievements = bigger rewards.
Respond ONLY with the JSON object, no other text.`;

    try {
      const response = await questAI.generateText(prompt);
      const parsed = JSON.parse(response);
      return {
        xp: Math.min(100, Math.max(10, parsed.xp || 15)),
        coins: Math.min(20, Math.max(0, parsed.coins || 0)),
        pillar: parsed.pillar || 'general',
        pillar_points: Math.min(5, Math.max(1, parsed.pillar_points || 1)),
        message: parsed.message || t('Great job!', '¡Buen trabajo!'),
      };
    } catch (err) {
      // Fallback if AI fails
      return {
        xp: 15,
        coins: 0,
        pillar: 'general',
        pillar_points: 1,
        message: t('Activity logged!', '¡Actividad registrada!'),
      };
    }
  };

  const submitAchievement = async () => {
    if (!description.trim() || !user?.id) return;

    setAnalyzing(true);
    try {
      let reward: AchievementReward;

      // Premium users: AI always analyzes (unless manual mode is on)
      // Free users: Always manual, fixed rewards
      const shouldUseAI = isPremium && !useManualMode;

      if (shouldUseAI) {
        // Premium + AI mode: AI analyzes
        reward = await analyzeWithAI();
      } else {
        // Free OR Premium-Manual: Fixed rewards, user-selected pillar
        reward = {
          xp: 10,
          coins: 0,
          pillar: manualPillar,
          pillar_points: 1,
          message: t('Activity logged!', '¡Actividad registrada!'),
        };
      }

      // Save to achievement_logs table
      await supabase.from('achievement_logs').insert({
        user_id: user.id,
        description: description.trim(),
        pillar: reward.pillar,
        xp_earned: reward.xp,
        coins_earned: reward.coins,
        ai_analyzed: isPremium,
      });

      // Update user's XP and coins
      await supabase.rpc('add_user_rewards', {
        p_user_id: user.id,
        p_xp: reward.xp,
        p_coins: reward.coins,
      });

      // Update pillar score
      if (reward.pillar !== 'general') {
        await supabase.rpc('increment_pillar_score', {
          p_user_id: user.id,
          p_pillar: reward.pillar,
          p_points: reward.pillar_points,
        });
      }

      // Show success animation
      setShowSuccess(reward);
      setDescription('');
      fetchRecentLogs();

      // Hide success after 3 seconds
      setTimeout(() => setShowSuccess(null), 3000);

    } catch (err: any) {
      Alert.alert('Error', err.message || t('Failed to log achievement', 'Error al registrar logro'));
    } finally {
      setAnalyzing(false);
    }
  };

  const Container = embedded ? View : SafeAreaView;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 20,
      paddingTop: embedded ? 10 : 20,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    inputCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 10,
    },
    textInput: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: theme.text,
      minHeight: 80,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: theme.border,
    },
    pillarSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    pillarLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginRight: 10,
    },
    pillarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pillarButtonText: {
      fontSize: 14,
      color: theme.text,
      marginLeft: 6,
    },
    pillarPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    pillarOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.background,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    pillarOptionSelected: {
      borderColor: theme.primary,
    },
    pillarOptionText: {
      fontSize: 13,
      marginLeft: 4,
    },
    submitButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
      marginTop: 10,
    },
    premiumBadgeText: {
      fontSize: 12,
      color: theme.primary,
      marginLeft: 4,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
      marginTop: 8,
    },
    logEntry: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderLeftWidth: 4,
    },
    logDescription: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 8,
    },
    logMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logReward: {
      fontSize: 13,
      fontWeight: '600',
    },
    logTime: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 30,
    },
    emptyIcon: {
      fontSize: 40,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    successOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
    },
    successCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 30,
      alignItems: 'center',
      marginHorizontal: 40,
    },
    successEmoji: {
      fontSize: 60,
      marginBottom: 16,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 8,
    },
    successMessage: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    successRewards: {
      flexDirection: 'row',
      gap: 20,
    },
    successReward: {
      alignItems: 'center',
    },
    successRewardValue: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.primary,
    },
    successRewardLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    // Mode toggle styles (for premium)
    modeToggle: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    modeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.background,
      gap: 6,
    },
    modeButtonActive: {
      backgroundColor: theme.primary,
    },
    modeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    modeButtonTextActive: {
      color: '#FFFFFF',
    },
    // Free badge
    freeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      gap: 4,
    },
    freeBadgeText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
  });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return t('Just now', 'Ahora');
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return t('Yesterday', 'Ayer');
    return `${diffDays}d`;
  };

  return (
    <Container style={styles.container} {...(!embedded && { edges: ['top'] })}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>📝 {t('Log Achievement', 'Registrar Logro')}</Text>
            <Text style={styles.headerSubtitle}>
              {t(
                'Record any activity and earn XP! Go out with friends, exercise, learn something new...',
                'Registra cualquier actividad y gana XP! Salir con amigos, ejercitarte, aprender algo nuevo...'
              )}
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>
                {t('What did you do?', '¿Qué hiciste?')}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={t(
                  'e.g., "Went to the gym for 1 hour", "Had lunch with a friend"...',
                  'ej: "Fui al gimnasio 1 hora", "Almorcé con un amigo"...'
                )}
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={280}
              />

              {/* For free users: manual pillar selection (always) */}
              {/* For premium: show option to use manual or AI */}
              {!isPremium ? (
                // FREE: Always manual
                <>
                  <View style={styles.pillarSelector}>
                    <Text style={styles.pillarLabel}>{t('Category:', 'Categoría:')}</Text>
                    <TouchableOpacity 
                      style={styles.pillarButton}
                      onPress={() => setShowPillarPicker(!showPillarPicker)}
                    >
                      <Text>{PILLAR_INFO[manualPillar].emoji}</Text>
                      <Text style={styles.pillarButtonText}>
                        {language === 'es' ? PILLAR_INFO[manualPillar].nameEs : PILLAR_INFO[manualPillar].name}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {showPillarPicker && (
                    <View style={styles.pillarPicker}>
                      {Object.entries(PILLAR_INFO).map(([key, info]) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.pillarOption,
                            manualPillar === key && styles.pillarOptionSelected,
                            { borderColor: manualPillar === key ? info.color : 'transparent' }
                          ]}
                          onPress={() => {
                            setManualPillar(key);
                            setShowPillarPicker(false);
                          }}
                        >
                          <Text>{info.emoji}</Text>
                          <Text style={[styles.pillarOptionText, { color: theme.text }]}>
                            {language === 'es' ? info.nameEs : info.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  <View style={styles.freeBadge}>
                    <Ionicons name="hand-left-outline" size={14} color={theme.textSecondary} />
                    <Text style={styles.freeBadgeText}>
                      {t('Manual mode • 10 XP fixed', 'Modo manual • 10 XP fijo')}
                    </Text>
                  </View>
                </>
              ) : (
                // PREMIUM: AI by default, with option for manual
                <>
                  <View style={styles.modeToggle}>
                    <TouchableOpacity
                      style={[styles.modeButton, !useManualMode && styles.modeButtonActive]}
                      onPress={() => setUseManualMode(false)}
                    >
                      <Ionicons name="sparkles" size={16} color={!useManualMode ? '#FFFFFF' : theme.textSecondary} />
                      <Text style={[styles.modeButtonText, !useManualMode && styles.modeButtonTextActive]}>
                        {t('AI Analysis', 'Análisis IA')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modeButton, useManualMode && styles.modeButtonActive]}
                      onPress={() => setUseManualMode(true)}
                    >
                      <Ionicons name="hand-left-outline" size={16} color={useManualMode ? '#FFFFFF' : theme.textSecondary} />
                      <Text style={[styles.modeButtonText, useManualMode && styles.modeButtonTextActive]}>
                        {t('Manual', 'Manual')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {useManualMode ? (
                    // Manual mode for premium
                    <>
                      <View style={styles.pillarSelector}>
                        <Text style={styles.pillarLabel}>{t('Category:', 'Categoría:')}</Text>
                        <TouchableOpacity 
                          style={styles.pillarButton}
                          onPress={() => setShowPillarPicker(!showPillarPicker)}
                        >
                          <Text>{PILLAR_INFO[manualPillar].emoji}</Text>
                          <Text style={styles.pillarButtonText}>
                            {language === 'es' ? PILLAR_INFO[manualPillar].nameEs : PILLAR_INFO[manualPillar].name}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      {showPillarPicker && (
                        <View style={styles.pillarPicker}>
                          {Object.entries(PILLAR_INFO).map(([key, info]) => (
                            <TouchableOpacity
                              key={key}
                              style={[
                                styles.pillarOption,
                                manualPillar === key && styles.pillarOptionSelected,
                                { borderColor: manualPillar === key ? info.color : 'transparent' }
                              ]}
                              onPress={() => {
                                setManualPillar(key);
                                setShowPillarPicker(false);
                              }}
                            >
                              <Text>{info.emoji}</Text>
                              <Text style={[styles.pillarOptionText, { color: theme.text }]}>
                                {language === 'es' ? info.nameEs : info.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    // AI mode badge
                    <View style={styles.premiumBadge}>
                      <Ionicons name="sparkles" size={14} color={theme.primary} />
                      <Text style={styles.premiumBadgeText}>
                        {t('AI will analyze & give 10-100 XP', 'IA analizará y dará 10-100 XP')}
                      </Text>
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!description.trim() || analyzing) && styles.submitButtonDisabled
                ]}
                onPress={submitAchievement}
                disabled={!description.trim() || analyzing}
              >
                {analyzing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {t('Log & Earn XP', 'Registrar y Ganar XP')} ⭐
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Recent logs */}
            <Text style={styles.sectionTitle}>
              {t('Recent Activity', 'Actividad Reciente')}
            </Text>

            {loading ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
            ) : recentLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>
                  {t('No achievements logged yet.\nStart recording your wins!', 
                     'Aún no has registrado logros.\n¡Empieza a registrar tus victorias!')}
                </Text>
              </View>
            ) : (
              recentLogs.map((log) => {
                const pillar = PILLAR_INFO[log.pillar] || PILLAR_INFO.general;
                return (
                  <View 
                    key={log.id} 
                    style={[styles.logEntry, { borderLeftColor: pillar.color }]}
                  >
                    <Text style={styles.logDescription}>{log.description}</Text>
                    <View style={styles.logMeta}>
                      <Text style={[styles.logReward, { color: pillar.color }]}>
                        {pillar.emoji} +{log.xp_earned} XP
                      </Text>
                      {log.coins_earned > 0 && (
                        <Text style={[styles.logReward, { color: theme.warning }]}>
                          🪙 +{log.coins_earned}
                        </Text>
                      )}
                      <Text style={styles.logTime}>{formatTime(log.created_at)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success overlay */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>
              {PILLAR_INFO[showSuccess.pillar]?.emoji || '⭐'}
            </Text>
            <Text style={styles.successTitle}>{t('Logged!', '¡Registrado!')}</Text>
            <Text style={styles.successMessage}>{showSuccess.message}</Text>
            <View style={styles.successRewards}>
              <View style={styles.successReward}>
                <Text style={styles.successRewardValue}>+{showSuccess.xp}</Text>
                <Text style={styles.successRewardLabel}>XP</Text>
              </View>
              {showSuccess.coins > 0 && (
                <View style={styles.successReward}>
                  <Text style={[styles.successRewardValue, { color: theme.warning }]}>
                    +{showSuccess.coins}
                  </Text>
                  <Text style={styles.successRewardLabel}>Coins</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </Container>
  );
};

export default AchievementLogScreen;
