import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface Guild {
  id: string;
  name: string;
  description: string;
  icon: string;
  member_count: number;
  max_members: number;
  is_private: boolean;
  category: string;
  quest_ai_level: string;
}

export default function GuildsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [myGuilds, setMyGuilds] = useState<Guild[]>([]);
  const [discoverGuilds, setDiscoverGuilds] = useState<Guild[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');

  useEffect(() => {
    loadGuilds();
  }, [activeTab, searchQuery]);

  const loadGuilds = async () => {
    setLoading(true);
    if (activeTab === 'my') {
      await loadMyGuilds();
    } else {
      await loadDiscoverGuilds();
    }
    setLoading(false);
    setRefreshing(false);
  };

  const loadMyGuilds = async () => {
    const { data, error } = await supabase
      .from('guild_members')
      .select('guilds(id, name, description, icon, member_count, max_members, is_private, category, quest_ai_level)')
      .eq('user_id', user?.id);

    if (!error && data) {
      setMyGuilds(data.map((gm: any) => gm.guilds).filter(Boolean));
    }
  };

  const loadDiscoverGuilds = async () => {
    let query = supabase
      .from('guilds')
      .select('id, name, description, icon, member_count, max_members, is_private, category, quest_ai_level')
      .eq('is_private', false)
      .order('member_count', { ascending: false })
      .limit(20);

    if (searchQuery.trim()) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Filter out guilds user is already in
      const myGuildIds = new Set(myGuilds.map((g) => g.id));
      setDiscoverGuilds(data.filter((g: Guild) => !myGuildIds.has(g.id)));
    }
  };

  const joinGuild = async (guildId: string) => {
    const { error } = await supabase.from('guild_members').insert({
      guild_id: guildId,
      user_id: user?.id,
      role: 'member',
    });

    if (!error) {
      loadGuilds();
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      fitness: '💪',
      study: '📚',
      work: '💼',
      health: '🏥',
      creativity: '🎨',
      social: '👥',
    };
    return icons[category] || '🎯';
  };

  const getAIBadge = (level: string) => {
    if (level === 'disabled') return null;
    const colors: Record<string, string> = {
      basic: '#10B981',
      moderation: '#F59E0B',
      advanced: '#8B5CF6',
    };
    return (
      <View style={[styles.aiBadge, { backgroundColor: colors[level] + '20' }]}>
        <Text style={[styles.aiBadgeText, { color: colors[level] }]}>
          🤖 AI {level.toUpperCase()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Guilds</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateGuild')}
        >
          <Text style={styles.createButtonText}>+ Crear</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.tabActive]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
            Mis Guilds ({myGuilds.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Descubrir
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search (only in discover) */}
      {activeTab === 'discover' && (
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar guilds..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Guilds List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadGuilds} />}
      >
        {activeTab === 'my' && myGuilds.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏰</Text>
            <Text style={styles.emptyText}>No estás en ningún guild</Text>
            <Text style={styles.emptySubtext}>Crea uno o únete a guilds públicos</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateGuild')}
            >
              <Text style={styles.emptyButtonText}>Crear Guild</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'discover' && discoverGuilds.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No se encontraron guilds</Text>
            <Text style={styles.emptySubtext}>Intenta con otra búsqueda</Text>
          </View>
        )}

        {activeTab === 'my' &&
          myGuilds.map((guild) => (
            <TouchableOpacity
              key={guild.id}
              style={styles.guildCard}
              onPress={() => navigation.navigate('GuildDetail', { guildId: guild.id })}
            >
              <View style={styles.guildHeader}>
                <Text style={styles.guildIcon}>{guild.icon}</Text>
                <View style={styles.guildInfo}>
                  <Text style={styles.guildName}>{guild.name}</Text>
                  <Text style={styles.guildDescription} numberOfLines={2}>
                    {guild.description || 'Sin descripción'}
                  </Text>
                </View>
              </View>

              <View style={styles.guildMeta}>
                <Text style={styles.categoryBadge}>
                  {getCategoryIcon(guild.category)} {guild.category}
                </Text>
                <Text style={styles.memberCount}>
                  👥 {guild.member_count}/{guild.max_members}
                </Text>
              </View>

              {getAIBadge(guild.quest_ai_level)}
            </TouchableOpacity>
          ))}

        {activeTab === 'discover' &&
          discoverGuilds.map((guild) => (
            <View key={guild.id} style={styles.guildCard}>
              <View style={styles.guildHeader}>
                <Text style={styles.guildIcon}>{guild.icon}</Text>
                <View style={styles.guildInfo}>
                  <Text style={styles.guildName}>{guild.name}</Text>
                  <Text style={styles.guildDescription} numberOfLines={2}>
                    {guild.description || 'Sin descripción'}
                  </Text>
                </View>
              </View>

              <View style={styles.guildMeta}>
                <Text style={styles.categoryBadge}>
                  {getCategoryIcon(guild.category)} {guild.category}
                </Text>
                <Text style={styles.memberCount}>
                  👥 {guild.member_count}/{guild.max_members}
                </Text>
              </View>

              {getAIBadge(guild.quest_ai_level)}

              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => joinGuild(guild.id)}
              >
                <Text style={styles.joinButtonText}>Unirse</Text>
              </TouchableOpacity>
            </View>
          ))}
      </ScrollView>
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
  createButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 12,
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
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  guildCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  guildHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  guildIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  guildInfo: {
    flex: 1,
  },
  guildName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  guildDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  guildMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    fontSize: 12,
    color: '#94A3B8',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  memberCount: {
    fontSize: 12,
    color: '#64748B',
  },
  aiBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
