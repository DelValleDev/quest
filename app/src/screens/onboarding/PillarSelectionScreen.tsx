import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useLanguageStore, useAuthStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';

const { width } = Dimensions.get('window');

interface PillarSelectionScreenProps {
  onComplete: (selectedPillars: string[]) => void;
  onBack?: () => void;
}

const PILLARS = [
  {
    id: 'physical',
    icon: '💪',
    color: '#EF4444',
    name: { en: 'Physical', es: 'Físico' },
    description: { 
      en: 'Exercise, nutrition, sleep, self-care', 
      es: 'Ejercicio, nutrición, sueño, cuidado personal' 
    },
    examples: { en: 'Workout, drink water, sleep 8h', es: 'Ejercicio, tomar agua, dormir 8h' },
  },
  {
    id: 'mental',
    icon: '🧠',
    color: '#3B82F6',
    name: { en: 'Mental', es: 'Mental' },
    description: { 
      en: 'Learning, focus, mindfulness', 
      es: 'Aprendizaje, enfoque, mindfulness' 
    },
    examples: { en: 'Read, meditate, journal', es: 'Leer, meditar, escribir diario' },
  },
  {
    id: 'social',
    icon: '❤️',
    color: '#EC4899',
    name: { en: 'Social', es: 'Social' },
    description: { 
      en: 'Relationships, connection', 
      es: 'Relaciones, conexión' 
    },
    examples: { en: 'Call friend, family time', es: 'Llamar amigo, tiempo en familia' },
  },
  {
    id: 'professional',
    icon: '💼',
    color: '#10B981',
    name: { en: 'Professional', es: 'Profesional' },
    description: { 
      en: 'Career, skills, finances', 
      es: 'Carrera, habilidades, finanzas' 
    },
    examples: { en: 'Learn skill, work on goals', es: 'Aprender habilidad, trabajar metas' },
  },
  {
    id: 'spiritual',
    icon: '✨',
    color: '#8B5CF6',
    name: { en: 'Spiritual', es: 'Espiritual' },
    description: { 
      en: 'Faith, prayer, inner peace', 
      es: 'Fe, oración, paz interior' 
    },
    examples: { en: 'Pray, read scripture, reflect', es: 'Orar, leer escrituras, reflexionar' },
  },
  {
    id: 'creative',
    icon: '🎨',
    color: '#F97316',
    name: { en: 'Creative', es: 'Creativo' },
    description: { 
      en: 'Art, music, expression', 
      es: 'Arte, música, expresión' 
    },
    examples: { en: 'Draw, play music, write', es: 'Dibujar, tocar música, escribir' },
  },
];

export const PillarSelectionScreen: React.FC<PillarSelectionScreenProps> = ({ 
  onComplete, 
  onBack 
}) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  const [selectedPillars, setSelectedPillars] = useState<string[]>([]);

  const togglePillar = (pillarId: string) => {
    if (selectedPillars.includes(pillarId)) {
      setSelectedPillars(selectedPillars.filter(id => id !== pillarId));
    } else {
      setSelectedPillars([...selectedPillars, pillarId]);
    }
  };

  const handleContinue = async () => {
    if (selectedPillars.length === 0) return;

    try {
      // Save selected pillars to database
      await supabase
        .from('profiles')
        .update({ selected_pillars: selectedPillars })
        .eq('id', user?.id);

      // Also insert into user_pillar_focus table
      const focusEntries = selectedPillars.map((pillarId, index) => ({
        user_id: user?.id,
        pillar_id: pillarId,
        priority: index + 1,
      }));

      // Delete existing entries first
      await supabase
        .from('user_pillar_focus')
        .delete()
        .eq('user_id', user?.id);

      // Insert new entries
      await supabase
        .from('user_pillar_focus')
        .insert(focusEntries);

      onComplete(selectedPillars);
    } catch (err) {
      console.error('Error saving pillar selection:', err);
      onComplete(selectedPillars);
    }
  };

  const getEstimatedTime = () => {
    const questionsPerPillar = 4; // For standard length
    const totalQuestions = selectedPillars.length * questionsPerPillar;
    const minutes = Math.ceil(totalQuestions * 0.5); // ~30 seconds per question
    return minutes;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 10,
    },
    backButton: {
      marginBottom: 20,
    },
    backText: {
      color: theme.primary,
      fontSize: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 24,
    },
    selectedCount: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
      marginTop: 12,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    pillarCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    pillarCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '15',
    },
    pillarIcon: {
      fontSize: 36,
      marginRight: 16,
    },
    pillarInfo: {
      flex: 1,
    },
    pillarName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    pillarDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    pillarExamples: {
      fontSize: 12,
      color: theme.textSecondary,
      fontStyle: 'italic',
    },
    checkMark: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkMarkSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    checkMarkText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    footer: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    infoBox: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    infoHighlight: {
      color: theme.primary,
      fontWeight: '600',
    },
    continueBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 18,
      borderRadius: 12,
      alignItems: 'center',
    },
    continueBtnDisabled: {
      opacity: 0.5,
    },
    continueBtnText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
    tip: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>
          {t('onboarding.pillars.chooseFocus')}
        </Text>
        <Text style={styles.subtitle}>
          {t('onboarding.pillars.selectAreas')}
        </Text>
        {selectedPillars.length > 0 && (
          <Text style={styles.selectedCount}>
            {selectedPillars.length} {t('onboarding.pillars.selected')} • 
            ~{getEstimatedTime()} {t('onboarding.pillars.minAssessment')}
          </Text>
        )}
      </View>

      {/* Pillar List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {PILLARS.map((pillar) => {
          const isSelected = selectedPillars.includes(pillar.id);
          return (
            <TouchableOpacity
              key={pillar.id}
              style={[styles.pillarCard, isSelected && styles.pillarCardSelected]}
              onPress={() => togglePillar(pillar.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.pillarIcon}>{pillar.icon}</Text>
              <View style={styles.pillarInfo}>
                <Text style={[styles.pillarName, isSelected && { color: pillar.color }]}>
                  {pillar.name[language]}
                </Text>
                <Text style={styles.pillarDescription}>
                  {pillar.description[language]}
                </Text>
                <Text style={styles.pillarExamples}>
                  {t('onboarding.pillars.eg')} {pillar.examples[language]}
                </Text>
              </View>
              <View style={[styles.checkMark, isSelected && styles.checkMarkSelected]}>
                {isSelected && <Text style={styles.checkMarkText}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {selectedPillars.length > 0 && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {t('onboarding.pillars.morePillars')}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.continueBtn, selectedPillars.length === 0 && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={selectedPillars.length === 0}
        >
          <Text style={styles.continueBtnText}>
            {selectedPillars.length === 0
              ? t('onboarding.pillars.selectAtLeastOne')
              : t('common.next')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.tip}>
          {t('onboarding.pillars.tip')}
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default PillarSelectionScreen;
