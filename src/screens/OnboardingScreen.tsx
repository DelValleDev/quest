import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

interface Props {
  navigation: OnboardingScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

const slides = [
  {
    key: '1',
    title: 'Bienvenido a Quest',
    description: 'Convierte tu vida en un juego épico. Completa tareas, gana XP y sube de nivel.',
    emoji: '🎮',
    gradient: ['#667eea', '#764ba2']
  },
  {
    key: '2',
    title: 'Crea Hábitos Poderosos',
    description: 'Destruye malos hábitos y construye buenos. Cada día sin recaer es una victoria.',
    emoji: '💪',
    gradient: ['#f093fb', '#f5576c']
  },
  {
    key: '3',
    title: 'Únete a Guilds',
    description: 'Conecta con personas que comparten tus metas. Compite, colabora y crece juntos.',
    emoji: '🏰',
    gradient: ['#4facfe', '#00f2fe']
  },
  {
    key: '4',
    title: 'Quest AI - Tu Coach Personal',
    description: 'Nuestra IA te ayuda a mantenerte motivado, analiza tus patrones y te da consejos.',
    emoji: '🤖',
    gradient: ['#43e97b', '#38f9d7']
  },
  {
    key: '5',
    title: 'Sistema de Recompensas',
    description: 'Gana Quest Coins completando misiones. Úsalas para desbloquear features premium.',
    emoji: '💰',
    gradient: ['#fa709a', '#fee140']
  }
];

export default function OnboardingScreen({ navigation }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finalizar onboarding
      navigation.replace('Home');
    }
  };

  const handleSkip = () => {
    navigation.replace('Home');
  };

  const currentSlide = slides[currentIndex];

  return (
    <LinearGradient
      colors={currentSlide.gradient}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Skip Button */}
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
        )}

        {/* Emoji Icon */}
        <Text style={styles.emoji}>{currentSlide.emoji}</Text>

        {/* Title */}
        <Text style={styles.title}>{currentSlide.title}</Text>

        {/* Description */}
        <Text style={styles.description}>{currentSlide.description}</Text>

        {/* Dots Indicator */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive
              ]}
            />
          ))}
        </View>

        {/* Next/Finish Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  emoji: {
    fontSize: 120,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 60,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  dotActive: {
    backgroundColor: 'white',
    width: 30,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  nextButton: {
    backgroundColor: 'white',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
});
