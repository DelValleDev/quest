import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type CreateGuildScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateGuild'>;

interface Props {
  navigation: CreateGuildScreenNavigationProp;
}

const GUILD_CATEGORIES = [
  { value: 'fitness', label: '💪 Fitness', emoji: '💪' },
  { value: 'study', label: '📚 Estudio', emoji: '📚' },
  { value: 'work', label: '💼 Trabajo', emoji: '💼' },
  { value: 'health', label: '🏥 Salud', emoji: '🏥' },
  { value: 'creativity', label: '🎨 Creatividad', emoji: '🎨' },
  { value: 'social', label: '🤝 Social', emoji: '🤝' },
];

const GUILD_ICONS = ['🏰', '⚔️', '🛡️', '🎯', '🔥', '⭐', '💎', '🏆', '🚀', '⚡', '🌟', '👑'];

export default function CreateGuildScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  // Step 1: Básicos
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🏰');
  
  // Step 2: Configuración
  const [category, setCategory] = useState('fitness');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState('50');
  
  // Step 3: Quest AI
  const [questAIEnabled, setQuestAIEnabled] = useState(false);
  const [questAILevel, setQuestAILevel] = useState<'basic' | 'moderation' | 'advanced'>('basic');
  
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert('Error', 'El nombre del guild es obligatorio');
        return;
      }
      if (name.length < 3 || name.length > 50) {
        Alert.alert('Error', 'El nombre debe tener entre 3 y 50 caracteres');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleCreateGuild();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleCreateGuild = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Crear guild
      const { data: guild, error: guildError } = await supabase
        .from('guilds')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          icon: selectedIcon,
          category,
          is_private: isPrivate,
          max_members: parseInt(maxMembers) || 50,
          created_by: user.id,
          quest_ai_level: questAIEnabled ? questAILevel : 'disabled',
        })
        .select()
        .single();

      if (guildError) throw guildError;

      // Agregar al creador como miembro admin
      const { error: memberError } = await supabase
        .from('guild_members')
        .insert({
          guild_id: guild.id,
          user_id: user.id,
          role: 'admin',
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      Alert.alert(
        '¡Guild Creado!',
        `${name} ha sido creado exitosamente. ¡Invita a tus amigos!`,
        [
          {
            text: 'Ver Guild',
            onPress: () => navigation.replace('GuildDetail', { guildId: guild.id }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>Paso {step} de 3</Text>
        </View>
        <Text style={styles.headerTitle}>Crear Guild</Text>
        
        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Step 1: Básicos */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>📝 Información Básica</Text>
            
            <Text style={styles.label}>Icono del Guild</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
              {GUILD_ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconButton, selectedIcon === icon && styles.iconButtonActive]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Text style={styles.iconEmoji}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Nombre del Guild *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Warriors del Gym"
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
            <Text style={styles.charCount}>{name.length}/50</Text>

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="¿De qué trata tu guild? (opcional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/200</Text>
          </View>
        )}

        {/* Step 2: Configuración */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>⚙️ Configuración</Text>

            <Text style={styles.label}>Categoría</Text>
            <View style={styles.categoryGrid}>
              {GUILD_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    category === cat.value && styles.categoryButtonActive
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.categoryText,
                    category === cat.value && styles.categoryTextActive
                  ]}>
                    {cat.label.replace(cat.emoji + ' ', '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Privacidad</Text>
            <View style={styles.privacyContainer}>
              <TouchableOpacity
                style={[styles.privacyButton, !isPrivate && styles.privacyButtonActive]}
                onPress={() => setIsPrivate(false)}
              >
                <Text style={styles.privacyIcon}>🌍</Text>
                <Text style={styles.privacyLabel}>Público</Text>
                <Text style={styles.privacyDescription}>Cualquiera puede unirse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.privacyButton, isPrivate && styles.privacyButtonActive]}
                onPress={() => setIsPrivate(true)}
              >
                <Text style={styles.privacyIcon}>🔒</Text>
                <Text style={styles.privacyLabel}>Privado</Text>
                <Text style={styles.privacyDescription}>Solo por invitación</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Máximo de Miembros</Text>
            <TextInput
              style={styles.input}
              placeholder="50"
              value={maxMembers}
              onChangeText={setMaxMembers}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        )}

        {/* Step 3: Quest AI */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>🤖 Quest AI (Opcional)</Text>

            <View style={styles.aiToggleContainer}>
              <View style={styles.aiToggleLeft}>
                <Text style={styles.aiToggleLabel}>Activar Quest AI</Text>
                <Text style={styles.aiToggleDescription}>
                  Un asistente inteligente para tu guild
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, questAIEnabled && styles.toggleActive]}
                onPress={() => setQuestAIEnabled(!questAIEnabled)}
              >
                <View style={[styles.toggleCircle, questAIEnabled && styles.toggleCircleActive]} />
              </TouchableOpacity>
            </View>

            {questAIEnabled && (
              <View style={styles.aiLevelsContainer}>
                <Text style={styles.label}>Nivel de Quest AI</Text>
                
                <TouchableOpacity
                  style={[styles.aiLevelCard, questAILevel === 'basic' && styles.aiLevelCardActive]}
                  onPress={() => setQuestAILevel('basic')}
                >
                  <Text style={styles.aiLevelTitle}>🟢 Básico (Gratis)</Text>
                  <Text style={styles.aiLevelDescription}>
                    Responde preguntas y da motivación
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.aiLevelCard, questAILevel === 'moderation' && styles.aiLevelCardActive]}
                  onPress={() => setQuestAILevel('moderation')}
                >
                  <Text style={styles.aiLevelTitle}>🟡 Moderación (Gratis)</Text>
                  <Text style={styles.aiLevelDescription}>
                    Básico + moderación automática
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.aiLevelCard, questAILevel === 'advanced' && styles.aiLevelCardActive]}
                  onPress={() => setQuestAILevel('advanced')}
                >
                  <Text style={styles.aiLevelTitle}>🔴 Avanzado (Premium)</Text>
                  <Text style={styles.aiLevelDescription}>
                    Todo + crear tareas, análisis, insights
                  </Text>
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? 'Creando...' : step === 3 ? 'Crear Guild' : 'Siguiente'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  stepIndicator: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 4,
  },
  iconScroll: {
    marginBottom: 8,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  iconButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f2ff',
  },
  iconEmoji: {
    fontSize: 32,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  categoryButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f2ff',
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#667eea',
  },
  privacyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  privacyButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f2ff',
  },
  privacyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  aiToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  aiToggleLeft: {
    flex: 1,
  },
  aiToggleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  aiToggleDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e9ecef',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#667eea',
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
  },
  toggleCircleActive: {
    transform: [{ translateX: 20 }],
  },
  aiLevelsContainer: {
    marginTop: 8,
  },
  aiLevelCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  aiLevelCardActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f2ff',
  },
  aiLevelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  aiLevelDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  premiumBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  nextButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
