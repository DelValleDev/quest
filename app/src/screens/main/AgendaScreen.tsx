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
import calendarService, { 
  CalendarEvent, 
  FreeTimeSlot,
} from '../../lib/calendar';

const { width } = Dimensions.get('window');

interface ScheduledQuest {
  id: string;
  quest_title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
}

interface CalendarIntegration {
  provider: string;
  connected: boolean;
  last_sync: string | null;
}

const CALENDAR_PROVIDERS = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: '📅',
    color: '#4285F4',
    description: 'Sincroniza tus eventos de Google',
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    icon: '🍎',
    color: '#000000',
    description: 'Sincroniza con iCloud Calendar',
    comingSoon: true,
  },
  {
    id: 'notion',
    name: 'Notion Calendar',
    icon: '📓',
    color: '#000000',
    description: 'Conecta tu database de Notion',
    comingSoon: true,
  },
];

export const AgendaScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [scheduledQuests, setScheduledQuests] = useState<ScheduledQuest[]>([]);
  const [freeSlots, setFreeSlots] = useState<FreeTimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      // Load integrations
      const { data: integrationsData } = await supabase
        .from('user_calendar_integrations')
        .select('provider, connected, last_sync')
        .eq('user_id', user.id);
      
      setIntegrations(integrationsData || []);

      // Load today's events
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data: eventsData } = await supabase
        .from('user_calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', dateStr + 'T00:00:00')
        .lte('start_time', dateStr + 'T23:59:59')
        .order('start_time');
      
      setEvents(eventsData || []);

      // Load scheduled quests
      const { data: questsData } = await supabase
        .from('quest_schedule')
        .select('id, quest_title, scheduled_start, scheduled_end, status')
        .eq('user_id', user.id)
        .gte('scheduled_start', dateStr + 'T00:00:00')
        .lte('scheduled_start', dateStr + 'T23:59:59')
        .order('scheduled_start');
      
      setScheduledQuests(questsData || []);

      // Get free time slots
      const slots = await calendarService.findFreeTime(user.id, selectedDate);
      setFreeSlots(slots);
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!user?.id) return;
    
    try {
      setSyncing(true);
      const success = await calendarService.connectGoogle(user.id);
      if (success) {
        Alert.alert('¡Conectado! 🎉', 'Google Calendar sincronizado correctamente');
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo conectar con Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncCalendar = async () => {
    if (!user?.id) return;
    
    try {
      setSyncing(true);
      await calendarService.syncGoogle(user.id);
      Alert.alert('Sincronizado ✓', 'Eventos actualizados');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!user?.id) return;
    
    Alert.alert(
      'Desconectar',
      `¿Seguro que quieres desconectar ${provider}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            await calendarService.disconnect(user.id, provider);
            loadData();
          },
        },
      ]
    );
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDayName = (date: Date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  };

  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const isConnected = (provider: string) => {
    return integrations.some(i => i.provider === provider && i.connected);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 5,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    dateSelector: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 15,
    },
    dateItem: {
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      marginHorizontal: 4,
    },
    dateItemSelected: {
      backgroundColor: theme.primary,
    },
    dateDayName: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    dateDayNameSelected: {
      color: '#FFFFFF',
    },
    dateNumber: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    dateNumberSelected: {
      color: '#FFFFFF',
    },
    section: {
      paddingHorizontal: 20,
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 15,
    },
    integrationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    integrationIcon: {
      fontSize: 32,
      marginRight: 15,
    },
    integrationInfo: {
      flex: 1,
    },
    integrationName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    integrationDesc: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    integrationButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    connectButton: {
      backgroundColor: theme.primary,
    },
    disconnectButton: {
      backgroundColor: theme.error + '20',
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    comingSoonBadge: {
      backgroundColor: theme.textSecondary + '30',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    comingSoonText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    timelineContainer: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
    },
    timelineItem: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    timelineTime: {
      width: 60,
    },
    timelineTimeText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    timelineContent: {
      flex: 1,
      marginLeft: 12,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: theme.border,
    },
    eventCard: {
      backgroundColor: theme.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    eventTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    eventMeta: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    questCard: {
      backgroundColor: theme.primary + '20',
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    questTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
    questStatus: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    freeSlotCard: {
      backgroundColor: theme.success + '10',
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: theme.success,
    },
    freeSlotText: {
      fontSize: 14,
      color: theme.success,
      fontWeight: '500',
    },
    freeSlotDuration: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 30,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    syncButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginTop: 10,
    },
    syncButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
      marginLeft: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 10 }}>
            Cargando agenda...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📅 Agenda</Text>
          <Text style={styles.subtitle}>
            Organiza tus quests según tu calendario
          </Text>
        </View>

        {/* Date Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateSelector}
        >
          {getWeekDates().map((date, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateItem,
                  isSelected && styles.dateItemSelected,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[
                  styles.dateDayName,
                  isSelected && styles.dateDayNameSelected,
                ]}>
                  {isToday ? 'Hoy' : getDayName(date)}
                </Text>
                <Text style={[
                  styles.dateNumber,
                  isSelected && styles.dateNumberSelected,
                ]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Integrations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 Conectar Calendarios</Text>
          
          {CALENDAR_PROVIDERS.map((provider) => (
            <View key={provider.id} style={styles.integrationCard}>
              <Text style={styles.integrationIcon}>{provider.icon}</Text>
              <View style={styles.integrationInfo}>
                <Text style={styles.integrationName}>{provider.name}</Text>
                <Text style={styles.integrationDesc}>{provider.description}</Text>
              </View>
              
              {provider.comingSoon ? (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Próximamente</Text>
                </View>
              ) : isConnected(provider.id) ? (
                <TouchableOpacity
                  style={[styles.integrationButton, styles.disconnectButton]}
                  onPress={() => handleDisconnect(provider.id)}
                >
                  <Text style={[styles.buttonText, { color: theme.error }]}>
                    Desconectar
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.integrationButton, styles.connectButton]}
                  onPress={handleConnectGoogle}
                  disabled={syncing}
                >
                  {syncing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                      Conectar
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}

          {isConnected('google') && (
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSyncCalendar}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Text>🔄</Text>
                  <Text style={styles.syncButtonText}>Sincronizar ahora</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Día Completo</Text>
          
          <View style={styles.timelineContainer}>
            {events.length === 0 && scheduledQuests.length === 0 && freeSlots.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyText}>
                  {isConnected('google')
                    ? 'No hay eventos para este día'
                    : 'Conecta un calendario para ver tus eventos'
                  }
                </Text>
              </View>
            ) : (
              <>
                {/* Show events */}
                {events.map((event, index) => (
                  <View key={`event-${index}`} style={styles.timelineItem}>
                    <View style={styles.timelineTime}>
                      <Text style={styles.timelineTimeText}>
                        {formatTime(event.start_time)}
                      </Text>
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.eventCard}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventMeta}>
                          📍 {event.location || 'Sin ubicación'} • 
                          Hasta {formatTime(event.end_time)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Show scheduled quests */}
                {scheduledQuests.map((quest, index) => (
                  <View key={`quest-${index}`} style={styles.timelineItem}>
                    <View style={styles.timelineTime}>
                      <Text style={styles.timelineTimeText}>
                        {formatTime(quest.scheduled_start)}
                      </Text>
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.questCard}>
                        <Text style={styles.questTitle}>🎯 {quest.quest_title}</Text>
                        <Text style={styles.questStatus}>
                          Estado: {quest.status === 'scheduled' ? '📅 Programada' : 
                                   quest.status === 'completed' ? '✅ Completada' :
                                   quest.status === 'in_progress' ? '🔄 En progreso' : quest.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Show free time slots */}
                {freeSlots.map((slot, index) => (
                  <View key={`slot-${index}`} style={styles.timelineItem}>
                    <View style={styles.timelineTime}>
                      <Text style={styles.timelineTimeText}>
                        {formatTime(slot.start)}
                      </Text>
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.freeSlotCard}>
                        <Text style={styles.freeSlotText}>
                          ✨ Tiempo libre disponible
                        </Text>
                        <Text style={styles.freeSlotDuration}>
                          {slot.duration_minutes} minutos libres
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AgendaScreen;
