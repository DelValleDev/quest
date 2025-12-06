import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import {
  getUserBadHabits,
  createBadHabit,
  logBadHabit,
  getBadHabitsStats,
  subscribeToBadHabits,
  type BadHabit
} from '../../lib/badHabits';

export default function BadHabitsScreen() {
  const { user } = useAuthStore();
  const [badHabits, setBadHabits] = useState<BadHabit[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [habitName, setHabitName] = useState('');
  const [description, setDescription] = useState('');
  const [qcPenalty, setQcPenalty] = useState('50');

  useEffect(() => {
    if (user) {
      loadData();
      const subscription = subscribeToBadHabits(user.id, () => {
        loadData();
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [habitsData, statsData] = await Promise.all([
        getUserBadHabits(user.id),
        getBadHabitsStats(user.id)
      ]);

      setBadHabits(habitsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading bad habits:', error);
      Alert.alert('Error', 'No se pudo cargar los malos hábitos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHabit = async () => {
    if (!user || !habitName.trim()) {
      Alert.alert('Error', 'El nombre del hábito es requerido');
      return;
    }

    const penalty = parseInt(qcPenalty);
    if (isNaN(penalty) || penalty < 1) {
      Alert.alert('Error', 'La penalización debe ser al menos 1 QC');
      return;
    }

    try {
      await createBadHabit(user.id, habitName, penalty, description);
      setHabitName('');
      setDescription('');
      setQcPenalty('50');
      setShowAddModal(false);
      Alert.alert('✅ Creado', 'Mal hábito agregado');
    } catch (error) {
      console.error('Error creating bad habit:', error);
      Alert.alert('Error', 'No se pudo crear el mal hábito');
    }
  };

  const handleLogOccurrence = async (badHabitId: string, habitName: string) => {
    if (!user) return;

    Alert.alert(
      '⚠️ Registrar Ocurrencia',
      `¿Cometiste el mal hábito "${habitName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, registrar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await logBadHabit(user.id, badHabitId);
              Alert.alert(
                '💔 Registrado',
                `Perdiste ${result.qc_lost} QC. ¡Evita este hábito!`
              );
            } catch (error) {
              console.error('Error logging bad habit:', error);
              Alert.alert('Error', 'No se pudo registrar');
            }
          }
        }
      ]
    );
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
          <Text style={styles.title}>⚠️ Malos Hábitos</Text>
          <Text style={styles.subtitle}>
            Registra cuando cometes un mal hábito y pierde QC
          </Text>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_bad_habits}</Text>
                <Text style={styles.statLabel}>Hábitos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_occurrences}</Text>
                <Text style={styles.statLabel}>Ocurrencias</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                  {stats.total_qc_lost}
                </Text>
                <Text style={styles.statLabel}>QC Perdidos</Text>
              </View>
            </View>
          </View>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <View style={styles.addModal}>
            <Text style={styles.modalTitle}>Nuevo Mal Hábito</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nombre (ej: Fumar, Comer comida chatarra)"
              value={habitName}
              onChangeText={setHabitName}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción (opcional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.penaltyContainer}>
              <Text style={styles.penaltyLabel}>Penalización (QC):</Text>
              <TextInput
                style={styles.penaltyInput}
                value={qcPenalty}
                onChangeText={setQcPenalty}
                keyboardType="number-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setHabitName('');
                  setDescription('');
                  setQcPenalty('50');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={handleCreateHabit}
              >
                <Text style={styles.createButtonText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bad Habits List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tus Malos Hábitos</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={32} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          {badHabits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No has definido malos hábitos aún
              </Text>
              <Text style={styles.emptySubtext}>
                Toca + para agregar uno
              </Text>
            </View>
          ) : (
            badHabits.map(habit => (
              <View key={habit.id} style={styles.habitCard}>
                <View style={styles.habitHeader}>
                  <Text style={styles.habitName}>{habit.habit_name}</Text>
                  <View style={styles.penaltyBadge}>
                    <Text style={styles.penaltyText}>-{habit.qc_penalty} QC</Text>
                  </View>
                </View>

                {habit.description && (
                  <Text style={styles.habitDescription}>{habit.description}</Text>
                )}

                <View style={styles.habitFooter}>
                  <Text style={styles.occurrences}>
                    {habit.occurrences} {habit.occurrences === 1 ? 'vez' : 'veces'}
                  </Text>

                  <TouchableOpacity
                    style={styles.logButton}
                    onPress={() => handleLogOccurrence(habit.id, habit.habit_name)}
                  >
                    <Text style={styles.logButtonText}>Lo cometí</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF'
  },
  statsCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  addButton: {},
  habitCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  habitName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1
  },
  penaltyBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  penaltyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  habitDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12
  },
  habitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  occurrences: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  logButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280'
  },
  addModal: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16
  },
  input: {
    backgroundColor: '#0F0F1E',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  penaltyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  penaltyLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 12
  },
  penaltyInput: {
    backgroundColor: '#0F0F1E',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    width: 100
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#374151'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  createButton: {
    backgroundColor: '#8B5CF6'
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});
