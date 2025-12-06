import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';
import { 
  GuildMessage, 
  getGuildMessages, 
  sendGuildMessage,
  deleteGuildMessage, 
  markMessagesAsRead,
  addReaction,
  removeReaction,
  setTypingIndicator,
  getTypingUsers,
  TypingIndicator,
  translateMessage,
} from '../../lib/guild/chatApi';
import { supabase } from '../../lib/supabase';

interface GuildChatScreenProps {
  route: {
    params: {
      guildId: string;
      guildName: string;
    };
  };
  navigation: any;
}

export const GuildChatScreen: React.FC<GuildChatScreenProps> = ({ route, navigation }) => {
  const { guildId, guildName } = route.params;
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [messages, setMessages] = useState<GuildMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<GuildMessage | null>(null);
  const [longPressedMessage, setLongPressedMessage] = useState<GuildMessage | null>(null);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMessages();
    setupRealtimeSubscription();
    setupTypingSubscription();
    markMessagesAsRead(guildId);

    return () => {
      supabase.channel(`guild-${guildId}-chat`).unsubscribe();
      supabase.channel(`guild-${guildId}-typing`).unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTypingIndicator(guildId, false);
    };
  }, [guildId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`guild-${guildId}-chat`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guild_messages',
          filter: `guild_id=eq.${guildId}`,
        },
        async (payload) => {
          // Obtener el mensaje completo con datos del autor
          const { data } = await supabase
            .from('guild_messages')
            .select(`
              *,
              author:profiles!user_id (
                display_name,
                avatar_url,
                level,
                class
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, data]);
            // Scroll al final
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'guild_messages',
          filter: `guild_id=eq.${guildId}`,
        },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();
  };

  const setupTypingSubscription = () => {
    const channel = supabase
      .channel(`guild-${guildId}-typing`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guild_typing_indicators',
          filter: `guild_id=eq.${guildId}`,
        },
        async () => {
          const users = await getTypingUsers(guildId);
          setTypingUsers(users);
        }
      )
      .subscribe();
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await getGuildMessages(guildId, 100);
      setMessages(data);
      // Scroll al final después de cargar
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    const tempMessage = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      await sendGuildMessage({
        guild_id: guildId,
        content: tempMessage,
        message_type: 'text',
        reply_to_id: replyingTo?.id,
      });
      setReplyingTo(null);
      setTypingIndicator(guildId, false);
      // El mensaje aparecerá vía realtime subscription
    } catch (error) {
      console.error('Error sending message:', error);
      // Restaurar texto si falla
      setMessageText(tempMessage);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setMessageText(text);

    // Indicar que está escribiendo
    setTypingIndicator(guildId, true);

    // Reset timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Quitar indicador después de 3 segundos sin escribir
    typingTimeoutRef.current = setTimeout(() => {
      setTypingIndicator(guildId, false);
    }, 3000);
  };

  const handleLongPress = (message: GuildMessage) => {
    if (message.message_type === 'system') return;
    setLongPressedMessage(message);
    setShowReactionsModal(true);
  };

  const handleReaction = async (emoji: string) => {
    if (!longPressedMessage) return;

    try {
      const existingReaction = longPressedMessage.reactions?.find(r => r.emoji === emoji && r.user_reacted);
      
      if (existingReaction) {
        await removeReaction(longPressedMessage.id, emoji);
      } else {
        await addReaction(longPressedMessage.id, emoji);
      }

      // Actualizar mensaje localmente
      setMessages(prev => prev.map(m => {
        if (m.id === longPressedMessage.id) {
          const reactions = m.reactions || [];
          const reactionIndex = reactions.findIndex(r => r.emoji === emoji);
          
          if (reactionIndex >= 0) {
            const updatedReactions = [...reactions];
            if (existingReaction) {
              updatedReactions[reactionIndex].count--;
              updatedReactions[reactionIndex].user_reacted = false;
              if (updatedReactions[reactionIndex].count === 0) {
                updatedReactions.splice(reactionIndex, 1);
              }
            } else {
              updatedReactions[reactionIndex].count++;
              updatedReactions[reactionIndex].user_reacted = true;
            }
            return { ...m, reactions: updatedReactions };
          } else {
            return { ...m, reactions: [...reactions, { emoji, count: 1, user_reacted: true }] };
          }
        }
        return m;
      }));

      setShowReactionsModal(false);
      setLongPressedMessage(null);
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleTranslate = async (message: GuildMessage) => {
    setTranslatingMessageId(message.id);
    try {
      const targetLang = language === 'es' ? 'es' : 'en';
      const translation = await translateMessage(message.id, targetLang);
      
      Alert.alert(
        t('Translation', 'Traducción'),
        translation,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        t('Error', 'Error'),
        t('Could not translate message', 'No se pudo traducir el mensaje')
      );
    } finally {
      setTranslatingMessageId(null);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Hoy: solo hora
      return date.toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      // Ayer
      return t('Yesterday', 'Ayer');
    } else if (diffDays < 7) {
      // Esta semana: día de la semana
      return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
        weekday: 'short' 
      });
    } else {
      // Más antiguo: fecha
      return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const renderMessage = ({ item, index }: { item: GuildMessage; index: number }) => {
    const isMyMessage = item.user_id === user?.id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !isMyMessage && (!prevMessage || prevMessage.user_id !== item.user_id);
    const showName = !isMyMessage && (!prevMessage || prevMessage.user_id !== item.user_id);

    if (item.message_type === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={[styles.systemMessage, { color: theme.textSecondary }]}>
            {item.content}
          </Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageRow,
        isMyMessage && styles.messageRowMine
      ]}>
        {!isMyMessage && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                {item.author?.avatar_url ? (
                  <Image source={{ uri: item.author.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {item.author?.display_name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
        )}
        
        <TouchableOpacity
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.messageBubble,
            isMyMessage 
              ? { backgroundColor: theme.primary } 
              : { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }
          ]}>
            {/* Reply Indicator */}
            {item.reply_to && (
              <View style={[
                styles.replyIndicator,
                { backgroundColor: isMyMessage ? 'rgba(0,0,0,0.1)' : theme.background }
              ]}>
                <Text style={[
                  styles.replyAuthor,
                  { color: isMyMessage ? 'rgba(255,255,255,0.9)' : theme.primary }
                ]}>
                  {item.reply_to.author?.display_name || t('User', 'Usuario')}
                </Text>
                <Text 
                  style={[
                    styles.replyContent,
                    { color: isMyMessage ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
                  ]}
                  numberOfLines={1}
                >
                  {item.reply_to.content}
                </Text>
              </View>
            )}

            {showName && (
              <Text style={[
                styles.messageName, 
                { color: theme.primary, fontWeight: '600' }
              ]}>
                {item.author?.display_name || t('Unknown', 'Desconocido')}
              </Text>
            )}
            <Text style={[
              styles.messageContent,
              { color: isMyMessage ? '#FFF' : theme.text }
            ]}>
              {item.content}
            </Text>
            <Text style={[
              styles.messageTime,
              { color: isMyMessage ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
            ]}>
              {formatTime(item.created_at)}
            </Text>
          </View>

          {/* Reactions */}
          {item.reactions && item.reactions.length > 0 && (
            <View style={[
              styles.reactionsContainer,
              isMyMessage ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
            ]}>
              {item.reactions.map((reaction, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleReaction(reaction.emoji)}
                  style={[
                    styles.reactionBadge,
                    { 
                      backgroundColor: reaction.user_reacted 
                        ? theme.primary 
                        : theme.card,
                      borderColor: theme.border
                    }
                  ]}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  {reaction.count > 1 && (
                    <Text style={[
                      styles.reactionCount,
                      { color: reaction.user_reacted ? '#FFF' : theme.text }
                    ]}>
                      {reaction.count}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {t('No messages yet', 'Sin mensajes aún')}
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
          {t('Start the conversation!', '¡Inicia la conversación!')}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{guildName}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {t('Guild Chat', 'Chat de la Guild')}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Messages */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              ListEmptyComponent={renderEmpty}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />

            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <View style={[styles.typingContainer, { backgroundColor: theme.card }]}>
                <Text style={[styles.typingText, { color: theme.textSecondary }]}>
                  {typingUsers.length === 1
                    ? t(
                        `${typingUsers[0].display_name} is typing...`,
                        `${typingUsers[0].display_name} está escribiendo...`
                      )
                    : typingUsers.length === 2
                    ? t(
                        `${typingUsers[0].display_name} and ${typingUsers[1].display_name} are typing...`,
                        `${typingUsers[0].display_name} y ${typingUsers[1].display_name} están escribiendo...`
                      )
                    : t(
                        `${typingUsers.length} people are typing...`,
                        `${typingUsers.length} personas están escribiendo...`
                      )}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Reply Bar */}
        {replyingTo && (
          <View style={[styles.replyBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <View style={styles.replyBarContent}>
              <Ionicons name="return-down-forward" size={16} color={theme.primary} />
              <View style={styles.replyBarText}>
                <Text style={[styles.replyBarAuthor, { color: theme.primary }]}>
                  {replyingTo.author?.display_name || t('User', 'Usuario')}
                </Text>
                <Text 
                  style={[styles.replyBarMessage, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {replyingTo.content}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

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
            placeholder={t('Type a message...', 'Escribe un mensaje...')}
            placeholderTextColor={theme.textSecondary}
            value={messageText}
            onChangeText={(text) => {
              setMessageText(text);
              handleTyping(text);
            }}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
            style={[
              styles.sendButton,
              { backgroundColor: theme.primary },
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Reactions Modal */}
      <Modal
        visible={showReactionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReactionsModal(false)}
        >
          <View style={[styles.reactionsModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.reactionsModalTitle, { color: theme.text }]}>
              {t('React to message', 'Reaccionar al mensaje')}
            </Text>
            <View style={styles.emojiGrid}>
              {['❤️', '👍', '😂', '😮', '😢', '🙏', '🎉', '🔥'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiButton, { backgroundColor: theme.background }]}
                  onPress={() => {
                    handleReaction(emoji);
                    setShowReactionsModal(false);
                  }}
                >
                  <Text style={styles.emojiButtonText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowReactionsModal(false);
                  if (longPressedMessage) {
                    setReplyingTo(longPressedMessage);
                  }
                }}
              >
                <Ionicons name="return-down-forward" size={18} color="#FFF" />
                <Text style={styles.modalActionText}>{t('Reply', 'Responder')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowReactionsModal(false);
                  if (longPressedMessage) {
                    handleTranslate(longPressedMessage);
                  }
                }}
              >
                <Ionicons name="language" size={18} color="#FFF" />
                <Text style={styles.modalActionText}>{t('Translate', 'Traducir')}</Text>
              </TouchableOpacity>

              {longPressedMessage?.user_id === user?.id && (
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: '#EF4444' }]}
                  onPress={async () => {
                    setShowReactionsModal(false);
                    if (longPressedMessage) {
                      Alert.alert(
                        t('Delete Message', 'Eliminar Mensaje'),
                        t('Are you sure you want to delete this message?', '¿Estás seguro de que quieres eliminar este mensaje?'),
                        [
                          { text: t('Cancel', 'Cancelar'), style: 'cancel' },
                          {
                            text: t('Delete', 'Eliminar'),
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await deleteGuildMessage(longPressedMessage.id);
                                setMessages((prev) => prev.filter((m) => m.id !== longPressedMessage.id));
                              } catch (error) {
                                console.error('Error deleting message:', error);
                              }
                            },
                          },
                        ]
                      );
                    }
                  }}
                >
                  <Ionicons name="trash" size={18} color="#FFF" />
                  <Text style={styles.modalActionText}>{t('Delete', 'Eliminar')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
    padding: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
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
  messagesList: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    width: 32,
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 10,
    paddingHorizontal: 14,
  },
  messageName: {
    fontSize: 12,
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  systemMessage: {
    fontSize: 12,
    fontStyle: 'italic',
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
  replyIndicator: {
    padding: 8,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyContent: {
    fontSize: 12,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  replyBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyBarText: {
    flex: 1,
  },
  replyBarAuthor: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyBarMessage: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reactionsModalContent: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  reactionsModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  emojiButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonText: {
    fontSize: 28,
  },
  modalActions: {
    gap: 10,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  modalActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
