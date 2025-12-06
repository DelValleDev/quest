import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlocked_at?: string;
  progress?: { current: number; target: number };
}

export default function BadgesScreen() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [filter]);

  const fetchBadges = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('achievements')
        .select(`
          *,
          user_achievement:user_achievements(unlocked_at)
        `)
        .order('display_order');

      const badgesData: Badge[] = data?.map(badge => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
        unlocked: !!badge.user_achievement?.unlocked_at,
        unlocked_at: badge.user_achievement?.unlocked_at,
      })) || [];

      // Apply filter
      let filtered = badgesData;
      if (filter === 'unlocked') {
        filtered = badgesData.filter(b => b.unlocked);
      } else if (filter === 'locked') {
        filtered = badgesData.filter(b => !b.unlocked);
      }

      setBadges(filtered);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#95a5a6';
      case 'rare': return '#3498db';
      case 'epic': return '#9b59b6';
      case 'legendary': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'Común';
      case 'rare': return 'Rara';
      case 'epic': return 'Épica';
      case 'legendary': return 'Legendaria';
      default: return 'Común';
    }
  };

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const totalCount = badges.length;
  const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando badges...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Badges</Text>
        <Text style={styles.subtitle}>
          {unlockedCount} / {totalCount} desbloqueadas ({completionPercentage.toFixed(0)}%)
        </Text>
        
        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        {(['all', 'unlocked', 'locked'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todas' : f === 'unlocked' ? 'Desbloqueadas' : 'Bloqueadas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Badges Grid */}
      <ScrollView style={styles.content} contentContainerStyle={styles.badgesGrid}>
        {badges.map(badge => (
          <View key={badge.id} style={[
            styles.badgeCard,
            !badge.unlocked && styles.badgeCardLocked
          ]}>
            <Text style={styles.badgeIcon}>{badge.icon}</Text>
            <Text style={styles.badgeName}>{badge.name}</Text>
            <Text style={styles.badgeDescription}>{badge.description}</Text>
            
            <View style={[
              styles.rarityBadge,
              { backgroundColor: getRarityColor(badge.rarity) }
            ]}>
              <Text style={styles.rarityText}>{getRarityLabel(badge.rarity)}</Text>
            </View>

            {badge.unlocked && badge.unlocked_at && (
              <Text style={styles.unlockedDate}>
                Desbloqueada: {new Date(badge.unlocked_at).toLocaleDateString()}
              </Text>
            )}

            {!badge.unlocked && badge.progress && (
              <View style={styles.badgeProgress}>
                <Text style={styles.badgeProgressText}>
                  {badge.progress.current} / {badge.progress.target}
                </Text>
                <View style={styles.badgeProgressBar}>
                  <View style={[
                    styles.badgeProgressFill,
                    { width: `${(badge.progress.current / badge.progress.target) * 100}%` }
                  ]} />
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    paddingTop: 40,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  filterTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  badgesGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  badgeCardLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDescription: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 12,
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  unlockedDate: {
    fontSize: 10,
    color: '#28a745',
    fontWeight: '600',
  },
  badgeProgress: {
    width: '100%',
    marginTop: 8,
  },
  badgeProgressText: {
    fontSize: 10,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeProgressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: '#667eea',
  },
});
