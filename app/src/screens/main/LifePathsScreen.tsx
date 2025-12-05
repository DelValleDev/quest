import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  LifePaths: undefined;
  LifePathDetail: { pathId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface LifePath {
  id: string;
  title: string;
  description: string | null;
  pillar_id: string;
  icon: string;
  color: string;
  vision_statement: string | null;
  target_date: string | null;
  status: string;
  progress_percentage: number;
}

interface Milestone {
  id: string;
  title: string;
  target_date: string;
  status: string;
  life_path_id: string;
}

interface WeeklyObjective {
  id: string;
  title: string;
  pillar_id: string;
  target_value: number;
  current_value: number;
  status: string;
}

const PILLAR_CONFIG: Record<string, { emoji: string; name: string; nameEs: string; color: string }> = {
  physical: { emoji: '💪', name: 'Physical', nameEs: 'Físico', color: '#EF4444' },
  mental: { emoji: '🧠', name: 'Mental', nameEs: 'Mental', color: '#3B82F6' },
  social: { emoji: '❤️', name: 'Social', nameEs: 'Social', color: '#EC4899' },
  professional: { emoji: '💼', name: 'Professional', nameEs: 'Profesional', color: '#10B981' },
  spiritual: { emoji: '✨', name: 'Spiritual', nameEs: 'Espiritual', color: '#8B5CF6' },
  creative: { emoji: '🎨', name: 'Creative', nameEs: 'Creativo', color: '#F97316' },
};

interface LifePathsScreenProps {
  embedded?: boolean;
}

export const LifePathsScreen: React.FC<LifePathsScreenProps> = ({ embedded = false }) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<NavigationProp>();

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lifePaths, setLifePaths] = useState<LifePath[]>([]);
  const [upcomingMilestones, setUpcomingMilestones] = useState<Milestone[]>([]);
  const [weeklyObjectives, setWeeklyObjectives] = useState<WeeklyObjective[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPath, setSelectedPath] = useState<LifePath | null>(null);

  // New path form
  const [newPathTitle, setNewPathTitle] = useState('');
  const [newPathVision, setNewPathVision] = useState('');
  const [newPathPillar, setNewPathPillar] = useState<string>('');

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      // Fetch life paths
      const { data: paths, error: pathsError } = await supabase
        .from('life_paths')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (pathsError) throw pathsError;
      setLifePaths(paths || []);

      // Fetch upcoming milestones (next 7 days)
      const { data: milestones } = await supabase
        .from('path_milestones')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .lte('target_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('target_date', { ascending: true })
        .limit(5);

      setUpcomingMilestones(milestones || []);

      // Fetch this week's objectives
      const weekStart = getWeekStart();
      const { data: objectives } = await supabase
        .from('weekly_objectives')
        .select('*, weekly_plans!inner(*)')
        .eq('weekly_plans.user_id', user.id)
        .eq('weekly_plans.week_start', weekStart);

      setWeeklyObjectives(objectives || []);

    } catch (err) {
      console.error('Error fetching life paths:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user?.id])
  );

  const createLifePath = async () => {
    if (!newPathTitle.trim() || !newPathPillar) {
      Alert.alert(t('Error', 'Error'), t('Please fill in all fields', 'Por favor completa todos los campos'));
      return;
    }

    try {
      const { error } = await supabase
        .from('life_paths')
        .insert({
          user_id: user?.id,
          title: newPathTitle.trim(),
          vision_statement: newPathVision.trim() || null,
          pillar_id: newPathPillar,
          icon: PILLAR_CONFIG[newPathPillar]?.emoji || '🎯',
          color: PILLAR_CONFIG[newPathPillar]?.color || '#8B5CF6',
          target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });

      if (error) throw error;

      setShowCreateModal(false);
      setNewPathTitle('');
      setNewPathVision('');
      setNewPathPillar('');
      fetchData();

      Alert.alert(
        t('Path Created! 🎯', '¡Camino Creado! 🎯'),
        t('Your life path has been created. Now let\'s add milestones!', 'Tu camino de vida ha sido creado. ¡Ahora agreguemos hitos!')
      );
    } catch (err) {
      console.error('Error creating path:', err);
      Alert.alert(t('Error', 'Error'), t('Failed to create path', 'Error al crear el camino'));
    }
  };

  const generatePathsWithAI = async () => {
    try {
      setLoading(true);
      
      // Create initial paths based on weak pillars
      const { data, error } = await supabase
        .rpc('create_initial_life_paths', { p_user_id: user?.id });

      if (error) throw error;

      Alert.alert(
        t('Paths Generated! 🎯', '¡Caminos Generados! 🎯'),
        t(`${data} life paths created based on your assessment`, `${data} caminos de vida creados basados en tu assessment`)
      );

      fetchData();
    } catch (err) {
      console.error('Error generating paths:', err);
      Alert.alert(t('Error', 'Error'), t('Failed to generate paths', 'Error al generar caminos'));
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
      paddingTop: 60,
      paddingBottom: 100,
    },
    header: {
      marginBottom: 24,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    seeAllBtn: {
      padding: 4,
    },
    seeAllText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
    },
    pathCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
    },
    pathHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    pathIcon: {
      fontSize: 32,
      marginRight: 12,
    },
    pathInfo: {
      flex: 1,
    },
    pathTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 2,
    },
    pathPillar: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    milestoneCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    milestoneIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    milestoneInfo: {
      flex: 1,
    },
    milestoneTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    milestoneDue: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    objectiveCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    objectiveHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    objectiveTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    objectiveProgress: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    createBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    createBtnText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
    },
    aiBtn: {
      backgroundColor: theme.surface,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    aiBtnText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 100,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: theme.text,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    pillarSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    pillarOption: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    pillarOptionSelected: {
      borderColor: theme.primary,
    },
    pillarOptionText: {
      fontSize: 14,
      color: theme.text,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelBtn: {
      backgroundColor: theme.surface,
    },
    submitBtn: {
      backgroundColor: theme.primary,
    },
    cancelBtnText: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    submitBtnText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });

  if (loading) {
    const Container = embedded ? View : SafeAreaView;
    return (
      <Container style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </Container>
    );
  }

  const Container = embedded ? View : SafeAreaView;
  
  return (
    <Container style={styles.container} {...(!embedded && { edges: ['top'] })}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('Life Paths', 'Caminos de Vida')} 🎯
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('Your journey to becoming your best self', 'Tu viaje para ser tu mejor versión')}
          </Text>
        </View>

        {/* Life Paths */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('Active Paths', 'Caminos Activos')}
            </Text>
          </View>

          {lifePaths.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyText}>
                {t('No life paths yet.\nCreate your first path to start your journey!', 
                   'Aún no tienes caminos.\n¡Crea tu primer camino para empezar!')}
              </Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={styles.createBtnText}>{t('Create Path', 'Crear Camino')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiBtn} onPress={generatePathsWithAI}>
                <Text style={{ fontSize: 18 }}>🤖</Text>
                <Text style={styles.aiBtnText}>{t('Generate with AI', 'Generar con IA')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            lifePaths.map((path) => {
              const pillar = PILLAR_CONFIG[path.pillar_id] || { emoji: '🎯', color: '#8B5CF6' };
              return (
                <TouchableOpacity
                  key={path.id}
                  style={[styles.pathCard, { borderLeftColor: pillar.color }]}
                  onPress={() => navigation.navigate('LifePathDetail', { pathId: path.id })}
                >
                  <View style={styles.pathHeader}>
                    <Text style={styles.pathIcon}>{path.icon || pillar.emoji}</Text>
                    <View style={styles.pathInfo}>
                      <Text style={styles.pathTitle}>{path.title}</Text>
                      <Text style={styles.pathPillar}>
                        {language === 'es' ? pillar.nameEs : pillar.name}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${path.progress_percentage}%`, backgroundColor: pillar.color }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {path.progress_percentage}% {t('complete', 'completado')}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Upcoming Milestones */}
        {upcomingMilestones.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('Upcoming Milestones', 'Próximos Hitos')} 🏁
              </Text>
            </View>
            {upcomingMilestones.map((milestone) => (
              <View key={milestone.id} style={styles.milestoneCard}>
                <View style={styles.milestoneIcon}>
                  <Ionicons name="flag" size={20} color={theme.primary} />
                </View>
                <View style={styles.milestoneInfo}>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                  <Text style={styles.milestoneDue}>
                    📅 {new Date(milestone.target_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* This Week's Focus */}
        {weeklyObjectives.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('This Week', 'Esta Semana')} 📋
              </Text>
            </View>
            {weeklyObjectives.map((obj) => (
              <View key={obj.id} style={styles.objectiveCard}>
                <View style={styles.objectiveHeader}>
                  <Text style={styles.objectiveTitle}>{obj.title}</Text>
                  <Text style={styles.objectiveProgress}>
                    {obj.current_value}/{obj.target_value}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${Math.min((obj.current_value / obj.target_value) * 100, 100)}%`,
                        backgroundColor: theme.primary 
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {lifePaths.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Create Path Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowCreateModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={styles.modalTitle}>
              {t('Create Life Path', 'Crear Camino de Vida')} 🎯
            </Text>

            <Text style={styles.inputLabel}>{t('What do you want to achieve?', '¿Qué quieres lograr?')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('e.g., Get in the best shape of my life', 'ej: Estar en mi mejor forma física')}
              placeholderTextColor={theme.textMuted}
              value={newPathTitle}
              onChangeText={setNewPathTitle}
            />

            <Text style={styles.inputLabel}>{t('Your vision (optional)', 'Tu visión (opcional)')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('Describe how you see yourself...', 'Describe cómo te ves...')}
              placeholderTextColor={theme.textMuted}
              value={newPathVision}
              onChangeText={setNewPathVision}
              multiline
            />

            <Text style={styles.inputLabel}>{t('Life area', 'Área de vida')}</Text>
            <View style={styles.pillarSelector}>
              {Object.entries(PILLAR_CONFIG).map(([key, config]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.pillarOption,
                    newPathPillar === key && styles.pillarOptionSelected,
                    newPathPillar === key && { borderColor: config.color }
                  ]}
                  onPress={() => setNewPathPillar(key)}
                >
                  <Text style={styles.pillarOptionText}>
                    {config.emoji} {language === 'es' ? config.nameEs : config.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelBtnText}>{t('Cancel', 'Cancelar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.submitBtn]}
                onPress={createLifePath}
              >
                <Text style={styles.submitBtnText}>{t('Create', 'Crear')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Container>
  );
};

export default LifePathsScreen;
