import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Guild {
  id: string;
  name: string;
  description: string;
  icon: string;
  created_by: string;
  member_count: number;
  max_members: number;
  is_private: boolean;
  category: string;
  quest_ai_level: string;
}

interface Member {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  profiles: {
    username: string;
    level: number;
    avatar_url: string | null;
  };
}

export default function GuildDetailScreen({ route, navigation }: any) {
  const { guildId } = route.params;
  const { user } = useAuth();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'chat'>('overview');

  useEffect(() => {
    loadGuildData();
  }, []);

  const loadGuildData = async () => {
    setLoading(true);
    await Promise.all([loadGuild(), loadMembers(), checkUserRole()]);
    setLoading(false);
    setRefreshing(false);
  };

  const loadGuild = async () => {
    const { data, error } = await supabase
      .from('guilds')
      .select('*')
      .eq('id', guildId)
      .single();

    if (!error && data) {
      setGuild(data);
    }
  };

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('guild_members')
      .select('id, user_id, role, profiles(username, level, avatar_url)')
      .eq('guild_id', guildId)
      .order('role', { ascending: true });

    if (!error && data) {
      setMembers(data);
    }
  };

  const checkUserRole = async () => {
    const { data } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setUserRole(data.role);
    }
  };

  const leaveGuild = () => {
    Alert.alert(
      'Salir del Guild',
      '¿Estás seguro que quieres salir de este guild?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('guild_members')
              .delete()
              .eq('guild_id', guildId)
              .eq('user_id', user?.id);

            if (!error) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: '#EF4444',
      moderator: '#F59E0B',
      member: '#6366F1',
    };
    return colors[role as keyof typeof colors] || '#6366F1';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Admin',
      moderator: 'Mod',
      member: 'Miembro',
    };
    return labels[role as keyof typeof labels] || 'Miembro';
  };

  if (!guild) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.guildIcon}>{guild.icon}</Text>
          <View style={styles.headerText}>
            <Text style={styles.guildName}>{guild.name}</Text>
            <Text style={styles.memberCount}>
              {guild.member_count}/{guild.max_members} miembros
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            General
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            Miembros ({guild.member_count})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
            Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadGuildData} />}
      >
        {activeTab === 'overview' && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.description}>
                {guild.description || 'Sin descripción'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Categoría:</Text>
                <Text style={styles.infoValue}>{guild.category}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Privacidad:</Text>
                <Text style={styles.infoValue}>
                  {guild.is_private ? '🔒 Privado' : '🌐 Público'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Quest AI:</Text>
                <Text style={styles.infoValue}>
                  {guild.quest_ai_level === 'disabled'
                    ? 'Desactivado'
                    : guild.quest_ai_level.charAt(0).toUpperCase() +
                      guild.quest_ai_level.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acciones</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('GuildInvite', { guildId })}
              >
                <Text style={styles.actionIcon}>🔗</Text>
                <Text style={styles.actionText}>Invitar Miembros</Text>
              </TouchableOpacity>

              {userRole !== 'admin' && (
                <TouchableOpacity style={styles.leaveButton} onPress={leaveGuild}>
                  <Text style={styles.leaveButtonText}>Salir del Guild</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {activeTab === 'members' && (
          <View style={styles.section}>
            {members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {member.profiles.username?.[0]?.toUpperCase() || 'A'}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.profiles.username}</Text>
                  <Text style={styles.memberLevel}>Nivel {member.profiles.level}</Text>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: getRoleBadgeColor(member.role) + '20' },
                  ]}
                >
                  <Text style={[styles.roleText, { color: getRoleBadgeColor(member.role) }]}>
                    {getRoleLabel(member.role)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'chat' && (
          <View style={styles.section}>
            <View style={styles.comingSoon}>
              <Text style={styles.comingSoonIcon}>💬</Text>
              <Text style={styles.comingSoonText}>Chat Próximamente</Text>
              <Text style={styles.comingSoonSubtext}>
                La función de chat grupal estará disponible pronto
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  guildIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  guildName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  memberCount: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  infoLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  memberLevel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  comingSoon: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  comingSoonIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  comingSoonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
