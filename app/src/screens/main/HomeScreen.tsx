import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Animated,
} from 'react-native';
import { useThemeStore, useLanguageStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PillarProgressChart } from '../../components/PillarProgressChart';
import { PenaltyWarningBanner } from '../../components/PenaltyWarningBanner';
import { PenaltyNotification } from '../../components/PenaltyNotification';
import { PenaltyService, PenaltyLog } from '../../lib/penalties';
import { useAchievementMonitor, useBadgeMonitor } from '../../hooks/useEventMonitor';
import QuestAIToast from '../../components/QuestAIToast';
import type { ProactiveMessage } from '../../lib/proactiveAI';

type RootStackParamList = {
  Main: undefined;
  QuestCoach: undefined;
  Assessment: undefined;
  AssessmentResults: { scores: Record<string, number> };
  Agenda: undefined;
  Duels: undefined;
  Raids: undefined;
  Profile: undefined;
  Achievements: undefined;
  Settings: undefined;
};

const { width } = Dimensions.get('window');

interface Profile {
  display_name: string;
  level: number;
  total_xp: number;
  quest_coins: number;
  current_streak: number;
  assessment_completed: boolean;
  pillar_scores: Record<string, number> | null;
}

interface DailyQuest {
  id: string;
  title: string;
  xp_reward: number;
  coin_reward: number;
  pillar_id: string;
  completed: boolean;
}

interface UserPillar {
  pillar_id: string;
  level: number;
  current_xp: number;
}

interface ActiveChallenge {
  id: string;
  challenge: {
    id: string;
    title: string;
    pillar_id: string;
    xp_reward: number;
    icon: string;
  };
}

const PILLARS = [
  { id: 'physical', name: 'Physical', nameEs: 'Físico', emoji: '💪', color: '#EF4444' },
  { id: 'mental', name: 'Mental', nameEs: 'Mental', emoji: '🧠', color: '#3B82F6' },
  { id: 'social', name: 'Social', nameEs: 'Social', emoji: '👥', color: '#EC4899' },
  { id: 'professional', name: 'Professional', nameEs: 'Profesional', emoji: '💼', color: '#10B981' },
  { id: 'spiritual', name: 'Spiritual', nameEs: 'Espiritual', emoji: '✨', color: '#8B5CF6' },
  { id: 'creative', name: 'Creative', nameEs: 'Creativo', emoji: '🎨', color: '#F97316' },
];

// Mascot messages in both languages
const MASCOT_MESSAGES_EN = {
  morning: [
    "Good morning, champion! 🌅 Today is a new day to grow.",
    "☀️ The dawn brings new opportunities. Let's conquer them!",
    "🌄 Every morning is a blank page. Write something epic!",
  ],
  afternoon: [
    "💪 Keep it up! You've already achieved a lot today.",
    "🔥 The afternoon is perfect for completing your missions.",
    "⚡ You're halfway there! Don't stop.",
  ],
  evening: [
    "🌙 Finish the day strong. You can do it!",
    "✨ The night is young and you're unstoppable.",
    "🌟 Reflect on your achievements today.",
  ],
  streak: [
    "🔥 {streak} day streak! You're a legend!",
    "💎 {streak} day streak. Consistency is power!",
    "⚡ {streak} days in a row. Nothing stops you!",
  ],
  newUser: [
    "🎮 Welcome to Quest! Your adventure begins now.",
    "🚀 I'm Quest, your companion. Let's be amazing together!",
    "✨ Complete the assessment to discover your strengths.",
  ],
  lowScore: [
    "📈 {pillar} needs attention. I'll help you improve!",
    "💪 Small steps in {pillar} = big results.",
  ],
  highScore: [
    "🏆 Your {pillar} is shining! Keep it up.",
    "⭐ You're very strong in {pillar}. Inspire others!",
  ],
};

const MASCOT_MESSAGES_ES = {
  morning: [
    "¡Buenos días, campeón! 🌅 Hoy es un nuevo día para crecer.",
    "☀️ El amanecer trae nuevas oportunidades. ¡A conquistarlas!",
    "🌄 Cada mañana es una página en blanco. ¡Escribe algo épico!",
  ],
  afternoon: [
    "💪 ¡Sigue así! Ya has logrado mucho hoy.",
    "🔥 La tarde es perfecta para completar tus misiones.",
    "⚡ ¡Estás a mitad del camino! No te detengas.",
  ],
  evening: [
    "🌙 Termina el día fuerte. ¡Tú puedes!",
    "✨ La noche es joven y tú eres imparable.",
    "🌟 Reflexiona sobre tus logros de hoy.",
  ],
  streak: [
    "🔥 ¡{streak} días de racha! ¡Eres una leyenda!",
    "💎 Racha de {streak} días. ¡La consistencia es poder!",
    "⚡ {streak} días seguidos. ¡Nada te detiene!",
  ],
  newUser: [
    "🎮 ¡Bienvenido a Quest! Tu aventura comienza ahora.",
    "🚀 Soy Quest, tu compañero. ¡Vamos a ser increíbles juntos!",
    "✨ Completa el assessment para conocer tus fortalezas.",
  ],
  lowScore: [
    "📈 {pillar} necesita atención. ¡Te ayudaré a mejorar!",
    "💪 Pequeños pasos en {pillar} = grandes resultados.",
  ],
  highScore: [
    "🏆 ¡Tu {pillar} está brillando! Sigue así.",
    "⭐ Eres muy fuerte en {pillar}. ¡Inspira a otros!",
  ],
};

export const HomeScreen: React.FC = () => {
  const { mode, toggleTheme } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // Translation helper function
  const t = (en: string, es: string) => language === 'es' ? es : en;
  
  // Get mascot messages based on language
  const MASCOT_MESSAGES = language === 'es' ? MASCOT_MESSAGES_ES : MASCOT_MESSAGES_EN;
  
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pillars, setPillars] = useState<UserPillar[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [mascotBounce] = useState(new Animated.Value(0));
  const [fabPulse] = useState(new Animated.Value(1));
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [todayPenalties, setTodayPenalties] = useState<PenaltyLog[]>([]);
  const [aiMessage, setAiMessage] = useState<ProactiveMessage | null>(null);

  // Monitor for achievement and badge unlocks
  useAchievementMonitor({
    userId: userId || '',
    onAchievementUnlocked: (message) => setAiMessage(message),
  });

  useBadgeMonitor({
    userId: userId || '',
    onBadgeUnlocked: (message) => setAiMessage(message),
  });

  // FAB pulse animation
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(fabPulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fabPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  // Mascot bounce animation
  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(mascotBounce, {
          toValue: -8,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(mascotBounce, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(animate, 2000);
      });
    };
    animate();
  }, []);

  // Get contextual mascot message
  const getMascotMessage = useMemo(() => {
    const hour = new Date().getHours();
    let timeMessages: string[];
    
    if (hour >= 5 && hour < 12) {
      timeMessages = MASCOT_MESSAGES.morning;
    } else if (hour >= 12 && hour < 18) {
      timeMessages = MASCOT_MESSAGES.afternoon;
    } else {
      timeMessages = MASCOT_MESSAGES.evening;
    }

    // New user without assessment
    if (!profile?.assessment_completed) {
      return MASCOT_MESSAGES.newUser[Math.floor(Math.random() * MASCOT_MESSAGES.newUser.length)];
    }

    // High streak message
    if (profile?.current_streak && profile.current_streak >= 7) {
      const msg = MASCOT_MESSAGES.streak[Math.floor(Math.random() * MASCOT_MESSAGES.streak.length)];
      return msg.replace('{streak}', String(profile.current_streak));
    }

    // Find weakest pillar
    if (profile?.pillar_scores) {
      const scores = profile.pillar_scores;
      const weakest = Object.entries(scores).reduce((a, b) => a[1] < b[1] ? a : b);
      const strongest = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
      
      if (weakest[1] < 40) {
        const pillar = PILLARS.find(p => p.id === weakest[0]);
        const msg = MASCOT_MESSAGES.lowScore[Math.floor(Math.random() * MASCOT_MESSAGES.lowScore.length)];
        return msg.replace('{pillar}', pillar?.name || weakest[0]);
      }
      
      if (strongest[1] >= 80 && Math.random() > 0.5) {
        const pillar = PILLARS.find(p => p.id === strongest[0]);
        const msg = MASCOT_MESSAGES.highScore[Math.floor(Math.random() * MASCOT_MESSAGES.highScore.length)];
        return msg.replace('{pillar}', pillar?.name || strongest[0]);
      }
    }

    return timeMessages[Math.floor(Math.random() * timeMessages.length)];
  }, [profile]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Check for penalties from today
      checkTodayPenalties(user.id);      // Fetch profile with assessment fields
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, level, total_xp, quest_coins, current_streak, assessment_completed, pillar_scores')
        .eq('id', user.id)
        .single();

      // Create profile if doesn't exist
      if (profileError?.code === 'PGRST116') {
        const displayName = user.email?.split('@')[0] || 'Adventurer';
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ id: user.id, display_name: displayName })
          .select('display_name, level, total_xp, quest_coins, current_streak, assessment_completed, pillar_scores')
          .single();
        profileData = newProfile;

        // Create pillars
        await supabase.from('user_pillars').insert(
          PILLARS.map(p => ({ user_id: user.id, pillar_id: p.id }))
        );
      }

      setProfile(profileData);

      // Fetch pillars
      const { data: pillarsData } = await supabase
        .from('user_pillars')
        .select('pillar_id, level, current_xp')
        .eq('user_id', user.id);
      setPillars(pillarsData || []);

      // Fetch today's daily quests
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyQuestsData } = await supabase
        .from('user_daily_quests')
        .select('id, daily_quest:daily_quests(id, title, xp_reward, coin_reward, pillar_id), completed')
        .eq('user_id', user.id)
        .eq('assigned_date', today)
        .limit(3);
      
      const transformedDailyQuests = (dailyQuestsData || []).map((item: any) => ({
        id: item.id,
        title: item.daily_quest?.title || 'Quest',
        xp_reward: item.daily_quest?.xp_reward || 10,
        coin_reward: item.daily_quest?.coin_reward || 5,
        pillar_id: item.daily_quest?.pillar_id || 'physical',
        completed: item.completed,
      }));
      setDailyQuests(transformedDailyQuests);

      // Fetch active challenges
      const { data: challengesData } = await supabase
        .from('user_challenges')
        .select('id, challenge:challenges(id, title, pillar_id, xp_reward, icon)')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      // Transform data - Supabase returns challenge as array, we need object
      const transformedChallenges = (challengesData || []).map((item: any) => ({
        id: item.id,
        challenge: Array.isArray(item.challenge) ? item.challenge[0] : item.challenge,
      })).filter((item: any) => item.challenge);
      
      setActiveChallenges(transformedChallenges);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const xpToNextLevel = profile ? profile.level * 100 : 100;
  const xpProgress = profile ? (profile.total_xp % 100) / 100 : 0;

  const getPillarLevel = (pillarId: string) => {
    const pillar = pillars.find(p => p.pillar_id === pillarId);
    return pillar?.level || 1;
  };

  const checkTodayPenalties = async (uid: string) => {
    try {
      const stats = await PenaltyService.getUserPenaltyStats(uid, 1);
      if (stats && stats.recent_penalties.length > 0) {
        setTodayPenalties(stats.recent_penalties);
        // Show modal if there are penalties from today
        const today = new Date().toISOString().split('T')[0];
        const hasToday = stats.recent_penalties.some(
          p => p.penalty_date === today
        );
        if (hasToday) {
          setShowPenaltyModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking penalties:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchData} />
      }
    >
      {/* Penalty Warning Banner */}
      <PenaltyWarningBanner />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            {t('Welcome back,', 'Bienvenido de nuevo,')}
          </Text>
          <Text style={[styles.name, { color: theme.text }]}>
            {profile?.display_name || t('Adventurer', 'Aventurero')} 👋
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Achievements')} 
            style={styles.headerButton}
          >
            <Text style={{ fontSize: 22 }}>🏆</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Main', { screen: 'Profile' })} 
            style={styles.headerButton}
          >
            <Text style={{ fontSize: 22 }}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
            <Text style={{ fontSize: 22 }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quest Mascot Card */}
      <View style={[styles.mascotCard, { backgroundColor: theme.primary + '20' }]}>
        <View style={styles.mascotContainer}>
          <Animated.Text 
            style={[
              styles.mascotEmoji, 
              { transform: [{ translateY: mascotBounce }] }
            ]}
          >
            🤖
          </Animated.Text>
          <View style={styles.speechBubble}>
            <View style={[styles.bubbleArrow, { borderRightColor: theme.card }]} />
            <View style={[styles.bubbleContent, { backgroundColor: theme.card }]}>
              <Text style={[styles.mascotMessage, { color: theme.text }]}>
                {getMascotMessage}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={styles.statCardEmoji}>⚡</Text>
          <Text style={[styles.statCardValue, { color: theme.text }]}>
            {t('Lv', 'Nv')} {profile?.level || 1}
          </Text>
          <Text style={[styles.statCardLabel, { color: theme.textSecondary }]}>
            {t('Level', 'Nivel')}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={styles.statCardEmoji}>🔥</Text>
          <Text style={[styles.statCardValue, { color: '#EF4444' }]}>
            {profile?.current_streak || 0}
          </Text>
          <Text style={[styles.statCardLabel, { color: theme.textSecondary }]}>
            {t('Streak', 'Racha')}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={styles.statCardEmoji}>🪙</Text>
          <Text style={[styles.statCardValue, { color: '#F59E0B' }]}>
            {profile?.quest_coins || 0}
          </Text>
          <Text style={[styles.statCardLabel, { color: theme.textSecondary }]}>
            {t('Coins', 'Monedas')}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={styles.statCardEmoji}>⭐</Text>
          <Text style={[styles.statCardValue, { color: theme.primary }]}>
            {profile?.total_xp || 0}
          </Text>
          <Text style={[styles.statCardLabel, { color: theme.textSecondary }]}>
            {t('Total XP', 'XP Total')}
          </Text>
        </View>
      </View>

      {/* XP Progress Bar */}
      <View style={[styles.xpCard, { backgroundColor: theme.surface }]}>
        <View style={styles.xpHeader}>
          <Text style={[styles.xpTitle, { color: theme.text }]}>{t('Progress to Level', 'Progreso al Nivel')} {(profile?.level || 1) + 1}</Text>
          <Text style={[styles.xpAmount, { color: theme.primary }]}>
            {profile?.total_xp ? profile.total_xp % 100 : 0} / 100 XP
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
                width: `${xpProgress * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Today's Daily Quests */}
      {dailyQuests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🎯 {t("Today's Quests", 'Quests de Hoy')}</Text>
          {dailyQuests.map((quest) => {
            const pillar = PILLARS.find((p) => p.id === quest.pillar_id);
            return (
              <View
                key={quest.id}
                style={[
                  styles.dailyQuestCard, 
                  { 
                    backgroundColor: quest.completed ? theme.primary + '10' : theme.surface,
                    borderColor: quest.completed ? theme.primary : 'transparent',
                    borderWidth: quest.completed ? 1 : 0,
                  }
                ]}
              >
                <View style={[styles.dailyPillarDot, { backgroundColor: pillar?.color }]} />
                <Text style={styles.dailyEmoji}>{quest.completed ? '✅' : pillar?.emoji}</Text>
                <View style={styles.dailyQuestContent}>
                  <Text 
                    style={[
                      styles.dailyQuestTitle, 
                      { 
                        color: theme.text,
                        textDecorationLine: quest.completed ? 'line-through' : 'none',
                        opacity: quest.completed ? 0.6 : 1,
                      }
                    ]}
                    numberOfLines={1}
                  >
                    {quest.title}
                  </Text>
                  <View style={styles.dailyRewards}>
                    <Text style={[styles.dailyReward, { color: theme.primary }]}>+{quest.xp_reward} XP</Text>
                    <Text style={[styles.dailyReward, { color: '#F59E0B' }]}>+{quest.coin_reward} 🪙</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Pillars Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('Your Pillars', 'Tus Pilares')}</Text>
        <View style={styles.pillarsGrid}>
          {PILLARS.map((pillar) => {
            const pillarScore = profile?.pillar_scores?.[pillar.id] || 0;
            return (
              <TouchableOpacity
                key={pillar.id}
                style={[styles.pillarCard, { backgroundColor: theme.surface }]}
              >
                <Text style={styles.pillarEmoji}>{pillar.emoji}</Text>
                <Text style={[styles.pillarName, { color: theme.text }]}>
                  {language === 'es' ? pillar.nameEs : pillar.name}
                </Text>
                <Text style={[styles.pillarLevel, { color: pillar.color }]}>
                  {t('Lv', 'Nv')} {getPillarLevel(pillar.id)}
                </Text>
                {profile?.assessment_completed && (
                  <View style={[styles.pillarScoreBadge, { backgroundColor: pillar.color + '20' }]}>
                    <Text style={[styles.pillarScoreText, { color: pillar.color }]}>
                      {Math.round(pillarScore)}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Pillar Progress Chart */}
      {userId && (
        <PillarProgressChart userId={userId} theme={theme} />
      )}

      {/* Active Challenges */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('Active Quests', 'Quests Activas')} ({activeChallenges.length})
        </Text>
        {activeChallenges.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Text style={styles.emptyIcon}>⚔️</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t('No active quests. Go to Quests tab to start one!', '¡No hay quests activas. Ve a la pestaña Quests para comenzar una!')}
            </Text>
          </View>
        ) : (
          activeChallenges.map((item) => {
            const pillar = PILLARS.find((p) => p.id === item.challenge.pillar_id);
            return (
              <View
                key={item.id}
                style={[styles.challengeCard, { backgroundColor: theme.surface }]}
              >
                <View
                  style={[
                    styles.challengePillarIndicator,
                    { backgroundColor: pillar?.color },
                  ]}
                />
                <Text style={styles.challengeIcon}>{item.challenge.icon}</Text>
                <View style={styles.challengeContent}>
                  <Text style={[styles.challengeTitle, { color: theme.text }]}>
                    {item.challenge.title}
                  </Text>
                  <Text style={[styles.challengeXp, { color: theme.primary }]}>
                    +{item.challenge.xp_reward} XP
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#22C55E20' }]}>
                  <Text style={[styles.statusText, { color: '#22C55E' }]}>{t('Active', 'Activa')}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('Quick Actions', 'Acciones Rápidas')}</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate('LifePaths')}
          >
            <Text style={styles.quickActionIcon}>🎯</Text>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>{t('Paths', 'Rutas')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate('Agenda')}
          >
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>{t('Agenda', 'Agenda')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate('Duels')}
          >
            <Text style={styles.quickActionIcon}>⚔️</Text>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>{t('Duels', 'Duelos')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate('Raids')}
          >
            <Text style={styles.quickActionIcon}>🐉</Text>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>{t('Raids', 'Raids')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Assessment CTA if not completed */}
      {!profile?.assessment_completed && (
        <TouchableOpacity
          style={[styles.assessmentCta, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Assessment')}
        >
          <Text style={styles.ctaEmoji}>🎯</Text>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>{t('Complete Your Assessment', 'Completa tu Evaluación')}</Text>
            <Text style={styles.ctaSubtitle}>
              {t('Discover your strengths and areas to improve', 'Descubre tus fortalezas y áreas a mejorar')}
            </Text>
          </View>
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>
      )}
    </ScrollView>

    {/* Quest Coach FAB */}
    <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabPulse }] }]}>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('QuestCoach')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabEmoji}>🤖</Text>
      </TouchableOpacity>
    </Animated.View>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    padding: 8,
  },
  // Quest Mascot Card
  mascotCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  mascotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mascotEmoji: {
    fontSize: 56,
    marginRight: 12,
  },
  speechBubble: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubbleArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  bubbleContent: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  mascotMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statCardLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  // XP Progress Card
  xpCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  xpTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  xpAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Daily Quests
  dailyQuestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dailyPillarDot: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 10,
  },
  dailyEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  dailyQuestContent: {
    flex: 1,
  },
  dailyQuestTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  dailyRewards: {
    flexDirection: 'row',
    gap: 12,
  },
  dailyReward: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Pillar Score Badge
  pillarScoreBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pillarScoreText: {
    fontSize: 10,
    fontWeight: '600',
  },
  levelCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mascot: {
    fontSize: 48,
    marginRight: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  xpText: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statEmoji: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pillarCard: {
    width: (width - 52) / 3,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pillarEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  pillarName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  pillarLevel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  challengePillarIndicator: {
    width: 4,
    height: '100%',
  },
  challengeIcon: {
    fontSize: 24,
    marginLeft: 12,
  },
  challengeContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 12,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  challengeXp: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ScrollView
  scrollView: {
    flex: 1,
  },
  // Assessment CTA
  assessmentCta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  ctaEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  ctaArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabEmoji: {
    fontSize: 32,
  },
});

      {/* Penalty Notification Modal */}
      <PenaltyNotification
        visible={showPenaltyModal}
        penalties={todayPenalties}
        onClose={() => setShowPenaltyModal(false)}
      />

      {/* Quest AI Proactive Message Toast */}
      <QuestAIToast 
        message={aiMessage} 
        onDismiss={() => setAiMessage(null)}
        duration={4000}
      />
    </View>
  );
};
