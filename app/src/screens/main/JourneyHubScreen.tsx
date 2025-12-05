import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { getTheme } from '../../theme/colors';
import { DailyQuestsScreen } from './DailyQuestsScreen';
import { ChallengesScreen } from './ChallengesScreen';
import { HabitsScreen } from './HabitsScreen';
import { LifePathsScreen } from './LifePathsScreen';
import { AgendaScreen } from './AgendaScreen';

const { width } = Dimensions.get('window');

type JourneyTab = 'today' | 'paths' | 'habits' | 'agenda';

export const JourneyHubScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<JourneyTab>('today');

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const tabs: { id: JourneyTab; icon: string; label: string }[] = [
    { id: 'today', icon: '📋', label: t('Today', 'Hoy') },
    { id: 'paths', icon: '🎯', label: t('Paths', 'Caminos') },
    { id: 'habits', icon: '🔄', label: t('Habits', 'Hábitos') },
    { id: 'agenda', icon: '📅', label: t('Agenda', 'Agenda') },
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: theme.surface,
      gap: 6,
    },
    tabActive: {
      backgroundColor: theme.primary,
    },
    tabIcon: {
      fontSize: 16,
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabLabelActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
    },
    comingSoon: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    comingSoonIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    comingSoonTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    comingSoonText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    pathsPreview: {
      padding: 20,
    },
    pathCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    pathHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    pathIcon: {
      fontSize: 32,
      marginRight: 12,
    },
    pathInfo: {
      flex: 1,
    },
    pathTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    pathPillar: {
      fontSize: 13,
      color: theme.primary,
      fontWeight: '600',
    },
    pathProgress: {
      marginTop: 12,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    progressText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 6,
    },
    milestonesList: {
      marginTop: 16,
    },
    milestone: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 10,
    },
    milestoneCheck: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    milestoneCheckCompleted: {
      backgroundColor: theme.success,
      borderColor: theme.success,
    },
    milestoneCheckText: {
      fontSize: 12,
      color: '#FFFFFF',
    },
    milestoneText: {
      fontSize: 14,
      color: theme.text,
      flex: 1,
    },
    milestoneTextCompleted: {
      textDecorationLine: 'line-through',
      color: theme.textMuted,
    },
    addPathButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary + '15',
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: theme.primary + '30',
      borderStyle: 'dashed',
      gap: 8,
    },
    addPathText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.primary,
    },
    agendaPreview: {
      padding: 20,
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    dayTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    dayDate: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    timeBlock: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    timeLabel: {
      width: 60,
      fontSize: 13,
      color: theme.textMuted,
      fontWeight: '500',
    },
    eventCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 14,
      borderLeftWidth: 3,
    },
    eventTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    eventType: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    // Achievement Log button
    logAchievementBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary + '15',
      marginHorizontal: 16,
      marginBottom: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.primary + '40',
      gap: 10,
    },
    logAchievementIcon: {
      fontSize: 20,
    },
    logAchievementText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.primary,
    },
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'today':
        return <DailyQuestsScreen embedded />;
      
      case 'paths':
        return <LifePathsScreen embedded />;
      
      case 'habits':
        return <HabitsScreen embedded />;
      
      case 'agenda':
        return <AgendaScreen embedded />;
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ {t('My Journey', 'Mi Viaje')}</Text>
        <Text style={styles.subtitle}>
          {t('Your path to becoming your best self', 'Tu camino para ser tu mejor versión')}
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

      {/* Log Achievement Button - visible on Today tab */}
      {activeTab === 'today' && (
        <TouchableOpacity 
          style={styles.logAchievementBtn}
          onPress={() => navigation.navigate('AchievementLog' as never)}
        >
          <Text style={styles.logAchievementIcon}>📝</Text>
          <Text style={styles.logAchievementText}>
            {t('Log an Achievement', 'Registrar un Logro')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};
