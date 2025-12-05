import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { getTheme } from '../../theme/colors';
import { useFocusEffect } from '@react-navigation/native';

// Import existing screens as components
import { DailyQuestsScreen } from './DailyQuestsScreen';
import { ChallengesScreen } from './ChallengesScreen';

const { width } = Dimensions.get('window');

type TabType = 'daily' | 'challenges' | 'habits';

export const QuestsHubScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  
  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [activeTab, setActiveTab] = useState<TabType>('daily');

  const tabs: { id: TabType; label: string; emoji: string }[] = [
    { id: 'daily', label: t('Today', 'Hoy'), emoji: '📋' },
    { id: 'challenges', label: t('Challenges', 'Retos'), emoji: '⚔️' },
    { id: 'habits', label: t('Habits', 'Hábitos'), emoji: '🔄' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 16,
    },
    tabsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.surface,
      gap: 6,
    },
    tabActive: {
      backgroundColor: theme.primary,
    },
    tabEmoji: {
      fontSize: 16,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: '#FFF',
    },
    content: {
      flex: 1,
    },
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'daily':
        return <DailyQuestsScreen embedded />;
      case 'challenges':
        return <ChallengesScreen embedded />;
      case 'habits':
        return <HabitsContent theme={theme} t={t} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with tabs */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('My Quests', 'Mis Quests')} ⚔️</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

// Habits content placeholder
const HabitsContent: React.FC<{ theme: any; t: (en: string, es: string) => string }> = ({ theme, t }) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emoji: {
      fontSize: 64,
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔄</Text>
      <Text style={styles.title}>{t('Habits Coming Soon', 'Hábitos Próximamente')}</Text>
      <Text style={styles.subtitle}>
        {t(
          'Your recurring habits will appear here, connected to your Life Paths',
          'Tus hábitos recurrentes aparecerán aquí, conectados a tus Caminos de Vida'
        )}
      </Text>
    </View>
  );
};

export default QuestsHubScreen;
