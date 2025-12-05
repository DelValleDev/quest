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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore, useAuthStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../../App';

const { width } = Dimensions.get('window');

// =====================================================
// TYPES
// =====================================================
interface CharacterClass {
  id: string;
  name: string;
  icon: string;
  description: string;
  primary_pillar: string;
  secondary_pillar: string | null;
  color: string;
}

// =====================================================
// CLASS DETAILS
// =====================================================
const CLASS_DETAILS: Record<string, {
  tagline: string;
  traits: string[];
  challenges: string[];
}> = {
  warrior: {
    tagline: 'Forge Your Body, Forge Your Will',
    traits: ['Disciplined', 'Strong', 'Resilient'],
    challenges: ['Daily workouts', 'Step goals', 'Nutrition tracking', 'Sleep optimization'],
  },
  sage: {
    tagline: 'Knowledge Is The Ultimate Power',
    traits: ['Curious', 'Focused', 'Analytical'],
    challenges: ['Reading goals', 'Learning sessions', 'Focus time', 'Skill building'],
  },
  connector: {
    tagline: 'Together We Rise',
    traits: ['Empathetic', 'Social', 'Supportive'],
    challenges: ['Social meetups', 'Acts of kindness', 'Family time', 'Community service'],
  },
  creator: {
    tagline: 'Bring Ideas To Life',
    traits: ['Creative', 'Innovative', 'Expressive'],
    challenges: ['Art projects', 'Writing sessions', 'Music practice', 'Creative exploration'],
  },
  achiever: {
    tagline: 'Success Leaves Clues',
    traits: ['Ambitious', 'Strategic', 'Driven'],
    challenges: ['Career goals', 'Skill development', 'Networking', 'Project milestones'],
  },
  monk: {
    tagline: 'Find Peace Within',
    traits: ['Mindful', 'Calm', 'Purposeful'],
    challenges: ['Meditation', 'Reflection', 'Gratitude practice', 'Nature connection'],
  },
};

const PILLAR_NAMES: Record<string, string> = {
  physical: 'Physical',
  mental: 'Mental',
  social: 'Social',
  professional: 'Professional',
  spiritual: 'Spiritual',
  creative: 'Creative',
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export const ClassSelectionScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { setIsOnboarded } = useAuthStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const isOnboarding = (route.params as any)?.onboarding ?? false;

  // State
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [classes, setClasses] = useState<CharacterClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [currentClass, setCurrentClass] = useState<string | null>(null);
  const [canChange, setCanChange] = useState(true);

  // =====================================================
  // DATA FETCHING
  // =====================================================
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all classes
      const { data: classesData } = await supabase.rpc('get_all_classes');
      if (classesData) {
        setClasses(classesData);
      }

      // Fetch user's current class
      const { data: classInfo } = await supabase.rpc('get_user_class_info', {
        p_user_id: user.id,
      });

      if (classInfo?.has_class) {
        setCurrentClass(classInfo.class.id);
        setSelectedClass(classInfo.class.id);
        setCanChange(classInfo.can_change);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // ACTIONS
  // =====================================================
  const confirmSelection = async () => {
    if (!selectedClass) {
      Alert.alert('Select a Class', 'Please choose your character class to continue.');
      return;
    }

    if (selectedClass === currentClass) {
      if (isOnboarding) {
        navigation.goBack();
      } else {
        Alert.alert('Same Class', 'This is already your current class.');
      }
      return;
    }

    Alert.alert(
      'Confirm Selection',
      `Are you sure you want to become ${getClassName(selectedClass)}?\n\n${currentClass ? 'You can only change once per month.' : 'This will be your starting class.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSelecting(true);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const { data, error } = await supabase.rpc('select_character_class', {
                p_user_id: user.id,
                p_class_id: selectedClass,
              });

              if (error) {
                Alert.alert('Error', error.message);
                return;
              }

              if (!data.success) {
                Alert.alert('Cannot Change', data.error);
                return;
              }

              const classData = classes.find(c => c.id === selectedClass);
              Alert.alert(
                `${classData?.icon} Welcome, ${classData?.name}!`,
                'Your journey begins now. Your challenges will be tailored to your path.',
                [
                  {
                    text: "Let's Go!",
                    onPress: () => {
                      if (isOnboarding) {
                        // Set onboarded to true - this will re-render App and show Main
                        setIsOnboarded(true);
                      } else {
                        navigation.goBack();
                      }
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error selecting class:', error);
              Alert.alert('Error', 'Failed to select class');
            } finally {
              setSelecting(false);
            }
          },
        },
      ]
    );
  };

  const getClassName = (classId: string) => {
    return classes.find(c => c.id === classId)?.name || classId;
  };

  // =====================================================
  // RENDER
  // =====================================================
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        {!isOnboarding && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: theme.text }]}>
          {currentClass ? 'Your Class' : 'Choose Your Path'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {currentClass 
            ? canChange ? 'You can change your class' : 'Class change available next month'
            : 'This determines your challenge focus'
          }
        </Text>
      </View>

      {/* Classes List */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {classes.map((characterClass) => {
          const details = CLASS_DETAILS[characterClass.id];
          const isSelected = selectedClass === characterClass.id;
          const isCurrent = currentClass === characterClass.id;

          return (
            <TouchableOpacity
              key={characterClass.id}
              style={[
                styles.classCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: isSelected ? characterClass.color : theme.border,
                  borderWidth: isSelected ? 3 : 1,
                },
              ]}
              onPress={() => setSelectedClass(characterClass.id)}
              disabled={!canChange && !isCurrent && currentClass !== null}
            >
              {/* Current Badge */}
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: characterClass.color }]}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}

              {/* Header */}
              <View style={styles.classHeader}>
                <View 
                  style={[
                    styles.classIconContainer, 
                    { backgroundColor: characterClass.color + '20' }
                  ]}
                >
                  <Text style={styles.classIcon}>{characterClass.icon}</Text>
                </View>
                <View style={styles.classInfo}>
                  <Text style={[styles.className, { color: theme.text }]}>
                    {characterClass.name}
                  </Text>
                  <Text style={[styles.classTagline, { color: characterClass.color }]}>
                    {details?.tagline}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.selectedCheck, { backgroundColor: characterClass.color }]}>
                    <Text style={styles.selectedCheckText}>✓</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              <Text style={[styles.classDescription, { color: theme.textSecondary }]}>
                {characterClass.description}
              </Text>

              {/* Focus Pillars */}
              <View style={styles.focusSection}>
                <Text style={[styles.focusLabel, { color: theme.textSecondary }]}>
                  Primary Focus:
                </Text>
                <View style={styles.focusTags}>
                  <View style={[styles.focusTag, { backgroundColor: characterClass.color + '20' }]}>
                    <Text style={[styles.focusTagText, { color: characterClass.color }]}>
                      {PILLAR_NAMES[characterClass.primary_pillar]} (+60%)
                    </Text>
                  </View>
                  {characterClass.secondary_pillar && (
                    <View style={[styles.focusTag, { backgroundColor: theme.border }]}>
                      <Text style={[styles.focusTagText, { color: theme.text }]}>
                        {PILLAR_NAMES[characterClass.secondary_pillar]} (+20%)
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Traits */}
              <View style={styles.traitsSection}>
                <Text style={[styles.traitsLabel, { color: theme.textSecondary }]}>
                  Traits:
                </Text>
                <View style={styles.traitsRow}>
                  {details?.traits.map((trait, index) => (
                    <View 
                      key={index} 
                      style={[styles.traitBadge, { backgroundColor: theme.background }]}
                    >
                      <Text style={[styles.traitText, { color: theme.text }]}>
                        {trait}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Sample Challenges */}
              {isSelected && details?.challenges && (
                <View style={styles.challengesSection}>
                  <Text style={[styles.challengesLabel, { color: theme.textSecondary }]}>
                    Sample Challenges:
                  </Text>
                  {details.challenges.map((challenge, index) => (
                    <View key={index} style={styles.challengeItem}>
                      <Text style={[styles.challengeBullet, { color: characterClass.color }]}>
                        •
                      </Text>
                      <Text style={[styles.challengeText, { color: theme.text }]}>
                        {challenge}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Bonus */}
              <View style={[styles.bonusSection, { backgroundColor: characterClass.color + '10' }]}>
                <Text style={[styles.bonusText, { color: characterClass.color }]}>
                  ⭐ +15% XP for {PILLAR_NAMES[characterClass.primary_pillar]} challenges
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            {
              backgroundColor: selectedClass 
                ? classes.find(c => c.id === selectedClass)?.color || theme.primary
                : theme.border,
            },
          ]}
          onPress={confirmSelection}
          disabled={!selectedClass || selecting || (!canChange && selectedClass !== currentClass)}
        >
          {selecting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {currentClass && selectedClass === currentClass
                ? 'Continue as ' + getClassName(selectedClass)
                : selectedClass
                  ? 'Become ' + getClassName(selectedClass)
                  : 'Select a Class'
              }
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  classCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  currentBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  currentBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  classIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  classIcon: {
    fontSize: 32,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 20,
    fontWeight: '700',
  },
  classTagline: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  selectedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  classDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  focusSection: {
    marginBottom: 12,
  },
  focusLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  focusTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  focusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  focusTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  traitsSection: {
    marginBottom: 12,
  },
  traitsLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  traitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  traitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  challengesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  challengesLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  challengeBullet: {
    fontSize: 16,
    marginRight: 8,
  },
  challengeText: {
    fontSize: 13,
  },
  bonusSection: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  bonusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
