import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore, useAuthStore, useLanguageStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { PremiumService } from '../../lib/premium';

// Pillar limits by plan
const FREE_PILLAR_LIMIT = 2;
const PREMIUM_WARNING_THRESHOLD = 4;

interface PillarInfo {
  id: string;
  emoji: string;
  name: string;
  nameEs: string;
  color: string;
  description: string;
  descriptionEs: string;
}

const PILLARS: PillarInfo[] = [
  {
    id: 'physical',
    emoji: '💪',
    name: 'Physical',
    nameEs: 'Físico',
    color: '#EF4444',
    description: 'Body, health, fitness, nutrition, sleep',
    descriptionEs: 'Cuerpo, salud, fitness, nutrición, sueño',
  },
  {
    id: 'mental',
    emoji: '🧠',
    name: 'Mental',
    nameEs: 'Mental',
    color: '#3B82F6',
    description: 'Mind, focus, learning, mental health',
    descriptionEs: 'Mente, enfoque, aprendizaje, salud mental',
  },
  {
    id: 'social',
    emoji: '❤️',
    name: 'Social',
    nameEs: 'Social',
    color: '#EC4899',
    description: 'Relationships, family, friends, community',
    descriptionEs: 'Relaciones, familia, amigos, comunidad',
  },
  {
    id: 'professional',
    emoji: '💼',
    name: 'Professional',
    nameEs: 'Profesional',
    color: '#10B981',
    description: 'Career, finances, skills, growth',
    descriptionEs: 'Carrera, finanzas, habilidades, crecimiento',
  },
  {
    id: 'spiritual',
    emoji: '✨',
    name: 'Spiritual',
    nameEs: 'Espiritual',
    color: '#8B5CF6',
    description: 'Purpose, values, inner peace, connection',
    descriptionEs: 'Propósito, valores, paz interior, conexión',
  },
  {
    id: 'creative',
    emoji: '🎨',
    name: 'Creative',
    nameEs: 'Creativo',
    color: '#F97316',
    description: 'Creativity, hobbies, art, expression',
    descriptionEs: 'Creatividad, hobbies, arte, expresión',
  },
];

interface UserPillarData {
  pillar_id: string;
  level: number;
  current_xp: number;
  is_active: boolean;
  inactive_xp: number;
}

export const ManagePillarsScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const navigation = useNavigation();

  const [userPillars, setUserPillars] = useState<UserPillarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // Translation helper
  const t = (en: string, es: string) => language === 'es' ? es : en;

  useEffect(() => {
    fetchPillars();
    checkPremium();
  }, []);

  const checkPremium = async () => {
    if (user?.id) {
      const status = await PremiumService.getStatus(user.id);
      setIsPremium(status.isPremium);
    }
  };

  const fetchPillars = async () => {
    try {
      const { data, error } = await supabase
        .from('user_pillars')
        .select('pillar_id, level, current_xp, is_active, inactive_xp')
        .eq('user_id', user?.id);

      if (error) throw error;
      
      // Default is_active to true for backwards compatibility
      const pillarsWithDefaults = (data || []).map(p => ({
        ...p,
        is_active: p.is_active ?? true,
        inactive_xp: p.inactive_xp ?? 0,
      }));
      
      setUserPillars(pillarsWithDefaults);
    } catch (error) {
      console.error('Error fetching pillars:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePillar = async (pillarId: string) => {
    const pillar = userPillars.find(p => p.pillar_id === pillarId);
    if (!pillar) return;

    const newIsActive = !pillar.is_active;
    const currentActiveCount = userPillars.filter(p => p.is_active).length;
    
    // Check if at least one pillar will remain active
    const activePillarsAfter = userPillars.filter(p => 
      p.pillar_id === pillarId ? newIsActive : p.is_active
    ).length;
    
    if (activePillarsAfter === 0) {
      Alert.alert(
        t('Cannot Deactivate', 'No se puede desactivar'),
        t('You must have at least one active pillar.', 'Debes tener al menos un pilar activo.')
      );
      return;
    }

    // Check free user limit when activating
    if (newIsActive && !isPremium && currentActiveCount >= FREE_PILLAR_LIMIT) {
      Alert.alert(
        t('Free Plan Limit', 'Límite del Plan Gratuito'),
        t(
          `Free users can focus on up to ${FREE_PILLAR_LIMIT} pillars. Upgrade to Premium for unlimited focus areas!`,
          `Los usuarios gratuitos pueden enfocarse en hasta ${FREE_PILLAR_LIMIT} pilares. ¡Actualiza a Premium para áreas ilimitadas!`
        ),
        [
          { text: t('OK', 'OK'), style: 'cancel' },
          { 
            text: t('Go Premium', 'Ir a Premium'), 
            onPress: () => (navigation as any).navigate('Premium')
          }
        ]
      );
      return;
    }

    // Warn premium users if selecting more than threshold
    if (newIsActive && isPremium && currentActiveCount >= PREMIUM_WARNING_THRESHOLD) {
      Alert.alert(
        t('Focus Warning', 'Advertencia de Enfoque'),
        t(
          'Having more than 4 active pillars means less focus on each one. Quality over quantity! Continue?',
          'Tener más de 4 pilares activos significa menos enfoque en cada uno. ¡Calidad sobre cantidad! ¿Continuar?'
        ),
        [
          { text: t('Cancel', 'Cancelar'), style: 'cancel' },
          { 
            text: t('Continue', 'Continuar'), 
            onPress: () => executeToggle(pillarId, newIsActive)
          }
        ]
      );
      return;
    }

    executeToggle(pillarId, newIsActive);
  };

  const executeToggle = async (pillarId: string, newIsActive: boolean) => {
    setSaving(true);
    try {
      if (newIsActive) {
        // Activating: apply inactive_xp
        await supabase.rpc('activate_pillar', {
          p_user_id: user?.id,
          p_pillar_id: pillarId,
        });
      } else {
        // Deactivating
        await supabase.rpc('deactivate_pillar', {
          p_user_id: user?.id,
          p_pillar_id: pillarId,
        });
      }

      // Update local state
      setUserPillars(prev => prev.map(p => 
        p.pillar_id === pillarId 
          ? { ...p, is_active: newIsActive, inactive_xp: newIsActive ? 0 : p.inactive_xp }
          : p
      ));
    } catch (error) {
      console.error('Error toggling pillar:', error);
      // Fallback: direct update if RPC doesn't exist yet
      try {
        await supabase
          .from('user_pillars')
          .update({ is_active: newIsActive })
          .eq('user_id', user?.id)
          .eq('pillar_id', pillarId);
        
        setUserPillars(prev => prev.map(p => 
          p.pillar_id === pillarId ? { ...p, is_active: newIsActive } : p
        ));
      } catch (fallbackError) {
        Alert.alert(t('Error', 'Error'), t('Could not update pillar.', 'No se pudo actualizar el pilar.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const activePillars = userPillars.filter(p => p.is_active);
  const inactivePillars = userPillars.filter(p => !p.is_active);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      padding: 8,
      marginRight: 8,
    },
    backText: {
      fontSize: 24,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    sectionHeader: {
      marginTop: 20,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
    },
    pillarCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginBottom: 10,
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderWidth: 2,
    },
    pillarEmoji: {
      fontSize: 32,
      marginRight: 14,
    },
    pillarInfo: {
      flex: 1,
    },
    pillarName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    pillarDescription: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    pillarLevel: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '500',
      marginTop: 4,
    },
    pillarRight: {
      alignItems: 'center',
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    inactiveXpBadge: {
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: theme.primary + '20',
    },
    inactiveXpText: {
      fontSize: 10,
      color: theme.primary,
      fontWeight: '500',
    },
    emptyText: {
      textAlign: 'center',
      color: theme.textSecondary,
      fontStyle: 'italic',
      paddingVertical: 20,
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    hint: {
      textAlign: 'center',
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('Manage Pillars', 'Gestionar Pilares')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Pillars */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('Active Pillars', 'Pilares Activos')} ({activePillars.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            {t('These pillars earn XP and level up', 'Estos pilares ganan XP y suben de nivel')}
          </Text>
        </View>

        {activePillars.length === 0 ? (
          <Text style={styles.emptyText}>
            {t('No active pillars', 'Sin pilares activos')}
          </Text>
        ) : (
          activePillars.map(pillar => {
            const info = PILLARS.find(p => p.id === pillar.pillar_id);
            if (!info) return null;
            return (
              <TouchableOpacity
                key={pillar.pillar_id}
                style={[styles.pillarCard, { borderColor: info.color }]}
                onPress={() => togglePillar(pillar.pillar_id)}
                disabled={saving}
              >
                <Text style={styles.pillarEmoji}>{info.emoji}</Text>
                <View style={styles.pillarInfo}>
                  <Text style={styles.pillarName}>
                    {language === 'es' ? info.nameEs : info.name}
                  </Text>
                  <Text style={styles.pillarDescription}>
                    {language === 'es' ? info.descriptionEs : info.description}
                  </Text>
                  <Text style={styles.pillarLevel}>
                    {t('Level', 'Nivel')} {pillar.level} • {pillar.current_xp} XP
                  </Text>
                </View>
                <View style={styles.pillarRight}>
                  <View style={[styles.statusBadge, { backgroundColor: info.color }]}>
                    <Text style={styles.statusText}>
                      {t('Active', 'Activo')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Inactive Pillars */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('Inactive Pillars', 'Pilares Inactivos')} ({inactivePillars.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            {t('XP is saved for when you activate them', 'El XP se guarda para cuando los actives')}
          </Text>
        </View>

        {inactivePillars.length === 0 ? (
          <Text style={styles.emptyText}>
            {t('All pillars are active', 'Todos los pilares están activos')}
          </Text>
        ) : (
          inactivePillars.map(pillar => {
            const info = PILLARS.find(p => p.id === pillar.pillar_id);
            if (!info) return null;
            return (
              <TouchableOpacity
                key={pillar.pillar_id}
                style={[styles.pillarCard, { borderColor: theme.border, opacity: 0.8 }]}
                onPress={() => togglePillar(pillar.pillar_id)}
                disabled={saving}
              >
                <Text style={[styles.pillarEmoji, { opacity: 0.6 }]}>{info.emoji}</Text>
                <View style={styles.pillarInfo}>
                  <Text style={styles.pillarName}>
                    {language === 'es' ? info.nameEs : info.name}
                  </Text>
                  <Text style={styles.pillarDescription}>
                    {language === 'es' ? info.descriptionEs : info.description}
                  </Text>
                  <Text style={styles.pillarLevel}>
                    {t('Level', 'Nivel')} {pillar.level} • {pillar.current_xp} XP
                  </Text>
                </View>
                <View style={styles.pillarRight}>
                  <View style={[styles.statusBadge, { backgroundColor: theme.border }]}>
                    <Text style={styles.statusText}>
                      {t('Tap to activate', 'Toca para activar')}
                    </Text>
                  </View>
                  {pillar.inactive_xp > 0 && (
                    <View style={styles.inactiveXpBadge}>
                      <Text style={styles.inactiveXpText}>
                        +{pillar.inactive_xp} XP {t('pending', 'pendiente')}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.hint}>
          💡 {t(
            'Focus on 2-3 pillars at a time for better results. Inactive pillars still earn XP from group quests!',
            'Enfócate en 2-3 pilares a la vez para mejores resultados. ¡Los pilares inactivos siguen ganando XP de quests grupales!'
          )}
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default ManagePillarsScreen;
