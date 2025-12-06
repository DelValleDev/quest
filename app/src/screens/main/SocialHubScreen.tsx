import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { GuildsScreen } from './GuildsScreen';
import { LeaderboardScreen } from './LeaderboardScreen';

type SocialTab = 'feed' | 'friends' | 'guilds' | 'leaderboard';

export const SocialHubScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<SocialTab>('feed');

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const tabs: { id: SocialTab; icon: string; label: string }[] = [
    { id: 'feed', icon: '📰', label: t('Feed', 'Feed') },
    { id: 'friends', icon: '👥', label: t('Friends', 'Amigos') },
    { id: 'guilds', icon: '🛡️', label: t('Guilds', 'Gremios') },
    { id: 'leaderboard', icon: '🏆', label: t('Ranking', 'Ranking') },
  ];

  // Mock data
  const feedItems = [
    { id: '1', user: 'María García', avatar: '👩', action: t('completed a 7-day streak!', '¡completó una racha de 7 días!'), time: '2h', icon: '🔥' },
    { id: '2', user: 'Carlos Ruiz', avatar: '👨', action: t('leveled up to 25!', '¡subió al nivel 25!'), time: '4h', icon: '⬆️' },
    { id: '3', user: 'Ana López', avatar: '👩‍🦰', action: t('finished a Life Path milestone', 'completó un milestone de Life Path'), time: '6h', icon: '🎯' },
    { id: '4', user: 'Juan Pérez', avatar: '🧔', action: t('won a duel vs Pedro', 'ganó un duelo vs Pedro'), time: '8h', icon: '⚔️' },
  ];

  const friends = [
    { id: '1', name: 'María García', avatar: '👩', level: 32, streak: 14, online: true },
    { id: '2', name: 'Carlos Ruiz', avatar: '👨', level: 25, streak: 7, online: true },
    { id: '3', name: 'Ana López', avatar: '👩‍🦰', level: 41, streak: 30, online: false },
    { id: '4', name: 'Juan Pérez', avatar: '🧔', level: 18, streak: 3, online: false },
  ];

  const leaderboard = [
    { rank: 1, name: 'Ana López', avatar: '👩‍🦰', xp: 45200, level: 41 },
    { rank: 2, name: 'María García', avatar: '👩', xp: 38500, level: 32 },
    { rank: 3, name: 'Carlos Ruiz', avatar: '👨', xp: 28100, level: 25 },
    { rank: 4, name: 'You', avatar: '🦸', xp: 22400, level: 20, isYou: true },
    { rank: 5, name: 'Juan Pérez', avatar: '🧔', xp: 15800, level: 18 },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 8,
      gap: 8,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.surface,
      gap: 4,
    },
    tabActive: {
      backgroundColor: theme.primary,
    },
    tabIcon: {
      fontSize: 18,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabLabelActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 100,
    },
    // Feed styles
    feedItem: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      alignItems: 'center',
    },
    feedAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    feedAvatarText: {
      fontSize: 24,
    },
    feedContent: {
      flex: 1,
    },
    feedUser: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    feedAction: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },
    feedTime: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 4,
    },
    feedIcon: {
      fontSize: 24,
      marginLeft: 8,
    },
    // Friends styles
    friendCard: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      alignItems: 'center',
    },
    friendAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    friendAvatarText: {
      fontSize: 28,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.success,
      borderWidth: 2,
      borderColor: theme.surface,
    },
    offlineIndicator: {
      backgroundColor: theme.textMuted,
    },
    friendInfo: {
      flex: 1,
    },
    friendName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    friendStats: {
      flexDirection: 'row',
      marginTop: 4,
      gap: 12,
    },
    friendStat: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    friendActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.primary + '20',
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.primary,
    },
    // Guilds styles
    guildCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      alignItems: 'center',
    },
    guildIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    guildName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    guildMembers: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    joinButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    joinButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    comingSoonBadge: {
      backgroundColor: theme.warning + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginTop: 12,
    },
    comingSoonText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.warning,
    },
    comingSoonTitle: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    comingSoonSubtitle: {
      fontSize: 16,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    // Leaderboard styles
    leaderboardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    leaderboardItemYou: {
      borderWidth: 2,
      borderColor: theme.primary,
    },
    rank: {
      width: 32,
      fontSize: 18,
      fontWeight: '800',
      color: theme.textMuted,
      textAlign: 'center',
    },
    rankTop: {
      fontSize: 22,
    },
    rankGold: {
      color: '#FFD700',
    },
    rankSilver: {
      color: '#C0C0C0',
    },
    rankBronze: {
      color: '#CD7F32',
    },
    leaderAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 12,
    },
    leaderAvatarText: {
      fontSize: 24,
    },
    leaderInfo: {
      flex: 1,
    },
    leaderName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    leaderXP: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    leaderLevel: {
      alignItems: 'flex-end',
    },
    levelBadge: {
      backgroundColor: theme.primary + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    levelText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>🚧</Text>
            <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
              {t('Coming Soon', 'Próximamente')}
            </Text>
            <Text style={[styles.comingSoonSubtitle, { color: theme.textSecondary }]}>
              {t('Activity feed is under construction', 'El feed de actividad está en construcción')}
            </Text>
          </View>
        );

      case 'friends':
        return (
          <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>👥</Text>
            <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
              {t('Coming Soon', 'Próximamente')}
            </Text>
            <Text style={[styles.comingSoonSubtitle, { color: theme.textSecondary }]}>
              {t('Friends feature is coming soon!', '¡La función de amigos viene pronto!')}
            </Text>
          </View>
        );

      case 'guilds':
        return <GuildsScreen embedded navigation={navigation} />;

      case 'leaderboard':
        return <LeaderboardScreen embedded />;

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>👥 {t('Social', 'Social')}</Text>
        <Text style={styles.subtitle}>
          {t('Connect with your quest companions', 'Conecta con tus compañeros de quest')}
        </Text>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}
    </SafeAreaView>
  );
};
