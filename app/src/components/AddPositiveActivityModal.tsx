import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useThemeStore, useLanguageStore } from '../store';
import { getTheme } from '../theme/colors';
import { supabase } from '../lib/supabase';

interface AddPositiveActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (activityData?: { title: string; pillar: string; xpEarned: number }) => void;
}

const PILLARS_EN = [
  { id: 'physical', name: 'Physical', emoji: '💪', color: '#EF4444' },
  { id: 'mental', name: 'Mental', emoji: '🧠', color: '#3B82F6' },
  { id: 'social', name: 'Social', emoji: '👥', color: '#EC4899' },
  { id: 'professional', name: 'Professional', emoji: '💼', color: '#10B981' },
  { id: 'spiritual', name: 'Spiritual', emoji: '✨', color: '#8B5CF6' },
  { id: 'creative', name: 'Creative', emoji: '🎨', color: '#F97316' },
];

const PILLARS_ES = [
  { id: 'physical', name: 'Físico', emoji: '💪', color: '#EF4444' },
  { id: 'mental', name: 'Mental', emoji: '🧠', color: '#3B82F6' },
  { id: 'social', name: 'Social', emoji: '👥', color: '#EC4899' },
  { id: 'professional', name: 'Profesional', emoji: '💼', color: '#10B981' },
  { id: 'spiritual', name: 'Espiritual', emoji: '✨', color: '#8B5CF6' },
  { id: 'creative', name: 'Creativo', emoji: '🎨', color: '#F97316' },
];

export const AddPositiveActivityModal: React.FC<AddPositiveActivityModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  
  const t = (en: string, es: string) => language === 'es' ? es : en;
  const PILLARS = language === 'es' ? PILLARS_ES : PILLARS_EN;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(
        t('Error', 'Error'),
        t('Please enter an activity title', 'Por favor ingresa el título de la actividad')
      );
      return;
    }

    if (!selectedPillar) {
      Alert.alert(
        t('Error', 'Error'),
        t('Please select a pillar', 'Por favor selecciona un pilar')
      );
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Calculate XP reward based on title length and description
      // Simple heuristic: base 15 XP + extra for longer descriptions
      const baseXP = 15;
      const descriptionBonus = description.length > 50 ? 10 : description.length > 20 ? 5 : 0;
      const xpReward = baseXP + descriptionBonus;
      const coinReward = Math.floor(xpReward / 3); // ~1/3 of XP as coins

      // Create a challenge entry first
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .insert({
          title,
          description: description || title,
          pillar_id: selectedPillar,
          difficulty: 'easy',
          xp_reward: xpReward,
          coin_reward: coinReward,
          duration_minutes: null,
          icon: PILLARS.find(p => p.id === selectedPillar)?.emoji || '⭐',
          is_daily: true,
          tags: ['user_created', 'positive_activity'],
        })
        .select('id')
        .single();

      if (challengeError) throw challengeError;

      // Create a user_daily_quest entry and mark it as completed
      const today = new Date().toISOString().split('T')[0];
      const { data: quest, error: questError } = await supabase
        .from('user_daily_quests')
        .insert({
          user_id: user.id,
          challenge_id: challenge.id,
          assigned_date: today,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (questError) throw questError;

      // Award XP and coins using the complete_daily_quest function
      const { error: completeError } = await supabase.rpc('complete_daily_quest', {
        p_user_id: user.id,
        p_quest_id: quest.id,
      });

      if (completeError) throw completeError;

      // Success!
      Alert.alert(
        t('Success! 🎉', '¡Éxito! 🎉'),
        t(
          `Activity logged! You earned ${xpReward} XP and ${coinReward} QC!`,
          `¡Actividad registrada! ¡Ganaste ${xpReward} XP y ${coinReward} QC!`
        )
      );

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedPillar(null);

      // Pass activity data back for AI message generation
      onSuccess({
        title,
        pillar: selectedPillar,
        xpEarned: xpReward,
      });
      onClose();
    } catch (error: any) {
      console.error('Error saving positive activity:', error);
      Alert.alert(
        t('Error', 'Error'),
        t(
          'Failed to save activity. Please try again.',
          'Error al guardar la actividad. Por favor intenta de nuevo.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {t('Add Positive Activity', 'Agregar Actividad Positiva')} ⭐
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                {t(
                  'Log extra activities you did today and earn XP!',
                  '¡Registra actividades extra que hiciste hoy y gana XP!'
                )}
              </Text>
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t('Activity', 'Actividad')} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder={t(
                  'e.g., Read a book, Called a friend, Meditated...',
                  'ej. Leí un libro, Llamé a un amigo, Medité...'
                )}
                placeholderTextColor={theme.textSecondary}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t('Details (optional)', 'Detalles (opcional)')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder={t(
                  'What did you do? How did it make you feel?',
                  '¿Qué hiciste? ¿Cómo te hizo sentir?'
                )}
                placeholderTextColor={theme.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={300}
              />
              <Text style={[styles.charCount, { color: theme.textSecondary }]}>
                {description.length}/300
              </Text>
            </View>

            {/* Pillar Selection */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t('Which area does this improve?', '¿Qué área mejora esto?')} *
              </Text>
              <View style={styles.pillarsGrid}>
                {PILLARS.map((pillar) => (
                  <TouchableOpacity
                    key={pillar.id}
                    style={[
                      styles.pillarCard,
                      {
                        backgroundColor:
                          selectedPillar === pillar.id
                            ? pillar.color + '20'
                            : theme.background,
                        borderColor:
                          selectedPillar === pillar.id
                            ? pillar.color
                            : theme.border,
                        borderWidth: selectedPillar === pillar.id ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedPillar(pillar.id)}
                  >
                    <Text style={styles.pillarEmoji}>{pillar.emoji}</Text>
                    <Text
                      style={[
                        styles.pillarName,
                        {
                          color:
                            selectedPillar === pillar.id
                              ? pillar.color
                              : theme.text,
                          fontWeight:
                            selectedPillar === pillar.id ? '700' : '600',
                        },
                      ]}
                    >
                      {pillar.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.infoText, { color: theme.primary }]}>
                💡 {t(
                  'Longer descriptions earn more XP!',
                  '¡Descripciones más largas ganan más XP!'
                )}
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
                onPress={onClose}
                disabled={saving}
              >
                <Text style={[styles.buttonText, { color: theme.textSecondary }]}>
                  {t('Cancel', 'Cancelar')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  { backgroundColor: theme.primary },
                  saving && styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {t('Save', 'Guardar')} ⭐
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pillarCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  pillarName: {
    fontSize: 12,
    textAlign: 'center',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
