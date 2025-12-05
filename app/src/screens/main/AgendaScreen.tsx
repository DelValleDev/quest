import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

type ViewMode = 'day' | 'week' | 'month';

interface AgendaItem {
  id: string;
  start_time: string | null;
  end_time: string | null;
  item_type: 'habit' | 'quest' | 'event' | 'blocked';
  title: string;
  description: string | null;
  icon: string;
  color: string;
  pillar_id: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  duration_minutes: number;
  priority: number;
  reference_id: string;
}

interface AIQuest {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  pillar_id: string | null;
  difficulty: string;
  xp_reward: number;
  coin_reward: number;
  estimated_minutes: number;
  suggested_time: string;
  status: string;
}

interface WeekDay {
  date: string;
  day_name: string;
  habits_count: number;
  habits_completed: number;
  events_count: number;
  quests_count: number;
}

interface MonthDay {
  date: string;
  day: number;
  has_habits: boolean;
  has_events: boolean;
  completion_rate: number;
}

const translations = {
  en: {
    title: 'Agenda',
    today: 'Today',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    noItems: 'No items for this day',
    addEvent: 'Add Event',
    habits: 'Habits',
    quests: 'Quests',
    events: 'Events',
    completed: 'completed',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    anytime: 'Anytime',
    aiQuests: 'Daily Quests',
    accept: 'Accept',
    skip: 'Skip',
    complete: 'Complete',
    eventTitle: 'Event Title',
    save: 'Save',
    cancel: 'Cancel',
    generateQuests: 'Generate Quests',
    questsAvailable: 'quests available',
  },
  es: {
    title: 'Agenda',
    today: 'Hoy',
    day: 'Día',
    week: 'Semana',
    month: 'Mes',
    noItems: 'No hay items para este día',
    addEvent: 'Añadir Evento',
    habits: 'Hábitos',
    quests: 'Quests',
    events: 'Eventos',
    completed: 'completados',
    morning: 'Mañana',
    afternoon: 'Tarde',
    evening: 'Noche',
    anytime: 'Cualquier hora',
    aiQuests: 'Quests Diarias',
    accept: 'Aceptar',
    skip: 'Saltar',
    complete: 'Completar',
    eventTitle: 'Título del Evento',
    save: 'Guardar',
    cancel: 'Cancelar',
    generateQuests: 'Generar Quests',
    questsAvailable: 'quests disponibles',
  },
};

interface AgendaScreenProps {
  embedded?: boolean;
}

export function AgendaScreen({ embedded = false }: AgendaScreenProps) {
  const { mode } = useThemeStore();
  const isDarkMode = mode === 'dark';
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [aiQuests, setAiQuests] = useState<AIQuest[]>([]);
  const [weekData, setWeekData] = useState<WeekDay[]>([]);
  const [monthData, setMonthData] = useState<MonthDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');

  const theme = {
    background: isDarkMode ? '#0F172A' : '#F8FAFC',
    card: isDarkMode ? '#1E293B' : '#FFFFFF',
    text: isDarkMode ? '#F1F5F9' : '#1E293B',
    textSecondary: isDarkMode ? '#94A3B8' : '#64748B',
    border: isDarkMode ? '#334155' : '#E2E8F0',
    primary: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    accent: '#8B5CF6',
  };

  const formatDateHeader = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return t.today;
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const loadDayData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data: agendaData } = await supabase
        .rpc('generate_daily_agenda', { p_user_id: user.id, p_date: dateStr });
      setAgendaItems(agendaData || []);
      const { data: questsData } = await supabase
        .rpc('get_ai_daily_quests', { p_user_id: user.id, p_date: dateStr });
      setAiQuests(questsData || []);
    } catch (error) {
      console.error('Error loading day data:', error);
    }
  }, [user?.id, selectedDate]);

  const loadWeekData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const dateStr = weekStart.toISOString().split('T')[0];
      const { data } = await supabase
        .rpc('get_weekly_calendar', { p_user_id: user.id, p_week_start: dateStr });
      if (data?.days) setWeekData(data.days);
    } catch (error) {
      console.error('Error loading week data:', error);
    }
  }, [user?.id, selectedDate]);

  const loadMonthData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .rpc('get_monthly_calendar', {
          p_user_id: user.id,
          p_year: selectedDate.getFullYear(),
          p_month: selectedDate.getMonth() + 1,
        });
      if (data?.days) setMonthData(data.days);
    } catch (error) {
      console.error('Error loading month data:', error);
    }
  }, [user?.id, selectedDate]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (viewMode === 'day') await loadDayData();
      else if (viewMode === 'week') await loadWeekData();
      else await loadMonthData();
      setLoading(false);
    };
    loadData();
  }, [viewMode, selectedDate, loadDayData, loadWeekData, loadMonthData]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (viewMode === 'day') await loadDayData();
    else if (viewMode === 'week') await loadWeekData();
    else await loadMonthData();
    setRefreshing(false);
  };

  const completeItem = async (item: AgendaItem) => {
    if (!user?.id) return;
    try {
      await supabase.rpc('complete_agenda_item', { p_user_id: user.id, p_item_id: item.id });
      setAgendaItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed' as const } : i));
    } catch (error) {
      console.error('Error completing item:', error);
    }
  };

  const respondToQuest = async (quest: AIQuest, action: 'accept' | 'skip' | 'complete') => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.rpc('respond_to_ai_quest', {
        p_user_id: user.id, p_quest_id: quest.id, p_action: action,
      });
      if (action === 'complete' && data?.xp_earned) {
        Alert.alert('🎉', `+${data.xp_earned} XP, +${data.coins_earned} QC`);
      }
      loadDayData();
    } catch (error) {
      console.error('Error responding to quest:', error);
    }
  };

  const generateQuests = async () => {
    if (!user?.id) return;
    try {
      await supabase.rpc('generate_ai_daily_quests', {
        p_user_id: user.id, p_date: selectedDate.toISOString().split('T')[0],
      });
      loadDayData();
    } catch (error) {
      console.error('Error generating quests:', error);
    }
  };

  const addEvent = async () => {
    if (!user?.id || !newEventTitle.trim()) return;
    try {
      const startTime = new Date(selectedDate);
      startTime.setHours(12, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(13, 0, 0);
      await supabase.rpc('add_calendar_event', {
        p_user_id: user.id, p_title: newEventTitle,
        p_start_time: startTime.toISOString(), p_end_time: endTime.toISOString(),
      });
      setNewEventTitle('');
      setShowAddEvent(false);
      loadDayData();
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + direction);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
    else newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const getTimeOfDaySection = (item: AgendaItem): string => {
    if (!item.start_time) return t.anytime;
    const hour = parseInt(item.start_time.split(':')[0], 10);
    if (hour < 12) return t.morning;
    if (hour < 17) return t.afternoon;
    return t.evening;
  };

  const groupItemsByTimeOfDay = () => {
    const groups: { [key: string]: AgendaItem[] } = { [t.morning]: [], [t.afternoon]: [], [t.evening]: [], [t.anytime]: [] };
    agendaItems.forEach(item => { groups[getTimeOfDaySection(item)]?.push(item); });
    return groups;
  };

  const renderAgendaItem = (item: AgendaItem) => {
    const isCompleted = item.status === 'completed';
    return (
      <TouchableOpacity key={item.id} style={[styles.agendaItem, { backgroundColor: theme.card, borderLeftColor: item.color, opacity: isCompleted ? 0.6 : 1 }]}
        onPress={() => !isCompleted && completeItem(item)} disabled={isCompleted}>
        <Text style={styles.itemIcon}>{item.icon || '📌'}</Text>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: theme.text, textDecorationLine: isCompleted ? 'line-through' : 'none' }]}>{item.title}</Text>
          {item.start_time && <Text style={[styles.itemTime, { color: theme.textSecondary }]}>{item.start_time.slice(0, 5)}</Text>}
        </View>
        <View style={[styles.checkCircle, { backgroundColor: isCompleted ? theme.success : theme.border }]}>
          {isCompleted && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderAIQuest = (quest: AIQuest) => {
    const isCompleted = quest.status === 'completed';
    const isAccepted = quest.status === 'accepted';
    return (
      <View key={quest.id} style={[styles.questCard, { backgroundColor: theme.card }]}>
        <View style={styles.questHeader}>
          <Text style={styles.questIcon}>{quest.icon}</Text>
          <View style={styles.questInfo}>
            <Text style={[styles.questTitle, { color: theme.text }]}>{quest.title}</Text>
            <View style={styles.questMeta}>
              <Text style={[styles.questXP, { color: theme.warning }]}>+{quest.xp_reward} XP</Text>
              <Text style={[styles.questTime, { color: theme.textSecondary }]}>~{quest.estimated_minutes} min</Text>
            </View>
          </View>
        </View>
        <View style={styles.questActions}>
          {quest.status === 'available' && (
            <>
              <TouchableOpacity style={[styles.questBtn, { backgroundColor: theme.primary }]} onPress={() => respondToQuest(quest, 'accept')}>
                <Text style={styles.questBtnText}>{t.accept}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.questBtn, { backgroundColor: theme.border }]} onPress={() => respondToQuest(quest, 'skip')}>
                <Text style={[styles.questBtnText, { color: theme.textSecondary }]}>{t.skip}</Text>
              </TouchableOpacity>
            </>
          )}
          {isAccepted && (
            <TouchableOpacity style={[styles.questBtn, { backgroundColor: theme.success, flex: 1 }]} onPress={() => respondToQuest(quest, 'complete')}>
              <Ionicons name="checkmark-circle" size={16} color="#FFF" />
              <Text style={styles.questBtnText}> {t.complete}</Text>
            </TouchableOpacity>
          )}
          {isCompleted && (
            <View style={[styles.questBtn, { backgroundColor: theme.success, flex: 1, opacity: 0.6 }]}>
              <Ionicons name="checkmark-done" size={16} color="#FFF" />
              <Text style={styles.questBtnText}> ✓</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderDayView = () => {
    const groupedItems = groupItemsByTimeOfDay();
    const availableQuests = aiQuests.filter(q => q.status === 'available' || q.status === 'accepted');
    return (
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {availableQuests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.accent }]}>⚡ {t.aiQuests}</Text>
              <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{availableQuests.length} {t.questsAvailable}</Text>
            </View>
            {availableQuests.map(renderAIQuest)}
          </View>
        )}
        {aiQuests.length === 0 && (
          <TouchableOpacity style={[styles.generateBtn, { backgroundColor: theme.accent }]} onPress={generateQuests}>
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={styles.generateBtnText}>{t.generateQuests}</Text>
          </TouchableOpacity>
        )}
        {Object.entries(groupedItems).map(([timeOfDay, items]) => {
          if (items.length === 0) return null;
          return (
            <View key={timeOfDay} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{timeOfDay}</Text>
              {items.map(renderAgendaItem)}
            </View>
          );
        })}
        {agendaItems.length === 0 && aiQuests.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t.noItems}</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  const renderWeekView = () => (
    <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {weekData.map((day, index) => {
        const isToday = new Date(day.date).toDateString() === new Date().toDateString();
        const progress = day.habits_count > 0 ? Math.round((day.habits_completed / day.habits_count) * 100) : 0;
        return (
          <TouchableOpacity key={index} style={[styles.weekDay, { backgroundColor: theme.card, borderLeftColor: isToday ? theme.primary : 'transparent' }]}
            onPress={() => { setSelectedDate(new Date(day.date)); setViewMode('day'); }}>
            <View style={styles.weekDayLeft}>
              <Text style={[styles.weekDayName, { color: isToday ? theme.primary : theme.text }]}>{day.day_name}</Text>
              <Text style={[styles.weekDayDate, { color: theme.textSecondary }]}>{new Date(day.date).getDate()}</Text>
            </View>
            <View style={styles.weekDayStats}>
              <View style={styles.weekStat}><Text style={[styles.weekStatNum, { color: theme.success }]}>{day.habits_completed}/{day.habits_count}</Text><Text style={[styles.weekStatLabel, { color: theme.textSecondary }]}>{t.habits}</Text></View>
              <View style={styles.weekStat}><Text style={[styles.weekStatNum, { color: theme.warning }]}>{day.quests_count}</Text><Text style={[styles.weekStatLabel, { color: theme.textSecondary }]}>{t.quests}</Text></View>
              <View style={styles.weekStat}><Text style={[styles.weekStatNum, { color: theme.primary }]}>{day.events_count}</Text><Text style={[styles.weekStatLabel, { color: theme.textSecondary }]}>{t.events}</Text></View>
            </View>
            <View style={[styles.progressRing, { borderColor: progress > 50 ? theme.success : theme.border }]}><Text style={[styles.progressText, { color: theme.text }]}>{progress}%</Text></View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderMonthView = () => {
    const weeks: MonthDay[][] = [];
    let currentWeek: MonthDay[] = [];
    const firstDay = monthData[0];
    if (firstDay) {
      const firstDayOfWeek = new Date(firstDay.date).getDay();
      for (let i = 0; i < (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1); i++) {
        currentWeek.push({ date: '', day: 0, has_habits: false, has_events: false, completion_rate: 0 });
      }
    }
    monthData.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);
    const dayNames = language === 'es' ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return (
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={[styles.monthGrid, { backgroundColor: theme.card }]}>
          <View style={styles.monthHeader}>{dayNames.map((name, i) => (<Text key={i} style={[styles.monthDayName, { color: theme.textSecondary }]}>{name}</Text>))}</View>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.monthWeek}>
              {week.map((day, dayIndex) => {
                if (day.day === 0) return <View key={dayIndex} style={styles.monthDayEmpty} />;
                const isToday = new Date(day.date).toDateString() === new Date().toDateString();
                const hasActivity = day.has_habits || day.has_events;
                return (
                  <TouchableOpacity key={dayIndex} style={[styles.monthDay, isToday && { backgroundColor: theme.primary }, day.completion_rate > 80 && { backgroundColor: theme.success + '30' }]}
                    onPress={() => { setSelectedDate(new Date(day.date)); setViewMode('day'); }}>
                    <Text style={[styles.monthDayNum, { color: isToday ? '#FFF' : theme.text }]}>{day.day}</Text>
                    {hasActivity && !isToday && <View style={[styles.activityDot, { backgroundColor: theme.success }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    const Container = embedded ? View : SafeAreaView;
    return (
      <Container style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
      </Container>
    );
  }

  const Container = embedded ? View : SafeAreaView;

  return (
    <Container style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigateDate(-1)}><Ionicons name="chevron-back" size={24} color={theme.text} /></TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
          <Text style={[styles.dateTitle, { color: theme.text }]}>
            {viewMode === 'month' ? selectedDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' }) : formatDateHeader(selectedDate)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigateDate(1)}><Ionicons name="chevron-forward" size={24} color={theme.text} /></TouchableOpacity>
      </View>
      <View style={[styles.tabs, { backgroundColor: theme.card }]}>
        {(['day', 'week', 'month'] as ViewMode[]).map((m) => (
          <TouchableOpacity key={m} style={[styles.tab, viewMode === m && { backgroundColor: theme.primary }]} onPress={() => setViewMode(m)}>
            <Text style={[styles.tabText, { color: viewMode === m ? '#FFF' : theme.textSecondary }]}>{m === 'day' ? t.day : m === 'week' ? t.week : t.month}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => setShowAddEvent(true)}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
      <Modal visible={showAddEvent} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.addEvent}</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder={t.eventTitle} placeholderTextColor={theme.textSecondary} value={newEventTitle} onChangeText={setNewEventTitle} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border }]} onPress={() => setShowAddEvent(false)}><Text style={[styles.modalBtnText, { color: theme.text }]}>{t.cancel}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={addEvent}><Text style={styles.modalBtnText}>{t.save}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  navBtn: { padding: 8 },
  dateTitle: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  tabs: { flexDirection: 'row', margin: 16, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 16 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  sectionCount: { fontSize: 12 },
  agendaItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, borderLeftWidth: 4 },
  itemIcon: { fontSize: 22, marginRight: 12 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemTime: { fontSize: 12, marginTop: 2 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  questCard: { padding: 16, borderRadius: 12, marginBottom: 10 },
  questHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  questIcon: { fontSize: 28, marginRight: 12 },
  questInfo: { flex: 1 },
  questTitle: { fontSize: 15, fontWeight: '600' },
  questMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 },
  questXP: { fontSize: 13, fontWeight: '700' },
  questTime: { fontSize: 12 },
  questActions: { flexDirection: 'row', gap: 8 },
  questBtn: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  questBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginBottom: 16, gap: 8 },
  generateBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 15 },
  weekDay: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, borderLeftWidth: 4 },
  weekDayLeft: { width: 50 },
  weekDayName: { fontSize: 14, fontWeight: '700' },
  weekDayDate: { fontSize: 20, fontWeight: '300' },
  weekDayStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  weekStat: { alignItems: 'center' },
  weekStatNum: { fontSize: 16, fontWeight: '700' },
  weekStatLabel: { fontSize: 10, marginTop: 2 },
  progressRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  progressText: { fontSize: 11, fontWeight: '700' },
  monthGrid: { borderRadius: 16, padding: 16 },
  monthHeader: { flexDirection: 'row', marginBottom: 8 },
  monthDayName: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  monthWeek: { flexDirection: 'row' },
  monthDay: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', margin: 2, borderRadius: 8 },
  monthDayEmpty: { flex: 1, aspectRatio: 1, margin: 2 },
  monthDayNum: { fontSize: 14, fontWeight: '500' },
  activityDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: '600' },
});
