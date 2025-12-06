import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { QuestMascot, QuestMood, QuestEvolutionStage } from '../lib/questMascot';

interface QuestMascotDisplayProps {
  mascot: QuestMascot;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  onTap?: () => void;
  showMessage?: boolean;
  message?: string;
}

const QuestMascotDisplay: React.FC<QuestMascotDisplayProps> = ({
  mascot,
  size = 'medium',
  animated = true,
  onTap,
  showMessage = false,
  message,
}) => {
  const [bounceAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (animated) {
      // Animación de rebote suave
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated, bounceAnim]);

  const handlePress = () => {
    // Animación de pulso al tocar
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    onTap?.();
  };

  const getMascotEmoji = (stage: QuestEvolutionStage, mood: QuestMood): string => {
    // Mapeo básico de emojis según evolución y mood
    const stageEmojis: Record<QuestEvolutionStage, string> = {
      1: '🐣', // Baby
      2: '🐥', // Apprentice
      3: '🦅', // Warrior
      4: '🦉', // Master
      5: '🐉', // Legend
    };

    const moodModifier: Record<QuestMood, string> = {
      happy: '',
      excited: '✨',
      sad: '💧',
      tired: '😴',
      proud: '👑',
      disappointed: '💔',
    };

    return stageEmojis[stage] + (moodModifier[mood] || '');
  };

  const sizeStyles = {
    small: { width: 60, height: 60, fontSize: 36 },
    medium: { width: 100, height: 100, fontSize: 64 },
    large: { width: 150, height: 150, fontSize: 96 },
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        disabled={!onTap}
      >
        <Animated.View
          style={[
            styles.mascotContainer,
            {
              width: currentSize.width,
              height: currentSize.height,
              transform: [
                { translateY: bounceAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <Text style={[styles.mascotEmoji, { fontSize: currentSize.fontSize }]}>
            {getMascotEmoji(mascot.evolution_stage, mascot.mood)}
          </Text>
        </Animated.View>
      </TouchableOpacity>

      {showMessage && message && (
        <View style={styles.speechBubble}>
          <Text style={styles.messageText}>{message}</Text>
          <View style={styles.bubbleTail} />
        </View>
      )}

      {size !== 'small' && (
        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{mascot.name}</Text>
          <Text style={styles.stageText}>
            {getStageLabel(mascot.evolution_stage)}
          </Text>
        </View>
      )}
    </View>
  );
};

function getStageLabel(stage: QuestEvolutionStage): string {
  const labels: Record<QuestEvolutionStage, string> = {
    1: 'Bebé',
    2: 'Aprendiz',
    3: 'Guerrero',
    4: 'Maestro',
    5: 'Leyenda',
  };
  return labels[stage];
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mascotEmoji: {
    textAlign: 'center',
  },
  infoContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  stageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  speechBubble: {
    position: 'absolute',
    top: -80,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#8B5CF6',
  },
  messageText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
});

export default QuestMascotDisplay;
