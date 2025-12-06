import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

const NOTIFICATION_TYPES = [
  { key: 'streak_milestone', label: 'Milestones de racha', icon: '🔥' },
  { key: 'streak_broken', label: 'Racha rota', icon: '💔' },
  { key: 'achievement_unlocked', label: 'Logros desbloqueados', icon: '🏆' },
  { key: 'bad_habit_logged', label: 'Malos hábitos', icon: '⚠️' },
  { key: 'daily_quest_reminder', label: 'Recordatorio diario', icon: '📋' },
  { key: 'friend_request', label: 'Solicitudes de amistad', icon: '👋' },
  { key: 'guild_invite', label: 'Invitaciones a grupos', icon: '📬' },
  { key: 'quest_message', label: 'Mensajes de Quest', icon: '💬' },
  { key: 'moderation_warning', label: 'Advertencias de moderación', icon: '⚠️' }
];

export default function NotificationSettingsScreen() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    streak_milestone: true,
    streak_broken: true,
    achievement_unlocked: true,
    bad_habit_logged: true,
    daily_quest_reminder: true,
    friend_request: true,
    guild_invite: true,
    quest_message: true,
    moderation_warning: true
  });
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [smartTiming, setSmartTiming] = useState(false);
  const [maxPerDay, setMaxPerDay] = useState(5);

  const toggleNotification = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        settings,
        do_not_disturb: doNotDisturb,
        smart_timing: smartTiming,
        max_per_day: maxPerDay
      });

      Alert.alert('✅ Guardado', 'Preferencias actualizadas');
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🔔 Notificaciones</Text>
          <Text style={styles.subtitle}>Configura qué notificaciones recibir</Text>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipos de Notificaciones</Text>
          {NOTIFICATION_TYPES.map(type => (
            <View key={type.key} style={styles.notifRow}>
              <View style={styles.notifInfo}>
                <Text style={styles.notifIcon}>{type.icon}</Text>
                <Text style={styles.notifLabel}>{type.label}</Text>
              </View>
              <Switch
                value={settings[type.key]}
                onValueChange={() => toggleNotification(type.key)}
                trackColor={{ false: '#374151', true: '#8B5CF6' }}
                thumbColor={settings[type.key] ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          ))}
        </View>

        {/* Advanced Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración Avanzada</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Do Not Disturb</Text>
              <Text style={styles.settingDesc}>22:00 - 08:00</Text>
            </View>
            <Switch
              value={doNotDisturb}
              onValueChange={setDoNotDisturb}
              trackColor={{ false: '#374151', true: '#8B5CF6' }}
              thumbColor={doNotDisturb ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Smart Timing</Text>
              <Text style={styles.settingDesc}>Enviar cuando sueles usar la app</Text>
            </View>
            <Switch
              value={smartTiming}
              onValueChange={setSmartTiming}
              trackColor={{ false: '#374151', true: '#8B5CF6' }}
              thumbColor={smartTiming ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Límite Diario</Text>
              <Text style={styles.settingDesc}>Máx {maxPerDay} notificaciones/día</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>💾 Guardar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1E' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#9CA3AF' },
  section: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16 },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151'
  },
  notifInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifIcon: { fontSize: 24 },
  notifLabel: { fontSize: 16, color: '#FFFFFF' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151'
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  settingDesc: { fontSize: 12, color: '#9CA3AF' },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  saveButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }
});
