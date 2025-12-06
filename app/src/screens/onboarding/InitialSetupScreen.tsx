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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useLanguageStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store';
import { PremiumService } from '../../lib/premium';

const { width } = Dimensions.get('window');

// Pillar limits by plan
const FREE_PILLAR_LIMIT = 2;
const PREMIUM_WARNING_THRESHOLD = 4; // Warn if selecting more than 4

interface InitialSetupScreenProps {
  onComplete: () => void;
  initialStep?: SetupStep;
}

type SetupStep = 'language' | 'name' | 'age' | 'pillars' | 'survey_length';

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

const PILLARS = [
  {
    id: 'physical',
    icon: '💪',
    color: '#EF4444',
    name: { en: 'Physical', es: 'Físico' },
    description: { en: 'Exercise, nutrition, sleep, health', es: 'Ejercicio, nutrición, sueño, salud' },
  },
  {
    id: 'mental',
    icon: '🧠',
    color: '#3B82F6',
    name: { en: 'Mental', es: 'Mental' },
    description: { en: 'Learning, focus, mindfulness, therapy', es: 'Aprendizaje, enfoque, mindfulness, terapia' },
  },
  {
    id: 'social',
    icon: '❤️',
    color: '#EC4899',
    name: { en: 'Social', es: 'Social' },
    description: { en: 'Relationships, family, friends, community', es: 'Relaciones, familia, amigos, comunidad' },
  },
  {
    id: 'professional',
    icon: '💼',
    color: '#10B981',
    name: { en: 'Professional', es: 'Profesional' },
    description: { en: 'Career, skills, finances, growth', es: 'Carrera, habilidades, finanzas, crecimiento' },
  },
  {
    id: 'spiritual',
    icon: '✨',
    color: '#8B5CF6',
    name: { en: 'Spiritual', es: 'Espiritual' },
    description: { en: 'Purpose, values, faith, inner peace', es: 'Propósito, valores, fe, paz interior' },
  },
  {
    id: 'creative',
    icon: '🎨',
    color: '#F97316',
    name: { en: 'Creative', es: 'Creativo' },
    description: { en: 'Art, music, writing, hobbies', es: 'Arte, música, escritura, hobbies' },
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
  const [selectedPillars, setSelectedPillars] = useState<string[]>([]);
  const [surveyLength, setSurveyLength] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(!!initialStep);
  const [isPremium, setIsPremium] = useState(false);

  const t = (en: string, es: string) => selectedLanguage === 'es' ? es : en;

  // Check premium status
  useEffect(() => {
    const checkPremium = async () => {
      if (user?.id) {
        const status = await PremiumService.getStatus(user.id);
        setIsPremium(status.isPremium);
      }
    };
    checkPremium();
  }, [user?.id]);

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
      setStep('pillars');
    } else if (step === 'pillars') {
      if (selectedPillars.length === 0) return;
      // Save active pillars
      await savePillarSelection();
      setStep('survey_length');
    } else if (step === 'survey_length') {
      await saveSetup();
    }
  };

  const handleBack = () => {
    if (step === 'name') setStep('language');
    else if (step === 'age') setStep('name');
    else if (step === 'pillars') setStep('age');
    else if (step === 'survey_length') setStep('pillars');
  };

  const togglePillar = (pillarId: string) => {
    if (selectedPillars.includes(pillarId)) {
      // Always allow deselection
      setSelectedPillars(selectedPillars.filter(id => id !== pillarId));
    } else {
      // Check limits based on plan
      if (!isPremium && selectedPillars.length >= FREE_PILLAR_LIMIT) {
        Alert.alert(
          t('Free Plan Limit', 'Límite del Plan Gratuito'),
          t(
            `Free users can focus on up to ${FREE_PILLAR_LIMIT} pillars. Upgrade to Premium for unlimited focus areas!`,
            `Los usuarios gratuitos pueden enfocarse en hasta ${FREE_PILLAR_LIMIT} pilares. ¡Actualiza a Premium para áreas de enfoque ilimitadas!`
          ),
          [
            { text: t('OK', 'OK'), style: 'cancel' },
            { 
              text: t('Go Premium', 'Ir a Premium'), 
              onPress: () => {
                // TODO: Navigate to premium screen
              }
            }
          ]
        );
        return;
      }
      
      // Warn premium users if selecting more than 4
      const newCount = selectedPillars.length + 1;
      if (isPremium && newCount > PREMIUM_WARNING_THRESHOLD && newCount === PREMIUM_WARNING_THRESHOLD + 1) {
        Alert.alert(
          t('Focus Warning', 'Advertencia de Enfoque'),
          t(
            'Selecting more than 4 pillars means less focus on each one. Quality over quantity! Are you sure?',
            'Seleccionar más de 4 pilares significa menos enfoque en cada uno. ¡Calidad sobre cantidad! ¿Estás seguro?'
          ),
          [
            { text: t('Cancel', 'Cancelar'), style: 'cancel' },
            { 
              text: t('Continue', 'Continuar'), 
              onPress: () => setSelectedPillars([...selectedPillars, pillarId])
            }
          ]
        );
        return;
      }
      
      setSelectedPillars([...selectedPillars, pillarId]);
    }
  };

  const savePillarSelection = async () => {
    try {
      // First, deactivate all pillars
      await supabase
        .from('user_pillars')
        .update({ is_active: false, priority: 0 })
        .eq('user_id', user?.id);

      // Then activate selected pillars with priority
      for (let i = 0; i < selectedPillars.length; i++) {
        await supabase
          .from('user_pillars')
          .update({ 
            is_active: true, 
            priority: i + 1,
            activated_at: new Date().toISOString(),
          })
          .eq('user_id', user?.id)
          .eq('pillar_id', selectedPillars[i]);
      }
    } catch (err) {
      console.error('Error saving pillar selection:', err);
    }
  };

  const createInitialLifePath = async () => {
    if (!user?.id || selectedPillars.length === 0) return;

    try {
      // Create a default Life Path based on first selected pillar
      const primaryPillar = selectedPillars[0];
      const pillarInfo = PILLARS.find(p => p.id === primaryPillar);
      
      const defaultTitles: Record<string, { en: string; es: string }> = {
        physical: { en: 'Become My Healthiest Self', es: 'Ser Mi Mejor Versión Física' },
        mental: { en: 'Sharpen My Mind', es: 'Fortalecer Mi Mente' },
        social: { en: 'Build Meaningful Relationships', es: 'Construir Relaciones Significativas' },
        professional: { en: 'Grow My Career', es: 'Crecer Profesionalmente' },
        spiritual: { en: 'Deepen My Inner Peace', es: 'Profundizar Mi Paz Interior' },
        creative: { en: 'Unleash My Creativity', es: 'Liberar Mi Creatividad' },
      };

      const title = selectedLanguage === 'es' 
        ? defaultTitles[primaryPillar]?.es || 'Mi Primer Camino'
        : defaultTitles[primaryPillar]?.en || 'My First Path';

      // Create the Life Path
      const { data: pathData, error } = await supabase
        .from('life_paths')
        .insert({
          user_id: user.id,
          title,
          pillar_id: primaryPillar,
          icon: pillarInfo?.icon || '🎯',
          color: pillarInfo?.color || '#8B5CF6',
          target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months
          status: 'active',
          ai_generated: true,
        })
        .select('id')
        .single();

      if (!error && pathData?.id) {
        // Import questAI and expand the path with AI
        const questAI = require('../../lib/openai').default;
        await questAI.expandLifePath(
          user.id,
          pathData.id,
          title,
          null,
          primaryPillar,
          6 // Default 6 months for onboarding
        );
      }
    } catch (err) {
      console.error('Error creating initial life path:', err);
      // Don't block onboarding if this fails
    }
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
      
      // Create initial Life Path in background
      createInitialLifePath();
      
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
    if (step === 'pillars') return selectedPillars.length >= 1;
    if (step === 'survey_length') return !!surveyLength;
    return false;
  };

  const getStepNumber = () => {
    const steps: SetupStep[] = ['language', 'name', 'age', 'pillars', 'survey_length'];
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
      width: `${(getStepNumber() / 5) * 100}%`,
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

  const renderPillarsStep = () => (
    <>
      <Text style={styles.title}>
        {t('What do you want to improve?', '¿En qué te quieres enfocar?')}
      </Text>
      <Text style={styles.subtitle}>
        {t(
          'Choose the areas of your life you want to work on right now. You can always add more later.',
          'Elige las áreas de tu vida en las que quieres trabajar ahora. Siempre podrás agregar más después.'
        )}
      </Text>
      <View style={{ marginTop: 8 }}>
        {PILLARS.map((pillar) => {
          const isSelected = selectedPillars.includes(pillar.id);
          return (
            <TouchableOpacity
              key={pillar.id}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isSelected ? pillar.color + '15' : theme.surface,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  borderWidth: 2,
                  borderColor: isSelected ? pillar.color : 'transparent',
                },
              ]}
              onPress={() => togglePillar(pillar.id)}
            >
              <Text style={{ fontSize: 28, marginRight: 14 }}>{pillar.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>
                  {pillar.name[selectedLanguage]}
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                  {pillar.description[selectedLanguage]}
                </Text>
              </View>
              {isSelected && (
                <View style={{
                  width: 26, height: 26, borderRadius: 13,
                  backgroundColor: pillar.color,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[styles.surveyNote, { marginTop: 10 }]}>
        <Text style={styles.surveyNoteText}>
          {isPremium ? t(
            '💡 Tip: Start with 2-3 pillars for better focus. You can activate more in your profile anytime!',
            '💡 Tip: Empieza con 2-3 pilares para mejor enfoque. ¡Puedes activar más en tu perfil cuando quieras!'
          ) : t(
            `🆓 Free Plan: Up to ${FREE_PILLAR_LIMIT} pillars. Go Premium for unlimited focus areas!`,
            `🆓 Plan Gratuito: Hasta ${FREE_PILLAR_LIMIT} pilares. ¡Hazte Premium para áreas ilimitadas!`
          )}
        </Text>
      </View>
      {selectedPillars.length > 0 && (
        <Text style={{ textAlign: 'center', color: theme.textSecondary, marginTop: 8 }}>
          {t('Selected', 'Seleccionados')}: {selectedPillars.length}{!isPremium ? `/${FREE_PILLAR_LIMIT}` : ''}
        </Text>
      )}
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
            {t(`Step ${getStepNumber()} of 5`, `Paso ${getStepNumber()} de 5`)}
          </Text>
          
          {step === 'language' && renderLanguageStep()}
          {step === 'name' && renderNameStep()}
          {step === 'age' && renderAgeStep()}
          {step === 'pillars' && renderPillarsStep()}
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
