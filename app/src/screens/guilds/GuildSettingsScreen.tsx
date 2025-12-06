import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getGuildQuestConfig,
  updateGuildQuestConfig
} from '../../lib/questAI';

interface Props {
  route: {
    params: {
      guildId: string;
      guildName: string;
    };
  };
}

const PERSONALITIES = [
  { value: 'motivational', label: 'Motivacional', emoji: '💪', desc: 'Positivo y alentador' },
  { value: 'strict', label: 'Estricto', emoji: '👔', desc: 'Firme pero justo' },
  { value: 'funny', label: 'Gracioso', emoji: '😄', desc: 'Sarcástico y divertido' },
  { value: 'analytical', label: 'Analítico', emoji: '📊', desc: 'Datos y tendencias' }
];

const FEATURES = [
  { key: 'auto_messages', label: 'Mensajes automáticos', icon: '💬' },
  { key: 'daily_summary', label: 'Resumen diario', icon: '📊' },
  { key: 'weekly_report', label: 'Reporte semanal', icon: '📈' },
  { key: 'moderate_content', label: 'Moderar contenido', icon: '🛡️' },
  { key: 'respond_mentions', label: 'Responder menciones', icon: '👋' },
  { key: 'suggest_challenges', label: 'Sugerir retos', icon: '🎯' },
  { key: 'arbitrate_duels', label: 'Arbitrar duelos', icon: '⚔️' },
  { key: 'detect_burnout', label: 'Detectar burnout', icon: '🔥' },
  { key: 'analyze_progress', label: 'Analizar progreso', icon: '📉' },
  { key: 'celebrate_achievements', label: 'Celebrar logros', icon: '🎉' },
  { key: 'coach_members', label: 'Entrenar miembros', icon: '🏋️' },
  { key: 'generate_insights', label: 'Generar insights', icon: '💡' },
  { key: 'event_planning', label: 'Planear eventos', icon: '📅' }
];

export default function GuildSettingsScreen({ route }: Props) {
  const { guildId, guildName } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Config states
  const [enabled, setEnabled] = useState(false);
  const [personality, setPersonality] = useState('motivational');
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  
  // Moderation states
  const [moderationEnabled, setModerationEnabled] = useState(false);
  const [sensitivity, setSensitivity] = useState('medium');
  const [autoDelete, setAutoDelete] = useState(false);
  const [warnOnly, setWarnOnly] = useState(true);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [newWhitelistWord, setNewWhitelistWord] = useState('');
  const [newBlacklistWord, setNewBlacklistWord] = useState('');
  
  // Scheduling states
  const [dailySummaryTime, setDailySummaryTime] = useState('20:00');
  const [weeklyReportDay, setWeeklyReportDay] = useState('sunday');
  const [weeklyReportTime, setWeeklyReportTime] = useState('18:00');
  
  // Limits states
  const [maxMessagesPerDay, setMaxMessagesPerDay] = useState('10');
  const [cooldownMinutes, setCooldownMinutes] = useState('30');

  useEffect(() => {
    loadConfig();
  }, [guildId]);

  const loadConfig = async () => {
    try {
      const config = await getGuildQuestConfig(guildId);
      
      setEnabled(config.enabled || false);
      setPersonality(config.personality || 'motivational');
      setFeatures(config.features || {});
      
      if (config.moderation) {
        setModerationEnabled(config.moderation.enabled || false);
        setSensitivity(config.moderation.sensitivity || 'medium');
        setAutoDelete(config.moderation.auto_delete || false);
        setWarnOnly(config.moderation.warn_only !== false);
        setWhitelist(config.moderation.whitelist_words || []);
        setBlacklist(config.moderation.blacklist_words || []);
      }
      
      if (config.scheduling) {
        setDailySummaryTime(config.scheduling.daily_summary_time || '20:00');
        setWeeklyReportDay(config.scheduling.weekly_report_day || 'sunday');
        setWeeklyReportTime(config.scheduling.weekly_report_time || '18:00');
      }
      
      if (config.limits) {
        setMaxMessagesPerDay(String(config.limits.max_messages_per_day || 10));
        setCooldownMinutes(String(config.limits.cooldown_minutes || 30));
      }
    } catch (error) {
      console.error('Error loading config:', error);
      Alert.alert('Error', 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config = {
        enabled,
        personality,
        features,
        moderation: {
          enabled: moderationEnabled,
          sensitivity,
          auto_delete: autoDelete,
          warn_only: warnOnly,
          whitelist_words: whitelist,
          blacklist_words: blacklist
        },
        scheduling: {
          daily_summary_time: dailySummaryTime,
          weekly_report_day: weeklyReportDay,
          weekly_report_time: weeklyReportTime
        },
        limits: {
          max_messages_per_day: parseInt(maxMessagesPerDay),
          cooldown_minutes: parseInt(cooldownMinutes)
        }
      };

      await updateGuildQuestConfig(guildId, config);
      Alert.alert('✅ Guardado', 'Configuración actualizada correctamente');
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (key: string) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addWhitelistWord = () => {
    if (newWhitelistWord.trim()) {
      setWhitelist(prev => [...prev, newWhitelistWord.trim()]);
      setNewWhitelistWord('');
    }
  };

  const removeWhitelistWord = (word: string) => {
    setWhitelist(prev => prev.filter(w => w !== word));
  };

  const addBlacklistWord = () => {
    if (newBlacklistWord.trim()) {
      setBlacklist(prev => [...prev, newBlacklistWord.trim()]);
      setNewBlacklistWord('');
    }
  };

  const removeBlacklistWord = (word: string) => {
    setBlacklist(prev => prev.filter(w => w !== word));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Quest AI Settings</Text>
          <Text style={styles.subtitle}>{guildName}</Text>
        </View>

        {/* Enable/Disable */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quest AI</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#374151', true: '#8B5CF6' }}
              thumbColor={enabled ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
          <Text style={styles.sectionDesc}>
            Activa o desactiva Quest AI en este grupo
          </Text>
        </View>

        {/* Personality */}
        {enabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personalidad</Text>
              <View style={styles.personalityGrid}>
                {PERSONALITIES.map(p => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.personalityCard,
                      personality === p.value && styles.personalityCardActive
                    ]}
                    onPress={() => setPersonality(p.value)}
                  >
                    <Text style={styles.personalityEmoji}>{p.emoji}</Text>
                    <Text style={styles.personalityLabel}>{p.label}</Text>
                    <Text style={styles.personalityDesc}>{p.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Features</Text>
              {FEATURES.map(feature => (
                <View key={feature.key} style={styles.featureRow}>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureIcon}>{feature.icon}</Text>
                    <Text style={styles.featureLabel}>{feature.label}</Text>
                  </View>
                  <Switch
                    value={features[feature.key]}
                    onValueChange={() => toggleFeature(feature.key)}
                    trackColor={{ false: '#374151', true: '#8B5CF6' }}
                    thumbColor={features[feature.key] ? '#FFFFFF' : '#9CA3AF'}
                  />
                </View>
              ))}
            </View>

            {/* Moderation */}
            {features.moderate_content && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🛡️ Moderación</Text>
                  <Switch
                    value={moderationEnabled}
                    onValueChange={setModerationEnabled}
                    trackColor={{ false: '#374151', true: '#8B5CF6' }}
                    thumbColor={moderationEnabled ? '#FFFFFF' : '#9CA3AF'}
                  />
                </View>

                {moderationEnabled && (
                  <>
                    <View style={styles.moderationOption}>
                      <Text style={styles.optionLabel}>Sensibilidad</Text>
                      <View style={styles.sensitivityButtons}>
                        {['low', 'medium', 'high'].map(s => (
                          <TouchableOpacity
                            key={s}
                            style={[
                              styles.sensitivityButton,
                              sensitivity === s && styles.sensitivityButtonActive
                            ]}
                            onPress={() => setSensitivity(s)}
                          >
                            <Text
                              style={[
                                styles.sensitivityText,
                                sensitivity === s && styles.sensitivityTextActive
                              ]}
                            >
                              {s === 'low' ? 'Baja' : s === 'medium' ? 'Media' : 'Alta'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.moderationOption}>
                      <Text style={styles.optionLabel}>Auto-eliminar mensajes</Text>
                      <Switch
                        value={autoDelete}
                        onValueChange={setAutoDelete}
                        trackColor={{ false: '#374151', true: '#EF4444' }}
                        thumbColor={autoDelete ? '#FFFFFF' : '#9CA3AF'}
                      />
                    </View>

                    <View style={styles.moderationOption}>
                      <Text style={styles.optionLabel}>Solo advertir (no eliminar)</Text>
                      <Switch
                        value={warnOnly}
                        onValueChange={setWarnOnly}
                        trackColor={{ false: '#374151', true: '#F59E0B' }}
                        thumbColor={warnOnly ? '#FFFFFF' : '#9CA3AF'}
                      />
                    </View>

                    {/* Whitelist */}
                    <View style={styles.wordListSection}>
                      <Text style={styles.wordListTitle}>✅ Whitelist (Permitidas)</Text>
                      <Text style={styles.wordListDesc}>
                        Palabras que se permiten aunque parezcan explícitas
                      </Text>
                      <View style={styles.wordInputContainer}>
                        <TextInput
                          style={styles.wordInput}
                          placeholder="Agregar palabra..."
                          placeholderTextColor="#6B7280"
                          value={newWhitelistWord}
                          onChangeText={setNewWhitelistWord}
                          onSubmitEditing={addWhitelistWord}
                        />
                        <TouchableOpacity style={styles.addButton} onPress={addWhitelistWord}>
                          <Ionicons name="add" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.wordList}>
                        {whitelist.map((word, index) => (
                          <View key={index} style={styles.wordChip}>
                            <Text style={styles.wordChipText}>{word}</Text>
                            <TouchableOpacity onPress={() => removeWhitelistWord(word)}>
                              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Blacklist */}
                    <View style={styles.wordListSection}>
                      <Text style={styles.wordListTitle}>🚫 Blacklist (Prohibidas)</Text>
                      <Text style={styles.wordListDesc}>
                        Palabras específicas que siempre se moderan
                      </Text>
                      <View style={styles.wordInputContainer}>
                        <TextInput
                          style={styles.wordInput}
                          placeholder="Agregar palabra..."
                          placeholderTextColor="#6B7280"
                          value={newBlacklistWord}
                          onChangeText={setNewBlacklistWord}
                          onSubmitEditing={addBlacklistWord}
                        />
                        <TouchableOpacity style={styles.addButton} onPress={addBlacklistWord}>
                          <Ionicons name="add" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.wordList}>
                        {blacklist.map((word, index) => (
                          <View key={index} style={styles.wordChip}>
                            <Text style={styles.wordChipText}>{word}</Text>
                            <TouchableOpacity onPress={() => removeBlacklistWord(word)}>
                              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Scheduling */}
            {(features.daily_summary || features.weekly_report) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⏰ Horarios</Text>
                
                {features.daily_summary && (
                  <View style={styles.scheduleItem}>
                    <Text style={styles.scheduleLabel}>Resumen diario</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={dailySummaryTime}
                      onChangeText={setDailySummaryTime}
                      placeholder="HH:MM"
                      placeholderTextColor="#6B7280"
                    />
                  </View>
                )}

                {features.weekly_report && (
                  <>
                    <View style={styles.scheduleItem}>
                      <Text style={styles.scheduleLabel}>Reporte semanal (día)</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={weeklyReportDay}
                        onChangeText={setWeeklyReportDay}
                        placeholder="sunday, monday..."
                        placeholderTextColor="#6B7280"
                      />
                    </View>
                    <View style={styles.scheduleItem}>
                      <Text style={styles.scheduleLabel}>Reporte semanal (hora)</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={weeklyReportTime}
                        onChangeText={setWeeklyReportTime}
                        placeholder="HH:MM"
                        placeholderTextColor="#6B7280"
                      />
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Limits */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚦 Límites</Text>
              
              <View style={styles.limitItem}>
                <Text style={styles.limitLabel}>Máx. mensajes por día</Text>
                <TextInput
                  style={styles.limitInput}
                  value={maxMessagesPerDay}
                  onChangeText={setMaxMessagesPerDay}
                  keyboardType="number-pad"
                  placeholderTextColor="#6B7280"
                />
              </View>

              <View style={styles.limitItem}>
                <Text style={styles.limitLabel}>Cooldown (minutos)</Text>
                <TextInput
                  style={styles.limitInput}
                  value={cooldownMinutes}
                  onChangeText={setCooldownMinutes}
                  keyboardType="number-pad"
                  placeholderTextColor="#6B7280"
                />
              </View>
            </View>
          </>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Guardar Configuración</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E'
  },
  scrollContent: {
    padding: 20
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF'
  },
  section: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8
  },
  sectionDesc: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  personalityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  personalityCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#0F0F1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  personalityCardActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#8B5CF620'
  },
  personalityEmoji: {
    fontSize: 32,
    marginBottom: 8
  },
  personalityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  personalityDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center'
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151'
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  featureIcon: {
    fontSize: 24
  },
  featureLabel: {
    fontSize: 16,
    color: '#FFFFFF'
  },
  moderationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151'
  },
  optionLabel: {
    fontSize: 16,
    color: '#FFFFFF'
  },
  sensitivityButtons: {
    flexDirection: 'row',
    gap: 8
  },
  sensitivityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0F0F1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151'
  },
  sensitivityButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6'
  },
  sensitivityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF'
  },
  sensitivityTextActive: {
    color: '#FFFFFF'
  },
  wordListSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151'
  },
  wordListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  wordListDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12
  },
  wordInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  wordInput: {
    flex: 1,
    backgroundColor: '#0F0F1E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8
  },
  wordChipText: {
    fontSize: 14,
    color: '#FFFFFF'
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151'
  },
  scheduleLabel: {
    fontSize: 16,
    color: '#FFFFFF'
  },
  timeInput: {
    backgroundColor: '#0F0F1E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    minWidth: 100,
    textAlign: 'center'
  },
  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151'
  },
  limitLabel: {
    fontSize: 16,
    color: '#FFFFFF'
  },
  limitInput: {
    backgroundColor: '#0F0F1E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    minWidth: 80,
    textAlign: 'center'
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF'
  }
});
