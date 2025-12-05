import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import questAI from '../../lib/openai';
import { SimpleMarkdown, PaywallModal } from '../../components';
import { PremiumService } from '../../lib/premium';
import type { RootStackParamList } from '../../../App';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface UserContext {
  displayName: string;
  level: number;
  currentStreak: number;
  pillarScores: Record<string, number> | null;
  assessmentCompleted: boolean;
  weakestPillar: string | null;
  strongestPillar: string | null;
}

const PILLARS = [
  { id: 'physical', name: 'Physical', emoji: '💪', color: '#EF4444' },
  { id: 'mental', name: 'Mental', emoji: '🧠', color: '#3B82F6' },
  { id: 'social', name: 'Social', emoji: '👥', color: '#EC4899' },
  { id: 'professional', name: 'Professional', emoji: '💼', color: '#10B981' },
  { id: 'spiritual', name: 'Spiritual', emoji: '✨', color: '#8B5CF6' },
  { id: 'creative', name: 'Creative', emoji: '🎨', color: '#F97316' },
];

// Quest Coach AI responses based on context
const COACH_RESPONSES = {
  greeting: [
    "¡Hola {name}! 🤖 Soy Quest, tu coach personal. ¿En qué puedo ayudarte hoy?",
    "¡Hey {name}! ¿Listo para conquistar nuevos retos? 💪",
    "¡Qué bueno verte, {name}! ¿Cómo te sientes hoy?",
  ],
  streakCelebration: [
    "🔥 ¡{streak} días de racha! Eso es increíble. La consistencia es tu superpoder.",
    "¡Wow {name}! {streak} días seguidos. ¡Eres imparable!",
  ],
  weakPillarAdvice: {
    physical: [
      "💪 Tu pilar Physical necesita atención. Intenta empezar con 10 minutos de ejercicio hoy.",
      "🏃 Un pequeño paso: camina 15 minutos después del almuerzo.",
      "🧘 ¿Qué tal 5 minutos de estiramientos al despertar?",
    ],
    mental: [
      "🧠 Tu mente necesita ejercicio. Prueba 5 minutos de meditación hoy.",
      "📚 Lee un artículo interesante o un capítulo de un libro.",
      "🧩 Los puzzles y juegos mentales son excelentes para fortalecer este pilar.",
    ],
    social: [
      "👥 Conecta con alguien hoy - un mensaje, una llamada, un café.",
      "💬 Envía un mensaje a un amigo que hace tiempo no contactas.",
      "🤝 Participa en una actividad grupal esta semana.",
    ],
    professional: [
      "💼 Dedica 30 minutos a aprender algo nuevo de tu campo.",
      "📈 Establece una meta profesional pequeña para esta semana.",
      "🎯 Organiza tu espacio de trabajo para mayor productividad.",
    ],
    spiritual: [
      "✨ Dedica 5 minutos a reflexionar sobre lo que te hace feliz.",
      "🙏 Practica la gratitud - escribe 3 cosas buenas de hoy.",
      "🌿 Conecta con la naturaleza, aunque sea unos minutos.",
    ],
    creative: [
      "🎨 Dibuja, escribe, o crea algo hoy, sin importar qué tan pequeño.",
      "🎵 Escucha música nueva o aprende una canción.",
      "📝 Escribe tus pensamientos en un diario creativo.",
    ],
  },
  strongPillarPraise: {
    physical: "💪 ¡Tu Physical está brillando! Eres un ejemplo de disciplina.",
    mental: "🧠 ¡Tu mente está afilada! Sigue alimentando tu intelecto.",
    social: "👥 ¡Eres un maestro de las conexiones! Tu energía social es contagiosa.",
    professional: "💼 ¡Tu carrera está en ascenso! El éxito te sigue.",
    spiritual: "✨ ¡Tu paz interior es inspiradora! Irradia tranquilidad.",
    creative: "🎨 ¡Tu creatividad es impresionante! El mundo necesita tu arte.",
  },
  motivational: [
    "💫 Recuerda: cada pequeño paso cuenta. No subestimes tu progreso.",
    "🌟 El hecho de que estés aquí ya te hace especial. ¡Sigue adelante!",
    "🚀 Los grandes logros comienzan con pequeñas acciones diarias.",
    "💎 Eres más capaz de lo que crees. Confía en ti.",
    "⚡ Tu potencial es ilimitado. Solo necesitas dar el primer paso.",
  ],
  questionsAboutPillars: [
    "Los pilares son las 6 áreas fundamentales de tu vida: Physical, Mental, Social, Professional, Spiritual y Creative. Equilibrarlos es la clave del bienestar.",
    "Cada pilar representa un aspecto importante de tu desarrollo. Al completar retos, ganas XP y subes de nivel en cada uno.",
  ],
  questionsAboutApp: [
    "Quest es tu compañero de crecimiento personal. Completa retos diarios, gana Quest Coins, y mejora tus pilares.",
    "Puedes personalizar tu experiencia comprando items en la tienda con Quest Coins. ¡Hazlo divertido!",
  ],
  fallback: [
    "Hmm, no estoy seguro de cómo responder a eso. ¿Quieres hablar sobre tus metas o pilares?",
    "Interesante... ¿Hay algo específico en lo que pueda ayudarte con tu desarrollo personal?",
    "Cuéntame más sobre lo que necesitas. Estoy aquí para apoyarte en tu journey.",
  ],
};

const QUICK_REPLIES = [
  "¿Cuáles son mis Life Paths?",
  "Muéstrame mis hábitos",
  "Crea un nuevo quest",
  "¿Qué debo hacer hoy?",
  "Analiza mi progreso",
];

export const QuestCoachScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [mascotBounce] = useState(new Animated.Value(0));
  const [showConversationList, setShowConversationList] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  
  // Premium state
  const [isPremium, setIsPremium] = useState(true); // Default true to not block initially
  const [showPaywall, setShowPaywall] = useState(false);
  const [dailyMessagesUsed, setDailyMessagesUsed] = useState(0);
  const FREE_DAILY_LIMIT = 5; // Free users get 5 messages per day

  // Mascot thinking animation
  const startTypingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotBounce, {
          toValue: -5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(mascotBounce, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopTypingAnimation = () => {
    mascotBounce.stopAnimation();
    mascotBounce.setValue(0);
  };

  // Fetch user context and chat history
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check premium status
      const premiumStatus = await PremiumService.isPremium(user.id);
      setIsPremium(premiumStatus);

      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, level, current_streak, pillar_scores, assessment_completed')
        .eq('id', user.id)
        .single();

      if (profile) {
        let weakest: string | null = null;
        let strongest: string | null = null;

        if (profile.pillar_scores) {
          const scores = profile.pillar_scores as Record<string, number>;
          const entries = Object.entries(scores);
          if (entries.length > 0) {
            weakest = entries.reduce((a, b) => a[1] < b[1] ? a : b)[0];
            strongest = entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
          }
        }

        const context = {
          displayName: profile.display_name || 'Adventurer',
          level: profile.level || 1,
          currentStreak: profile.current_streak || 0,
          pillarScores: profile.pillar_scores,
          assessmentCompleted: profile.assessment_completed || false,
          weakestPillar: weakest,
          strongestPillar: strongest,
        };
        setUserContext(context);

        // 2. Fetch Chat History (TODAY'S CONVERSATION)
        const today = new Date().toISOString().split('T')[0];
        const { data: history } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', today + 'T00:00:00')
          .order('created_at', { ascending: true });

        if (history && history.length > 0) {
          setMessages(history.map(h => ({
            id: h.id,
            text: h.message,
            isUser: h.is_user,
            timestamp: new Date(h.created_at),
          })));
          
          // Count user messages for daily limit
          const userMessages = history.filter(h => h.is_user).length;
          setDailyMessagesUsed(userMessages);
          
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 500);
        } else {
          // Only send greeting if no history
          sendInitialGreeting(context);
        }
      }
    };

    init();
  }, []);

  // Fetch past conversations (grouped by day)
  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: history } = await supabase
      .from('chat_history')
      .select('created_at, message, is_user')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (history) {
      // Group by day
      const grouped: Record<string, any[]> = {};
      history.forEach(h => {
        const day = new Date(h.created_at).toISOString().split('T')[0];
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(h);
      });

      const conversationList = Object.entries(grouped).map(([day, msgs]) => ({
        day,
        messageCount: msgs.length,
        lastMessage: msgs[0].message.substring(0, 50) + '...',
        messages: msgs,
      }));

      setConversations(conversationList);
    }
  };

  const sendInitialGreeting = (context: UserContext) => {
    const greeting = getRandomItem(COACH_RESPONSES.greeting)
      .replace('{name}', context.displayName);
    
    addBotMessage(greeting);

    // Add context-aware follow-up
    setTimeout(() => {
      if (context.currentStreak >= 3) {
        const streakMsg = getRandomItem(COACH_RESPONSES.streakCelebration)
          .replace('{name}', context.displayName)
          .replace('{streak}', String(context.currentStreak));
        addBotMessage(streakMsg);
      } else if (!context.assessmentCompleted) {
        addBotMessage("🎯 Te recomiendo completar el Assessment inicial para personalizar tu experiencia.");
      } else if (context.weakestPillar) {
        const pillar = PILLARS.find(p => p.id === context.weakestPillar);
        addBotMessage(`📊 Veo que ${pillar?.name || context.weakestPillar} podría usar algo de atención. ¿Quieres algunos consejos?`);
      }
    }, 1500);
  };

  const getRandomItem = <T,>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const addBotMessage = async (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // Persist to DB
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('chat_history').insert({
          user_id: user.id,
          message: text,
          is_user: false
        });
      }
    } catch (error) {
      console.error('Error saving bot message:', error);
    }
  };

  const generateResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase();

    // Check for pillar-related questions
    if (msg.includes('pilar') || msg.includes('pillar') || msg.includes('qué son')) {
      return getRandomItem(COACH_RESPONSES.questionsAboutPillars);
    }

    // Check for app-related questions
    if (msg.includes('app') || msg.includes('quest') || msg.includes('cómo funciona')) {
      return getRandomItem(COACH_RESPONSES.questionsAboutApp);
    }

    // Check for motivation requests
    if (msg.includes('motiva') || msg.includes('animo') || msg.includes('ánimo') || msg.includes('motivación')) {
      return getRandomItem(COACH_RESPONSES.motivational);
    }

    // Check for improvement requests
    if (msg.includes('mejorar') || msg.includes('consejo') || msg.includes('ayuda') || msg.includes('tip')) {
      if (userContext?.weakestPillar) {
        const pillarAdvice = COACH_RESPONSES.weakPillarAdvice[userContext.weakestPillar as keyof typeof COACH_RESPONSES.weakPillarAdvice];
        if (pillarAdvice) {
          return getRandomItem(pillarAdvice);
        }
      }
      return getRandomItem(COACH_RESPONSES.motivational);
    }

    // Check for specific pillar mentions
    for (const pillar of PILLARS) {
      if (msg.includes(pillar.id.toLowerCase()) || msg.includes(pillar.name.toLowerCase())) {
        const advice = COACH_RESPONSES.weakPillarAdvice[pillar.id as keyof typeof COACH_RESPONSES.weakPillarAdvice];
        if (advice) {
          return getRandomItem(advice);
        }
      }
    }

    // Check for greeting
    if (msg.includes('hola') || msg.includes('hey') || msg.includes('hi') || msg.includes('buenas')) {
      return getRandomItem(COACH_RESPONSES.greeting).replace('{name}', userContext?.displayName || 'Adventurer');
    }

    // Check for gratitude/praise
    if (msg.includes('gracias') || msg.includes('thanks')) {
      return "¡De nada! 🤖 Para eso estoy aquí. ¿Hay algo más en lo que pueda ayudarte?";
    }

    // Fallback
    return getRandomItem(COACH_RESPONSES.fallback);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    // Check if free user has exceeded daily limit
    if (!isPremium && dailyMessagesUsed >= FREE_DAILY_LIMIT) {
      setShowPaywall(true);
      return;
    }

    const messageText = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    startTypingAnimation();
    
    // Increment daily message count for free users
    if (!isPremium) {
      setDailyMessagesUsed(prev => prev + 1);
    }

    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Save user message to DB
      await supabase.from('chat_history').insert({
        user_id: user.id,
        message: messageText,
        is_user: true
      });

      // Build conversation history for AI
      const conversationHistory = messages.map(m => ({
        role: m.isUser ? 'user' as const : 'assistant' as const,
        content: m.text,
      }));

      // Call real AI with proper signature
      const response = await questAI.chat(user.id, messageText, conversationHistory);
      
      stopTypingAnimation();
      setIsTyping(false);
      addBotMessage(response);
    } catch (error) {
      console.error('AI Error:', error);
      stopTypingAnimation();
      setIsTyping(false);
      
      // Fallback to local responses if AI fails
      const fallbackResponse = generateResponse(messageText);
      addBotMessage(fallbackResponse);
    }
  };

  const handleQuickReply = (text: string) => {
    setInputText(text);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Animated.Text 
          style={[
            styles.headerMascot,
            { transform: [{ translateY: isTyping ? mascotBounce : 0 }] }
          ]}
        >
          🤖
        </Animated.Text>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Quest Coach</Text>
          <Text style={[styles.headerStatus, { color: isTyping ? theme.primary : theme.success }]}>
            {isTyping ? 'Pensando...' : 'En línea'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Tu coach personal con acceso total a tus datos
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.historyButton, { backgroundColor: theme.primary + '20' }]}
          onPress={() => {
            loadConversations();
            setShowConversationList(true);
          }}
        >
          <Text style={{ fontSize: 20 }}>📚</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.isUser ? styles.userBubble : styles.botBubble,
              {
                backgroundColor: message.isUser ? theme.primary : theme.surface,
              },
            ]}
          >
            {!message.isUser && <Text style={styles.botAvatar}>🤖</Text>}
            <View style={styles.messageContent}>
              <SimpleMarkdown
                text={message.text}
                baseStyle={[
                  styles.messageText,
                  { color: message.isUser ? '#FFFFFF' : theme.text },
                ]}
                boldStyle={{ fontWeight: 'bold' }}
              />
              <Text
                style={[
                  styles.messageTime,
                  { color: message.isUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
                ]}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: theme.surface }]}>
            <Text style={styles.botAvatar}>🤖</Text>
            <View style={styles.typingIndicator}>
              <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
              <View style={[styles.typingDot, styles.typingDot2, { backgroundColor: theme.textSecondary }]} />
              <View style={[styles.typingDot, styles.typingDot3, { backgroundColor: theme.textSecondary }]} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Replies */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickReplies}
        contentContainerStyle={styles.quickRepliesContent}
      >
        {QUICK_REPLIES.map((text, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.quickReplyButton, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
            onPress={() => handleQuickReply(text)}
          >
            <Text style={[styles.quickReplyText, { color: theme.primary }]}>{text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: theme.primary, opacity: inputText.trim() ? 1 : 0.5 }]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Past Conversations Modal */}
      <Modal
        visible={showConversationList}
        animationType="slide"
        transparent
        onRequestClose={() => setShowConversationList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Conversaciones Pasadas 📚</Text>
              <TouchableOpacity onPress={() => setShowConversationList(false)}>
                <Text style={{ fontSize: 24, color: theme.text }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.conversationList}>
              {conversations.map((conv) => (
                <TouchableOpacity
                  key={conv.day}
                  style={[styles.conversationItem, { backgroundColor: theme.background }]}
                  onPress={() => {
                    setMessages(conv.messages.reverse().map((m: any) => ({
                      id: Math.random().toString(),
                      text: m.message,
                      isUser: m.is_user,
                      timestamp: new Date(m.created_at),
                    })));
                    setShowConversationList(false);
                    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 500);
                  }}
                >
                  <Text style={[styles.conversationDate, { color: theme.text }]}>
                    {new Date(conv.day).toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Text style={[styles.conversationPreview, { color: theme.textSecondary }]}>
                    {conv.messageCount} mensajes - {conv.lastMessage}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {conversations.length === 0 && (
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No hay conversaciones pasadas
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Paywall Modal for Free Users */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureId="AI_COACH"
        customMessage={`Has usado ${dailyMessagesUsed}/${FREE_DAILY_LIMIT} mensajes gratis hoy. ¡Hazte Premium para chatear sin límites!`}
      />

      {/* Free User Limit Warning */}
      {!isPremium && (
        <View style={[styles.limitBanner, { backgroundColor: theme.primary + '15' }]}>
          <Text style={[styles.limitText, { color: theme.primary }]}>
            💬 {FREE_DAILY_LIMIT - dailyMessagesUsed} mensajes gratis restantes hoy
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerMascot: {
    fontSize: 40,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: width * 0.85,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botBubble: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  botAvatar: {
    fontSize: 24,
    marginRight: 8,
  },
  messageContent: {
    flex: 1,
    maxWidth: width * 0.65,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  quickReplies: {
    maxHeight: 50,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  quickRepliesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  quickReplyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 30,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  conversationList: {
    flex: 1,
    padding: 16,
  },
  conversationItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  conversationDate: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  conversationPreview: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  limitBanner: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default QuestCoachScreen;
