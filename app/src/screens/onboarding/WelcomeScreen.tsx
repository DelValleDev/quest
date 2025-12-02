import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Your Life is the Quest',
    subtitle: 'Transform your daily habits into an epic adventure. Level up every aspect of your life.',
    emoji: '🎮',
  },
  {
    id: 2,
    title: 'AI Coach Guides You',
    subtitle: 'Quest, your personal AI companion, creates a custom plan to become your best self.',
    emoji: '🤖',
  },
  {
    id: 3,
    title: 'Friends Are Your Allies',
    subtitle: 'Challenge friends, join raids, and hold each other accountable with real stakes.',
    emoji: '⚔️',
  },
];

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const { mode } = useThemeStore();
  const theme = getTheme(mode);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onGetStarted();
    }
  };

  const slide = slides[currentSlide];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Quest Logo/Mascot Area */}
      <View style={styles.mascotContainer}>
        <Text style={styles.mascotEmoji}>{slide.emoji}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {slide.subtitle}
        </Text>
      </View>

      {/* Dots Indicator */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index === currentSlide ? theme.primary : theme.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={handleNext}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {currentSlide < slides.length - 1 ? 'Next' : 'Get Started'}
        </Text>
      </TouchableOpacity>

      {/* Skip */}
      {currentSlide < slides.length - 1 && (
        <TouchableOpacity onPress={onGetStarted} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: theme.textMuted }]}>
            Skip
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mascotContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  mascotEmoji: {
    fontSize: 120,
  },
  content: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 48,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  button: {
    width: width - 48,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
  },
});
