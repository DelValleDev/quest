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
} from 'react-native';
import { useThemeStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

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
  "¿Cómo puedo mejorar?",
  "Dame motivación",
  "¿Qué son los pilares?",
  "Consejo del día",
];

export const QuestCoachScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [mascotBounce] = useState(new Animated.Value(0));

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

  // Fetch user context
  useEffect(() => {
    const fetchUserContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

        setUserContext({
          displayName: profile.display_name || 'Adventurer',
          level: profile.level || 1,
          currentStreak: profile.current_streak || 0,
          pillarScores: profile.pillar_scores,
          assessmentCompleted: profile.assessment_completed || false,
          weakestPillar: weakest,
          strongestPillar: strongest,
        });
      }
    };

    fetchUserContext();
  }, []);

  // Send initial greeting when context is loaded
  useEffect(() => {
    if (userContext && messages.length === 0) {
      const greeting = getRandomItem(COACH_RESPONSES.greeting)
        .replace('{name}', userContext.displayName);
      
      addBotMessage(greeting);

      // Add context-aware follow-up
      setTimeout(() => {
        if (userContext.currentStreak >= 3) {
          const streakMsg = getRandomItem(COACH_RESPONSES.streakCelebration)
            .replace('{name}', userContext.displayName)
            .replace('{streak}', String(userContext.currentStreak));
          addBotMessage(streakMsg);
        } else if (!userContext.assessmentCompleted) {
          addBotMessage("🎯 Te recomiendo completar el Assessment inicial para personalizar tu experiencia.");
        } else if (userContext.weakestPillar) {
          const pillar = PILLARS.find(p => p.id === userContext.weakestPillar);
          addBotMessage(`📊 Veo que ${pillar?.name || userContext.weakestPillar} podría usar algo de atención. ¿Quieres algunos consejos?`);
        }
      }, 1500);
    }
  }, [userContext]);

  const getRandomItem = <T,>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const addBotMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
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

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    startTypingAnimation();

    // Simulate typing delay
    setTimeout(() => {
      stopTypingAnimation();
      setIsTyping(false);
      const response = generateResponse(userMessage.text);
      addBotMessage(response);
    }, 1000 + Math.random() * 1000);
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
        </View>
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
              <Text
                style={[
                  styles.messageText,
                  { color: message.isUser ? '#FFFFFF' : theme.text },
                ]}
              >
                {message.text}
              </Text>
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
});

export default QuestCoachScreen;
