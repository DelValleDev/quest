import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
  Modal,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

interface LifePath {
  id: string;
  title: string;
  description: string | null;
  pillar_id: string;
  icon: string;
  color: string;
  vision_statement: string | null;
  why_important: string | null;
  target_date: string | null;
  status: string;
  progress_percentage: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  success_criteria: string | null;
  sort_order: number;
}

interface LinkedHabit {
  id: string;
  title: string;
  frequency: string;
  target_per_period: number;
}

const PILLAR_CONFIG: Record<string, { emoji: string; name: string; nameEs: string; color: string }> = {
  physical: { emoji: '💪', name: 'Physical', nameEs: 'Físico', color: '#EF4444' },
  mental: { emoji: '🧠', name: 'Mental', nameEs: 'Mental', color: '#3B82F6' },
  social: { emoji: '❤️', name: 'Social', nameEs: 'Social', color: '#EC4899' },
  professional: { emoji: '💼', name: 'Professional', nameEs: 'Profesional', color: '#10B981' },
  spiritual: { emoji: '✨', name: 'Spiritual', nameEs: 'Espiritual', color: '#8B5CF6' },
  creative: { emoji: '🎨', name: 'Creative', nameEs: 'Creativo', color: '#F97316' },
};

type RouteParams = {
  LifePathDetail: {
    pathId: string;
  };
};

export const LifePathDetailScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'LifePathDetail'>>();
  const pathId = route.params?.pathId;

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [path, setPath] = useState<LifePath | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [habits, setHabits] = useState<LinkedHabit[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  
  // Animation for "breathing" effect on current node
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const fetchData = async () => {
    if (!pathId) return;

    try {
      // Fetch path
      const { data: pathData, error: pathError } = await supabase
        .from('life_paths')
        .select('*')
        .eq('id', pathId)
        .single();

      if (pathError) throw pathError;
      setPath(pathData);

      // Fetch milestones
      const { data: milestonesData } = await supabase
        .from('path_milestones')
        .select('*')
        .eq('life_path_id', pathId)
        .order('sort_order', { ascending: true });

      setMilestones(milestonesData || []);

      // Fetch linked habits
      const { data: habitsData } = await supabase
        .from('path_habits')
        .select('habit_id, title, frequency, target_per_period')
        .eq('life_path_id', pathId);
      
      setHabits(habitsData?.map(h => ({
        id: h.habit_id,
        title: h.title,
        frequency: h.frequency,
        target_per_period: h.target_per_period
      })) || []);

    } catch (error) {
      console.error('Error fetching life path details:', error);
      Alert.alert(t('Error', 'Error'), t('Failed to load details', 'Error al cargar detalles'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pathId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleMilestonePress = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
  };

  const completeMilestone = async (milestoneId: string) => {
    try {
      const { error } = await supabase
        .from('path_milestones')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', milestoneId);

      if (error) throw error;
      
      setMilestones(milestones.map(m => 
        m.id === milestoneId ? { ...m, status: 'completed' } : m
      ));
      setSelectedMilestone(null);
      Alert.alert(t('Success', '¡Éxito!'), t('Milestone completed! 🎉', '¡Hito completado! 🎉'));
      
      const allCompleted = milestones.every(m => m.id === milestoneId || m.status === 'completed');
      if (allCompleted && path) {
        await supabase.from('life_paths').update({ status: 'completed' }).eq('id', path.id);
        setPath({ ...path, status: 'completed', progress_percentage: 100 });
      }

    } catch (error) {
      Alert.alert(t('Error', 'Error'), t('Failed to update milestone', 'Error al actualizar hito'));
    }
  };

  // --- ADVANCED MAP RENDERING ---
  const renderMap = () => {
    if (!path || milestones.length === 0) return null;

    const verticalSpacing = 140;
    const horizontalAmplitude = width * 0.3; 
    const startY = 100; // Padding top for Goal
    const nodeRadius = 24;
    
    // Reverse milestones for rendering: Goal at Top (index 0 visually), Start at Bottom
    // But logically, milestones are 1..N.
    // Let's place Goal at (width/2, 50)
    // Then Milestone N, N-1, ... 1
    // Then Start at bottom.
    
    const goalNode = {
      id: 'goal',
      title: t('GOAL', 'META'),
      x: width / 2,
      y: startY,
      type: 'goal',
      status: path.status
    };

    // Calculate positions for milestones (Top to Bottom)
    // We want the LAST milestone (highest sort_order) to be closest to the Goal.
    const sortedMilestones = [...milestones].sort((a, b) => b.sort_order - a.sort_order);
    
    const mapNodes = sortedMilestones.map((m, i) => {
      const isLeft = i % 2 === 0;
      return {
        ...m,
        x: width / 2 + (isLeft ? -horizontalAmplitude : horizontalAmplitude),
        y: startY + (i + 1) * verticalSpacing,
        type: 'milestone'
      };
    });

    const startNode = {
      id: 'start',
      title: t('START', 'INICIO'),
      x: width / 2,
      y: startY + (mapNodes.length + 1) * verticalSpacing,
      type: 'start',
      status: 'completed'
    };

    const allPoints = [goalNode, ...mapNodes, startNode];
    const mapHeight = startNode.y + 100;

    // Generate Bezier Path
    let d = `M ${goalNode.x} ${goalNode.y}`;
    
    for (let i = 0; i < allPoints.length - 1; i++) {
      const current = allPoints[i];
      const next = allPoints[i + 1];
      
      // Control points for smooth S-curve
      const cp1x = current.x;
      const cp1y = current.y + (next.y - current.y) * 0.5;
      const cp2x = next.x;
      const cp2y = current.y + (next.y - current.y) * 0.5;
      
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }

    const pillarColor = PILLAR_CONFIG[path.pillar_id]?.color || theme.primary;

    return (
      <View style={{ height: mapHeight, width: '100%', marginTop: 20 }}>
        <Svg height={mapHeight} width={width} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="pathGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={pillarColor} stopOpacity="1" />
              <Stop offset="1" stopColor={theme.border} stopOpacity="0.5" />
            </LinearGradient>
          </Defs>
          
          {/* The Path Line */}
          <Path
            d={d}
            stroke="url(#pathGradient)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="12, 8" // Dashed line for "journey" feel
          />
        </Svg>

        {/* Render Nodes & Cards */}
        {allPoints.map((node, index) => {
          const isGoal = node.type === 'goal';
          const isStart = node.type === 'start';
          const isMilestone = node.type === 'milestone';
          
          // Determine status color
          let statusColor = theme.border;
          let iconName = 'lock-closed';
          let isCompleted = false;
          let isCurrent = false;

          if (isGoal) {
            statusColor = path.status === 'completed' ? '#FFD700' : theme.card;
            iconName = 'trophy';
          } else if (isStart) {
            statusColor = theme.primary;
            iconName = 'play';
            isCompleted = true;
          } else {
            const m = node as any;
            if (m.status === 'completed') {
              statusColor = pillarColor;
              iconName = 'checkmark';
              isCompleted = true;
            } else if (m.status === 'in_progress') {
              statusColor = pillarColor;
              iconName = 'construct';
              isCurrent = true;
            } else {
              // Check if unlocked (previous one completed)
              // Note: We are iterating Top to Bottom (Goal -> Start)
              // But logic flows Start -> Goal.
              // A milestone is unlocked if the one "below" it (next in this array) is completed.
              const nextNode = allPoints[index + 1];
              const prevCompleted = nextNode && (nextNode as any).status === 'completed';
              
              if (prevCompleted || nextNode?.type === 'start') {
                statusColor = theme.textSecondary;
                iconName = 'lock-open';
              }
            }
          }

          // Card Positioning
          const isLeft = node.x < width / 2;
          const cardStyle = isLeft ? styles.cardLeft : styles.cardRight;
          
          return (
            <View key={node.id} style={{ position: 'absolute', left: node.x, top: node.y, alignItems: 'center' }}>
              
              {/* The Node Circle */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => isMilestone ? handleMilestonePress(node as unknown as Milestone) : null}
                disabled={!isMilestone}
              >
                <Animated.View
                  style={[
                    styles.nodeCircle,
                    {
                      backgroundColor: isGoal ? theme.surface : (isCompleted || isCurrent ? statusColor : theme.background),
                      borderColor: isCurrent ? statusColor : (isCompleted ? statusColor : theme.border),
                      transform: isCurrent ? [{ scale: pulseAnim }] : [],
                      shadowColor: statusColor,
                      shadowOpacity: isCurrent ? 0.6 : 0.2,
                    }
                  ]}
                >
                  <Ionicons 
                    name={iconName as any} 
                    size={isGoal ? 28 : 20} 
                    color={isGoal ? '#FFD700' : (isCompleted || isCurrent ? '#FFF' : theme.textSecondary)} 
                  />
                </Animated.View>
              </TouchableOpacity>

              {/* The Info Card/Label */}
              <View 
                style={[
                  styles.nodeCard, 
                  cardStyle, 
                  { 
                    backgroundColor: theme.surface,
                    borderColor: isCurrent ? statusColor : theme.border,
                    borderWidth: isCurrent ? 2 : 1
                  }
                ]}
              >
                <Text style={[styles.nodeTitle, { color: theme.text }]} numberOfLines={2}>
                  {node.title}
                </Text>
                {isMilestone && (node as any).target_date && (
                  <Text style={[styles.nodeDate, { color: theme.textSecondary }]}>
                    {(node as any).target_date}
                  </Text>
                )}
                {isCurrent && (
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{t('In Progress', 'En Progreso')}</Text>
                  </View>
                )}
              </View>

            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!path) return null;

  const pillar = PILLAR_CONFIG[path.pillar_id] || PILLAR_CONFIG.physical;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Modern Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('Your Journey', 'Tu Viaje')}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${path.progress_percentage}%`, backgroundColor: pillar.color }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {path.progress_percentage}% {t('Complete', 'Completado')}
          </Text>
        </View>

        <TouchableOpacity onPress={onRefresh} style={styles.headerBtn}>
          <Ionicons name="refresh" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Goal/Vision Header Card */}
        <View style={styles.visionHeader}>
          <Text style={[styles.pathTitle, { color: theme.text }]}>{path.title}</Text>
          <Text style={[styles.pathDesc, { color: theme.textSecondary }]}>{path.description}</Text>
          
          <View style={[styles.pillarTag, { backgroundColor: pillar.color + '20' }]}>
            <Text style={styles.pillarEmoji}>{pillar.emoji}</Text>
            <Text style={[styles.pillarName, { color: pillar.color }]}>{t(pillar.name, pillar.nameEs)}</Text>
          </View>
        </View>

        {/* The Map */}
        {renderMap()}

        {/* Habits Section (Bottom) */}
        <View style={styles.habitsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={24} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('Daily Quests', 'Misiones Diarias')}</Text>
          </View>
          
          {habits.map(habit => (
            <View key={habit.id} style={[styles.habitRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <View style={[styles.habitIcon, { backgroundColor: theme.background }]}>
                <Ionicons name="repeat" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.habitContent}>
                <Text style={[styles.habitTitle, { color: theme.text }]}>{habit.title}</Text>
                <Text style={[styles.habitSub, { color: theme.textSecondary }]}>{habit.frequency}</Text>
              </View>
              <TouchableOpacity style={styles.habitAction}>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} /> 
      </ScrollView>

      {/* FAB for Quick Add (Visual only for now) */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Milestone Modal */}
      <Modal
        visible={!!selectedMilestone}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMilestone(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHandle} />
            {selectedMilestone && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedMilestone.title}</Text>
                  <TouchableOpacity onPress={() => setSelectedMilestone(null)}>
                    <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalBody}>
                  <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
                    {selectedMilestone.description || t('No description provided.', 'Sin descripción.')}
                  </Text>
                  
                  <View style={[styles.statusBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>{t('Status', 'Estado')}</Text>
                    <Text style={[styles.statusValue, { color: selectedMilestone.status === 'completed' ? theme.success : theme.primary }]}>
                      {selectedMilestone.status.toUpperCase()}
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  {selectedMilestone.status !== 'completed' && (
                    <TouchableOpacity 
                      style={[styles.completeBtn, { backgroundColor: pillar.color }]}
                      onPress={() => completeMilestone(selectedMilestone.id)}
                    >
                      <Text style={styles.completeBtnText}>{t('Complete Milestone', 'Completar Hito')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressBarContainer: {
    width: '60%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  visionHeader: {
    alignItems: 'center',
    padding: 24,
  },
  pathTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  pathDesc: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  pillarTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillarEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  pillarName: {
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Map Styles
  nodeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    zIndex: 10,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginLeft: -24, // Center the node on the point (x is center)
    marginTop: -24,  // Center the node on the point (y is center)
  },
  nodeCard: {
    position: 'absolute',
    width: 140,
    padding: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 5,
  },
  cardLeft: {
    right: 35,
    top: -30,
  },
  cardRight: {
    left: 35,
    top: -30,
  },
  nodeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nodeDate: {
    fontSize: 10,
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Habits
  habitsSection: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  habitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitContent: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  habitSub: {
    fontSize: 12,
    marginTop: 2,
  },
  habitAction: {
    padding: 4,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CCC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalDesc: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  statusBox: {
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalFooter: {
    marginTop: 'auto',
  },
  completeBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LifePathDetailScreen;
