import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useLanguageStore, useAuthStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Habit {
  id: string;
  title: string;
  description: string | null;
  pillar_id: string;
  icon: string;
  xp_reward: number;
  current_streak: number;
  times_per_day: number;
  completions_today: number;
  is_completed_today: boolean;
  time_of_day: string;
}

interface Profile {
  display_name: string;
  habit_streak: number;
  habits_completed_today: number;
}

const PILLAR_COLORS: Record<string, string> = {
  physical: '#EF4444',
  mental: '#3B82F6',
  social: '#EC4899',
  professional: '#10B981',
  spiritual: '#8B5CF6',
  creative: '#F97316',
};

const TIME_ICONS: Record<string, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌙',
  anytime: '⏰',
};

interface HabitsScreenProps {
  embedded?: boolean;
}

export const HabitsScreen: React.FC<HabitsScreenProps> = ({ embedded = false }) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const fetchHabits = async () => {
    try {
      // Get today's habits
      const { data: habitsData, error: habitsError } = await supabase
        .rpc('get_today_habits', { p_user_id: user?.id });

      if (habitsError) throw habitsError;
      setHabits(habitsData || []);

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, habit_streak, habits_completed_today')
        .eq('id', user?.id)
        .single();

      if (profileData) setProfile(profileData);
    } catch (err) {
      console.error('Error fetching habits:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHabits();
    }, [user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHabits();
  };

  const completeHabit = async (habit: Habit) => {
    if (habit.is_completed_today) {
      return; // Already completed
    }

    try {
      const { data, error } = await supabase.rpc('complete_habit', {
        p_habit_id: habit.id,
        p_user_id: user?.id,
      });

      if (error) throw error;

      if (data?.success) {
        // Update local state
        setHabits(habits.map(h => 
          h.id === habit.id 
            ? { 
                ...h, 
                completions_today: h.completions_today + 1,
                is_completed_today: h.completions_today + 1 >= h.times_per_day,
                current_streak: data.new_streak,
              }
            : h
        ));

        // Show success feedback
        // Could add haptic feedback here
      } else if (data?.error) {
        Alert.alert('Error', data.error);
      }
    } catch (err) {
      console.error('Error completing habit:', err);
      Alert.alert('Error', t('Could not complete habit', 'No se pudo completar el hábito'));
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('Good morning', 'Buenos días');
    if (hour < 18) return t('Good afternoon', 'Buenas tardes');
    return t('Good evening', 'Buenas noches');
  };

  const getCompletedCount = () => habits.filter(h => h.is_completed_today).length;
  const getTotalCount = () => habits.length;
  const getProgress = () => getTotalCount() > 0 ? (getCompletedCount() / getTotalCount()) * 100 : 0;

  // Group habits by time of day
  const groupedHabits = {
    morning: habits.filter(h => h.time_of_day === 'morning'),
    afternoon: habits.filter(h => h.time_of_day === 'afternoon'),
    evening: habits.filter(h => h.time_of_day === 'evening'),
    anytime: habits.filter(h => h.time_of_day === 'anytime' || !h.time_of_day),
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    embeddedContainer: {
      backgroundColor: 'transparent',
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
    },
    greeting: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    name: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    progressCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    progressTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    progressCount: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: 'bold',
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    streakText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 6,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionIcon: {
      fontSize: 20,
      marginRight: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    habitCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
    },
    habitCardCompleted: {
      opacity: 0.6,
    },
    habitIcon: {
      fontSize: 28,
      marginRight: 12,
    },
    habitInfo: {
      flex: 1,
    },
    habitTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    habitTitleCompleted: {
      textDecorationLine: 'line-through',
      color: theme.textSecondary,
    },
    habitMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    habitPillarDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    habitXP: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    habitStreak: {
      fontSize: 12,
      color: '#F59E0B',
      marginLeft: 8,
    },
    checkButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkButtonCompleted: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    checkText: {
      fontSize: 20,
      color: '#FFFFFF',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    addButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
      marginTop: 16,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });

  const renderHabitCard = (habit: Habit) => {
    const pillarColor = PILLAR_COLORS[habit.pillar_id] || theme.primary;
    const isCompleted = habit.is_completed_today;

    return (
      <View 
        key={habit.id} 
        style={[styles.habitCard, isCompleted && styles.habitCardCompleted]}
      >
        <Text style={styles.habitIcon}>{habit.icon}</Text>
        <View style={styles.habitInfo}>
          <Text style={[styles.habitTitle, isCompleted && styles.habitTitleCompleted]}>
            {habit.title}
          </Text>
          <View style={styles.habitMeta}>
            <View style={[styles.habitPillarDot, { backgroundColor: pillarColor }]} />
            <Text style={styles.habitXP}>+{habit.xp_reward} XP</Text>
            {habit.current_streak > 0 && (
              <Text style={styles.habitStreak}>🔥 {habit.current_streak}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.checkButton,
            { borderColor: isCompleted ? '#10B981' : pillarColor },
            isCompleted && styles.checkButtonCompleted,
          ]}
          onPress={() => completeHabit(habit)}
          disabled={isCompleted}
        >
          {isCompleted && <Text style={styles.checkText}>✓</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderSection = (title: string, icon: string, sectionHabits: Habit[]) => {
    if (sectionHabits.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {sectionHabits.map(renderHabitCard)}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, embedded && styles.embeddedContainer]} edges={embedded ? [] : ['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textSecondary }}>
            {t('Loading habits...', 'Cargando hábitos...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, embedded && styles.embeddedContainer]} edges={embedded ? [] : ['top']}>
      {/* Header - hide when embedded */}
      {!embedded && (
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.name}>{profile?.display_name || 'Adventurer'} 👋</Text>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              {t("Today's Progress", 'Progreso de Hoy')}
            </Text>
            <Text style={styles.progressCount}>
              {getCompletedCount()}/{getTotalCount()}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
          </View>
          {profile?.habit_streak && profile.habit_streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={{ fontSize: 16 }}>🔥</Text>
              <Text style={styles.streakText}>
                {profile.habit_streak} {t('day streak', 'días de racha')}
              </Text>
            </View>
          )}
        </View>
      </View>
      )}

      {/* Habits List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>
              {t(
                "You don't have any habits yet.\nAdd some to start your journey!",
                "Aún no tienes hábitos.\n¡Añade algunos para empezar tu viaje!"
              )}
            </Text>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>
                {t('Add Habits', 'Añadir Hábitos')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderSection(t('Morning', 'Mañana'), TIME_ICONS.morning, groupedHabits.morning)}
            {renderSection(t('Afternoon', 'Tarde'), TIME_ICONS.afternoon, groupedHabits.afternoon)}
            {renderSection(t('Evening', 'Noche'), TIME_ICONS.evening, groupedHabits.evening)}
            {renderSection(t('Anytime', 'Cualquier momento'), TIME_ICONS.anytime, groupedHabits.anytime)}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HabitsScreen;
