import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useAuthStore, useLanguageStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { t } from '../../lib/i18n';

const { width } = Dimensions.get('window');

interface AspirationalQuestion {
  id: string;
  pillar: string;
  question_text: string;
  question_type: 'text' | 'single_choice' | 'multiple_choice' | 'scale';
  options: string[] | null;
  placeholder: string | null;
  sort_order: number;
}

// Pillar info with translations
const getPillarInfo = (lang: 'en' | 'es'): Record<string, { emoji: string; name: string; color: string }> => ({
  general: { emoji: '🎯', name: lang === 'es' ? 'General' : 'General', color: '#6366F1' },
  physical: { emoji: '💪', name: lang === 'es' ? 'Físico' : 'Physical', color: '#EF4444' },
  mental: { emoji: '🧠', name: 'Mental', color: '#3B82F6' },
  social: { emoji: '❤️', name: 'Social', color: '#EC4899' },
  professional: { emoji: '💰', name: lang === 'es' ? 'Profesional' : 'Professional', color: '#10B981' },
  spiritual: { emoji: '🕉️', name: lang === 'es' ? 'Espiritual' : 'Spiritual', color: '#8B5CF6' },
  creative: { emoji: '🎨', name: lang === 'es' ? 'Creativo' : 'Creative', color: '#F97316' },
});

interface AspirationsScreenProps {
  onComplete?: () => void;
  onBack?: () => void;
}

export const AspirationsScreen: React.FC<AspirationsScreenProps> = ({ onComplete, onBack }) => {
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const navigation = useNavigation();
  
  // Create styles early so they're available for early returns
  const styles = createStyles(theme);
  
  // Translation helper
  const PILLAR_INFO = getPillarInfo(language);

  const [questions, setQuestions] = useState<AspirationalQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('aspirational_questions')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching aspirational questions:', err);
      Alert.alert(t('common.error'), t('aspirations.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const currentPillar = currentQuestion?.pillar;
  const pillarInfo = currentPillar ? PILLAR_INFO[currentPillar] : null;

  const handleAnswer = (value: any) => {
    const questionId = currentQuestion.id;
    
    if (currentQuestion.question_type === 'multiple_choice') {
      const current = (answers[questionId]?.answer_choices || []) as string[];
      const newChoices = current.includes(value)
        ? current.filter((c) => c !== value)
        : [...current, value];
      
      setAnswers({
        ...answers,
        [questionId]: { answer_choices: newChoices },
      });
    } else if (currentQuestion.question_type === 'single_choice') {
      setAnswers({
        ...answers,
        [questionId]: { answer_choice: value },
      });
    } else if (currentQuestion.question_type === 'text') {
      setAnswers({
        ...answers,
        [questionId]: { answer_text: value },
      });
    } else if (currentQuestion.question_type === 'scale') {
      setAnswers({
        ...answers,
        [questionId]: { answer_value: value },
      });
    }
  };

  const currentAnswer = answers[currentQuestion?.id];

  const canProceed = () => {
    if (!currentAnswer) return false;
    
    if (currentQuestion.question_type === 'text') {
      return (currentAnswer.answer_text || '').trim().length > 0;
    }
    if (currentQuestion.question_type === 'multiple_choice') {
      return (currentAnswer.answer_choices || []).length > 0;
    }
    if (currentQuestion.question_type === 'single_choice') {
      return !!currentAnswer.answer_choice;
    }
    if (currentQuestion.question_type === 'scale') {
      return currentAnswer.answer_value !== undefined;
    }
    return true;
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // Submit all answers
      await submitAnswers();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (onBack) {
      onBack();
    }
  };

  const submitAnswers = async () => {
    setSubmitting(true);
    try {
      // Prepare all answers for insertion
      const answersToInsert = Object.entries(answers).map(([questionId, answer]) => ({
        user_id: user?.id,
        question_id: questionId,
        answer_text: answer.answer_text || null,
        answer_choice: answer.answer_choice || null,
        answer_choices: answer.answer_choices || null,
        answer_value: answer.answer_value || null,
      }));

      // Upsert all answers
      const { error: insertError } = await supabase
        .from('user_aspirational_answers')
        .upsert(answersToInsert, { onConflict: 'user_id,question_id' });

      if (insertError) throw insertError;

      // Mark aspirations as completed
      await supabase
        .from('profiles')
        .update({ 
          aspirations_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      // Navigate or callback
      if (onComplete) {
        onComplete();
      } else {
        // Ask if user wants to see tutorial
        Alert.alert(
          '🎉 ' + t('onboarding.complete', '¡Configuración Completa!'),
          t('onboarding.tutorialPrompt', '¿Te gustaría ver un tutorial rápido de todas las funcionalidades?'),
          [
            { 
              text: t('common.skip', 'Omitir'),
              style: 'cancel',
              onPress: () => {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                });
              }
            },
            { 
              text: t('common.yes', 'Sí, muéstrame'),
              onPress: () => {
                (navigation as any).navigate('OnboardingTutorial');
              }
            },
          ]
        );
      }
    } catch (err) {
      console.error('Error submitting aspirations:', err);
      Alert.alert('Error', t('Failed to save your aspirations', 'Error al guardar tus aspiraciones'));
    } finally {
      setSubmitting(false);
    }
  };

  const skipAspirations = async () => {
    Alert.alert(
      t('aspirations.skipTitle'),
      t('aspirations.skipMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('aspirations.skip'), 
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('profiles')
              .update({ 
                aspirations_completed: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', user?.id);
            
            if (onComplete) {
              onComplete();
            } else {
              // Ask if user wants to see tutorial
              Alert.alert(
                '🎉 ' + t('onboarding.ready', '¡Listo para empezar!'),
                t('onboarding.tutorialPrompt', '¿Te gustaría ver un tutorial rápido?'),
                [
                  { 
                    text: t('common.skip', 'No, gracias'),
                    style: 'cancel',
                    onPress: () => {
                      (navigation as any).reset({
                        index: 0,
                        routes: [{ name: 'MainTabs' }],
                      });
                    }
                  },
                  { 
                    text: t('common.yes', 'Sí'),
                    onPress: () => {
                      (navigation as any).navigate('OnboardingTutorial');
                    }
                  },
                ]
              );
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('aspirations.loadingJourney')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('aspirations.noQuestions')}
          </Text>
          <TouchableOpacity
            style={[styles.skipButton, { borderColor: theme.border }]}
            onPress={skipAspirations}
          >
            <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
              {t('common.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>
              ←
            </Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              🎯 {t('aspirations.title')}
            </Text>
          </View>
          <TouchableOpacity onPress={skipAspirations} style={styles.skipLink}>
            <Text style={[styles.skipLinkText, { color: theme.textSecondary }]}>
              {t('aspirations.skip')}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.surface }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: pillarInfo?.color || theme.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {currentIndex + 1} / {questions.length}
          </Text>
        </View>

        {/* Pillar Badge */}
        {pillarInfo && (
          <View style={[styles.pillarBadge, { backgroundColor: pillarInfo.color + '20' }]}>
            <Text style={styles.pillarEmoji}>{pillarInfo.emoji}</Text>
            <Text style={[styles.pillarName, { color: pillarInfo.color }]}>
              {pillarInfo.name}
            </Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.questionCard}>
            <Text style={[styles.questionNumber, { color: theme.textSecondary }]}>
              {t('aspirations.question')} {currentIndex + 1}
            </Text>
            <Text style={[styles.questionText, { color: theme.text }]}>
              {currentQuestion.question_text}
            </Text>

            {/* Text Input Type */}
            {currentQuestion.question_type === 'text' && (
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: theme.surface, 
                    color: theme.text,
                    borderColor: pillarInfo?.color || theme.border 
                  }
                ]}
                placeholder={currentQuestion.placeholder || t('aspirations.placeholder')}
                placeholderTextColor={theme.textSecondary}
                value={currentAnswer?.answer_text || ''}
                onChangeText={(text) => handleAnswer(text)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}

            {/* Single Choice Type */}
            {currentQuestion.question_type === 'single_choice' &&
              currentQuestion.options?.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionBtn,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    currentAnswer?.answer_choice === option && {
                      backgroundColor: (pillarInfo?.color || theme.primary) + '20',
                      borderColor: pillarInfo?.color || theme.primary,
                    },
                  ]}
                  onPress={() => handleAnswer(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.text },
                      currentAnswer?.answer_choice === option && {
                        color: pillarInfo?.color || theme.primary,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}

            {/* Multiple Choice Type */}
            {currentQuestion.question_type === 'multiple_choice' &&
              currentQuestion.options?.map((option) => {
                const isSelected = (currentAnswer?.answer_choices || []).includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionBtn,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      isSelected && {
                        backgroundColor: (pillarInfo?.color || theme.primary) + '20',
                        borderColor: pillarInfo?.color || theme.primary,
                      },
                    ]}
                    onPress={() => handleAnswer(option)}
                  >
                    <View style={styles.checkboxContainer}>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: theme.border },
                          isSelected && {
                            backgroundColor: pillarInfo?.color || theme.primary,
                            borderColor: pillarInfo?.color || theme.primary,
                          },
                        ]}
                      >
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          { color: theme.text, flex: 1 },
                          isSelected && { color: pillarInfo?.color || theme.primary },
                        ]}
                      >
                        {option}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

            {currentQuestion.question_type === 'multiple_choice' && (
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                {t('aspirations.selectAll')}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Navigation Buttons */}
      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            { backgroundColor: pillarInfo?.color || theme.primary },
            !canProceed() && styles.navButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextBtnText}>
              {currentIndex === questions.length - 1
                ? t('aspirations.complete')
                : `${t('common.next')} →`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    width: 50,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  skipLink: {
    padding: 8,
    width: 50,
    alignItems: 'flex-end',
  },
  skipLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  pillarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  pillarEmoji: {
    fontSize: 20,
  },
  pillarName: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  questionCard: {
    marginBottom: 20,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 32,
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    lineHeight: 24,
  },
  optionBtn: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 22,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  navButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    // Primary button styling
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  skipButton: {
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// Default styles for loading state
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  skipButton: {
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
