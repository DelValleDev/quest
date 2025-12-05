/**
 * OnboardingTutorialScreen
 * Interactive walkthrough of all app features with premium trial
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { PremiumService } from '../../lib/premium';

const { width, height } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  emoji: string;
  isPremium: boolean;
  details: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido a Quest!',
    description: 'Tu app de desarrollo personal gamificada',
    emoji: '🎮',
    isPremium: false,
    details: [
      'Convierte tu vida en una aventura épica',
      'Sube de nivel en 6 pilares de vida',
      'Compite con amigos y gremios',
    ],
  },
  {
    id: 'pillars',
    title: 'Los 6 Pilares de Vida',
    description: 'Equilibra todas las áreas de tu vida',
    emoji: '⚖️',
    isPremium: false,
    details: [
      '💪 Físico - Salud y ejercicio',
      '🧠 Mental - Aprendizaje y enfoque',
      '👥 Social - Relaciones y comunidad',
      '💼 Profesional - Carrera y habilidades',
      '🧘 Espiritual - Paz y propósito',
      '🎨 Creativo - Arte y expresión',
    ],
  },
  {
    id: 'habits',
    title: 'Sistema de Hábitos',
    description: 'Construye rutinas que transforman',
    emoji: '🔄',
    isPremium: false,
    details: [
      'Crea hábitos diarios y semanales',
      'Trackea tu progreso con rachas 🔥',
      '⭐ PREMIUM: Hábitos ilimitados',
      '⭐ PREMIUM: Recordatorios personalizados',
    ],
  },
  {
    id: 'lifepaths',
    title: 'Life Paths',
    description: 'Diseña el mapa de tu vida',
    emoji: '🗺️',
    isPremium: true,
    details: [
      'Crea caminos hacia tus metas',
      'Añade hitos y fechas objetivo',
      'Visualiza tu progreso en el mapa',
      '⭐ PREMIUM: Life Paths ilimitados',
    ],
  },
  {
    id: 'quests',
    title: 'Quests Diarias',
    description: 'Misiones que te desafían cada día',
    emoji: '⚡',
    isPremium: false,
    details: [
      'Recibe 3-5 quests diarias',
      'Gana XP y monedas al completarlas',
      'Quests adaptadas a tus pilares débiles',
      '⭐ PREMIUM: Re-roll y quests custom',
    ],
  },
  {
    id: 'coach',
    title: 'Quest Coach (IA)',
    description: 'Tu coach personal con inteligencia artificial',
    emoji: '🤖',
    isPremium: true,
    details: [
      'Habla con tu coach 24/7',
      'Recibe consejos personalizados',
      'Crea hábitos y metas desde el chat',
      '⭐ PREMIUM: Chat ilimitado',
    ],
  },
  {
    id: 'social',
    title: 'Características Sociales',
    description: 'No estás solo en esta aventura',
    emoji: '👥',
    isPremium: false,
    details: [
      'Añade amigos y compite',
      'Únete a gremios',
      'Duelos 1v1',
      '⭐ PREMIUM: Crear gremios y raids',
    ],
  },
  {
    id: 'progress',
    title: 'Análisis de Progreso',
    description: 'Ve tu evolución a lo largo del tiempo',
    emoji: '📊',
    isPremium: true,
    details: [
      'Gráficos de tus pilares',
      'Historial de snapshots',
      'Comparación semanal',
      '⭐ PREMIUM: Historial completo de 1 año',
    ],
  },
  {
    id: 'premium',
    title: '🎁 ¡1 Mes Gratis de Premium!',
    description: 'Disfruta de todas las funciones sin límites',
    emoji: '👑',
    isPremium: true,
    details: [
      '✅ Chat ilimitado con Quest Coach',
      '✅ Life Paths y Hábitos ilimitados',
      '✅ Crear gremios y raids',
      '✅ Análisis detallado de progreso',
      '⏰ Después de 30 días, pasa a Free',
    ],
  },
];

export const OnboardingTutorialScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const progress = (currentStep + 1) / TUTORIAL_STEPS.length;

  const animateTransition = (direction: 'next' | 'prev') => {
    const toValue = direction === 'next' ? -width : width;
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: toValue / 4,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(prev => direction === 'next' ? prev + 1 : prev - 1);
      slideAnim.setValue(direction === 'next' ? width / 4 : -width / 4);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (isLastStep) {
      handleStartTrial();
    } else {
      animateTransition('next');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      animateTransition('prev');
    }
  };

  const handleSkip = async () => {
    // Skip tutorial without trial
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await PremiumService.completeTutorial(user.id);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error) {
      console.error('Error skipping tutorial:', error);
    }
  };

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Start trial
      const result = await PremiumService.startTrial(user.id);
      
      // Mark tutorial as completed
      await PremiumService.completeTutorial(user.id);

      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error) {
      console.error('Error starting trial:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: theme.primary,
                width: `${progress * 100}%`
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {currentStep + 1} / {TUTORIAL_STEPS.length}
        </Text>
      </View>

      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={[styles.skipText, { color: theme.textSecondary }]}>
          Saltar tutorial
        </Text>
      </TouchableOpacity>

      {/* Content */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }
        ]}
      >
        {/* Premium badge */}
        {step.isPremium && (
          <View style={[styles.premiumBadge, { backgroundColor: '#F59E0B20' }]}>
            <Text style={styles.premiumBadgeText}>👑 Feature Premium</Text>
          </View>
        )}

        {/* Emoji */}
        <Text style={styles.emoji}>{step.emoji}</Text>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>
          {step.title}
        </Text>

        {/* Description */}
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {step.description}
        </Text>

        {/* Details */}
        <View style={styles.detailsContainer}>
          {step.details.map((detail, index) => (
            <View 
              key={index} 
              style={[
                styles.detailItem,
                { backgroundColor: detail.startsWith('⭐') ? '#8B5CF620' : theme.surface }
              ]}
            >
              <Text 
                style={[
                  styles.detailText, 
                  { 
                    color: detail.startsWith('⭐') ? '#8B5CF6' : theme.text,
                    fontWeight: detail.startsWith('⭐') ? '600' : '400',
                  }
                ]}
              >
                {detail}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.navigation}>
        {currentStep > 0 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton, { borderColor: theme.border }]}
            onPress={handlePrev}
          >
            <Text style={[styles.prevButtonText, { color: theme.text }]}>
              ← Anterior
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.navButton} />
        )}

        <TouchableOpacity
          style={[
            styles.navButton, 
            styles.nextButton, 
            { backgroundColor: isLastStep ? '#10B981' : theme.primary }
          ]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? '...' : isLastStep ? '🎁 Activar Premium Gratis' : 'Siguiente →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dots indicator */}
      <View style={styles.dotsContainer}>
        {TUTORIAL_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentStep ? theme.primary : theme.border,
                width: index === currentStep ? 24 : 8,
              }
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  premiumBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  detailsContainer: {
    width: '100%',
    gap: 10,
  },
  detailItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  detailText: {
    fontSize: 15,
    textAlign: 'center',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  prevButton: {
    borderWidth: 2,
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 24,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

export default OnboardingTutorialScreen;
