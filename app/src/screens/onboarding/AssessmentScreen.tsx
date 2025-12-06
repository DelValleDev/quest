import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useAuthStore, useLanguageStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { questAI } from '../../lib/openai';
import { t } from '../../lib/i18n';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 80; // Total slider width (accounting for padding)

interface Question {
  id: string;
  pillar: string;
  question_text: string;
  question_text_en?: string; // English translation
  question_type: 'slider' | 'single_choice' | 'multiple_choice';
  options: string[] | null;
  options_en?: string[] | null; // English options
  sort_order: number;
}

// Pillar info with translations
const getPillarInfo = (lang: 'en' | 'es'): Record<string, { emoji: string; name: string; color: string }> => ({
  physical: { emoji: '💪', name: lang === 'es' ? 'Físico' : 'Physical', color: '#EF4444' },
  mental: { emoji: '🧠', name: 'Mental', color: '#3B82F6' },
  social: { emoji: '❤️', name: 'Social', color: '#EC4899' },
  professional: { emoji: '💰', name: lang === 'es' ? 'Profesional' : 'Professional', color: '#10B981' },
  spiritual: { emoji: '🕉️', name: lang === 'es' ? 'Espiritual' : 'Spiritual', color: '#8B5CF6' },
  creative: { emoji: '🎨', name: lang === 'es' ? 'Creativo' : 'Creative', color: '#F97316' },
});

// Custom Draggable Slider Component
interface DraggableSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  primaryColor: string;
  trackColor: string;
  onSlideStart?: () => void;
  onSlideEnd?: () => void;
}

const DraggableSlider: React.FC<DraggableSliderProps> = ({
  value,
  onValueChange,
  primaryColor,
  trackColor,
  onSlideStart,
  onSlideEnd,
}) => {
  const sliderRef = useRef<View>(null);
  const sliderXRef = useRef(0);
  
  // Store callbacks in refs so PanResponder always has latest
  const onSlideStartRef = useRef(onSlideStart);
  const onSlideEndRef = useRef(onSlideEnd);
  const onValueChangeRef = useRef(onValueChange);
  
  // Update refs when props change
  useEffect(() => {
    onSlideStartRef.current = onSlideStart;
    onSlideEndRef.current = onSlideEnd;
    onValueChangeRef.current = onValueChange;
  }, [onSlideStart, onSlideEnd, onValueChange]);
  
  // Calculate value from position
  const calculateValue = useCallback((pageX: number) => {
    const position = pageX - sliderXRef.current;
    const clampedPosition = Math.max(0, Math.min(position, SLIDER_WIDTH));
    const newValue = Math.round((clampedPosition / SLIDER_WIDTH) * 100);
    return newValue;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      // Capture horizontal gestures more aggressively
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Always capture if moving horizontally more than vertically
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 0.5 || Math.abs(gestureState.dx) > 3;
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        // Capture the gesture before ScrollView if moving horizontally
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 0.5 || Math.abs(gestureState.dx) > 3;
      },
      onPanResponderGrant: (evt) => {
        // Notify parent to disable scroll via ref
        onSlideStartRef.current?.();
        // Guard against null nativeEvent (synthetic event pooling)
        const pageX = evt.nativeEvent?.pageX;
        if (pageX == null) return;
        // Get the slider position when touch starts
        sliderRef.current?.measure((x, y, w, h, sliderPageX, pageY) => {
          sliderXRef.current = sliderPageX;
          const newValue = calculateValue(pageX);
          onValueChangeRef.current(newValue);
        });
      },
      onPanResponderMove: (evt) => {
        // Guard against null nativeEvent (synthetic event pooling)
        const pageX = evt.nativeEvent?.pageX;
        if (pageX == null) return;
        const newValue = calculateValue(pageX);
        onValueChangeRef.current(newValue);
      },
      onPanResponderRelease: (evt) => {
        // Guard against null nativeEvent (synthetic event pooling)
        const pageX = evt.nativeEvent?.pageX;
        if (pageX != null) {
          const newValue = calculateValue(pageX);
          onValueChangeRef.current(newValue);
        }
        // Notify parent to enable scroll again via ref
        onSlideEndRef.current?.();
      },
      onPanResponderTerminate: () => {
        // Also enable scroll if gesture is terminated
        onSlideEndRef.current?.();
      },
    })
  ).current;

  // Update slider position reference on layout
  const handleLayout = () => {
    sliderRef.current?.measure((x, y, w, h, pageX, pageY) => {
      sliderXRef.current = pageX;
    });
  };

  return (
    <View style={sliderStyles.container}>
      <Text style={[sliderStyles.valueText, { color: primaryColor }]}>
        {value}
      </Text>
      <View
        ref={sliderRef}
        onLayout={handleLayout}
        style={[sliderStyles.track, { backgroundColor: trackColor }]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            sliderStyles.fill,
            {
              width: `${value}%`,
              backgroundColor: primaryColor,
            },
          ]}
        />
        <View
          style={[
            sliderStyles.thumb,
            {
              left: `${value}%`,
              backgroundColor: primaryColor,
            },
          ]}
        />
      </View>
      <View style={sliderStyles.labels}>
        <Text style={[sliderStyles.label, { color: trackColor }]}>0</Text>
        <Text style={[sliderStyles.label, { color: trackColor }]}>50</Text>
        <Text style={[sliderStyles.label, { color: trackColor }]}>100</Text>
      </View>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  valueText: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  track: {
    height: 12,
    borderRadius: 6,
    position: 'relative',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: '100%',
    borderRadius: 6,
  },
  thumb: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: -16,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});

interface AssessmentScreenProps {
  onBackToSetup?: () => void;
}

export const AssessmentScreen: React.FC<AssessmentScreenProps> = ({ onBackToSetup }) => {
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const navigation = useNavigation();
  
  // Translation helper
  const PILLAR_INFO = getPillarInfo(language);

  // Get translated question text
  const getQuestionText = (q: Question): string => {
    if (language === 'en' && q.question_text_en) {
      return q.question_text_en;
    }
    return q.question_text;
  };

  // Get translated options
  const getQuestionOptions = (q: Question): string[] | null => {
    if (language === 'en' && q.options_en) {
      return q.options_en;
    }
    return q.options;
  };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [surveyLength, setSurveyLength] = useState<string>('complete');
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Load saved progress AFTER questions are loaded
  useEffect(() => {
    if (questions.length > 0 && user?.id) {
      loadSavedProgress();
    }
  }, [questions]);

  // Load previously saved answers and current index if user went back and returned
  const loadSavedProgress = async () => {
    if (!user?.id || questions.length === 0) return;
    try {
      // Load saved answers
      const { data: savedAnswers } = await supabase
        .from('user_assessment_answers')
        .select('question_id, answer_value, answer_choice, answer_choices')
        .eq('user_id', user.id);

      // Also try to load saved index from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('assessment_current_index')
        .eq('id', user.id)
        .single();
      
      if (savedAnswers && savedAnswers.length > 0) {
        const restoredAnswers: Record<string, any> = {};
        savedAnswers.forEach((ans) => {
          restoredAnswers[ans.question_id] = {
            answer_value: ans.answer_value,
            answer_choice: ans.answer_choice,
            answer_choices: ans.answer_choices,
          };
        });
        setAnswers(restoredAnswers);

        // Use saved index from profile if available, otherwise calculate from answers
        let resumeIndex = 0;
        
        if (profile?.assessment_current_index !== undefined && profile.assessment_current_index !== null) {
          // Use the saved index directly
          resumeIndex = profile.assessment_current_index;
        } else {
          // Fallback: find the first question without an answer
          for (let i = 0; i < questions.length; i++) {
            if (restoredAnswers[questions[i].id]) {
              resumeIndex = i + 1; // Move to next question after last answered
            } else {
              break; // Found first unanswered question
            }
          }
        }
        
        // Don't go past the last question
        if (resumeIndex >= questions.length) {
          resumeIndex = questions.length - 1;
        }
        setCurrentIndex(resumeIndex);
      }
    } catch (err) {
      console.log('No saved progress found');
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      // Get user's survey length preference
      const { data: profile } = await supabase
        .from('profiles')
        .select('survey_length_preference')
        .eq('id', user?.id)
        .single();
      
      const preference = profile?.survey_length_preference || 'complete';
      setSurveyLength(preference);
      
      // Determine priority filter based on preference
      // Short: core only (2 per pillar = 12)
      // Medium: core + extended (4 per pillar = 24)
      // Complete: all questions
      let priorityFilter: string[] = [];
      if (preference === 'short') {
        priorityFilter = ['core'];
      } else if (preference === 'medium') {
        priorityFilter = ['core', 'extended'];
      }
      // complete = no filter, get all

      let query = supabase
        .from('assessment_questions')
        .select('*')
        .order('sort_order');
      
      // Apply priority filter if not complete
      if (priorityFilter.length > 0) {
        query = query.in('priority', priorityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      Alert.alert(t('common.error'), t('errors.loadQuestions'));
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const currentPillar = currentQuestion?.pillar;
  const pillarInfo = currentPillar ? PILLAR_INFO[currentPillar] : null;

  // Exclusive options (if selected, deselect others)
  // Only exact patterns that indicate "none of the above" type options
  const isExclusiveOption = (option: string) => {
    const lowerOption = option.toLowerCase().trim();
    // Must be a standalone exclusive phrase, not part of another word
    const exclusivePhrases = [
      'ninguno todavía',
      'ninguna todavía', 
      'ninguno',
      'ninguna',
      'nada en particular',
      'ninguna en particular',
      'estoy bien',
      'voy por buen camino',
      'none',
      'nothing in particular',
    ];
    // Check if the option IS one of these exclusive phrases (starts with)
    return exclusivePhrases.some(phrase => lowerOption.startsWith(phrase) || lowerOption === phrase);
  };

  const handleAnswer = (value: any) => {
    const questionId = currentQuestion.id;
    
    if (currentQuestion.question_type === 'multiple_choice') {
      const current = (answers[questionId]?.answer_choices || []) as string[];
      
      // Check if this is an exclusive option
      if (isExclusiveOption(value)) {
        // If clicking exclusive, only select that one
        if (current.includes(value)) {
          // Deselecting exclusive option
          setAnswers({
            ...answers,
            [questionId]: { answer_choices: [] },
          });
        } else {
          // Selecting exclusive option - clear others
          setAnswers({
            ...answers,
            [questionId]: { answer_choices: [value] },
          });
        }
      } else {
        // Regular option - remove any exclusive options when selecting
        const currentWithoutExclusive = current.filter(c => !isExclusiveOption(c));
        const newChoices = currentWithoutExclusive.includes(value)
          ? currentWithoutExclusive.filter((c) => c !== value)
          : [...currentWithoutExclusive, value];
        
        setAnswers({
          ...answers,
          [questionId]: { answer_choices: newChoices },
        });
      }
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
      Alert.alert(t('assessment.answerRequired'), t('assessment.selectOption'));
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

  // Go back to setup - saves progress first
  const handleBackToSetup = async () => {
    if (!user?.id) return;
    
    try {
      // Save current answers before going back
      const answersToSave = Object.entries(answers).map(([questionId, answer]) => ({
        user_id: user.id,
        question_id: questionId,
        answer_value: answer.answer_value || null,
        answer_choice: answer.answer_choice || null,
        answer_choices: answer.answer_choices || null,
      }));

      if (answersToSave.length > 0) {
        await supabase
          .from('user_assessment_answers')
          .upsert(answersToSave, { onConflict: 'user_id,question_id' });
      }

      // Also save current question index to profiles
      await supabase
        .from('profiles')
        .update({ assessment_current_index: currentIndex })
        .eq('id', user.id);
    } catch (err) {
      console.log('Error saving progress:', err);
    }

    // Go back to setup
    if (onBackToSetup) {
      onBackToSetup();
    }
  };

  const [analysisStatus, setAnalysisStatus] = useState<string>('');

  const finishAssessment = async () => {
    setSubmitting(true);
    try {
      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user?.id)
        .single();

      // Get active pillars selected by user
      const { data: activePillarsData } = await supabase
        .from('user_pillars')
        .select('pillar_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      const activePillars = activePillarsData?.map(p => p.pillar_id) || 
        ['physical', 'mental', 'social', 'professional', 'spiritual', 'creative'];

      setAnalysisStatus(t('assessment.analyzingAI'));

      // Use AI to analyze assessment (pass language and active pillars)
      const analysis = await questAI.analyzeAssessment(
        questions,
        answers,
        profile?.display_name || undefined,
        language, // Pass language so AI responds in correct language
        activePillars // Pass active pillars for focused generation
      );

      setAnalysisStatus(t('assessment.savingProfile'));

      // Update profile with AI-analyzed data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          assessment_completed: true,
          pillar_scores: analysis.pillar_scores,
          personality_summary: analysis.personality_summary,
          strengths: analysis.strengths,
          areas_to_improve: analysis.areas_to_improve,
          recommended_class: analysis.recommended_class,
          user_class: analysis.recommended_class, // Auto-set class from AI recommendation
          personalized_goals: analysis.personalized_goals,
          coach_welcome_message: analysis.coach_welcome_message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (updateError) {
        console.warn('Some profile fields may not exist:', updateError);
        // Fallback: just save pillar_scores and class if other columns don't exist
        await supabase
          .from('profiles')
          .update({
            assessment_completed: true,
            pillar_scores: analysis.pillar_scores,
            user_class: analysis.recommended_class,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user?.id);
      }

      // Save initial quests from AI
      if (analysis.initial_quests && analysis.initial_quests.length > 0) {
        setAnalysisStatus(t('assessment.creatingQuests'));
        try {
          await questAI.saveGeneratedQuests(user?.id || '', analysis.initial_quests);
        } catch (e) {
          console.warn('Could not save initial quests:', e);
        }
      }

      // NOTE: Life Paths are NOT created automatically after assessment
      // The user should request/create them manually based on their priorities
      // This gives users control over what long-term goals they want to focus on
      let createdPathIds: string[] = [];

      // Save Habits from AI
      if (analysis.habits && analysis.habits.length > 0) {
        setAnalysisStatus(t('assessment.organizingHabits'));
        try {
          await questAI.saveGeneratedHabits(user?.id || '', analysis.habits, createdPathIds);
        } catch (e) {
          console.warn('Could not save habits:', e);
        }
      }

      // Show result and go to Main (no class selection - it's automatic now!)
      const classNames: Record<string, string> = {
        warrior: `${t('classes.warrior.name')} 💪`,
        sage: `${t('classes.sage.name')} 🧠`,
        connector: `${t('classes.connector.name')} ❤️`,
        creator: `${t('classes.creator.name')} 🎨`,
        achiever: `${t('classes.achiever.name')} 💼`,
        monk: `${t('classes.monk.name')} 🕉️`,
      };
      
      const assignedClass = classNames[analysis.recommended_class] || analysis.recommended_class;
      
      Alert.alert(
        t('assessment.completedTitle'),
        `${analysis.coach_welcome_message || t('common.success')}\n\n🏆 ${t('assessment.assignedClass')}: ${assignedClass}`,
        [
          {
            text: t('assessment.letsGo'),
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'Main' as never }],
            }),
          },
        ]
      );
    } catch (err: any) {
      console.error('Error finishing assessment:', err);
      Alert.alert(t('common.error'), err.message || t('errors.generic'));
    } finally {
      setSubmitting(false);
      setAnalysisStatus('');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    headerBackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
    },
    headerBackIcon: {
      fontSize: 24,
      color: theme.primary,
      marginRight: 4,
    },
    headerBackText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: '600',
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
      {/* Header with back arrow */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={handleBackToSetup}>
          <Text style={styles.headerBackIcon}>←</Text>
          <Text style={styles.headerBackText}>{t('common.setup')}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {t('assessment.question')} {currentIndex + 1} {t('assessment.of')} {questions.length}
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
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>
            {t('assessment.question').toUpperCase()} {currentIndex + 1}
          </Text>
          <Text style={styles.questionText}>
            {getQuestionText(currentQuestion)}
          </Text>

          {/* Slider Type */}
          {currentQuestion.question_type === 'slider' && (
            <DraggableSlider
              value={currentAnswer?.answer_value ?? 50}
              onValueChange={(value) => handleAnswer(value)}
              primaryColor={pillarInfo?.color || theme.primary}
              trackColor={theme.border}
              onSlideStart={() => setScrollEnabled(false)}
              onSlideEnd={() => setScrollEnabled(true)}
            />
          )}

          {/* Single Choice Type */}
          {currentQuestion.question_type === 'single_choice' &&
            getQuestionOptions(currentQuestion)?.map((option, idx) => {
              // Get the original option for comparison (always use Spanish for storage)
              const originalOption = currentQuestion.options?.[idx] || option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionBtn,
                    currentAnswer?.answer_choice === originalOption &&
                      styles.optionBtnSelected,
                  ]}
                  onPress={() => handleAnswer(originalOption)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      currentAnswer?.answer_choice === originalOption &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}

          {/* Multiple Choice Type */}
          {currentQuestion.question_type === 'multiple_choice' &&
            getQuestionOptions(currentQuestion)?.map((option, idx) => {
              // Get original option for storage (always use Spanish)
              const originalOption = currentQuestion.options?.[idx] || option;
              const selected = (
                currentAnswer?.answer_choices || []
              ).includes(originalOption);
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionBtn,
                    selected && styles.optionBtnSelected,
                  ]}
                  onPress={() => handleAnswer(originalOption)}
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
        {/* Show back button only if not on first question */}
        {currentIndex > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>← {t('common.back')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            !canProceed() && styles.nextBtnDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed() || submitting}
        >
          {submitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={[styles.nextBtnText, { marginLeft: 8 }]}>
                {analysisStatus || t('assessment.analyzing')}
              </Text>
            </View>
          ) : (
            <Text style={styles.nextBtnText}>
              {currentIndex === questions.length - 1
                ? `${t('assessment.complete')} ✓`
                : `${t('common.next')} →`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AssessmentScreen;
