import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useAuthStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

// =====================================================
// TYPES
// =====================================================
interface Friend {
  id: string;
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  level: number;
  total_xp: number;
  current_streak: number;
  created_at: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  level: number;
  message?: string;
  created_at: string;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  level: number;
  total_xp: number;
  current_streak: number;
  challenges_completed: number;
  rank_xp: number;
  rank_streak: number;
  rank_challenges: number;
}

interface Guild {
  id: string;
  name: string;
  description: string;
  icon: string;
  banner_color: string;
  member_count: number;
  max_members: number;
  total_xp: number;
  is_public: boolean;
  min_level: number;
  owner_id: string;
}

// =====================================================
// TABS
// =====================================================
const SOCIAL_TABS = [
  { id: 'friends', label: 'Friends', icon: '👥' },
  { id: 'leaderboard', label: 'Rankings', icon: '🏆' },
  { id: 'guilds', label: 'Guilds', icon: '⚔️' },
];

const LEADERBOARD_FILTERS = [
  { id: 'xp', label: 'XP', icon: '⭐' },
  { id: 'streak', label: 'Streak', icon: '🔥' },
  { id: 'challenges', label: 'Challenges', icon: '🎯' },
];

// =====================================================
// MAIN COMPONENT
// =====================================================
export const SocialScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  // Tab state
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardFilter, setLeaderboardFilter] = useState('xp');
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  // Guilds state
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [showCreateGuildModal, setShowCreateGuildModal] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDesc, setNewGuildDesc] = useState('');
  const [newGuildIcon, setNewGuildIcon] = useState('⚔️');

  // =====================================================
  // DATA FETCHING
  // =====================================================
  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      // Get friends with profile data
      const { data: friendsData, error } = await supabase
        .from('friends')
        .select(`
          id,
          friend_id,
          created_at,
          profiles:friend_id (
            username,
            display_name,
            avatar_url,
            level,
            total_xp,
            current_streak
          )
        `)
        .eq('user_id', user.id);

      if (!error && friendsData) {
        const mapped = friendsData.map((f: any) => ({
          id: f.id,
          friend_id: f.friend_id,
          username: f.profiles?.username || 'Unknown',
          display_name: f.profiles?.display_name || f.profiles?.username || 'Unknown',
          avatar_url: f.profiles?.avatar_url || '',
          level: f.profiles?.level || 1,
          total_xp: f.profiles?.total_xp || 0,
          current_streak: f.profiles?.current_streak || 0,
          created_at: f.created_at,
        }));
        setFriends(mapped);
      }

      // Get pending friend requests
      const { data: requests, error: reqError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          message,
          created_at,
          profiles:sender_id (
            username,
            display_name,
            avatar_url,
            level
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (!reqError && requests) {
        const mapped = requests.map((r: any) => ({
          id: r.id,
          sender_id: r.sender_id,
          username: r.profiles?.username || 'Unknown',
          display_name: r.profiles?.display_name || r.profiles?.username || 'Unknown',
          avatar_url: r.profiles?.avatar_url || '',
          level: r.profiles?.level || 1,
          message: r.message,
          created_at: r.created_at,
        }));
        setFriendRequests(mapped);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leaderboard_global')
        .select('*')
        .limit(100);

      if (!error && data) {
        // Sort based on filter
        const sorted = [...data].sort((a, b) => {
          if (leaderboardFilter === 'xp') return a.rank_xp - b.rank_xp;
          if (leaderboardFilter === 'streak') return a.rank_streak - b.rank_streak;
          return a.rank_challenges - b.rank_challenges;
        });
        setLeaderboard(sorted);

        // Find user's position
        const userEntry = data.find((e) => e.id === user.id);
        setUserRank(userEntry || null);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  }, [user, leaderboardFilter]);

  const fetchGuilds = useCallback(async () => {
    if (!user) return;

    try {
      // Check if user is in a guild
      const { data: membership, error: memError } = await supabase
        .from('guild_members')
        .select('guild_id')
        .eq('user_id', user.id)
        .single();

      if (!memError && membership) {
        const { data: guild } = await supabase
          .from('guilds')
          .select('*')
          .eq('id', membership.guild_id)
          .single();
        setMyGuild(guild || null);
      } else {
        setMyGuild(null);
      }

      // Fetch public guilds
      const { data: publicGuilds, error: guildsError } = await supabase
        .from('guilds')
        .select('*')
        .eq('is_public', true)
        .order('total_xp', { ascending: false })
        .limit(50);

      if (!guildsError && publicGuilds) {
        setGuilds(publicGuilds);
      }
    } catch (err) {
      console.error('Error fetching guilds:', err);
    }
  }, [user]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchFriends(), fetchLeaderboard(), fetchGuilds()]);
    setLoading(false);
  }, [fetchFriends, fetchLeaderboard, fetchGuilds]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  // =====================================================
  // ACTIONS
  // =====================================================
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, level')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id)
        .limit(10);

      if (!error && data) {
        // Filter out existing friends
        const friendIds = friends.map((f) => f.friend_id);
        const filtered = data.filter((u) => !friendIds.includes(u.id));
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    }
    setSearching(false);
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('send_friend_request', {
        p_sender_id: user.id,
        p_receiver_id: receiverId,
      });

      if (error) throw error;

      if (data?.success) {
        Alert.alert('Success', data.message);
        setSearchResults([]);
        setSearchQuery('');
        fetchFriends();
      } else {
        Alert.alert('Error', data?.error || 'Failed to send request');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        p_user_id: user.id,
        p_request_id: requestId,
      });

      if (error) throw error;

      if (data?.success) {
        Alert.alert('Success', 'Friend request accepted!');
        fetchFriends();
      } else {
        Alert.alert('Error', data?.error || 'Failed to accept');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const rejectRequest = async (requestId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('reject_friend_request', {
        p_user_id: user.id,
        p_request_id: requestId,
      });

      if (error) throw error;

      if (data?.success) {
        fetchFriends();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const removeFriend = async (friendId: string, friendName: string) => {
    if (!user) return;

    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('remove_friend', {
                p_user_id: user.id,
                p_friend_id: friendId,
              });

              if (!error) {
                fetchFriends();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const createGuild = async () => {
    if (!user) return;

    if (!newGuildName.trim()) {
      Alert.alert('Error', 'Please enter a guild name');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_guild', {
        p_owner_id: user.id,
        p_name: newGuildName.trim(),
        p_description: newGuildDesc.trim() || null,
        p_icon: newGuildIcon,
        p_is_public: true,
      });

      if (error) throw error;

      if (data?.success) {
        Alert.alert('Success', 'Guild created!');
        setShowCreateGuildModal(false);
        setNewGuildName('');
        setNewGuildDesc('');
        fetchGuilds();
      } else {
        Alert.alert('Error', data?.error || 'Failed to create guild');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const joinGuild = async (guildId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('join_guild', {
        p_user_id: user.id,
        p_guild_id: guildId,
      });

      if (error) throw error;

      if (data?.success) {
        Alert.alert('Success', 'Joined guild!');
        fetchGuilds();
      } else {
        Alert.alert('Error', data?.error || 'Failed to join');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const leaveGuild = async () => {
    if (!user) return;

    Alert.alert('Leave Guild', 'Are you sure you want to leave this guild?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data, error } = await supabase.rpc('leave_guild', {
              p_user_id: user.id,
            });

            if (!error && data?.success) {
              Alert.alert('Success', data.message);
              fetchGuilds();
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  // =====================================================
  // STYLES
  // =====================================================
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 15,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 15,
    },
    tabsContainer: {
      flexDirection: 'row',
      gap: 10,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 12,
      backgroundColor: theme.card,
      gap: 6,
    },
    activeTab: {
      backgroundColor: theme.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeTabText: {
      color: '#FFFFFF',
    },
    tabIcon: {
      fontSize: 16,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    // Search
    searchContainer: {
      marginBottom: 15,
    },
    searchInput: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: theme.text,
    },
    searchResults: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginTop: 10,
      overflow: 'hidden',
    },
    searchResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    // Friends
    friendCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      fontSize: 24,
    },
    friendInfo: {
      flex: 1,
    },
    friendName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    friendUsername: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    friendStats: {
      flexDirection: 'row',
      marginTop: 4,
      gap: 10,
    },
    friendStat: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    removeBtn: {
      padding: 8,
    },
    // Requests badge
    requestsBadge: {
      position: 'absolute',
      top: -5,
      right: -5,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    requestsBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    requestsBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 12,
      marginBottom: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    requestsBtnText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 16,
    },
    // Leaderboard
    filterRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 15,
    },
    filterBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.card,
      gap: 6,
    },
    activeFilter: {
      backgroundColor: theme.primary,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeFilterText: {
      color: '#FFFFFF',
    },
    leaderboardCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    rankBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    rankText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    leaderboardInfo: {
      flex: 1,
    },
    leaderboardName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    leaderboardStat: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },
    levelBadge: {
      backgroundColor: theme.primary + '30',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    levelText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
    userRankCard: {
      backgroundColor: theme.primary + '20',
      borderRadius: 12,
      padding: 15,
      marginBottom: 15,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    userRankTitle: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '600',
      marginBottom: 5,
    },
    userRankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    userRankBig: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    // Guilds
    myGuildCard: {
      backgroundColor: theme.primary + '20',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    myGuildHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    guildIcon: {
      fontSize: 40,
      marginRight: 15,
    },
    myGuildInfo: {
      flex: 1,
    },
    myGuildName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    myGuildMembers: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    myGuildStats: {
      flexDirection: 'row',
      gap: 20,
      marginTop: 10,
    },
    myGuildStatItem: {
      alignItems: 'center',
    },
    myGuildStatValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    myGuildStatLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    leaveGuildBtn: {
      backgroundColor: '#EF4444',
      borderRadius: 10,
      padding: 12,
      marginTop: 15,
      alignItems: 'center',
    },
    leaveGuildText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    guildCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
    },
    guildHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    guildSmallIcon: {
      fontSize: 28,
      marginRight: 10,
    },
    guildInfo: {
      flex: 1,
    },
    guildName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    guildDesc: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    guildFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    guildMeta: {
      flexDirection: 'row',
      gap: 15,
    },
    guildMetaText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    joinBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 8,
    },
    joinBtnText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
    createGuildBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    createGuildText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 15,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '90%',
      maxHeight: '80%',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    modalInput: {
      backgroundColor: theme.background,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      marginBottom: 12,
    },
    modalBtnRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 15,
    },
    modalBtn: {
      flex: 1,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    cancelBtn: {
      backgroundColor: theme.border,
    },
    confirmBtn: {
      backgroundColor: theme.primary,
    },
    modalBtnText: {
      fontWeight: '600',
      fontSize: 16,
    },
    cancelBtnText: {
      color: theme.textSecondary,
    },
    confirmBtnText: {
      color: '#FFFFFF',
    },
    requestItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    requestInfo: {
      flex: 1,
      marginLeft: 12,
    },
    requestName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    requestMessage: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    requestBtns: {
      flexDirection: 'row',
      gap: 8,
    },
    acceptBtn: {
      backgroundColor: '#22C55E',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    rejectBtn: {
      backgroundColor: '#EF4444',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    btnText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 13,
    },
    emptyText: {
      textAlign: 'center',
      color: theme.textSecondary,
      fontSize: 16,
      marginTop: 50,
    },
    loader: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emojiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 15,
    },
    emojiBtn: {
      width: 45,
      height: 45,
      borderRadius: 10,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emojiSelected: {
      backgroundColor: theme.primary + '40',
      borderWidth: 2,
      borderColor: theme.primary,
    },
    emojiBtnText: {
      fontSize: 24,
    },
  });

  // =====================================================
  // RENDER HELPERS
  // =====================================================
  const getRankColor = (rank: number): string => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return theme.textSecondary;
  };

  const getRankEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getStatValue = (entry: LeaderboardEntry): string => {
    if (leaderboardFilter === 'xp') return `${entry.total_xp.toLocaleString()} XP`;
    if (leaderboardFilter === 'streak') return `🔥 ${entry.current_streak} days`;
    return `🎯 ${entry.challenges_completed}`;
  };

  const getRank = (entry: LeaderboardEntry): number => {
    if (leaderboardFilter === 'xp') return entry.rank_xp;
    if (leaderboardFilter === 'streak') return entry.rank_streak;
    return entry.rank_challenges;
  };

  // =====================================================
  // RENDER SECTIONS
  // =====================================================
  const renderFriendsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search users by username..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchUsers(text);
          }}
        />
        {searching && <ActivityIndicator style={{ marginTop: 10 }} />}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((user) => (
              <View key={user.id} style={styles.searchResultItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.avatar_url || '👤'}
                  </Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{user.display_name || user.username}</Text>
                  <Text style={styles.friendUsername}>@{user.username} • Level {user.level}</Text>
                </View>
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => sendFriendRequest(user.id)}
                >
                  <Text style={styles.joinBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Friend Requests Button */}
      {friendRequests.length > 0 && (
        <TouchableOpacity
          style={styles.requestsBtn}
          onPress={() => setShowRequestsModal(true)}
        >
          <Text style={styles.requestsBtnText}>
            📬 {friendRequests.length} Friend Request{friendRequests.length > 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}

      {/* Friends List */}
      {friends.length === 0 ? (
        <Text style={styles.emptyText}>
          No friends yet.{'\n'}Search for users to add friends!
        </Text>
      ) : (
        friends.map((friend) => (
          <View key={friend.id} style={styles.friendCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{friend.avatar_url || '👤'}</Text>
            </View>
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{friend.display_name}</Text>
              <Text style={styles.friendUsername}>@{friend.username}</Text>
              <View style={styles.friendStats}>
                <Text style={styles.friendStat}>Lvl {friend.level}</Text>
                <Text style={styles.friendStat}>⭐ {friend.total_xp.toLocaleString()}</Text>
                <Text style={styles.friendStat}>🔥 {friend.current_streak}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeFriend(friend.friend_id, friend.display_name)}
            >
              <Text style={{ fontSize: 20 }}>❌</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderLeaderboardTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Filters */}
      <View style={styles.filterRow}>
        {LEADERBOARD_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterBtn,
              leaderboardFilter === filter.id && styles.activeFilter,
            ]}
            onPress={() => setLeaderboardFilter(filter.id)}
          >
            <Text style={styles.tabIcon}>{filter.icon}</Text>
            <Text
              style={[
                styles.filterText,
                leaderboardFilter === filter.id && styles.activeFilterText,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* User Rank */}
      {userRank && (
        <View style={styles.userRankCard}>
          <Text style={styles.userRankTitle}>YOUR RANK</Text>
          <View style={styles.userRankRow}>
            <Text style={styles.userRankBig}>
              {getRankEmoji(getRank(userRank))}
            </Text>
            <Text style={styles.userRankBig}>{getStatValue(userRank)}</Text>
          </View>
        </View>
      )}

      {/* Leaderboard */}
      {leaderboard.map((entry, index) => {
        const rank = getRank(entry);
        return (
          <View
            key={entry.id}
            style={[
              styles.leaderboardCard,
              entry.id === user?.id && { borderWidth: 2, borderColor: theme.primary },
            ]}
          >
            <View style={[styles.rankBadge, { backgroundColor: getRankColor(rank) }]}>
              <Text style={styles.rankText}>
                {rank <= 3 ? getRankEmoji(rank) : rank}
              </Text>
            </View>
            <View style={styles.leaderboardInfo}>
              <Text style={styles.leaderboardName}>
                {entry.display_name || entry.username}
              </Text>
              <Text style={styles.leaderboardStat}>{getStatValue(entry)}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lvl {entry.level}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderGuildsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* My Guild */}
      {myGuild ? (
        <View style={styles.myGuildCard}>
          <View style={styles.myGuildHeader}>
            <Text style={styles.guildIcon}>{myGuild.icon}</Text>
            <View style={styles.myGuildInfo}>
              <Text style={styles.myGuildName}>{myGuild.name}</Text>
              <Text style={styles.myGuildMembers}>
                {myGuild.member_count}/{myGuild.max_members} members
              </Text>
            </View>
          </View>
          {myGuild.description && (
            <Text style={styles.guildDesc}>{myGuild.description}</Text>
          )}
          <View style={styles.myGuildStats}>
            <View style={styles.myGuildStatItem}>
              <Text style={styles.myGuildStatValue}>
                {myGuild.total_xp.toLocaleString()}
              </Text>
              <Text style={styles.myGuildStatLabel}>Total XP</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.leaveGuildBtn} onPress={leaveGuild}>
            <Text style={styles.leaveGuildText}>Leave Guild</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.createGuildBtn}
          onPress={() => setShowCreateGuildModal(true)}
        >
          <Text style={{ fontSize: 20 }}>⚔️</Text>
          <Text style={styles.createGuildText}>Create Your Own Guild</Text>
        </TouchableOpacity>
      )}

      {/* Public Guilds */}
      <Text style={styles.sectionTitle}>
        {myGuild ? 'Other Guilds' : 'Join a Guild'}
      </Text>

      {guilds.filter((g) => g.id !== myGuild?.id).length === 0 ? (
        <Text style={styles.emptyText}>No public guilds available</Text>
      ) : (
        guilds
          .filter((g) => g.id !== myGuild?.id)
          .map((guild) => (
            <View key={guild.id} style={styles.guildCard}>
              <View style={styles.guildHeader}>
                <Text style={styles.guildSmallIcon}>{guild.icon}</Text>
                <View style={styles.guildInfo}>
                  <Text style={styles.guildName}>{guild.name}</Text>
                  {guild.description && (
                    <Text style={styles.guildDesc} numberOfLines={1}>
                      {guild.description}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.guildFooter}>
                <View style={styles.guildMeta}>
                  <Text style={styles.guildMetaText}>
                    👥 {guild.member_count}/{guild.max_members}
                  </Text>
                  <Text style={styles.guildMetaText}>
                    ⭐ {guild.total_xp.toLocaleString()}
                  </Text>
                  {guild.min_level > 1 && (
                    <Text style={styles.guildMetaText}>
                      🔒 Lvl {guild.min_level}+
                    </Text>
                  )}
                </View>
                {!myGuild && (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => joinGuild(guild.id)}
                  >
                    <Text style={styles.joinBtnText}>Join</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
      )}
    </ScrollView>
  );

  // =====================================================
  // MAIN RENDER
  // =====================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const GUILD_ICONS = ['⚔️', '🛡️', '🏰', '🐉', '🦁', '🔥', '💎', '⭐', '🌟', '🚀', '🎯', '👑'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
        <View style={styles.tabsContainer}>
          {SOCIAL_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'friends' && renderFriendsTab()}
          {activeTab === 'leaderboard' && renderLeaderboardTab()}
          {activeTab === 'guilds' && renderGuildsTab()}
        </ScrollView>
      </View>

      {/* Friend Requests Modal */}
      <Modal
        visible={showRequestsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRequestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Friend Requests</Text>
            <ScrollView>
              {friendRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {request.avatar_url || '👤'}
                    </Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{request.display_name}</Text>
                    <Text style={styles.friendUsername}>
                      @{request.username} • Level {request.level}
                    </Text>
                    {request.message && (
                      <Text style={styles.requestMessage}>"{request.message}"</Text>
                    )}
                  </View>
                  <View style={styles.requestBtns}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => {
                        acceptRequest(request.id);
                        setShowRequestsModal(false);
                      }}
                    >
                      <Text style={styles.btnText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => {
                        rejectRequest(request.id);
                        setShowRequestsModal(false);
                      }}
                    >
                      <Text style={styles.btnText}>✗</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn, { marginTop: 15 }]}
              onPress={() => setShowRequestsModal(false)}
            >
              <Text style={[styles.modalBtnText, styles.cancelBtnText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Guild Modal */}
      <Modal
        visible={showCreateGuildModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateGuildModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Guild</Text>
            
            <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Choose Icon</Text>
            <View style={styles.emojiRow}>
              {GUILD_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.emojiBtn,
                    newGuildIcon === icon && styles.emojiSelected,
                  ]}
                  onPress={() => setNewGuildIcon(icon)}
                >
                  <Text style={styles.emojiBtnText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Guild Name"
              placeholderTextColor={theme.textSecondary}
              value={newGuildName}
              onChangeText={setNewGuildName}
              maxLength={30}
            />
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textSecondary}
              value={newGuildDesc}
              onChangeText={setNewGuildDesc}
              multiline
              maxLength={200}
            />
            
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowCreateGuildModal(false)}
              >
                <Text style={[styles.modalBtnText, styles.cancelBtnText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={createGuild}
              >
                <Text style={[styles.modalBtnText, styles.confirmBtnText]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SocialScreen;
