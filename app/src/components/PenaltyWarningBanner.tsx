/**
 * PenaltyWarningBanner Component
 * Shows a warning banner if user has incomplete tasks today
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, useLanguageStore } from '../store';
import { getTheme } from '../theme/colors';
import { PenaltyService } from '../lib/penalties';
import { supabase } from '../lib/supabase';

export const PenaltyWarningBanner: React.FC = () => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const [userId, setUserId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [pendingData, setPendingData] = useState({
    incompleteHabits: 0,
    incompleteQuests: 0,
    potentialXpLoss: 0,
  });
  const [slideAnim] = useState(new Animated.Value(-100));

  const t = (en: string, es: string) => (language === 'es' ? es : en);

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (userId) {
      checkPendingTasks();
    
      // Check every 30 minutes
      const interval = setInterval(checkPendingTasks, 30 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [userId]);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const checkPendingTasks = async () => {
    if (!userId) return;

    // Only show warning after 6 PM
    const hour = new Date().getHours();
    if (hour < 18) {
      setVisible(false);
      return;
    }

    const data = await PenaltyService.checkPendingPenalties(userId);
    setPendingData(data);

    const hasIncompleteTasks = data.incompleteHabits > 0 || data.incompleteQuests > 0;
    
    if (hasIncompleteTasks && !visible) {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else if (!hasIncompleteTasks && visible) {
      dismiss();
    }
  };

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  if (!visible) return null;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: '#FEF3C7',
      borderLeftWidth: 4,
      borderLeftColor: '#F59E0B',
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F59E0B' + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: '#92400E',
      marginBottom: 2,
    },
    message: {
      fontSize: 12,
      color: '#78350F',
      lineHeight: 16,
    },
    xpLoss: {
      fontSize: 16,
      fontWeight: '800',
      color: '#DC2626',
      marginLeft: 8,
    },
    dismissBtn: {
      padding: 8,
    },
  });

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={24} color="#F59E0B" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>
            ⏰ {t('Day ending soon!', '¡El día termina pronto!')}
          </Text>
          <Text style={styles.message}>
            {pendingData.incompleteHabits > 0 &&
              `${pendingData.incompleteHabits} ${t('incomplete habit(s)', 'hábito(s) sin completar')} `}
            {pendingData.incompleteHabits > 0 && pendingData.incompleteQuests > 0 && '• '}
            {pendingData.incompleteQuests > 0 &&
              `${pendingData.incompleteQuests} ${t('incomplete quest(s)', 'quest(s) sin completar')}`}
          </Text>
        </View>
        <Text style={styles.xpLoss}>-{pendingData.potentialXpLoss}</Text>
        <TouchableOpacity style={styles.dismissBtn} onPress={dismiss}>
          <Ionicons name="close" size={20} color="#92400E" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default PenaltyWarningBanner;
