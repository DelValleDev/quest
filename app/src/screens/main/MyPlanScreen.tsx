/**
 * MyPlanScreen
 * Shows current subscription status and upgrade options
 * More accessible than buried in Profile
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore, useLanguageStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { PremiumService, SUBSCRIPTION_PLANS, PremiumStatus } from '../../lib/premium';

export const MyPlanScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  
  // Translation helper
  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const premiumStatus = await PremiumService.getStatus(user.id);
      setStatus(premiumStatus);

      // Get subscription history
      const { data: history } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setSubscriptionHistory(history || []);
    } catch (error) {
      console.error('Error loading plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanName = (type: string) => {
    switch (type) {
      case 'free': return t('Free Plan', 'Plan Gratuito');
      case 'trial': return t('Premium Trial', 'Prueba Premium');
      case 'monthly': return t('Monthly Premium', 'Premium Mensual');
      case 'yearly': return t('Yearly Premium', 'Premium Anual');
      case 'lifetime': return t('Lifetime Premium', 'Premium de por Vida');
      default: return type;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.primary }]}>← {t('Back', 'Volver')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t('My Plan', 'Mi Plan')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current Plan Card */}
        <View style={[styles.planCard, { 
          backgroundColor: status?.isPremium ? '#F59E0B15' : theme.surface,
          borderColor: status?.isPremium ? '#F59E0B' : theme.border,
        }]}>
          <View style={styles.planHeader}>
            <Text style={styles.planIcon}>
              {status?.isPremium ? '👑' : '🆓'}
            </Text>
            <View style={styles.planInfo}>
              <Text style={[styles.planName, { color: status?.isPremium ? '#F59E0B' : theme.text }]}>
                {getPlanName(status?.premiumType || 'free')}
              </Text>
              {status?.isPremium && status.daysLeft && (
                <Text style={[styles.planExpiry, { color: theme.textSecondary }]}>
                  {status.premiumType === 'trial' 
                    ? t(`${status.daysLeft} trial days remaining`, `${status.daysLeft} días de prueba restantes`)
                    : status.premiumType !== 'lifetime'
                    ? t(`Expires in ${status.daysLeft} days`, `Expira en ${status.daysLeft} días`)
                    : t('No expiration', 'Sin expiración')
                  }
                </Text>
              )}
            </View>
          </View>

          {status?.isPremium ? (
            <View style={styles.benefitsList}>
              <Text style={[styles.benefitsTitle, { color: theme.text }]}>
                ✅ {t('You have access to:', 'Tienes acceso a:')}
              </Text>
              <Text style={[styles.benefitItem, { color: theme.textSecondary }]}>
                • {t('Unlimited AI chat', 'Chat ilimitado con IA')}
              </Text>
              <Text style={[styles.benefitItem, { color: theme.textSecondary }]}>
                • Quest Finanzas 💰
              </Text>
              <Text style={[styles.benefitItem, { color: theme.textSecondary }]}>
                • {t('Create raids and guilds', 'Crear raids y gremios')}
              </Text>
              <Text style={[styles.benefitItem, { color: theme.textSecondary }]}>
                • {t('Advanced analytics', 'Análisis avanzado')}
              </Text>
              <Text style={[styles.benefitItem, { color: theme.textSecondary }]}>
                • {t('Unlimited habits', 'Hábitos ilimitados')}
              </Text>
              <Text style={[styles.benefitItem, { color: theme.textSecondary }]}>
                • {t('AI in groups', 'IA en grupos')}
              </Text>
            </View>
          ) : (
            <View style={styles.upgradeSection}>
              <Text style={[styles.upgradeText, { color: theme.textSecondary }]}>
                {t('Unlock all premium features', 'Desbloquea todas las funciones premium')}
              </Text>
              <TouchableOpacity
                style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('Premium')}
              >
                <Text style={styles.upgradeButtonText}>
                  {status?.trialUsed ? t('👑 View Premium Plans', '👑 Ver Planes Premium') : t('🎁 Try Free 1 Month', '🎁 Probar Gratis 1 Mes')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Features Comparison */}
        {!status?.isPremium && (
          <View style={[styles.comparisonCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.comparisonTitle, { color: theme.text }]}>
              {t('What do you get with Premium?', '¿Qué obtienes con Premium?')}
            </Text>
            
            <View style={styles.featureRow}>
              <Text style={[styles.featureName, { color: theme.textSecondary }]}>{t('AI Chat', 'Chat con IA')}</Text>
              <Text style={[styles.featureFree, { color: theme.textMuted }]}>{t('5/day', '5/día')}</Text>
              <Text style={[styles.featurePremium, { color: '#F59E0B' }]}>{t('Unlimited', 'Ilimitado')}</Text>
            </View>
            
            <View style={styles.featureRow}>
              <Text style={[styles.featureName, { color: theme.textSecondary }]}>{t('Habits', 'Hábitos')}</Text>
              <Text style={[styles.featureFree, { color: theme.textMuted }]}>5</Text>
              <Text style={[styles.featurePremium, { color: '#F59E0B' }]}>{t('Unlimited', 'Ilimitados')}</Text>
            </View>
            
            <View style={styles.featureRow}>
              <Text style={[styles.featureName, { color: theme.textSecondary }]}>Life Paths</Text>
              <Text style={[styles.featureFree, { color: theme.textMuted }]}>2</Text>
              <Text style={[styles.featurePremium, { color: '#F59E0B' }]}>{t('Unlimited', 'Ilimitados')}</Text>
            </View>
            
            <View style={styles.featureRow}>
              <Text style={[styles.featureName, { color: theme.textSecondary }]}>Quest Finanzas</Text>
              <Text style={[styles.featureFree, { color: theme.textMuted }]}>❌</Text>
              <Text style={[styles.featurePremium, { color: '#F59E0B' }]}>✅</Text>
            </View>
            
            <View style={styles.featureRow}>
              <Text style={[styles.featureName, { color: theme.textSecondary }]}>Crear Raids</Text>
              <Text style={[styles.featureFree, { color: theme.textMuted }]}>❌</Text>
              <Text style={[styles.featurePremium, { color: '#F59E0B' }]}>✅</Text>
            </View>
            
            <View style={styles.featureRow}>
              <Text style={[styles.featureName, { color: theme.textSecondary }]}>IA en Grupos</Text>
              <Text style={[styles.featureFree, { color: theme.textMuted }]}>❌</Text>
              <Text style={[styles.featurePremium, { color: '#F59E0B' }]}>✅</Text>
            </View>
          </View>
        )}

        {/* Subscription History */}
        {subscriptionHistory.length > 0 && (
          <View style={[styles.historyCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.historyTitle, { color: theme.text }]}>
              Historial de Suscripciones
            </Text>
            
            {subscriptionHistory.map((sub, index) => (
              <View key={sub.id} style={[styles.historyItem, { borderBottomColor: theme.border }]}>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyType, { color: theme.text }]}>
                    {getPlanName(sub.subscription_type)}
                  </Text>
                  <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                    {formatDate(sub.created_at)}
                  </Text>
                </View>
                <View style={[styles.historyBadge, { 
                  backgroundColor: sub.status === 'active' ? '#10B98120' : theme.border 
                }]}>
                  <Text style={[styles.historyStatus, { 
                    color: sub.status === 'active' ? '#10B981' : theme.textMuted 
                  }]}>
                    {sub.status === 'active' ? 'Activa' : 
                     sub.status === 'expired' ? 'Expirada' :
                     sub.status === 'cancelled' ? 'Cancelada' : sub.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Cancel/Manage Button */}
        {status?.isPremium && status.premiumType !== 'lifetime' && (
          <TouchableOpacity
            style={[styles.manageButton, { borderColor: theme.border }]}
            onPress={() => {
              // TODO: Implement cancel/manage subscription
            }}
          >
            <Text style={[styles.manageButtonText, { color: theme.textSecondary }]}>
              Gestionar suscripción
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  planCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    marginBottom: 20,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  planIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  planExpiry: {
    fontSize: 14,
    marginTop: 4,
  },
  benefitsList: {
    marginTop: 8,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 15,
    marginBottom: 8,
    paddingLeft: 8,
  },
  upgradeSection: {
    alignItems: 'center',
    paddingTop: 8,
  },
  upgradeText: {
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
  upgradeButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  comparisonCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  featureName: {
    flex: 1,
    fontSize: 14,
  },
  featureFree: {
    width: 70,
    textAlign: 'center',
    fontSize: 13,
  },
  featurePremium: {
    width: 70,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  historyCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyInfo: {
    flex: 1,
  },
  historyType: {
    fontSize: 15,
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 12,
    marginTop: 2,
  },
  historyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  manageButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 15,
  },
});

export default MyPlanScreen;
