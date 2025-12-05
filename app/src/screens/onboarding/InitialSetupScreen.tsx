import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useLanguageStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store';

const { width } = Dimensions.get('window');

interface InitialSetupScreenProps {
  onComplete: () => void;
  initialStep?: SetupStep;
}

type SetupStep = 'language' | 'name' | 'age' | 'survey_length';

const LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

const AGE_RANGES = [
  { value: '13-17', label: '13-17' },
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55+', label: '55+' },
];

const SURVEY_LENGTHS = [
  { 
    value: 'short', 
    label: { en: 'Quick', es: 'Rápida' },
    description: { 
      en: '5 minutes • Basic understanding', 
      es: '5 minutos • Comprensión básica' 
    },
    questions: 10
  },
  { 
    value: 'medium', 
    label: { en: 'Standard', es: 'Estándar' },
    description: { 
      en: '10 minutes • Good personalization', 
      es: '10 minutos • Buena personalización' 
    },
    questions: 20
  },
  { 
    value: 'complete', 
    label: { en: 'Complete', es: 'Completa' },
    description: { 
      en: '15 minutes • Best AI understanding', 
      es: '15 minutos • Mejor comprensión de la IA' 
    },
    questions: 35
  },
];

export const InitialSetupScreen: React.FC<InitialSetupScreenProps> = ({ onComplete, initialStep }) => {
  const { mode } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  const [step, setStep] = useState<SetupStep>(initialStep || 'language');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es'>(language);
  const [displayName, setDisplayName] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [surveyLength, setSurveyLength] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(!!initialStep);

  const t = (en: string, es: string) => selectedLanguage === 'es' ? es : en;

  // Load existing profile data when coming back from Assessment
  useEffect(() => {
    if (initialStep) {
      loadExistingProfile();
    }
  }, [initialStep]);

  const loadExistingProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, age_range, preferred_language, survey_length_preference')
        .eq('id', user?.id)
        .single();
      
      if (profile) {
        if (profile.display_name) setDisplayName(profile.display_name);
        if (profile.age_range) setAgeRange(profile.age_range);
        if (profile.preferred_language) {
          setSelectedLanguage(profile.preferred_language as 'en' | 'es');
          setLanguage(profile.preferred_language as 'en' | 'es');
        }
        if (profile.survey_length_preference) setSurveyLength(profile.survey_length_preference);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Save progress when moving to next step
  const saveProgress = async (data: Record<string, any>) => {
    try {
      await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  const handleNext = async () => {
    if (step === 'language') {
      setLanguage(selectedLanguage);
      await saveProgress({ preferred_language: selectedLanguage });
      setStep('name');
    } else if (step === 'name') {
      if (displayName.trim().length < 2) return;
      await saveProgress({ display_name: displayName.trim() });
      setStep('age');
    } else if (step === 'age') {
      if (!ageRange) return;
      await saveProgress({ age_range: ageRange });
      setStep('survey_length');
    } else if (step === 'survey_length') {
      await saveSetup();
    }
  };

  const handleBack = () => {
    if (step === 'name') setStep('language');
    else if (step === 'age') setStep('name');
    else if (step === 'survey_length') setStep('age');
  };

  const saveSetup = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          age_range: ageRange,
          preferred_language: selectedLanguage,
          survey_length_preference: surveyLength,
          initial_setup_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;
      onComplete();
    } catch (err) {
      console.error('Error saving setup:', err);
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 'language') return true;
    if (step === 'name') return displayName.trim().length >= 2;
    if (step === 'age') return !!ageRange;
    if (step === 'survey_length') return !!surveyLength;
    return false;
  };

  const getStepNumber = () => {
    const steps: SetupStep[] = ['language', 'name', 'age', 'survey_length'];
    return steps.indexOf(step) + 1;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 40,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      marginBottom: 40,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 2,
      width: `${(getStepNumber() / 4) * 100}%`,
    },
    stepIndicator: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 32,
      lineHeight: 24,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '15',
    },
    optionFlag: {
      fontSize: 32,
      marginRight: 16,
    },
    optionText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    optionDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    input: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      fontSize: 18,
      color: theme.text,
      borderWidth: 2,
      borderColor: theme.border,
    },
    inputFocused: {
      borderColor: theme.primary,
    },
    ageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    ageOption: {
      width: '48%',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    ageOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '15',
    },
    ageText: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    surveyOption: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    surveyOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '15',
    },
    surveyLabel: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    surveyDescription: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    surveyNote: {
      marginTop: 20,
      padding: 16,
      backgroundColor: theme.primary + '10',
      borderRadius: 12,
    },
    surveyNoteText: {
      fontSize: 13,
      color: theme.primary,
      textAlign: 'center',
      lineHeight: 20,
    },
    footer: {
      flexDirection: 'row',
      padding: 24,
      gap: 12,
    },
    backBtn: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
    },
    backBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    nextBtn: {
      flex: 2,
      backgroundColor: theme.primary,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
    },
    nextBtnDisabled: {
      opacity: 0.5,
    },
    nextBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  const renderLanguageStep = () => (
    <>
      <Text style={styles.title}>
        {t('Choose your language', 'Elige tu idioma')}
      </Text>
      <Text style={styles.subtitle}>
        {t(
          'This will be used throughout the app',
          'Se usará en toda la aplicación'
        )}
      </Text>
      {LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.optionCard,
            selectedLanguage === lang.code && styles.optionCardSelected,
          ]}
          onPress={() => setSelectedLanguage(lang.code as 'en' | 'es')}
        >
          <Text style={styles.optionFlag}>{lang.flag}</Text>
          <Text style={styles.optionText}>{lang.name}</Text>
        </TouchableOpacity>
      ))}
    </>
  );

  const renderNameStep = () => (
    <>
      <Text style={styles.title}>
        {t('What should we call you?', '¿Cómo te gustaría que te llamemos?')}
      </Text>
      <Text style={styles.subtitle}>
        {t(
          'This is how Quest will address you',
          'Así es como Quest te llamará'
        )}
      </Text>
      <TextInput
        style={styles.input}
        placeholder={t('Your name or nickname', 'Tu nombre o apodo')}
        placeholderTextColor={theme.textMuted}
        value={displayName}
        onChangeText={setDisplayName}
        autoFocus
        maxLength={30}
      />
    </>
  );

  const renderAgeStep = () => (
    <>
      <Text style={styles.title}>
        {t('Your age range', 'Tu rango de edad')}
      </Text>
      <Text style={styles.subtitle}>
        {t(
          'Helps us personalize your experience',
          'Nos ayuda a personalizar tu experiencia'
        )}
      </Text>
      <View style={styles.ageGrid}>
        {AGE_RANGES.map((age) => (
          <TouchableOpacity
            key={age.value}
            style={[
              styles.ageOption,
              ageRange === age.value && styles.ageOptionSelected,
            ]}
            onPress={() => setAgeRange(age.value)}
          >
            <Text style={styles.ageText}>{age.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderSurveyLengthStep = () => (
    <>
      <Text style={styles.title}>
        {t('Assessment length', 'Duración de la evaluación')}
      </Text>
      <Text style={styles.subtitle}>
        {t(
          'How much time do you have? The more questions, the better Quest will understand you.',
          '¿Cuánto tiempo tienes? Entre más preguntas, mejor te conocerá Quest.'
        )}
      </Text>
      {SURVEY_LENGTHS.map((length) => (
        <TouchableOpacity
          key={length.value}
          style={[
            styles.surveyOption,
            surveyLength === length.value && styles.surveyOptionSelected,
          ]}
          onPress={() => setSurveyLength(length.value)}
        >
          <Text style={styles.surveyLabel}>
            {length.label[selectedLanguage]}
          </Text>
          <Text style={styles.surveyDescription}>
            {length.description[selectedLanguage]}
          </Text>
        </TouchableOpacity>
      ))}
      <View style={styles.surveyNote}>
        <Text style={styles.surveyNoteText}>
          {t(
            '💡 Tip: The complete assessment gives the AI the best understanding of your personality and goals',
            '💡 Tip: La evaluación completa le da a la IA la mejor comprensión de tu personalidad y metas'
          )}
        </Text>
      </View>
    </>
  );

  // Loading state when coming back from Assessment
  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.stepIndicator}>
            {t(`Step ${getStepNumber()} of 4`, `Paso ${getStepNumber()} de 4`)}
          </Text>
          
          {step === 'language' && renderLanguageStep()}
          {step === 'name' && renderNameStep()}
          {step === 'age' && renderAgeStep()}
          {step === 'survey_length' && renderSurveyLengthStep()}
        </ScrollView>

        <View style={styles.footer}>
          {step !== 'language' && (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backBtnText}>
                {t('Back', 'Atrás')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextBtn,
              !canProceed() && styles.nextBtnDisabled,
              step === 'language' && { flex: 1 },
            ]}
            onPress={handleNext}
            disabled={!canProceed() || saving}
          >
            <Text style={styles.nextBtnText}>
              {saving
                ? t('Saving...', 'Guardando...')
                : step === 'survey_length'
                ? t('Start Assessment', 'Comenzar Evaluación')
                : t('Continue', 'Continuar')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default InitialSetupScreen;
