/**
 * Quest AI Message Toast
 * 
 * Elegant animated toast component for showing proactive AI messages
 * Appears from top, stays for a few seconds, then disappears
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { getTheme } from '../theme/colors';
import type { ProactiveMessage } from '../lib/proactiveAI';

const { width } = Dimensions.get('window');

interface QuestAIToastProps {
  message: ProactiveMessage | null;
  onDismiss: () => void;
  duration?: number; // milliseconds to show
}

export const QuestAIToast: React.FC<QuestAIToastProps> = ({
  message,
  onDismiss,
  duration = 4000,
}) => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);
  
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      // Slide in from top
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        dismissToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!message) return null;

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 60,
      left: 20,
      right: 20,
      zIndex: 9999,
    },
    toast: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.primary + '40',
    },
    avatarContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatar: {
      fontSize: 24,
    },
    content: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    questLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
      letterSpacing: 0.5,
    },
    emoji: {
      fontSize: 14,
      marginLeft: 6,
    },
    message: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '500',
      lineHeight: 20,
    },
    dismissButton: {
      padding: 4,
      marginLeft: 8,
    },
    dismissText: {
      fontSize: 18,
      color: theme.textSecondary,
    },
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.toast}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>🤖</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.questLabel}>QUEST AI</Text>
            <Text style={styles.emoji}>{message.emoji}</Text>
          </View>
          <Text style={styles.message}>{message.message}</Text>
        </View>
        <TouchableOpacity style={styles.dismissButton} onPress={dismissToast}>
          <Text style={styles.dismissText}>×</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default QuestAIToast;
