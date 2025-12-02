import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useThemeStore, useAuthStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  level: number;
  total_xp: number;
  quest_coins: number;
  user_class: string;
  current_streak: number;
  longest_streak: number;
  created_at: string;
}

interface UserPillar {
  pillar_id: string;
  level: number;
  current_xp: number;
  challenges_completed: number;
}

const CLASS_INFO: Record<string, { icon: string; name: string; color: string }> = {
  warrior: { icon: '⚔️', name: 'Warrior', color: '#EF4444' },
  sage: { icon: '📚', name: 'Sage', color: '#3B82F6' },
  connector: { icon: '🤝', name: 'Connector', color: '#EC4899' },
  creator: { icon: '🎨', name: 'Creator', color: '#F97316' },
};

const PILLAR_INFO: Record<string, { icon: string; name: string; color: string }> = {
  physical: { icon: '💪', name: 'Physical', color: '#EF4444' },
  mental: { icon: '🧠', name: 'Mental', color: '#3B82F6' },
  social: { icon: '👥', name: 'Social', color: '#EC4899' },
  professional: { icon: '💼', name: 'Professional', color: '#10B981' },
  spiritual: { icon: '✨', name: 'Spiritual', color: '#8B5CF6' },
  creative: { icon: '🎨', name: 'Creative', color: '#F97316' },
};

export const ProfileScreen: React.FC = () => {
  const { mode, toggleTheme } = useThemeStore();
  const { signOut } = useAuthStore();
  const theme = getTheme(mode);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pillars, setPillars] = useState<UserPillar[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, create it (for users registered before trigger)
      if (profileError?.code === 'PGRST116') {
        const displayName = user.email?.split('@')[0] || 'Adventurer';
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ id: user.id, display_name: displayName })
          .select()
          .single();
        
        if (createError) throw createError;
        profileData = newProfile;

        // Also create pillars for this user
        const pillarIds = ['physical', 'mental', 'social', 'professional', 'spiritual', 'creative'];
        await supabase.from('user_pillars').insert(
          pillarIds.map(pillar_id => ({ user_id: user.id, pillar_id }))
        );
      } else if (profileError) {
        throw profileError;
      }
      
      setProfile(profileData);

      // Fetch pillars
      const { data: pillarsData, error: pillarsError } = await supabase
        .from('user_pillars')
        .select('pillar_id, level, current_xp, challenges_completed')
        .eq('user_id', user.id);

      if (pillarsError) throw pillarsError;
      setPillars(pillarsData || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const xpForNextLevel = (level: number) => level * 100;
  const xpProgress = profile ? (profile.total_xp % 100) / 100 : 0;

  const classInfo = CLASS_INFO[profile?.user_class || 'warrior'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: theme.surface }]}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: classInfo?.color || theme.primary }]}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.levelText}>{profile?.level || 1}</Text>
          </View>
        </View>

        <Text style={[styles.displayName, { color: theme.text }]}>
          {profile?.display_name || 'Adventurer'}
        </Text>

        <View style={styles.classContainer}>
          <Text style={styles.classIcon}>{classInfo?.icon}</Text>
          <Text style={[styles.className, { color: classInfo?.color }]}>
            {classInfo?.name}
          </Text>
        </View>

        {/* XP Progress */}
        <View style={styles.xpContainer}>
          <View style={[styles.xpBar, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.xpProgress,
                { backgroundColor: theme.primary, width: `${xpProgress * 100}%` },
              ]}
            />
          </View>
          <Text style={[styles.xpText, { color: theme.textSecondary }]}>
            {profile?.total_xp || 0} XP • Next level: {xpForNextLevel(profile?.level || 1)} XP
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {profile?.current_streak || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Day Streak
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={styles.statIcon}>🪙</Text>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {profile?.quest_coins || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Quest Coins
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={styles.statIcon}>🏆</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {profile?.longest_streak || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Best Streak
          </Text>
        </View>
      </View>

      {/* Pillar Levels */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Pillar Levels
        </Text>
        <View style={styles.pillarsGrid}>
          {pillars.map((pillar) => {
            const info = PILLAR_INFO[pillar.pillar_id];
            return (
              <View key={pillar.pillar_id} style={styles.pillarItem}>
                <View
                  style={[styles.pillarIcon, { backgroundColor: info?.color + '20' }]}
                >
                  <Text style={styles.pillarEmoji}>{info?.icon}</Text>
                </View>
                <Text style={[styles.pillarName, { color: theme.textSecondary }]}>
                  {info?.name}
                </Text>
                <Text style={[styles.pillarLevel, { color: theme.text }]}>
                  Lv. {pillar.level}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Settings */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Settings
        </Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={toggleTheme}
        >
          <Text style={styles.settingIcon}>
            {mode === 'dark' ? '🌙' : '☀️'}
          </Text>
          <Text style={[styles.settingText, { color: theme.text }]}>
            {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </Text>
          <Text style={[styles.settingAction, { color: theme.primary }]}>
            Toggle
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={handleSignOut}
        >
          <Text style={styles.settingIcon}>🚪</Text>
          <Text style={[styles.settingText, { color: '#EF4444' }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={[styles.footer, { color: theme.textMuted }]}>
        Quest v1.0.0 • Made with 💜
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  headerCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 50,
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  classContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  classIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
  },
  xpContainer: {
    width: '100%',
  },
  xpBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpProgress: {
    height: '100%',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  pillarItem: {
    width: '30%',
    alignItems: 'center',
  },
  pillarIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pillarEmoji: {
    fontSize: 24,
  },
  pillarName: {
    fontSize: 11,
    marginBottom: 2,
  },
  pillarLevel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
  },
  settingAction: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
});
