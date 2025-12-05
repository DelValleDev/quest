import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { PaywallModal } from '../../components';
import { PremiumService } from '../../lib/premium';
import type { RootStackParamList } from '../../../App';

// =====================================================
// TYPES
// =====================================================
interface Raid {
  raid_id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  target_unit: string;
  xp_reward: number;
  coin_reward: number;
  status: string;
  started_at: string;
  ends_at: string;
  my_progress: number;
  my_status: string;
  total_participants: number;
  completed_participants: number;
  creator_username: string;
  creator_display_name: string;
}

interface RaidTemplate {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  target_unit: string;
  xp_reward: number;
  duration_hours: number;
  pillar_id: string | null;
  icon: string;
}

interface Friend {
  id: string;
  friend_id: string;
  username: string;
  display_name: string;
  level: number;
}

interface RaidParticipant {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  status: string;
  current_progress: number;
  completed_at: string | null;
}

// =====================================================
// CONSTANTS
// =====================================================
const CHALLENGE_ICONS: Record<string, string> = {
  walking: '🚶',
  running: '🏃',
  workout: '💪',
  stretching: '🧘',
  steps: '👟',
  reading: '📚',
  focus: '🎯',
  learning: '🧠',
  puzzles: '🧩',
  journaling: '📝',
  social: '👋',
  gratitude: '🙏',
  compliments: '💬',
  tasks: '✅',
  emails: '📧',
  study: '📖',
  meditation: '🧘‍♂️',
  reflection: '✨',
  mindfulness: '🌿',
  art: '🎨',
  writing: '✍️',
  music: '🎵',
  hydration: '💧',
  digital_detox: '📵',
  cleaning: '🧹',
  custom: '⚡',
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export const RaidsScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'available' | 'history'>('active');
  const [myRaids, setMyRaids] = useState<Raid[]>([]);
  const [availableRaids, setAvailableRaids] = useState<Raid[]>([]);
  const [templates, setTemplates] = useState<RaidTemplate[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRaid, setSelectedRaid] = useState<Raid | null>(null);
  const [raidParticipants, setRaidParticipants] = useState<RaidParticipant[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<RaidTemplate | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  
  // Premium state
  const [isPremium, setIsPremium] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  // =====================================================
  // DATA FETCHING
  // =====================================================
  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Check premium status
      const premiumStatus = await PremiumService.isPremium(user.id);
      setIsPremium(premiumStatus);
      if (!user) return;

      // Fetch my raids
      const { data: myRaidsData, error: raidsError } = await supabase
        .rpc('get_user_raids', { p_user_id: user.id });

      if (!raidsError && myRaidsData) {
        setMyRaids(myRaidsData);
      }

      // Fetch available raids from friends
      const { data: availableData, error: availError } = await supabase
        .rpc('get_available_raids', { p_user_id: user.id });

      if (!availError && availableData) {
        setAvailableRaids(availableData);
      }

      // Fetch templates
      const { data: templatesData } = await supabase
        .from('raid_templates')
        .select('*')
        .eq('is_active', true);

      if (templatesData) {
        setTemplates(templatesData);
      }

      // Fetch friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select(`
          id,
          friend_id,
          profiles:friend_id (
            username,
            display_name,
            level
          )
        `)
        .eq('user_id', user.id);

      if (friendsData) {
        const mapped = friendsData.map((f: any) => ({
          id: f.id,
          friend_id: f.friend_id,
          username: f.profiles?.username || 'Unknown',
          display_name: f.profiles?.display_name || f.profiles?.username || 'Unknown',
          level: f.profiles?.level || 1,
        }));
        setFriends(mapped);
      }
    } catch (error) {
      console.error('Error fetching raids:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // =====================================================
  // ACTIONS
  // =====================================================
  const handleCreatePress = () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    setShowCreateModal(true);
  };

  const createRaid = async () => {
    if (!selectedTemplate) return;
    if (selectedFriends.length < 2) {
      Alert.alert('Need More Friends', 'Select at least 2 friends to start a raid!');
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('create_raid_from_template', {
        p_creator_id: user.id,
        p_template_id: selectedTemplate.id,
        p_friend_ids: selectedFriends,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        '⚔️ Raid Started!',
        `${selectedTemplate.title} has begun! Rally your friends!`,
        [{ text: 'Let\'s Go!', onPress: () => {
          setShowCreateModal(false);
          setSelectedTemplate(null);
          setSelectedFriends([]);
          fetchData();
        }}]
      );
    } catch (error) {
      console.error('Error creating raid:', error);
      Alert.alert('Error', 'Failed to create raid');
    } finally {
      setCreating(false);
    }
  };

  const joinRaid = async (raidId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('join_raid', {
        p_user_id: user.id,
        p_raid_id: raidId,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('⚔️ Joined!', 'You joined the raid!');
      fetchData();
    } catch (error) {
      console.error('Error joining raid:', error);
    }
  };

  const updateProgress = async (raid: Raid, progress: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('update_raid_progress', {
        p_user_id: user.id,
        p_raid_id: raid.raid_id,
        p_progress: progress,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (data?.completed) {
        Alert.alert('🎉 Completed!', 'You finished your part of the raid!');
      }

      fetchData();
      if (showDetailModal) {
        fetchRaidDetails(raid.raid_id);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const fetchRaidDetails = async (raidId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_raid_participants', {
        p_raid_id: raidId,
      });

      if (!error && data) {
        setRaidParticipants(data);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const showRaidDetail = (raid: Raid) => {
    setSelectedRaid(raid);
    fetchRaidDetails(raid.raid_id);
    setShowDetailModal(true);
  };

  const promptProgress = (raid: Raid) => {
    Alert.prompt(
      'Update Progress',
      `Enter your current progress (${raid.target_unit}):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: (value: string | undefined) => {
            const progress = parseInt(value || '0');
            if (progress >= 0) {
              updateProgress(raid, progress);
            }
          },
        },
      ],
      'plain-text',
      String(raid.my_progress)
    );
  };

  // =====================================================
  // HELPERS
  // =====================================================
  const getTimeRemaining = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'completed': return '#3B82F6';
      case 'failed': return '#EF4444';
      default: return theme.textSecondary;
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================
  const renderActiveRaids = () => {
    const activeRaids = myRaids.filter(r => r.status === 'active');
    
    if (activeRaids.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚔️</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Active Raids</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Create a raid or check available ones from friends!
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.primary }]}
            onPress={handleCreatePress}
          >
            <Text style={styles.createButtonText}>⚔️ Start a Raid {!isPremium && '👑'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.raidsList}>
        {activeRaids.map(raid => (
          <TouchableOpacity
            key={raid.raid_id}
            style={[styles.raidCard, { backgroundColor: theme.surface }]}
            onPress={() => showRaidDetail(raid)}
          >
            <View style={styles.raidHeader}>
              <Text style={styles.raidIcon}>
                {CHALLENGE_ICONS[raid.challenge_type] || '⚡'}
              </Text>
              <View style={styles.raidInfo}>
                <Text style={[styles.raidTitle, { color: theme.text }]}>
                  {raid.title}
                </Text>
                <Text style={[styles.raidCreator, { color: theme.textSecondary }]}>
                  by {raid.creator_display_name}
                </Text>
              </View>
              <View style={[styles.timeBadge, { backgroundColor: '#F59E0B20' }]}>
                <Text style={[styles.timeText, { color: '#F59E0B' }]}>
                  {getTimeRemaining(raid.ends_at)}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                  Your Progress
                </Text>
                <Text style={[styles.progressValue, { color: theme.text }]}>
                  {raid.my_progress}/{raid.target_value} {raid.target_unit}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((raid.my_progress / raid.target_value) * 100, 100)}%`,
                      backgroundColor: raid.my_status === 'completed' ? '#22C55E' : theme.primary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Team Progress */}
            <View style={styles.teamProgress}>
              <Text style={[styles.teamLabel, { color: theme.textSecondary }]}>
                Team: {raid.completed_participants}/{raid.total_participants} completed
              </Text>
              <View style={styles.participantDots}>
                {Array(raid.total_participants).fill(0).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.participantDot,
                      {
                        backgroundColor: i < raid.completed_participants 
                          ? '#22C55E' 
                          : theme.border,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Actions */}
            {raid.my_status !== 'completed' && (
              <TouchableOpacity
                style={[styles.updateButton, { backgroundColor: theme.primary }]}
                onPress={() => promptProgress(raid)}
              >
                <Text style={styles.updateButtonText}>📊 Update Progress</Text>
              </TouchableOpacity>
            )}

            {/* Rewards */}
            <View style={styles.rewardsRow}>
              <Text style={styles.reward}>+{raid.xp_reward} XP</Text>
              <Text style={styles.reward}>+{raid.coin_reward} 🪙</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderAvailableRaids = () => {
    if (availableRaids.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Available Raids</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Your friends haven't started any raids yet.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.raidsList}>
        {availableRaids.map((raid: any) => (
          <View
            key={raid.raid_id}
            style={[styles.raidCard, { backgroundColor: theme.surface }]}
          >
            <View style={styles.raidHeader}>
              <Text style={styles.raidIcon}>
                {CHALLENGE_ICONS[raid.challenge_type] || '⚡'}
              </Text>
              <View style={styles.raidInfo}>
                <Text style={[styles.raidTitle, { color: theme.text }]}>
                  {raid.title}
                </Text>
                <Text style={[styles.raidCreator, { color: theme.textSecondary }]}>
                  by {raid.creator_username} • {raid.current_participants} joined
                </Text>
              </View>
              <View style={[styles.timeBadge, { backgroundColor: '#22C55E20' }]}>
                <Text style={[styles.timeText, { color: '#22C55E' }]}>
                  {getTimeRemaining(raid.ends_at)}
                </Text>
              </View>
            </View>

            <Text style={[styles.raidDescription, { color: theme.textSecondary }]}>
              {raid.description}
            </Text>

            <View style={styles.raidMeta}>
              <Text style={[styles.metaText, { color: theme.text }]}>
                🎯 {raid.target_value} {raid.target_unit}
              </Text>
              <Text style={[styles.metaText, { color: theme.text }]}>
                ⭐ +{raid.xp_reward} XP
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.joinButton, { backgroundColor: '#22C55E' }]}
              onPress={() => joinRaid(raid.raid_id)}
            >
              <Text style={styles.joinButtonText}>⚔️ Join Raid</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderHistory = () => {
    const completedRaids = myRaids.filter(r => r.status !== 'active');

    if (completedRaids.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Raid History</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Complete some raids to see your history!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.raidsList}>
        {completedRaids.map(raid => (
          <View
            key={raid.raid_id}
            style={[
              styles.raidCard,
              styles.historyCard,
              { backgroundColor: theme.surface },
            ]}
          >
            <View style={styles.raidHeader}>
              <Text style={styles.raidIcon}>
                {CHALLENGE_ICONS[raid.challenge_type] || '⚡'}
              </Text>
              <View style={styles.raidInfo}>
                <Text style={[styles.raidTitle, { color: theme.text }]}>
                  {raid.title}
                </Text>
                <Text style={[styles.raidCreator, { color: theme.textSecondary }]}>
                  {raid.completed_participants}/{raid.total_participants} completed
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(raid.status) + '20' },
                ]}
              >
                <Text style={[styles.statusText, { color: getStatusColor(raid.status) }]}>
                  {raid.status === 'completed' ? '✓ Success' : '✗ Failed'}
                </Text>
              </View>
            </View>

            <View style={styles.historyMeta}>
              <Text style={[styles.historyReward, { color: theme.textSecondary }]}>
                {raid.my_status === 'completed' ? `+${raid.xp_reward} XP earned` : 'No reward'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCreateModal(false)}>
            <Text style={[styles.modalClose, { color: theme.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Start a Raid</Text>
          <TouchableOpacity
            onPress={createRaid}
            disabled={!selectedTemplate || selectedFriends.length < 2 || creating}
          >
            <Text
              style={[
                styles.modalAction,
                {
                  color: selectedTemplate && selectedFriends.length >= 2
                    ? theme.primary
                    : theme.textSecondary,
                },
              ]}
            >
              {creating ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Select Template */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Choose a Challenge
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.templatesScroll}
          >
            {templates.map(template => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: selectedTemplate?.id === template.id
                      ? theme.primary
                      : theme.border,
                    borderWidth: selectedTemplate?.id === template.id ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedTemplate(template)}
              >
                <Text style={styles.templateIcon}>{template.icon}</Text>
                <Text style={[styles.templateTitle, { color: theme.text }]}>
                  {template.title}
                </Text>
                <Text style={[styles.templateMeta, { color: theme.textSecondary }]}>
                  {template.target_value} {template.target_unit} • {template.duration_hours}h
                </Text>
                <Text style={[styles.templateXp, { color: '#22C55E' }]}>
                  +{template.xp_reward} XP
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Select Friends */}
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>
            Invite Friends ({selectedFriends.length} selected)
          </Text>
          <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
            Select at least 2 friends to start a raid
          </Text>

          {friends.length === 0 ? (
            <View style={styles.noFriendsBox}>
              <Text style={[styles.noFriendsText, { color: theme.textSecondary }]}>
                Add friends first to start raids!
              </Text>
            </View>
          ) : (
            <View style={styles.friendsList}>
              {friends.map(friend => (
                <TouchableOpacity
                  key={friend.friend_id}
                  style={[
                    styles.friendItem,
                    {
                      backgroundColor: theme.surface,
                      borderColor: selectedFriends.includes(friend.friend_id)
                        ? theme.primary
                        : theme.border,
                      borderWidth: selectedFriends.includes(friend.friend_id) ? 2 : 1,
                    },
                  ]}
                  onPress={() => toggleFriendSelection(friend.friend_id)}
                >
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>
                      {friend.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: theme.text }]}>
                      {friend.display_name}
                    </Text>
                    <Text style={[styles.friendLevel, { color: theme.textSecondary }]}>
                      Level {friend.level}
                    </Text>
                  </View>
                  {selectedFriends.includes(friend.friend_id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!selectedRaid) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Text style={[styles.modalClose, { color: theme.primary }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Raid Details</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Raid Info */}
            <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailIcon}>
                  {CHALLENGE_ICONS[selectedRaid.challenge_type] || '⚡'}
                </Text>
                <View>
                  <Text style={[styles.detailTitle, { color: theme.text }]}>
                    {selectedRaid.title}
                  </Text>
                  <Text style={[styles.detailCreator, { color: theme.textSecondary }]}>
                    Created by {selectedRaid.creator_display_name}
                  </Text>
                </View>
              </View>

              {selectedRaid.description && (
                <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
                  {selectedRaid.description}
                </Text>
              )}

              <View style={styles.detailStats}>
                <View style={styles.detailStat}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    🎯 {selectedRaid.target_value}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                    {selectedRaid.target_unit}
                  </Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    ⭐ {selectedRaid.xp_reward}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>XP</Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    ⏱️ {getTimeRemaining(selectedRaid.ends_at)}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                    remaining
                  </Text>
                </View>
              </View>
            </View>

            {/* Participants */}
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>
              Participants ({raidParticipants.length})
            </Text>

            {raidParticipants.map(participant => (
              <View
                key={participant.user_id}
                style={[styles.participantCard, { backgroundColor: theme.surface }]}
              >
                <View style={styles.participantInfo}>
                  <View style={styles.participantAvatar}>
                    <Text style={styles.participantAvatarText}>
                      {participant.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.participantName, { color: theme.text }]}>
                      {participant.display_name}
                    </Text>
                    <Text style={[styles.participantProgress, { color: theme.textSecondary }]}>
                      {participant.current_progress}/{selectedRaid.target_value}{' '}
                      {selectedRaid.target_unit}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.participantStatus,
                    {
                      backgroundColor:
                        participant.status === 'completed' ? '#22C55E20' : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.participantStatusText,
                      {
                        color:
                          participant.status === 'completed' ? '#22C55E' : theme.textSecondary,
                      },
                    ]}
                  >
                    {participant.status === 'completed' ? '✓ Done' : 'In Progress'}
                  </Text>
                </View>
              </View>
            ))}

            {/* Update Progress Button */}
            {selectedRaid.my_status !== 'completed' && selectedRaid.status === 'active' && (
              <TouchableOpacity
                style={[styles.bigUpdateButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowDetailModal(false);
                  promptProgress(selectedRaid);
                }}
              >
                <Text style={styles.bigUpdateButtonText}>📊 Update My Progress</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // =====================================================
  // MAIN RENDER
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>⚔️ Raids</Text>
        <TouchableOpacity
          style={[styles.newRaidButton, { backgroundColor: theme.primary }]}
          onPress={handleCreatePress}
        >
          <Text style={styles.newRaidButtonText}>+ New {!isPremium && '👑'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.surface }]}>
        {(['active', 'available', 'history'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: theme.primary },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? '#FFF' : theme.textSecondary },
              ]}
            >
              {tab === 'active' ? 'Active' : tab === 'available' ? 'Join' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'active' && renderActiveRaids()}
        {activeTab === 'available' && renderAvailableRaids()}
        {activeTab === 'history' && renderHistory()}
      </ScrollView>

      {/* Modals */}
      {renderCreateModal()}
      {renderDetailModal()}
      
      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureId="RAIDS"
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  newRaidButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newRaidButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  raidsList: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 100,
  },
  raidCard: {
    borderRadius: 16,
    padding: 16,
  },
  historyCard: {
    opacity: 0.8,
  },
  raidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  raidIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  raidInfo: {
    flex: 1,
  },
  raidTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  raidCreator: {
    fontSize: 13,
    marginTop: 2,
  },
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  teamProgress: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 13,
  },
  participantDots: {
    flexDirection: 'row',
    gap: 4,
  },
  participantDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  updateButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  reward: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  raidDescription: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  raidMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  metaText: {
    fontSize: 14,
  },
  joinButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  historyMeta: {
    marginTop: 8,
  },
  historyReward: {
    fontSize: 13,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalClose: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalAction: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: -8,
  },
  templatesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  templateCard: {
    width: 150,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
  },
  templateIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  templateMeta: {
    fontSize: 11,
    textAlign: 'center',
  },
  templateXp: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  noFriendsBox: {
    padding: 24,
    alignItems: 'center',
  },
  noFriendsText: {
    fontSize: 14,
  },
  friendsList: {
    gap: 8,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
  },
  friendLevel: {
    fontSize: 13,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: '#22C55E',
    fontWeight: 'bold',
  },

  // Detail modal
  detailCard: {
    borderRadius: 16,
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailCreator: {
    fontSize: 14,
    marginTop: 4,
  },
  detailDescription: {
    fontSize: 14,
    marginTop: 16,
    lineHeight: 20,
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  detailStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  participantName: {
    fontSize: 15,
    fontWeight: '500',
  },
  participantProgress: {
    fontSize: 12,
    marginTop: 2,
  },
  participantStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bigUpdateButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bigUpdateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
