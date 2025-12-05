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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

interface Guild {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  banner_color: string;
  owner_id: string;
  is_public: boolean;
  max_members: number;
  min_level: number;
  total_xp: number;
  member_count: number;
  weekly_xp: number;
  rank: number | null;
}

interface GuildMember {
  id: string;
  user_id: string;
  role: string;
  xp_contributed: number;
  joined_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
    level: number;
  };
}

interface GuildChallenge {
  id: string;
  title: string;
  description: string;
  goal_type: string;
  goal_value: number;
  current_value: number;
  xp_reward: number;
  coin_reward: number;
  ends_at: string;
  is_completed: boolean;
}

interface GuildsScreenProps {
  embedded?: boolean;
}

type ViewTab = 'discover' | 'my-guild';

export const GuildsScreen: React.FC<GuildsScreenProps> = ({ embedded = false }) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [activeTab, setActiveTab] = useState<ViewTab>('discover');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [myMembership, setMyMembership] = useState<GuildMember | null>(null);
  const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
  const [guildChallenges, setGuildChallenges] = useState<GuildChallenge[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLevel, setUserLevel] = useState(1);

  // New guild form
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDescription, setNewGuildDescription] = useState('');
  const [newGuildIcon, setNewGuildIcon] = useState('⚔️');
  const [newGuildColor, setNewGuildColor] = useState('#8B5CF6');

  const GUILD_ICONS = ['⚔️', '🛡️', '🏰', '🐉', '🦅', '🦁', '🐺', '🔥', '⭐', '💎', '🌟', '⚡'];
  const GUILD_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#EC4899', '#06B6D4', '#6366F1'];

  const fetchData = async () => {
    if (!user) return;

    try {
      // Get user's level
      const { data: profile } = await supabase
        .from('profiles')
        .select('level')
        .eq('id', user.id)
        .single();
      
      if (profile) setUserLevel(profile.level);

      // Check if user is in a guild
      const { data: membership } = await supabase
        .from('guild_members')
        .select(`
          *,
          guild:guilds(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (membership && membership.guild) {
        setMyMembership(membership);
        setMyGuild(membership.guild as Guild);

        // Fetch guild members
        const { data: members } = await supabase
          .from('guild_members')
          .select(`
            *,
            profile:profiles(display_name, avatar_url, level)
          `)
          .eq('guild_id', membership.guild_id)
          .order('xp_contributed', { ascending: false });
        
        if (members) setGuildMembers(members);

        // Fetch active challenges
        const { data: challenges } = await supabase
          .from('guild_challenges')
          .select('*')
          .eq('guild_id', membership.guild_id)
          .eq('is_completed', false)
          .gt('ends_at', new Date().toISOString())
          .order('ends_at', { ascending: true });
        
        if (challenges) setGuildChallenges(challenges);

        setActiveTab('my-guild');
      } else {
        setMyGuild(null);
        setMyMembership(null);
        setActiveTab('discover');
      }

      // Fetch public guilds
      const { data: publicGuilds } = await supabase
        .from('guilds')
        .select('*')
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .limit(20);
      
      if (publicGuilds) setGuilds(publicGuilds);

    } catch (error) {
      console.error('Error fetching guilds:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const createGuild = async () => {
    if (!user || !newGuildName.trim()) return;

    try {
      // Create guild
      const { data: newGuild, error: guildError } = await supabase
        .from('guilds')
        .insert({
          name: newGuildName.trim(),
          description: newGuildDescription.trim() || null,
          icon: newGuildIcon,
          banner_color: newGuildColor,
          owner_id: user.id,
        })
        .select()
        .single();

      if (guildError) throw guildError;

      // Add creator as owner member
      await supabase
        .from('guild_members')
        .insert({
          guild_id: newGuild.id,
          user_id: user.id,
          role: 'owner',
        });

      setShowCreateModal(false);
      setNewGuildName('');
      setNewGuildDescription('');
      setNewGuildIcon('⚔️');
      setNewGuildColor('#8B5CF6');
      
      fetchData();
      Alert.alert(
        t('Success!', '¡Éxito!'),
        t('Your guild has been created!', '¡Tu gremio ha sido creado!')
      );
    } catch (error: any) {
      Alert.alert(
        t('Error', 'Error'),
        error.message || t('Could not create guild', 'No se pudo crear el gremio')
      );
    }
  };

  const joinGuild = async (guildId: string) => {
    if (!user) return;

    try {
      const guild = guilds.find(g => g.id === guildId);
      if (guild && guild.min_level > userLevel) {
        Alert.alert(
          t('Level Required', 'Nivel Requerido'),
          t(`You need to be level ${guild.min_level} to join this guild`, 
            `Necesitas ser nivel ${guild.min_level} para unirte a este gremio`)
        );
        return;
      }

      if (guild && guild.member_count >= guild.max_members) {
        Alert.alert(
          t('Guild Full', 'Gremio Lleno'),
          t('This guild has reached its member limit', 'Este gremio ha alcanzado su límite de miembros')
        );
        return;
      }

      await supabase
        .from('guild_members')
        .insert({
          guild_id: guildId,
          user_id: user.id,
          role: 'member',
        });

      // Update member count
      await supabase.rpc('increment_guild_members', { guild_id: guildId });

      fetchData();
      Alert.alert(
        t('Welcome!', '¡Bienvenido!'),
        t('You have joined the guild!', '¡Te has unido al gremio!')
      );
    } catch (error: any) {
      Alert.alert(t('Error', 'Error'), error.message);
    }
  };

  const leaveGuild = async () => {
    if (!myMembership || !myGuild) return;

    if (myMembership.role === 'owner') {
      Alert.alert(
        t('Cannot Leave', 'No Puedes Salir'),
        t('As the owner, you must transfer ownership or disband the guild first.',
          'Como propietario, debes transferir la propiedad o disolver el gremio primero.')
      );
      return;
    }

    Alert.alert(
      t('Leave Guild?', '¿Dejar Gremio?'),
      t('Are you sure you want to leave this guild?', '¿Estás seguro de que quieres dejar este gremio?'),
      [
        { text: t('Cancel', 'Cancelar'), style: 'cancel' },
        {
          text: t('Leave', 'Dejar'),
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('guild_members')
                .delete()
                .eq('id', myMembership.id);

              // Decrement member count
              await supabase.rpc('decrement_guild_members', { guild_id: myGuild.id });

              setMyGuild(null);
              setMyMembership(null);
              setActiveTab('discover');
              fetchData();
            } catch (error: any) {
              Alert.alert(t('Error', 'Error'), error.message);
            }
          }
        }
      ]
    );
  };

  const filteredGuilds = guilds.filter(guild => 
    guild.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (guild.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const Container = embedded ? View : SafeAreaView;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      padding: 20,
      paddingTop: embedded ? 10 : 20,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 16,
      gap: 10,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: theme.surface,
    },
    tabActive: {
      backgroundColor: theme.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    searchInput: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    guildCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
    },
    guildHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    guildIcon: {
      fontSize: 36,
      marginRight: 12,
    },
    guildInfo: {
      flex: 1,
    },
    guildName: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 2,
    },
    guildDescription: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    guildStats: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 12,
    },
    guildStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    guildStatText: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    joinButton: {
      backgroundColor: theme.primary,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
    },
    joinButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
    levelRequirement: {
      fontSize: 12,
      color: theme.warning,
      marginTop: 8,
      textAlign: 'center',
    },
    // My Guild styles
    myGuildCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    myGuildHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    myGuildIcon: {
      fontSize: 48,
      marginRight: 16,
    },
    myGuildInfo: {
      flex: 1,
    },
    myGuildName: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 4,
    },
    myGuildRole: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
    },
    myGuildStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 16,
    },
    myGuildStatItem: {
      alignItems: 'center',
    },
    myGuildStatValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    myGuildStatLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
      marginTop: 8,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    memberAvatarText: {
      fontSize: 18,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    memberRole: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    memberXP: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.primary,
    },
    challengeCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    challengeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    challengeTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    challengeReward: {
      fontSize: 13,
      color: theme.primary,
      fontWeight: '600',
    },
    challengeProgress: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 6,
    },
    challengeProgressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    challengeMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    challengeProgressText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    challengeTimeLeft: {
      fontSize: 12,
      color: theme.warning,
    },
    leaveButton: {
      backgroundColor: theme.error + '20',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 16,
    },
    leaveButtonText: {
      color: theme.error,
      fontWeight: '600',
      fontSize: 14,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary + '15',
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: theme.primary + '30',
      borderStyle: 'dashed',
      gap: 8,
      marginBottom: 16,
    },
    createButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.primary,
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
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
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
      maxHeight: '85%',
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
      height: 80,
      textAlignVertical: 'top',
    },
    iconSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    iconOption: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    iconOptionSelected: {
      borderColor: theme.primary,
    },
    iconOptionText: {
      fontSize: 24,
    },
    colorSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    colorOption: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    colorOptionSelected: {
      borderColor: theme.text,
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
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const formatTimeLeft = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const formatXP = (xp: number) => {
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
  };

  const getRoleEmoji = (role: string) => {
    switch (role) {
      case 'owner': return '👑';
      case 'admin': return '⭐';
      default: return '';
    }
  };

  if (loading) {
    return (
      <Container style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </Container>
    );
  }

  return (
    <Container style={styles.container} {...(!embedded && { edges: ['top'] })}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('Guilds', 'Gremios')} 🛡️</Text>
          <Text style={styles.headerSubtitle}>
            {t('Join forces with others to achieve more', 'Únete con otros para lograr más')}
          </Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
            onPress={() => setActiveTab('discover')}
          >
            <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
              🔍 {t('Discover', 'Descubrir')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my-guild' && styles.tabActive]}
            onPress={() => setActiveTab('my-guild')}
            disabled={!myGuild}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'my-guild' && styles.tabTextActive,
              !myGuild && { opacity: 0.5 }
            ]}>
              🏰 {t('My Guild', 'Mi Gremio')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === 'discover' ? (
            <>
              {!myGuild && (
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={{ fontSize: 20 }}>➕</Text>
                  <Text style={styles.createButtonText}>
                    {t('Create Your Guild', 'Crear Tu Gremio')}
                  </Text>
                </TouchableOpacity>
              )}

              <TextInput
                style={styles.searchInput}
                placeholder={t('Search guilds...', 'Buscar gremios...')}
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {filteredGuilds.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🏰</Text>
                  <Text style={styles.emptyText}>
                    {t('No guilds found.\nBe the first to create one!', 
                       'No se encontraron gremios.\n¡Sé el primero en crear uno!')}
                  </Text>
                </View>
              ) : (
                filteredGuilds.map((guild) => (
                  <View 
                    key={guild.id} 
                    style={[styles.guildCard, { borderLeftColor: guild.banner_color }]}
                  >
                    <View style={styles.guildHeader}>
                      <Text style={styles.guildIcon}>{guild.icon}</Text>
                      <View style={styles.guildInfo}>
                        <Text style={styles.guildName}>{guild.name}</Text>
                        {guild.description && (
                          <Text style={styles.guildDescription} numberOfLines={2}>
                            {guild.description}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.guildStats}>
                      <View style={styles.guildStat}>
                        <Text>👥</Text>
                        <Text style={styles.guildStatText}>
                          {guild.member_count}/{guild.max_members}
                        </Text>
                      </View>
                      <View style={styles.guildStat}>
                        <Text>⭐</Text>
                        <Text style={styles.guildStatText}>
                          {formatXP(guild.total_xp)} XP
                        </Text>
                      </View>
                      {guild.rank && (
                        <View style={styles.guildStat}>
                          <Text>🏆</Text>
                          <Text style={styles.guildStatText}>#{guild.rank}</Text>
                        </View>
                      )}
                    </View>

                    {!myGuild && (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.joinButton,
                            guild.min_level > userLevel && { opacity: 0.5 }
                          ]}
                          onPress={() => joinGuild(guild.id)}
                          disabled={guild.min_level > userLevel || guild.member_count >= guild.max_members}
                        >
                          <Text style={styles.joinButtonText}>
                            {t('Join Guild', 'Unirse al Gremio')}
                          </Text>
                        </TouchableOpacity>
                        {guild.min_level > userLevel && (
                          <Text style={styles.levelRequirement}>
                            ⚠️ {t(`Level ${guild.min_level} required`, `Nivel ${guild.min_level} requerido`)}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                ))
              )}
            </>
          ) : (
            myGuild && (
              <>
                <View style={[styles.myGuildCard, { borderLeftColor: myGuild.banner_color, borderLeftWidth: 4 }]}>
                  <View style={styles.myGuildHeader}>
                    <Text style={styles.myGuildIcon}>{myGuild.icon}</Text>
                    <View style={styles.myGuildInfo}>
                      <Text style={styles.myGuildName}>{myGuild.name}</Text>
                      <Text style={styles.myGuildRole}>
                        {getRoleEmoji(myMembership?.role || 'member')} {
                          myMembership?.role === 'owner' 
                            ? t('Owner', 'Propietario')
                            : myMembership?.role === 'admin'
                            ? t('Admin', 'Administrador')
                            : t('Member', 'Miembro')
                        }
                      </Text>
                    </View>
                  </View>

                  <View style={styles.myGuildStats}>
                    <View style={styles.myGuildStatItem}>
                      <Text style={styles.myGuildStatValue}>{myGuild.member_count}</Text>
                      <Text style={styles.myGuildStatLabel}>{t('Members', 'Miembros')}</Text>
                    </View>
                    <View style={styles.myGuildStatItem}>
                      <Text style={styles.myGuildStatValue}>{formatXP(myGuild.total_xp)}</Text>
                      <Text style={styles.myGuildStatLabel}>XP Total</Text>
                    </View>
                    <View style={styles.myGuildStatItem}>
                      <Text style={styles.myGuildStatValue}>{myGuild.rank || '-'}</Text>
                      <Text style={styles.myGuildStatLabel}>{t('Rank', 'Rango')}</Text>
                    </View>
                  </View>
                </View>

                {guildChallenges.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>
                      🎯 {t('Active Challenges', 'Desafíos Activos')}
                    </Text>
                    {guildChallenges.map((challenge) => (
                      <View key={challenge.id} style={styles.challengeCard}>
                        <View style={styles.challengeHeader}>
                          <Text style={styles.challengeTitle}>{challenge.title}</Text>
                          <Text style={styles.challengeReward}>+{challenge.xp_reward} XP</Text>
                        </View>
                        <View style={styles.challengeProgress}>
                          <View 
                            style={[
                              styles.challengeProgressFill,
                              { width: `${Math.min(100, (challenge.current_value / challenge.goal_value) * 100)}%` }
                            ]} 
                          />
                        </View>
                        <View style={styles.challengeMeta}>
                          <Text style={styles.challengeProgressText}>
                            {challenge.current_value}/{challenge.goal_value}
                          </Text>
                          <Text style={styles.challengeTimeLeft}>
                            ⏳ {formatTimeLeft(challenge.ends_at)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                <Text style={styles.sectionTitle}>
                  👥 {t('Members', 'Miembros')} ({guildMembers.length})
                </Text>
                {guildMembers.slice(0, 10).map((member, index) => (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {getRoleEmoji(member.role)} {member.profile?.display_name || 'Unknown'}
                      </Text>
                      <Text style={styles.memberRole}>
                        Lv {member.profile?.level || 1}
                      </Text>
                    </View>
                    <Text style={styles.memberXP}>
                      {formatXP(member.xp_contributed)} XP
                    </Text>
                  </View>
                ))}

                {myMembership?.role !== 'owner' && (
                  <TouchableOpacity style={styles.leaveButton} onPress={leaveGuild}>
                    <Text style={styles.leaveButtonText}>
                      {t('Leave Guild', 'Dejar Gremio')}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )
          )}
        </View>
      </ScrollView>

      {/* Create Guild Modal */}
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
              {t('Create Guild', 'Crear Gremio')} 🛡️
            </Text>

            <Text style={styles.inputLabel}>{t('Guild Name', 'Nombre del Gremio')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Enter guild name...', 'Ingresa el nombre...')}
              placeholderTextColor={theme.textMuted}
              value={newGuildName}
              onChangeText={setNewGuildName}
              maxLength={30}
            />

            <Text style={styles.inputLabel}>{t('Description (optional)', 'Descripción (opcional)')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('What is your guild about?', '¿De qué trata tu gremio?')}
              placeholderTextColor={theme.textMuted}
              value={newGuildDescription}
              onChangeText={setNewGuildDescription}
              multiline
              maxLength={150}
            />

            <Text style={styles.inputLabel}>{t('Icon', 'Ícono')}</Text>
            <View style={styles.iconSelector}>
              {GUILD_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    newGuildIcon === icon && styles.iconOptionSelected
                  ]}
                  onPress={() => setNewGuildIcon(icon)}
                >
                  <Text style={styles.iconOptionText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>{t('Color', 'Color')}</Text>
            <View style={styles.colorSelector}>
              {GUILD_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newGuildColor === color && styles.colorOptionSelected
                  ]}
                  onPress={() => setNewGuildColor(color)}
                />
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
                style={[styles.modalBtn, styles.submitBtn, !newGuildName.trim() && { opacity: 0.5 }]}
                onPress={createGuild}
                disabled={!newGuildName.trim()}
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

export default GuildsScreen;
