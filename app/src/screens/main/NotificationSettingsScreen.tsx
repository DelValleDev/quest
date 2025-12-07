import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

interface NotificationPreferences {
  max_notifications_per_day: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  priority_filter: 'all' | 'high_only' | 'critical_only';
}

interface NotificationToggle {
  type: string;
  enabled: boolean;
  label: string;
  description: string;
  icon: string;
}

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    max_notifications_per_day: 3,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    priority_filter: 'all',
  });
  const [notifications, setNotifications] = useState<NotificationToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Load preferences
    const { data: prefsData } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (prefsData) {
      setPreferences({
        max_notifications_per_day: prefsData.max_notifications_per_day || 3,
        quiet_hours_start: prefsData.quiet_hours_start || '22:00',
        quiet_hours_end: prefsData.quiet_hours_end || '08:00',
        priority_filter: prefsData.priority_filter || 'all',
      });
    }

    // Load notification toggles
    const notificationTypes: NotificationToggle[] = [
      {
        type: 'task_reminder',
        enabled: true,
        label: 'Recordatorios de Tareas',
        description: 'Te avisamos 1 hora antes de la fecha límite',
        icon: '📝',
      },
      {
        type: 'streak_warning',
        enabled: true,
        label: 'Alerta de Racha',
        description: 'Aviso 1 hora antes de perder tu racha',
        icon: '🔥',
      },
      {
        type: 'habit_reminder',
        enabled: true,
        label: 'Recordatorio de Hábitos',
        description: 'Recordatorio diario de hábitos pendientes',
        icon: '🎯',
      },
      {
        type: 'social',
        enabled: true,
        label: 'Social',
        description: 'Solicitudes de amistad, invitaciones a guilds',
        icon: '👥',
      },
      {
        type: 'achievements',
        enabled: true,
        label: 'Logros',
        description: 'Notificaciones de achievements desbloqueados',
        icon: '🏆',
      },
      {
        type: 'level_up',
        enabled: true,
        label: 'Subida de Nivel',
        description: 'Celebración cuando subes de nivel',
        icon: '⬆️',
      },
      {
        type: 'quest_coins',
        enabled: true,
        label: 'Quest Coins',
        description: 'Notificación cuando ganas QC',
        icon: '🪙',
      },
      {
        type: 'weekly_summary',
        enabled: true,
        label: 'Resumen Semanal',
        description: 'Resumen de tu progreso cada semana',
        icon: '📊',
      },
      {
        type: 'budget_alert',
        enabled: true,
        label: 'Alertas de Presupuesto',
        description: 'Aviso cuando excedes tu presupuesto',
        icon: '💰',
      },
      {
        type: 'comeback_reward',
        enabled: true,
        label: 'Recompensa de Regreso',
        description: 'Recompensa especial si vuelves después de 7 días',
        icon: '🎁',
      },
    ];

    setNotifications(notificationTypes);
    setLoading(false);
  };

  const savePreferences = async () => {
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: user?.id,
        ...preferences,
      });

    if (!error) {
      Alert.alert('Guardado', 'Preferencias actualizadas correctamente');
    }
  };

  const toggleNotification = (type: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.type === type ? { ...n, enabled: !n.enabled } : n))
    );
  };

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notificaciones</Text>
      </View>

      {/* Quiet Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌙 Horas de Silencio</Text>
        <Text style={styles.sectionDescription}>
          No recibirás notificaciones durante estas horas
        </Text>

        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Inicio</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Text style={styles.timeText}>{preferences.quiet_hours_start}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.timeArrow}>→</Text>

          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Fin</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Text style={styles.timeText}>{preferences.quiet_hours_end}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showStartTimePicker && (
          <DateTimePicker
            value={parseTime(preferences.quiet_hours_start)}
            mode="time"
            is24Hour={true}
            onChange={(event, selectedDate) => {
              setShowStartTimePicker(false);
              if (selectedDate) {
                setPreferences({
                  ...preferences,
                  quiet_hours_start: formatTime(selectedDate),
                });
              }
            }}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={parseTime(preferences.quiet_hours_end)}
            mode="time"
            is24Hour={true}
            onChange={(event, selectedDate) => {
              setShowEndTimePicker(false);
              if (selectedDate) {
                setPreferences({
                  ...preferences,
                  quiet_hours_end: formatTime(selectedDate),
                });
              }
            }}
          />
        )}
      </View>

      {/* Max Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Límite Diario</Text>
        <Text style={styles.sectionDescription}>
          Máximo de notificaciones por día (excepto críticas)
        </Text>

        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() =>
              setPreferences({
                ...preferences,
                max_notifications_per_day: Math.max(1, preferences.max_notifications_per_day - 1),
              })
            }
          >
            <Text style={styles.counterButtonText}>−</Text>
          </TouchableOpacity>

          <View style={styles.counterDisplay}>
            <Text style={styles.counterValue}>{preferences.max_notifications_per_day}</Text>
            <Text style={styles.counterLabel}>notificaciones</Text>
          </View>

          <TouchableOpacity
            style={styles.counterButton}
            onPress={() =>
              setPreferences({
                ...preferences,
                max_notifications_per_day: Math.min(50, preferences.max_notifications_per_day + 1),
              })
            }
          >
            <Text style={styles.counterButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Priority Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Filtro de Prioridad</Text>
        <Text style={styles.sectionDescription}>
          Controla qué tipo de notificaciones recibes
        </Text>

        <View style={styles.priorityOptions}>
          {(['all', 'high_only', 'critical_only'] as const).map((priority) => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.priorityOption,
                preferences.priority_filter === priority && styles.priorityOptionActive,
              ]}
              onPress={() => setPreferences({ ...preferences, priority_filter: priority })}
            >
              <Text
                style={[
                  styles.priorityText,
                  preferences.priority_filter === priority && styles.priorityTextActive,
                ]}
              >
                {priority === 'all'
                  ? 'Todas'
                  : priority === 'high_only'
                  ? 'Solo Altas'
                  : 'Solo Críticas'}
              </Text>
              {priority === 'all' && <Text style={styles.priorityIcon}>🔔</Text>}
              {priority === 'high_only' && <Text style={styles.priorityIcon}>⚠️</Text>}
              {priority === 'critical_only' && <Text style={styles.priorityIcon}>🚨</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notification Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Tipos de Notificaciones</Text>
        <Text style={styles.sectionDescription}>
          Activa o desactiva notificaciones específicas
        </Text>

        {notifications.map((notif) => (
          <View key={notif.type} style={styles.notificationRow}>
            <View style={styles.notificationIcon}>
              <Text style={styles.notificationIconText}>{notif.icon}</Text>
            </View>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationLabel}>{notif.label}</Text>
              <Text style={styles.notificationDescription}>{notif.description}</Text>
            </View>
            <Switch
              value={notif.enabled}
              onValueChange={() => toggleNotification(notif.type)}
              trackColor={{ false: '#334155', true: '#6366F1' }}
              thumbColor={notif.enabled ? '#FFFFFF' : '#94A3B8'}
            />
          </View>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
        <Text style={styles.saveButtonText}>Guardar Cambios</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  timeItem: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  timeButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timeArrow: {
    fontSize: 24,
    color: '#64748B',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  counterDisplay: {
    alignItems: 'center',
    marginHorizontal: 32,
  },
  counterValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  counterLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  priorityOptions: {
    gap: 12,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priorityOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#6366F120',
  },
  priorityText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  priorityTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priorityIcon: {
    fontSize: 20,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 20,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 12,
  },
  notificationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
