import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';
import { GuildPost, getGuildFeed, hasLikedPost } from '../../lib/guild/feedApi';
import { PostCard } from '../../components/guild/PostCard';
import { PostComposer } from '../../components/guild/PostComposer';
import { CommentsModal } from '../../components/guild/CommentsModal';
import { supabase } from '../../lib/supabase';

interface GuildFeedScreenProps {
  route: {
    params: {
      guildId: string;
      guildName: string;
    };
  };
  navigation: any;
}

export const GuildFeedScreen: React.FC<GuildFeedScreenProps> = ({ route, navigation }) => {
  const { guildId, guildName } = route.params;
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [posts, setPosts] = useState<GuildPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    loadFeed();
    setupRealtimeSubscription();

    return () => {
      supabase.channel(`guild-${guildId}-feed`).unsubscribe();
    };
  }, [guildId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`guild-${guildId}-feed`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guild_posts',
          filter: `guild_id=eq.${guildId}`,
        },
        (payload) => {
          console.log('Real-time update:', payload);
          if (payload.eventType === 'INSERT') {
            // Refresh to show new post
            loadFeed(true);
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();
  };

  const loadFeed = async (reset: boolean = true) => {
    if (!reset && loadingMore) return;

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = reset ? 0 : posts.length;
      const feedData = await getGuildFeed(guildId, PAGE_SIZE, offset);

      // Verificar likes para cada post
      const postsWithLikes = await Promise.all(
        feedData.map(async (post) => ({
          ...post,
          has_liked: await hasLikedPost(post.id),
        }))
      );

      if (reset) {
        setPosts(postsWithLikes);
      } else {
        setPosts(prev => [...prev, ...postsWithLikes]);
      }

      setHasMore(feedData.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadFeed(false);
    }
  };

  const handlePostCreated = () => {
    loadFeed(true);
  };

  const handleDeleteSuccess = () => {
    loadFeed(true);
  };

  const renderPost = ({ item }: { item: GuildPost }) => (
    <PostCard
      post={item}
      onLikeToggle={() => {}}
      onCommentPress={() => setSelectedPostForComments(item.id)}
      onDeleteSuccess={handleDeleteSuccess}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={theme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {t('No posts yet', 'Sin posts aún')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          {t('Be the first to share something!', '¡Sé el primero en compartir algo!')}
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowComposer(true)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.emptyButtonText}>
            {t('Create Post', 'Crear Post')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{guildName}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {t('Guild Feed', 'Feed de la Guild')}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Feed */}
      {loading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('Loading feed...', 'Cargando feed...')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* FAB: New Post Button */}
      {!loading && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => setShowComposer(true)}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Post Composer Modal */}
      <PostComposer
        visible={showComposer}
        guildId={guildId}
        onClose={() => setShowComposer(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Comments Modal */}
      {selectedPostForComments && (
        <CommentsModal
          visible={!!selectedPostForComments}
          postId={selectedPostForComments}
          onClose={() => setSelectedPostForComments(null)}
        />
      )}
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
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  feedContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footerLoader: {
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
