import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';

// Menu sections with their items
const MENU_SECTIONS = {
  account: [
    { id: 'profile', icon: '👤', labelEn: 'My Profile', labelEs: 'Mi Perfil', screen: 'ProfileEdit' },
    { id: 'settings', icon: '⚙️', labelEn: 'Settings', labelEs: 'Configuración', screen: 'Settings' },
    { id: 'subscription', icon: '👑', labelEn: 'Subscription', labelEs: 'Suscripción', screen: 'Subscription' },
  ],
  progress: [
    { id: 'achievements', icon: '🏆', labelEn: 'Achievements', labelEs: 'Logros', screen: 'Achievements' },
    { id: 'stats', icon: '📊', labelEn: 'Statistics', labelEs: 'Estadísticas', screen: 'Stats' },
    { id: 'weekly', icon: '📅', labelEn: 'Weekly Review', labelEs: 'Resumen Semanal', screen: 'WeeklyReview' },
    { id: 'leaderboard', icon: '🥇', labelEn: 'Leaderboard', labelEs: 'Ranking', screen: 'Leaderboard' },
  ],
  social: [
    { id: 'friends', icon: '👥', labelEn: 'Friends', labelEs: 'Amigos', screen: 'Social' },
    { id: 'guilds', icon: '🛡️', labelEn: 'Guilds', labelEs: 'Gremios', screen: 'Guilds' },
    { id: 'duels', icon: '⚔️', labelEn: 'Duels', labelEs: 'Duelos', screen: 'Duels' },
    { id: 'raids', icon: '🐉', labelEn: 'Raids', labelEs: 'Raids', screen: 'Raids' },
  ],
  shop: [
    { id: 'shop', icon: '🛒', labelEn: 'Shop', labelEs: 'Tienda', screen: 'Shop' },
    { id: 'inventory', icon: '🎒', labelEn: 'Inventory', labelEs: 'Inventario', screen: 'Inventory' },
  ],
};

export const ProfileHubScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<any>();

  const t = (en: string, es: string) => language === 'es' ? es : en;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
      paddingTop: 60,
      paddingBottom: 100,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 3,
      borderColor: theme.primary,
    },
    avatarEmoji: {
      fontSize: 48,
    },
    userName: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 4,
    },
    userClass: {
      fontSize: 15,
      color: theme.primary,
      fontWeight: '600',
      marginBottom: 8,
    },
    levelBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 8,
    },
    levelText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    xpText: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
      marginLeft: 4,
    },
    menuCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuIcon: {
      fontSize: 22,
      marginRight: 14,
    },
    menuLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    menuArrow: {
      opacity: 0.5,
    },
    premiumBadge: {
      backgroundColor: '#F59E0B20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginRight: 8,
    },
    premiumText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#F59E0B',
    },
  });

  const renderMenuItem = (item: any, isLast: boolean) => {
    const isPremiumFeature = ['guilds', 'raids', 'duels'].includes(item.id);
    
    return (
      <TouchableOpacity 
        key={item.id}
        style={[styles.menuItem, isLast && styles.menuItemLast]}
        onPress={() => navigation.navigate(item.screen)}
      >
        <Text style={styles.menuIcon}>{item.icon}</Text>
        <Text style={styles.menuLabel}>
          {language === 'es' ? item.labelEs : item.labelEn}
        </Text>
        {isPremiumFeature && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>PRO</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} style={styles.menuArrow} />
      </TouchableOpacity>
    );
  };

  const classEmojis: Record<string, string> = {
    warrior: '⚔️',
    mage: '🔮',
    healer: '💚',
    rogue: '🗡️',
    ranger: '🏹',
  };

  // Profile data will be fetched from Supabase when screen is used
  const displayName = user?.email?.split('@')[0] || 'Adventurer';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>
              {classEmojis['warrior'] || '🧙'}
            </Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userClass}>
            {t('Warrior', 'Guerrero')}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv. 1</Text>
            <Text style={styles.xpText}>• 0 XP</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>🔥 0</Text>
            <Text style={styles.statLabel}>{t('Day Streak', 'Racha')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>💰 0</Text>
            <Text style={styles.statLabel}>{t('Coins', 'Monedas')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>💎 0</Text>
            <Text style={styles.statLabel}>{t('Gems', 'Gemas')}</Text>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Account', 'Cuenta')}</Text>
          <View style={styles.menuCard}>
            {MENU_SECTIONS.account.map((item, i) => 
              renderMenuItem(item, i === MENU_SECTIONS.account.length - 1)
            )}
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Progress', 'Progreso')}</Text>
          <View style={styles.menuCard}>
            {MENU_SECTIONS.progress.map((item, i) => 
              renderMenuItem(item, i === MENU_SECTIONS.progress.length - 1)
            )}
          </View>
        </View>

        {/* Social Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Social', 'Social')}</Text>
          <View style={styles.menuCard}>
            {MENU_SECTIONS.social.map((item, i) => 
              renderMenuItem(item, i === MENU_SECTIONS.social.length - 1)
            )}
          </View>
        </View>

        {/* Shop Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Shop', 'Tienda')}</Text>
          <View style={styles.menuCard}>
            {MENU_SECTIONS.shop.map((item, i) => 
              renderMenuItem(item, i === MENU_SECTIONS.shop.length - 1)
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileHubScreen;
