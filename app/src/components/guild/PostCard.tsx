import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GuildPost, likePost, unlikePost, deletePost } from '../../lib/guild/feedApi';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';

interface PostCardProps {
  post: GuildPost;
  onLikeToggle?: () => void;
  onCommentPress?: () => void;
  onDeleteSuccess?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLikeToggle,
  onCommentPress,
  onDeleteSuccess,
}) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [isLiked, setIsLiked] = useState(post.has_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isProcessing, setIsProcessing] = useState(false);

  const isAuthor = user?.id === post.author_id;

  const handleLikeToggle = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isLiked) {
        await unlikePost(post.id);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await likePost(post.id);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
      onLikeToggle?.();
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert(
        t('Error', 'Error'),
        t('Failed to like post', 'Error al dar like')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('Delete Post', 'Eliminar Post'),
      t('Are you sure you want to delete this post?', '¿Estás seguro de eliminar este post?'),
      [
        { text: t('Cancel', 'Cancelar'), style: 'cancel' },
        {
          text: t('Delete', 'Eliminar'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(post.id);
              onDeleteSuccess?.();
            } catch (error) {
              Alert.alert(
                t('Error', 'Error'),
                t('Failed to delete post', 'Error al eliminar post')
              );
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('Just now', 'Ahora');
    if (diffMins < 60) return `${diffMins}${t('m', 'm')}`;
    if (diffHours < 24) return `${diffHours}${t('h', 'h')}`;
    if (diffDays < 7) return `${diffDays}${t('d', 'd')}`;
    return date.toLocaleDateString();
  };

  const getPostTypeIcon = () => {
    switch (post.post_type) {
      case 'achievement':
        return '🏆';
      case 'image':
        return '📷';
      case 'video':
        return '🎥';
      case 'poll':
        return '📊';
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
            {post.author?.avatar_url ? (
              <Image source={{ uri: post.author.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={20} color={theme.primary} />
            )}
          </View>
          <View style={styles.authorDetails}>
            <View style={styles.nameRow}>
              <Text style={[styles.authorName, { color: theme.text }]}>
                {post.author?.display_name || t('Unknown', 'Desconocido')}
              </Text>
              {getPostTypeIcon() && (
                <Text style={styles.typeIcon}>{getPostTypeIcon()}</Text>
              )}
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.level, { color: theme.textSecondary }]}>
                {t('Lvl', 'Nv')} {post.author?.level || 1}
              </Text>
              {post.author?.class && (
                <>
                  <Text style={[styles.dot, { color: theme.textSecondary }]}> • </Text>
                  <Text style={[styles.class, { color: theme.primary }]}>
                    {post.author.class}
                  </Text>
                </>
              )}
              <Text style={[styles.dot, { color: theme.textSecondary }]}> • </Text>
              <Text style={[styles.time, { color: theme.textSecondary }]}>
                {formatTimeAgo(post.created_at)}
              </Text>
            </View>
          </View>
        </View>
        {isAuthor && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color={theme.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {post.content && (
        <Text style={[styles.content, { color: theme.text }]}>
          {post.content}
        </Text>
      )}

      {/* Image */}
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Video Thumbnail (placeholder) */}
      {post.video_url && (
        <View style={[styles.videoPlaceholder, { backgroundColor: theme.border }]}>
          <Ionicons name="play-circle" size={60} color={theme.primary} />
          <Text style={[styles.videoText, { color: theme.textSecondary }]}>
            {t('Video', 'Video')}
          </Text>
        </View>
      )}

      {/* Achievement Display */}
      {post.post_type === 'achievement' && post.achievement_data && (
        <View style={[styles.achievementCard, { backgroundColor: theme.success + '10', borderColor: theme.success }]}>
          <Text style={styles.achievementIcon}>🏆</Text>
          <Text style={[styles.achievementText, { color: theme.success }]}>
            {post.achievement_data.title || t('Achievement Unlocked!', '¡Logro Desbloqueado!')}
          </Text>
        </View>
      )}

      {/* Poll (simplified) */}
      {post.post_type === 'poll' && post.poll_options && (
        <View style={[styles.pollContainer, { borderColor: theme.border }]}>
          {post.poll_options.map((option: any, index: number) => (
            <TouchableOpacity
              key={index}
              style={[styles.pollOption, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <Text style={[styles.pollOptionText, { color: theme.text }]}>
                {option.text || option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLikeToggle}
          disabled={isProcessing}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={isLiked ? theme.error : theme.textSecondary}
          />
          <Text style={[styles.actionText, { color: isLiked ? theme.error : theme.textSecondary }]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onCommentPress}
        >
          <Ionicons name="chatbubble-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.actionText, { color: theme.textSecondary }]}>
            {post.comments_count}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  authorDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  typeIcon: {
    fontSize: 14,
    marginLeft: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  level: {
    fontSize: 12,
  },
  dot: {
    fontSize: 12,
  },
  class: {
    fontSize: 12,
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoText: {
    marginTop: 8,
    fontSize: 14,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 12,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  achievementText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  pollContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pollOption: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
  },
  pollOptionText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
});
