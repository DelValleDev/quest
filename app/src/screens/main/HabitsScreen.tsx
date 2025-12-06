import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Habit {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'custom';
  target_count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  current_streak: number;
  best_streak: number;
  icon: string;
}

export default function HabitsScreen() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    frequency: 'daily' as const,
    difficulty: 'easy' as const,
    icon: '🎯',
  });

  const habitIcons = ['🎯', '💪', '📚', '🧘', '🏃', '🎨', '💡', '🎵', '✍️', '🌱'];

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    setLoading(true);
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (habitsData) {
      setHabits(habitsData);
      await checkTodayCompletion(habitsData);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const checkTodayCompletion = async (habitsData: Habit[]) => {
    const today = new Date().toISOString().split('T')[0];
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('habit_id')
      .eq('user_id', user?.id)
      .gte('completed_at', today);

    if (logs) {
      setCompletedToday(new Set(logs.map((log: any) => log.habit_id)));
    }
  };

  const createHabit = async () => {
    if (!newHabit.title.trim()) return;

    const { error } = await supabase.from('habits').insert({
      user_id: user?.id,
      title: newHabit.title,
      description: newHabit.description,
      frequency: newHabit.frequency,
      target_count: 1,
      difficulty: newHabit.difficulty,
      icon: newHabit.icon,
    });

    if (!error) {
      setModalVisible(false);
      setNewHabit({
        title: '',
        description: '',
        frequency: 'daily',
        difficulty: 'easy',
        icon: '🎯',
      });
      loadHabits();
    }
  };

  const completeHabit = async (habitId: string) => {
    const { error } = await supabase.from('habit_logs').insert({
      user_id: user?.id,
      habit_id: habitId,
    });

    if (!error) {
      // Update streak
      await supabase.rpc('increment_habit_streak', { habit_id: habitId });
      loadHabits();
    }
  };

  const deleteHabit = async (habitId: string) => {
    const { error } = await supabase.from('habits').delete().eq('id', habitId);
    if (!error) loadHabits();
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = { easy: '#10B981', medium: '#F59E0B', hard: '#EF4444' };
    return colors[difficulty as keyof typeof colors] || '#10B981';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Hábitos</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{habits.length}</Text>
          <Text style={styles.statLabel}>Hábitos Activos</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completedToday.size}</Text>
          <Text style={styles.statLabel}>Completados Hoy</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Math.max(...habits.map((h) => h.current_streak), 0)}
          </Text>
          <Text style={styles.statLabel}>Mejor Racha</Text>
        </View>
      </View>

      {/* Habits List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadHabits} />}
      >
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>No tienes hábitos</Text>
            <Text style={styles.emptySubtext}>Crea un nuevo hábito para comenzar</Text>
          </View>
        ) : (
          habits.map((habit) => {
            const isCompletedToday = completedToday.has(habit.id);
            return (
              <View key={habit.id} style={styles.habitCard}>
                <View style={styles.habitIcon}>
                  <Text style={styles.habitIconText}>{habit.icon}</Text>
                </View>

                <View style={styles.habitContent}>
                  <Text style={styles.habitTitle}>{habit.title}</Text>
                  {habit.description && (
                    <Text style={styles.habitDescription}>{habit.description}</Text>
                  )}
                  <View style={styles.habitMeta}>
                    <Text style={styles.frequency}>
                      {habit.frequency === 'daily'
                        ? '📅 Diario'
                        : habit.frequency === 'weekly'
                        ? '📆 Semanal'
                        : '⏱️ Custom'}
                    </Text>
                    <Text style={styles.streak}>🔥 {habit.current_streak} días</Text>
                  </View>
                </View>

                <View style={styles.habitActions}>
                  {!isCompletedToday ? (
                    <TouchableOpacity
                      style={[
                        styles.completeButton,
                        { backgroundColor: getDifficultyColor(habit.difficulty) },
                      ]}
                      onPress={() => completeHabit(habit.id)}
                    >
                      <Text style={styles.completeButtonText}>✓</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓ Hecho</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteHabit(habit.id)}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create Habit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Hábito</Text>

            <Text style={styles.label}>Icono</Text>
            <View style={styles.iconGrid}>
              {habitIcons.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    newHabit.icon === icon && styles.iconOptionActive,
                  ]}
                  onPress={() => setNewHabit({ ...newHabit, icon })}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Título del hábito"
              placeholderTextColor="#64748B"
              value={newHabit.title}
              onChangeText={(text) => setNewHabit({ ...newHabit, title: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={2}
              value={newHabit.description}
              onChangeText={(text) => setNewHabit({ ...newHabit, description: text })}
            />

            <Text style={styles.label}>Frecuencia</Text>
            <View style={styles.frequencyOptions}>
              {(['daily', 'weekly'] as const).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyOption,
                    newHabit.frequency === freq && styles.frequencyOptionActive,
                  ]}
                  onPress={() => setNewHabit({ ...newHabit, frequency: freq })}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      newHabit.frequency === freq && styles.frequencyTextActive,
                    ]}
                  >
                    {freq === 'daily' ? 'Diario' : 'Semanal'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Dificultad</Text>
            <View style={styles.difficultyOptions}>
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.difficultyOption,
                    newHabit.difficulty === diff && styles.difficultyOptionActive,
                    { borderColor: getDifficultyColor(diff) },
                  ]}
                  onPress={() => setNewHabit({ ...newHabit, difficulty: diff })}
                >
                  <Text
                    style={[
                      styles.difficultyOptionText,
                      { color: getDifficultyColor(diff) },
                    ]}
                  >
                    {diff === 'easy' ? 'Fácil' : diff === 'medium' ? 'Medio' : 'Difícil'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={createHabit}
              >
                <Text style={styles.createButtonText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitIconText: {
    fontSize: 24,
  },
  habitContent: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  habitDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 6,
  },
  habitMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  frequency: {
    fontSize: 12,
    color: '#64748B',
  },
  streak: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  habitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  completedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#10B98120',
  },
  completedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#6366F120',
  },
  iconText: {
    fontSize: 24,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  frequencyOptionActive: {
    backgroundColor: '#6366F1',
  },
  frequencyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  frequencyTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  difficultyOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  difficultyOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  difficultyOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#6366F1',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
