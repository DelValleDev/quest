/**
 * PenaltyNotification Component
 * Shows visual feedback when user loses XP due to incomplete tasks
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, useLanguageStore } from '../store';
import { getTheme } from '../theme/colors';
import { PenaltyLog } from '../lib/penalties';

interface PenaltyNotificationProps {
  visible: boolean;
  penalties: PenaltyLog[];
  onClose: () => void;
}

export const PenaltyNotification: React.FC<PenaltyNotificationProps> = ({
  visible,
  penalties,
  onClose,
}) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const [fadeAnim] = useState(new Animated.Value(0));

  const t = (en: string, es: string) => (language === 'es' ? es : en);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  if (!visible || penalties.length === 0) return null;

  const totalXpLost = penalties.reduce((sum, p) => sum + p.xp_lost, 0);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      borderWidth: 2,
      borderColor: '#EF4444',
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
    },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#EF4444' + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    xpLoss: {
      fontSize: 32,
      fontWeight: '800',
      color: '#EF4444',
      textAlign: 'center',
      marginVertical: 12,
    },
    penaltiesList: {
      marginVertical: 16,
      maxHeight: 200,
    },
    penaltyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
    },
    penaltyIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#EF4444' + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    penaltyInfo: {
      flex: 1,
    },
    penaltyTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    penaltyType: {
      fontSize: 12,
      color: theme.textMuted,
    },
    penaltyXp: {
      fontSize: 14,
      fontWeight: '700',
      color: '#EF4444',
    },
    message: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    button: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFF',
    },
  });

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={32} color="#EF4444" />
            </View>
            <Text style={styles.title}>
              {t('Penalty Applied', 'Penalización Aplicada')}
            </Text>
            <Text style={styles.subtitle}>
              {t('Incomplete tasks from yesterday', 'Tareas incompletas de ayer')}
            </Text>
          </View>

          <Text style={styles.xpLoss}>-{totalXpLost} XP</Text>

          <View style={styles.penaltiesList}>
            {penalties.slice(0, 3).map((penalty, index) => (
              <View key={index} style={styles.penaltyItem}>
                <View style={styles.penaltyIcon}>
                  <Text style={{ fontSize: 16 }}>
                    {penalty.penalty_type === 'habit' ? '🎯' : '⚔️'}
                  </Text>
                </View>
                <View style={styles.penaltyInfo}>
                  <Text style={styles.penaltyTitle} numberOfLines={1}>
                    {penalty.item_title}
                  </Text>
                  <Text style={styles.penaltyType}>
                    {penalty.penalty_type === 'habit'
                      ? t('Habit', 'Hábito')
                      : t('Quest', 'Quest')}
                  </Text>
                </View>
                <Text style={styles.penaltyXp}>-{penalty.xp_lost}</Text>
              </View>
            ))}
            {penalties.length > 3 && (
              <Text style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center', marginTop: 4 }}>
                {t(`+${penalties.length - 3} more`, `+${penalties.length - 3} más`)}
              </Text>
            )}
          </View>

          <Text style={styles.message}>
            {t(
              'Complete your habits and quests to avoid losing XP. Quest Coins are never lost!',
              'Completa tus hábitos y quests para evitar perder XP. ¡Las Quest Coins nunca se pierden!'
            )}
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleClose}>
            <Text style={styles.buttonText}>
              {t('Got it!', '¡Entendido!')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

export default PenaltyNotification;
