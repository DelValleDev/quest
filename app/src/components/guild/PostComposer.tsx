import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createGuildPost, CreatePostData } from '../../lib/guild/feedApi';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { getTheme } from '../../theme/colors';

interface PostComposerProps {
  visible: boolean;
  guildId: string;
  onClose: () => void;
  onPostCreated: () => void;
}

type PostType = 'text' | 'image' | 'video' | 'achievement' | 'poll';

export const PostComposer: React.FC<PostComposerProps> = ({
  visible,
  guildId,
  onClose,
  onPostCreated,
}) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [postType, setPostType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() && postType === 'text') {
      Alert.alert(
        t('Empty Post', 'Post Vacío'),
        t('Please write something before posting', 'Escribe algo antes de publicar')
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const postData: CreatePostData = {
        guild_id: guildId,
        post_type: postType,
        content: content.trim() || undefined,
        visibility: 'members_only',
      };

      await createGuildPost(postData);
      
      // Reset form
      setContent('');
      setPostType('text');
      
      onPostCreated();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert(
        t('Error', 'Error'),
        t('Failed to create post', 'Error al crear el post')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (content.trim()) {
      Alert.alert(
        t('Discard Post?', '¿Descartar Post?'),
        t('Your changes will be lost', 'Se perderán tus cambios'),
        [
          { text: t('Cancel', 'Cancelar'), style: 'cancel' },
          {
            text: t('Discard', 'Descartar'),
            style: 'destructive',
            onPress: () => {
              setContent('');
              setPostType('text');
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const postTypeOptions = [
    { type: 'text' as PostType, icon: 'text', label: t('Text', 'Texto') },
    { type: 'image' as PostType, icon: 'image', label: t('Image', 'Imagen') },
    { type: 'video' as PostType, icon: 'videocam', label: t('Video', 'Video') },
    { type: 'achievement' as PostType, icon: 'trophy', label: t('Achievement', 'Logro') },
    { type: 'poll' as PostType, icon: 'bar-chart', label: t('Poll', 'Encuesta') },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('New Post', 'Nuevo Post')}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || (!content.trim() && postType === 'text')}
            style={[
              styles.submitButton,
              { backgroundColor: theme.primary },
              (isSubmitting || (!content.trim() && postType === 'text')) && styles.submitButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {t('Post', 'Publicar')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Post Type Selector */}
          <View style={styles.typeSelector}>
            {postTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.type}
                onPress={() => setPostType(option.type)}
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: postType === option.type ? theme.primary + '20' : theme.card,
                    borderColor: postType === option.type ? theme.primary : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={postType === option.type ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    {
                      color: postType === option.type ? theme.primary : theme.textSecondary,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content Input */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder={t(
              'Share something with your guild...',
              'Comparte algo con tu guild...'
            )}
            placeholderTextColor={theme.textSecondary}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />

          {/* Character Count */}
          <Text style={[styles.charCount, { color: theme.textSecondary }]}>
            {content.length} / 2000
          </Text>

          {/* Type-specific UI placeholders */}
          {postType === 'image' && (
            <View style={[styles.mediaPlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="image-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
                {t('Image upload coming soon', 'Subida de imágenes próximamente')}
              </Text>
            </View>
          )}

          {postType === 'video' && (
            <View style={[styles.mediaPlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="videocam-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
                {t('Video upload coming soon', 'Subida de videos próximamente')}
              </Text>
            </View>
          )}

          {postType === 'poll' && (
            <View style={[styles.pollBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="bar-chart-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
                {t('Poll creation coming soon', 'Creación de encuestas próximamente')}
              </Text>
            </View>
          )}

          {postType === 'achievement' && (
            <View style={[styles.achievementBuilder, { backgroundColor: theme.success + '10', borderColor: theme.success }]}>
              <Text style={styles.achievementIcon}>🏆</Text>
              <Text style={[styles.placeholderText, { color: theme.success }]}>
                {t('Share an achievement', 'Comparte un logro')}
              </Text>
              <Text style={[styles.achievementHint, { color: theme.textSecondary }]}>
                {t('Write about your recent accomplishment', 'Escribe sobre tu logro reciente')}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 16,
  },
  mediaPlaceholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  pollBuilder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  achievementBuilder: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  achievementHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
