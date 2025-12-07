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
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Task {
  id: string;
  title: string;
  description: string;
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard';
  is_completed: boolean;
  due_date: string | null;
  xp_reward: number;
  qc_reward: number;
}

export default function TasksScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    difficulty: 'easy' as const,
    due_date: '',
  });

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query = query.eq('is_completed', false);
    } else if (filter === 'completed') {
      query = query.eq('is_completed', true);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;

    const xpRewards = { trivial: 5, easy: 10, medium: 20, hard: 50 };
    const qcRewards = { trivial: 2, easy: 5, medium: 10, hard: 25 };

    const { error } = await supabase.from('tasks').insert({
      user_id: user?.id,
      title: newTask.title,
      description: newTask.description,
      difficulty: newTask.difficulty,
      due_date: newTask.due_date || null,
      xp_reward: xpRewards[newTask.difficulty],
      qc_reward: qcRewards[newTask.difficulty],
    });

    if (!error) {
      setModalVisible(false);
      setNewTask({ title: '', description: '', difficulty: 'easy', due_date: '' });
      loadTasks();
    }
  };

  const toggleTask = async (taskId: string, isCompleted: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: !isCompleted })
      .eq('id', taskId);

    if (!error) {
      loadTasks();
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) loadTasks();
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      trivial: '#94A3B8',
      easy: '#10B981',
      medium: '#F59E0B',
      hard: '#EF4444',
    };
    return colors[difficulty as keyof typeof colors] || '#94A3B8';
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels = {
      trivial: 'Trivial',
      easy: 'Fácil',
      medium: 'Medio',
      hard: 'Difícil',
    };
    return labels[difficulty as keyof typeof labels] || 'Fácil';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tareas</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Todas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pendientes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completadas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadTasks} />}
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No hay tareas {filter !== 'all' ? filter : ''}</Text>
            <Text style={styles.emptySubtext}>Crea una nueva tarea para comenzar</Text>
          </View>
        ) : (
          tasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleTask(task.id, task.is_completed)}
              >
                {task.is_completed && <View style={styles.checkboxChecked} />}
              </TouchableOpacity>

              <View style={styles.taskContent}>
                <Text
                  style={[styles.taskTitle, task.is_completed && styles.taskTitleCompleted]}
                >
                  {task.title}
                </Text>
                {task.description && (
                  <Text style={styles.taskDescription}>{task.description}</Text>
                )}
                <View style={styles.taskMeta}>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(task.difficulty) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        { color: getDifficultyColor(task.difficulty) },
                      ]}
                    >
                      {getDifficultyLabel(task.difficulty)}
                    </Text>
                  </View>
                  <Text style={styles.reward}>+{task.xp_reward} XP</Text>
                  <Text style={styles.reward}>+{task.qc_reward} QC</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTask(task.id)}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Task Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Tarea</Text>

            <TextInput
              style={styles.input}
              placeholder="Título de la tarea"
              placeholderTextColor="#64748B"
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={3}
              value={newTask.description}
              onChangeText={(text) => setNewTask({ ...newTask, description: text })}
            />

            <Text style={styles.label}>Dificultad</Text>
            <View style={styles.difficultyOptions}>
              {(['trivial', 'easy', 'medium', 'hard'] as const).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.difficultyOption,
                    newTask.difficulty === diff && styles.difficultyOptionActive,
                    { borderColor: getDifficultyColor(diff) },
                  ]}
                  onPress={() => setNewTask({ ...newTask, difficulty: diff })}
                >
                  <Text
                    style={[
                      styles.difficultyOptionText,
                      { color: getDifficultyColor(diff) },
                    ]}
                  >
                    {getDifficultyLabel(diff)}
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
                onPress={createTask}
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
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6366F1',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  taskDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reward: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 20,
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
    minHeight: 400,
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
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
