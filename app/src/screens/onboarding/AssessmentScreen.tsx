import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useAuthStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Question {
  id: string;
  pillar: string;
  question_text: string;
  question_type: 'slider' | 'single_choice' | 'multiple_choice';
  options: string[] | null;
  sort_order: number;
}

const PILLAR_INFO: Record<string, { emoji: string; name: string; color: string }> = {
  physical: { emoji: '💪', name: 'Físico', color: '#EF4444' },
  mental: { emoji: '🧠', name: 'Mental', color: '#3B82F6' },
  social: { emoji: '❤️', name: 'Social', color: '#EC4899' },
  professional: { emoji: '💰', name: 'Profesional', color: '#10B981' },
  spiritual: { emoji: '🕉️', name: 'Espiritual', color: '#8B5CF6' },
  creative: { emoji: '🎨', name: 'Creativo', color: '#F97316' },
};

export const AssessmentScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);
  const navigation = useNavigation();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_questions')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      Alert.alert('Error', 'Failed to load assessment questions');
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
      // Toggle selection
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
    } else if (currentQuestion.question_type === 'slider') {
      setAnswers({
        ...answers,
        [questionId]: { answer_value: value },
      });
    }
  };

  const canProceed = () => {
    const answer = answers[currentQuestion?.id];
    if (!answer) return false;

    if (currentQuestion.question_type === 'multiple_choice') {
      return answer.answer_choices && answer.answer_choices.length > 0;
    } else if (currentQuestion.question_type === 'single_choice') {
      return !!answer.answer_choice;
    } else if (currentQuestion.question_type === 'slider') {
      return answer.answer_value !== undefined;
    }
    return false;
  };

  const handleNext = async () => {
    if (!canProceed()) {
      Alert.alert('Respuesta requerida', 'Por favor selecciona una opción');
      return;
    }

    // Save current answer to DB
    const answer = answers[currentQuestion.id];
    try {
      const { error } = await supabase.rpc('submit_assessment_answer', {
        p_user_id: user?.id,
        p_question_id: currentQuestion.id,
        p_answer_value: answer.answer_value || null,
        p_answer_choice: answer.answer_choice || null,
        p_answer_choices: answer.answer_choices ? JSON.stringify(answer.answer_choices) : null,
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving answer:', err);
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finish assessment
      await finishAssessment();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const finishAssessment = async () => {
    setSubmitting(true);
    try {
      // Calculate pillar scores
      const { data: scores, error: scoresError } = await supabase.rpc(
        'calculate_pillar_scores',
        { p_user_id: user?.id }
      );

      if (scoresError) throw scoresError;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          assessment_completed: true,
          pillar_scores: scores,
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      Alert.alert(
        '¡Assessment Completado! 🎉',
        'Ahora vamos a crear tu plan personalizado',
        [
          {
            text: 'Ver Resultados',
            onPress: () => navigation.navigate('AssessmentResults' as never),
          },
        ]
      );
    } catch (err: any) {
      console.error('Error finishing assessment:', err);
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    progressContainer: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    progressText: {
      color: theme.textSecondary,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    pillarBanner: {
      paddingVertical: 20,
      paddingHorizontal: 20,
      alignItems: 'center',
      marginBottom: 10,
    },
    pillarEmoji: {
      fontSize: 48,
      marginBottom: 8,
    },
    pillarName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    questionCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    },
    questionNumber: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 10,
    },
    questionText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      lineHeight: 26,
      marginBottom: 20,
    },
    // Single/Multiple Choice
    optionBtn: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionBtnSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '20',
    },
    optionText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
    },
    optionTextSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
    // Slider
    sliderContainer: {
      marginBottom: 20,
    },
    sliderTrack: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      marginBottom: 15,
    },
    sliderFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    sliderThumb: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.primary,
      top: -11,
      marginLeft: -15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    sliderLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    sliderValue: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.primary,
      textAlign: 'center',
      marginBottom: 15,
    },
    // Navigation
    navButtons: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    backBtn: {
      flex: 1,
      backgroundColor: theme.surface,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    backBtnText: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    nextBtn: {
      flex: 2,
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    nextBtnDisabled: {
      opacity: 0.5,
    },
    nextBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    loader: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <Text style={{ color: theme.text }}>No questions available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentAnswer = answers[currentQuestion.id];

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Pregunta {currentIndex + 1} de {questions.length}
        </Text>
      </View>

      {/* Pillar Banner */}
      {pillarInfo && (
        <View
          style={[
            styles.pillarBanner,
            { backgroundColor: pillarInfo.color + '20' },
          ]}
        >
          <Text style={styles.pillarEmoji}>{pillarInfo.emoji}</Text>
          <Text style={[styles.pillarName, { color: pillarInfo.color }]}>
            {pillarInfo.name}
          </Text>
        </View>
      )}

      {/* Question */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>
            PREGUNTA {currentIndex + 1}
          </Text>
          <Text style={styles.questionText}>
            {currentQuestion.question_text}
          </Text>

          {/* Slider Type */}
          {currentQuestion.question_type === 'slider' && (
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>
                {currentAnswer?.answer_value ?? 50}
              </Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => {
                  const locationX = e.nativeEvent.locationX;
                  const containerWidth = width - 80; // padding
                  const value = Math.round((locationX / containerWidth) * 100);
                  handleAnswer(Math.max(0, Math.min(100, value)));
                }}
              >
                <View style={styles.sliderTrack}>
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        width: `${currentAnswer?.answer_value ?? 50}%`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderThumb,
                      {
                        left: `${currentAnswer?.answer_value ?? 50}%`,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0</Text>
                <Text style={styles.sliderLabel}>50</Text>
                <Text style={styles.sliderLabel}>100</Text>
              </View>
            </View>
          )}

          {/* Single Choice Type */}
          {currentQuestion.question_type === 'single_choice' &&
            currentQuestion.options?.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionBtn,
                  currentAnswer?.answer_choice === option &&
                    styles.optionBtnSelected,
                ]}
                onPress={() => handleAnswer(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    currentAnswer?.answer_choice === option &&
                      styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}

          {/* Multiple Choice Type */}
          {currentQuestion.question_type === 'multiple_choice' &&
            currentQuestion.options?.map((option) => {
              const selected = (
                currentAnswer?.answer_choices || []
              ).includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionBtn,
                    selected && styles.optionBtnSelected,
                  ]}
                  onPress={() => handleAnswer(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}
                  >
                    {selected ? '✓ ' : ''}
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navButtons}>
        {currentIndex > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>← Atrás</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            !canProceed() && styles.nextBtnDisabled,
            currentIndex === 0 && { flex: 1 },
          ]}
          onPress={handleNext}
          disabled={!canProceed() || submitting}
        >
          <Text style={styles.nextBtnText}>
            {submitting
              ? 'Guardando...'
              : currentIndex === questions.length - 1
              ? 'Finalizar ✓'
              : 'Siguiente →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AssessmentScreen;
