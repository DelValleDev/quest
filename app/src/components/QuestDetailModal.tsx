import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';
import { getTheme } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface Quest {
  id: string;
  title: string;
  description: string | null;
  pillar_id: string;
  difficulty: string;
  xp_reward: number;
  coin_reward: number;
  duration_minutes: number | null;
  icon: string;
  status: string;
  started_at?: string;
  why_this_quest?: string;
}

interface QuestDetailModalProps {
  visible: boolean;
  quest: Quest | null;
  onClose: () => void;
  onStatusChange: (questId: string, newStatus: string) => Promise<void>;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; labelEs: string; color: string; icon: string }> = {
  easy: { label: 'Easy', labelEs: 'Fácil', color: '#22C55E', icon: '🌱' },
  medium: { label: 'Medium', labelEs: 'Normal', color: '#F59E0B', icon: '⚡' },
  hard: { label: 'Hard', labelEs: 'Difícil', color: '#EF4444', icon: '🔥' },
  epic: { label: 'Epic', labelEs: 'Épico', color: '#8B5CF6', icon: '💎' },
};

const PILLAR_CONFIG: Record<string, { emoji: string; name: string; nameEs: string; color: string }> = {
  physical: { emoji: '💪', name: 'Physical', nameEs: 'Físico', color: '#EF4444' },
  mental: { emoji: '🧠', name: 'Mental', nameEs: 'Mental', color: '#3B82F6' },
  social: { emoji: '❤️', name: 'Social', nameEs: 'Social', color: '#EC4899' },
  professional: { emoji: '💼', name: 'Professional', nameEs: 'Profesional', color: '#10B981' },
  spiritual: { emoji: '✨', name: 'Spiritual', nameEs: 'Espiritual', color: '#8B5CF6' },
  creative: { emoji: '🎨', name: 'Creative', nameEs: 'Creativo', color: '#F97316' },
};

const STATUS_CONFIG: Record<string, { label: string; labelEs: string; color: string; icon: string }> = {
  pending: { label: 'Pending', labelEs: 'Pendiente', color: '#6B7280', icon: 'time-outline' },
  active: { label: 'In Progress', labelEs: 'En Progreso', color: '#3B82F6', icon: 'play-circle-outline' },
  completed: { label: 'Completed', labelEs: 'Completada', color: '#22C55E', icon: 'checkmark-circle' },
  skipped: { label: 'Skipped', labelEs: 'Omitida', color: '#F59E0B', icon: 'arrow-forward-circle-outline' },
  failed: { label: 'Failed', labelEs: 'Fallida', color: '#EF4444', icon: 'close-circle-outline' },
};

export const QuestDetailModal: React.FC<QuestDetailModalProps> = ({
  visible,
  quest,
  onClose,
  onStatusChange,
}) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const [loading, setLoading] = useState(false);
  const [activeTime, setActiveTime] = useState<number | null>(null);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  // Calculate time since quest started
  useEffect(() => {
    if (quest?.status === 'active' && quest.started_at) {
      const interval = setInterval(() => {
        const startTime = new Date(quest.started_at!).getTime();
        const now = Date.now();
        const diffMinutes = Math.floor((now - startTime) / 60000);
        setActiveTime(diffMinutes);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setActiveTime(null);
    }
  }, [quest?.status, quest?.started_at]);

  if (!quest) return null;

  const diffConfig = DIFFICULTY_CONFIG[quest.difficulty] || DIFFICULTY_CONFIG.medium;
  const pillarConfig = PILLAR_CONFIG[quest.pillar_id] || PILLAR_CONFIG.mental;
  const statusConfig = STATUS_CONFIG[quest.status] || STATUS_CONFIG.pending;

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      await onStatusChange(quest.id, newStatus);
      if (newStatus === 'completed') {
        onClose();
      }
    } catch (err) {
      console.error('Error changing status:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: height * 0.85,
      paddingBottom: 40,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 16,
      backgroundColor: pillarConfig.color + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    icon: {
      fontSize: 32,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    subtitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pillarBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: pillarConfig.color + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    pillarText: {
      fontSize: 12,
      color: pillarConfig.color,
      fontWeight: '600',
    },
    difficultyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: diffConfig.color + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    difficultyText: {
      fontSize: 12,
      color: diffConfig.color,
      fontWeight: '600',
    },
    closeBtn: {
      padding: 8,
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    description: {
      fontSize: 16,
      color: theme.text,
      lineHeight: 24,
    },
    whySection: {
      backgroundColor: theme.primary + '10',
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    whyText: {
      fontSize: 15,
      color: theme.text,
      lineHeight: 22,
      fontStyle: 'italic',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    statusSection: {
      backgroundColor: statusConfig.color + '15',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statusText: {
      flex: 1,
    },
    statusLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    statusValue: {
      fontSize: 16,
      fontWeight: '600',
      color: statusConfig.color,
    },
    activeTimer: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    actionsSection: {
      paddingHorizontal: 20,
      gap: 12,
    },
    primaryBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryBtnText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryBtns: {
      flexDirection: 'row',
      gap: 12,
    },
    secondaryBtn: {
      flex: 1,
      backgroundColor: theme.surface,
      paddingVertical: 14,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryBtnText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
    },
    skipBtn: {
      borderColor: '#F59E0B',
    },
    skipBtnText: {
      color: '#F59E0B',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.container} 
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={styles.handle} />
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{quest.icon}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{quest.title}</Text>
              <View style={styles.subtitle}>
                <View style={styles.pillarBadge}>
                  <Text>{pillarConfig.emoji}</Text>
                  <Text style={styles.pillarText}>
                    {language === 'es' ? pillarConfig.nameEs : pillarConfig.name}
                  </Text>
                </View>
                <View style={styles.difficultyBadge}>
                  <Text>{diffConfig.icon}</Text>
                  <Text style={styles.difficultyText}>
                    {language === 'es' ? diffConfig.labelEs : diffConfig.label}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Current Status */}
            <View style={styles.section}>
              <View style={styles.statusSection}>
                <Ionicons 
                  name={statusConfig.icon as any} 
                  size={28} 
                  color={statusConfig.color} 
                />
                <View style={styles.statusText}>
                  <Text style={styles.statusLabel}>{t('Current Status', 'Estado Actual')}</Text>
                  <Text style={styles.statusValue}>
                    {language === 'es' ? statusConfig.labelEs : statusConfig.label}
                  </Text>
                  {quest.status === 'active' && activeTime !== null && (
                    <Text style={styles.activeTimer}>
                      ⏱️ {t('Active for', 'Activa por')} {formatDuration(activeTime)}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Description */}
            {quest.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('Description', 'Descripción')}</Text>
                <Text style={styles.description}>{quest.description}</Text>
              </View>
            )}

            {/* Why this quest */}
            {quest.why_this_quest && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('Why This Quest?', '¿Por qué esta Quest?')}</Text>
                <View style={styles.whySection}>
                  <Text style={styles.whyText}>"{quest.why_this_quest}"</Text>
                </View>
              </View>
            )}

            {/* Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('Rewards', 'Recompensas')}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>⚡ {quest.xp_reward}</Text>
                  <Text style={styles.statLabel}>XP</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>🪙 {quest.coin_reward}</Text>
                  <Text style={styles.statLabel}>{t('Coins', 'Monedas')}</Text>
                </View>
                {quest.duration_minutes && (
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>⏱️ {quest.duration_minutes}</Text>
                    <Text style={styles.statLabel}>{t('Minutes', 'Minutos')}</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            {loading ? (
              <ActivityIndicator size="large" color={theme.primary} />
            ) : (
              <>
                {/* Primary action based on current status */}
                {quest.status === 'pending' && (
                  <TouchableOpacity 
                    style={styles.primaryBtn}
                    onPress={() => handleStatusChange('active')}
                  >
                    <Ionicons name="play" size={20} color="#FFF" />
                    <Text style={styles.primaryBtnText}>
                      {t('Start Quest', 'Comenzar Quest')}
                    </Text>
                  </TouchableOpacity>
                )}

                {quest.status === 'active' && (
                  <TouchableOpacity 
                    style={[styles.primaryBtn, { backgroundColor: '#22C55E' }]}
                    onPress={() => handleStatusChange('completed')}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.primaryBtnText}>
                      {t('Mark as Completed', 'Marcar como Completada')}
                    </Text>
                  </TouchableOpacity>
                )}

                {quest.status === 'completed' && (
                  <TouchableOpacity 
                    style={[styles.primaryBtn, { backgroundColor: theme.surface }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.primaryBtnText, { color: theme.text }]}>
                      ✅ {t('Quest Completed!', '¡Quest Completada!')}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Secondary actions */}
                {(quest.status === 'pending' || quest.status === 'active') && (
                  <View style={styles.secondaryBtns}>
                    {quest.status === 'active' && (
                      <TouchableOpacity 
                        style={styles.secondaryBtn}
                        onPress={() => handleStatusChange('pending')}
                      >
                        <Ionicons name="pause" size={18} color={theme.text} />
                        <Text style={styles.secondaryBtnText}>
                          {t('Pause', 'Pausar')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={[styles.secondaryBtn, styles.skipBtn]}
                      onPress={() => handleStatusChange('skipped')}
                    >
                      <Ionicons name="arrow-forward" size={18} color="#F59E0B" />
                      <Text style={[styles.secondaryBtnText, styles.skipBtnText]}>
                        {t('Skip', 'Omitir')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default QuestDetailModal;
