import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Profile {
  id: string;
  display_name: string;
  level: number;
}

interface Duel {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  stake_type: string;
  stake_amount: number;
  starts_at: string;
  ends_at: string;
  is_challenger: boolean;
  challenger: Profile;
  opponent: Profile;
  my_progress: { value: number; notes: any[] };
  opponent_progress: { value: number; notes: any[] };
  winner_id: string | null;
}

interface Friend {
  id: string;
  display_name: string;
  level: number;
}

export const DuelsScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);

  const [duels, setDuels] = useState<Duel[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'active' | 'pending' | 'completed'>('active');

  // Create duel form
  const [duelTitle, setDuelTitle] = useState('');
  const [duelDescription, setDuelDescription] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState<Friend | null>(null);
  const [stakeType, setStakeType] = useState<'honor' | 'coins'>('honor');
  const [stakeAmount, setStakeAmount] = useState('0');
  const [durationDays, setDurationDays] = useState('7');

  const fetchDuels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_duels', { p_user_id: user.id });
      
      if (error) {
        console.error('Error fetching duels:', error);
        // Fallback direct query
        const { data: directData } = await supabase
          .from('challenge_duels')
          .select(`
            *,
            challenger:profiles!challenger_id(id, display_name, level),
            opponent:profiles!opponent_id(id, display_name, level)
          `)
          .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
          .order('created_at', { ascending: false });
        
        if (directData) {
          const transformed = directData.map((d: any) => ({
            ...d,
            is_challenger: d.challenger_id === user.id,
            my_progress: d.challenger_id === user.id ? d.challenger_progress : d.opponent_progress,
            opponent_progress: d.challenger_id === user.id ? d.opponent_progress : d.challenger_progress,
          }));
          setDuels(transformed);
        }
      } else {
        setDuels(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('friends')
        .select(`
          friend:profiles!friend_id(id, display_name, level)
        `)
        .eq('user_id', user.id);

      if (data) {
        const friendsList = data
          .map((f: any) => f.friend)
          .filter((f: any) => f);
        setFriends(friendsList);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDuels();
      fetchFriends();
    }, [])
  );

  const createDuel = async () => {
    if (!duelTitle.trim() || !selectedOpponent) {
      Alert.alert('Error', 'Please enter a title and select an opponent');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('create_duel', {
        p_challenger_id: user.id,
        p_opponent_id: selectedOpponent.id,
        p_title: duelTitle.trim(),
        p_description: duelDescription.trim() || null,
        p_stake_type: stakeType,
        p_stake_amount: stakeType === 'coins' ? parseInt(stakeAmount) || 0 : 0,
        p_duration_days: parseInt(durationDays) || 7,
      });

      if (error) throw error;

      Alert.alert('Challenge Sent! ⚔️', `${selectedOpponent.display_name} has been challenged!`);
      setShowCreateModal(false);
      resetForm();
      fetchDuels();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create duel');
    }
  };

  const respondToDuel = async (duel: Duel, accept: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('respond_to_duel', {
        p_duel_id: duel.id,
        p_user_id: user.id,
        p_accept: accept,
      });

      if (error) throw error;
      
      if (data.success) {
        Alert.alert(accept ? 'Duel Accepted! ⚔️' : 'Duel Declined', data.message);
        fetchDuels();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const updateProgress = async (duel: Duel) => {
    Alert.prompt(
      'Update Progress',
      'Enter your current progress:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (value: string | undefined) => {
            const progress = parseInt(value || '0');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.rpc('update_duel_progress', {
              p_duel_id: duel.id,
              p_user_id: user.id,
              p_progress_value: progress,
            });

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              fetchDuels();
            }
          },
        },
      ],
      'plain-text',
      String(duel.my_progress?.value || 0)
    );
  };

  const resetForm = () => {
    setDuelTitle('');
    setDuelDescription('');
    setSelectedOpponent(null);
    setStakeType('honor');
    setStakeAmount('0');
    setDurationDays('7');
  };

  const filteredDuels = duels.filter((d) => {
    if (selectedTab === 'active') return d.status === 'active';
    if (selectedTab === 'pending') return d.status === 'pending';
    return d.status === 'completed' || d.status === 'cancelled';
  });

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>⚔️ Duels</Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ Challenge</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['active', 'pending', 'completed'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && { backgroundColor: theme.primary },
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: selectedTab === tab ? '#FFF' : theme.textSecondary },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Duels List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDuels} />}
      >
        {filteredDuels.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <Text style={styles.emptyEmoji}>⚔️</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No {selectedTab} duels
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {selectedTab === 'active' 
                ? 'Challenge a friend to start a duel!'
                : selectedTab === 'pending'
                ? 'No pending challenges'
                : 'Completed duels will appear here'}
            </Text>
          </View>
        ) : (
          filteredDuels.map((duel) => (
            <View
              key={duel.id}
              style={[styles.duelCard, { backgroundColor: theme.surface }]}
            >
              {/* Header */}
              <View style={styles.duelHeader}>
                <Text style={[styles.duelTitle, { color: theme.text }]}>
                  {duel.title}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: duel.status === 'active' ? '#22C55E20' : theme.border }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: duel.status === 'active' ? '#22C55E' : theme.textSecondary }
                  ]}>
                    {duel.status}
                  </Text>
                </View>
              </View>

              {/* Participants */}
              <View style={styles.participants}>
                <View style={styles.participant}>
                  <Text style={styles.participantEmoji}>
                    {duel.is_challenger ? '👤' : '👥'}
                  </Text>
                  <Text style={[styles.participantName, { color: theme.text }]}>
                    {duel.is_challenger ? 'You' : duel.challenger.display_name}
                  </Text>
                  <Text style={[styles.participantScore, { color: theme.primary }]}>
                    {duel.is_challenger ? duel.my_progress?.value || 0 : duel.opponent_progress?.value || 0}
                  </Text>
                </View>

                <Text style={[styles.vsText, { color: theme.textMuted }]}>VS</Text>

                <View style={styles.participant}>
                  <Text style={styles.participantEmoji}>
                    {!duel.is_challenger ? '👤' : '👥'}
                  </Text>
                  <Text style={[styles.participantName, { color: theme.text }]}>
                    {!duel.is_challenger ? 'You' : duel.opponent.display_name}
                  </Text>
                  <Text style={[styles.participantScore, { color: theme.primary }]}>
                    {!duel.is_challenger ? duel.my_progress?.value || 0 : duel.opponent_progress?.value || 0}
                  </Text>
                </View>
              </View>

              {/* Stakes & Time */}
              <View style={styles.duelMeta}>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Stake</Text>
                  <Text style={[styles.metaValue, { color: theme.text }]}>
                    {duel.stake_type === 'coins' ? `${duel.stake_amount} 🪙` : '🏅 Honor'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Time</Text>
                  <Text style={[styles.metaValue, { color: theme.text }]}>
                    {getTimeRemaining(duel.ends_at)}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              {duel.status === 'pending' && !duel.is_challenger && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => respondToDuel(duel, true)}
                  >
                    <Text style={styles.actionButtonText}>Accept ⚔️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={() => respondToDuel(duel, false)}
                  >
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}

              {duel.status === 'active' && (
                <TouchableOpacity
                  style={[styles.updateButton, { backgroundColor: theme.primary }]}
                  onPress={() => updateProgress(duel)}
                >
                  <Text style={styles.updateButtonText}>Update Progress 📊</Text>
                </TouchableOpacity>
              )}

              {duel.status === 'completed' && duel.winner_id && (
                <View style={[styles.resultBanner, { 
                  backgroundColor: duel.winner_id === (duel.is_challenger ? duel.challenger.id : duel.opponent.id) 
                    ? '#22C55E20' : '#EF444420' 
                }]}>
                  <Text style={[styles.resultText, {
                    color: duel.winner_id === (duel.is_challenger ? duel.challenger.id : duel.opponent.id) 
                      ? '#22C55E' : '#EF4444'
                  }]}>
                    {duel.winner_id === (duel.is_challenger ? duel.challenger.id : duel.opponent.id) 
                      ? '🏆 Victory!' : '😔 Defeat'}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Duel Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              ⚔️ Create Challenge
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Challenge Title"
              placeholderTextColor={theme.textMuted}
              value={duelTitle}
              onChangeText={setDuelTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textMuted}
              value={duelDescription}
              onChangeText={setDuelDescription}
              multiline
            />

            {/* Opponent Selection */}
            <Text style={[styles.label, { color: theme.text }]}>Select Opponent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendsScroll}>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[
                    styles.friendChip,
                    { backgroundColor: theme.background },
                    selectedOpponent?.id === friend.id && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setSelectedOpponent(friend)}
                >
                  <Text style={[
                    styles.friendChipText,
                    { color: selectedOpponent?.id === friend.id ? '#FFF' : theme.text }
                  ]}>
                    {friend.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
              {friends.length === 0 && (
                <Text style={[styles.noFriends, { color: theme.textMuted }]}>
                  Add friends to challenge them!
                </Text>
              )}
            </ScrollView>

            {/* Stake Type */}
            <Text style={[styles.label, { color: theme.text }]}>Stake Type</Text>
            <View style={styles.stakeOptions}>
              <TouchableOpacity
                style={[
                  styles.stakeOption,
                  { backgroundColor: theme.background },
                  stakeType === 'honor' && { backgroundColor: theme.primary },
                ]}
                onPress={() => setStakeType('honor')}
              >
                <Text style={[styles.stakeOptionText, { color: stakeType === 'honor' ? '#FFF' : theme.text }]}>
                  🏅 Honor
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.stakeOption,
                  { backgroundColor: theme.background },
                  stakeType === 'coins' && { backgroundColor: theme.primary },
                ]}
                onPress={() => setStakeType('coins')}
              >
                <Text style={[styles.stakeOptionText, { color: stakeType === 'coins' ? '#FFF' : theme.text }]}>
                  🪙 Coins
                </Text>
              </TouchableOpacity>
            </View>

            {stakeType === 'coins' && (
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="Amount to stake"
                placeholderTextColor={theme.textMuted}
                value={stakeAmount}
                onChangeText={setStakeAmount}
                keyboardType="numeric"
              />
            )}

            {/* Duration */}
            <Text style={[styles.label, { color: theme.text }]}>Duration (days)</Text>
            <View style={styles.durationOptions}>
              {['3', '7', '14', '30'].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.durationOption,
                    { backgroundColor: theme.background },
                    durationDays === days && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setDurationDays(days)}
                >
                  <Text style={[styles.durationText, { color: durationDays === days ? '#FFF' : theme.text }]}>
                    {days}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.border }]}
                onPress={() => { setShowCreateModal(false); resetForm(); }}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={createDuel}
              >
                <Text style={styles.modalButtonText}>Challenge! ⚔️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabText: {
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
  },
  duelCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  duelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  duelTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  participant: {
    alignItems: 'center',
    flex: 1,
  },
  participantEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  participantName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  participantScore: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 16,
  },
  duelMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metaValue: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#22C55E',
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  updateButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  resultBanner: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  friendsScroll: {
    marginBottom: 12,
  },
  friendChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  friendChipText: {
    fontWeight: '500',
  },
  noFriends: {
    padding: 10,
  },
  stakeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  stakeOption: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  stakeOptionText: {
    fontWeight: '600',
  },
  durationOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  durationOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  durationText: {
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default DuelsScreen;
