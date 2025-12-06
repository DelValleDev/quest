import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuildComment, getPostComments, createComment } from '../../lib/guild/feedApi';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { getTheme } from '../../theme/colors';

interface CommentsModalProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  postId,
  onClose,
}) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [comments, setComments] = useState<GuildComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await getPostComments(postId);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const comment = await createComment(postId, newComment.trim());
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setSubmitting(false);
    }
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {t('Comments', 'Comentarios')} ({comments.length})
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <ScrollView style={styles.commentsList}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {t('No comments yet', 'Sin comentarios aún')}
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                  {t('Be the first to comment!', '¡Sé el primero en comentar!')}
                </Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View
                  key={comment.id}
                  style={[styles.commentCard, { backgroundColor: theme.card }]}
                >
                  <View style={[styles.commentAvatar, { backgroundColor: theme.primary + '20' }]}>
                    {comment.author?.avatar_url ? (
                      <Image source={{ uri: comment.author.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="person" size={16} color={theme.primary} />
                    )}
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={[styles.commentAuthor, { color: theme.text }]}>
                        {comment.author?.display_name || t('Unknown', 'Desconocido')}
                      </Text>
                      <Text style={[styles.commentLevel, { color: theme.textSecondary }]}>
                        {t('Lvl', 'Nv')} {comment.author?.level || 1}
                      </Text>
                      <Text style={[styles.commentTime, { color: theme.textSecondary }]}>
                        • {formatTimeAgo(comment.created_at)}
                      </Text>
                    </View>
                    <Text style={[styles.commentText, { color: theme.text }]}>
                      {comment.content}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Input */}
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder={t('Write a comment...', 'Escribe un comentario...')}
              placeholderTextColor={theme.textSecondary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!newComment.trim() || submitting}
              style={[
                styles.sendButton,
                { backgroundColor: theme.primary },
                (!newComment.trim() || submitting) && styles.sendButtonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  commentCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentLevel: {
    fontSize: 12,
    marginLeft: 8,
  },
  commentTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-end',
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
