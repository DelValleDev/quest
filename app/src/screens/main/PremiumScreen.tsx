/**
 * PremiumScreen
 * Shows Free vs Premium comparison and subscription options
 */

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
import { useThemeStore, useLanguageStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { 
  PremiumService, 
  PREMIUM_FEATURES, 
  SUBSCRIPTION_PLANS,
  PremiumStatus 
} from '../../lib/premium';
import {
  initializeRevenueCat,
  getSubscriptionPackages,
  purchasePackage,
  restorePurchases,
  getSubscriptionStatus,
  RevenueCatPackage,
} from '../../lib/revenueCat';

interface FeatureRowProps {
  name: string;
  icon: string;
  freeValue: string;
  premiumValue: string;
  theme: any;
}

const FeatureRow: React.FC<FeatureRowProps> = ({ 
  name, icon, freeValue, premiumValue, theme 
}) => (
  <View style={[styles.featureRow, { borderBottomColor: theme.border }]}>
    <View style={styles.featureInfo}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={[styles.featureName, { color: theme.text }]}>{name}</Text>
    </View>
    <View style={styles.featureValues}>
      <Text style={[styles.freeValue, { color: theme.textSecondary }]}>
        {freeValue}
      </Text>
      <Text style={[styles.premiumValue, { color: '#10B981' }]}>
        {premiumValue}
      </Text>
    </View>
  </View>
);

export const PremiumScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const navigation = useNavigation();
  
  // Translation helper
  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [rcLoading, setRcLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    await Promise.all([loadStatus(), loadPackages()]);
  };

  const loadStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const premiumStatus = await PremiumService.getStatus(user.id, true);
        setStatus(premiumStatus);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await initializeRevenueCat(user.id);
        const rcPackages = await getSubscriptionPackages();
        setPackages(rcPackages);
        // Auto-select yearly if available
        const yearly = rcPackages.find(p => p.id.includes('yearly') || p.id.includes('annual'));
        if (yearly) setSelectedPlan(yearly.id);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setRcLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setPurchasing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const result = await PremiumService.startTrial(user.id);
      
      if (result.success) {
        Alert.alert(
          t('🎉 Premium Activated!', '🎉 ¡Premium Activado!'),
          t('You have 1 month free of all premium features. Enjoy!', 'Tienes 1 mes gratis de todas las funciones premium. ¡Disfrútalo!'),
          [{ text: t('Great', 'Genial'), onPress: () => navigation.goBack() }]
        );
        loadStatus();
      } else {
        Alert.alert(t('Notice', 'Aviso'), result.message);
      }
    } catch (error) {
      Alert.alert(t('Error', 'Error'), t('Could not activate trial', 'No se pudo activar la prueba'));
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    setPurchasing(true);
    try {
      const pkg = packages.find(p => p.id === packageId);
      if (!pkg) {
        Alert.alert(t('Error', 'Error'), t('Package not found', 'Paquete no encontrado'));
        return;
      }

      const result = await purchasePackage(pkg.rcPackage);
      
      if (result.success) {
        Alert.alert(
          t('🎉 Purchase Successful!', '🎉 ¡Compra Exitosa!'),
          t('Your Premium subscription is active. Enjoy all the features!', 'Tu suscripción Premium está activa. ¡Disfruta todas las funciones!'),
          [{ text: t('Great', 'Genial'), onPress: () => navigation.goBack() }]
        );
        loadStatus();
      } else if (!result.cancelled) {
        Alert.alert(t('Error', 'Error'), result.error || t('Could not complete purchase', 'No se pudo completar la compra'));
      }
    } catch (error: any) {
      Alert.alert(t('Error', 'Error'), error.message || t('Error processing purchase', 'Error procesando la compra'));
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    setPurchasing(true);
    try {
      const result = await restorePurchases();
      
      if (result.restored) {
        Alert.alert(
          t('✅ Purchases Restored', '✅ Compras Restauradas'),
          t('Your subscription has been restored successfully.', 'Tu suscripción ha sido restaurada exitosamente.'),
          [{ text: 'OK', onPress: () => loadStatus() }]
        );
      } else {
        Alert.alert(
          t('No Purchases', 'Sin Compras'),
          t('No previous purchases found to restore.', 'No se encontraron compras anteriores para restaurar.')
        );
      }
    } catch (error) {
      Alert.alert(t('Error', 'Error'), t('Could not restore purchases', 'No se pudieron restaurar las compras'));
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const features = [
    {
      name: t('Chat with Quest Coach', 'Chat con Quest Coach'),
      icon: '🤖',
      freeValue: t('5/day', '5/día'),
      premiumValue: t('Unlimited', 'Ilimitado'),
    },
    {
      name: t('AI Tools', 'Herramientas de IA'),
      icon: '🛠️',
      freeValue: '❌',
      premiumValue: '✅',
    },
    {
      name: 'Life Paths',
      icon: '🗺️',
      freeValue: '2',
      premiumValue: t('Unlimited', 'Ilimitados'),
    },
    {
      name: t('Habits', 'Hábitos'),
      icon: '🔄',
      freeValue: '5',
      premiumValue: t('Unlimited', 'Ilimitados'),
    },
    {
      name: t('Reminders', 'Recordatorios'),
      icon: '🔔',
      freeValue: '❌',
      premiumValue: '✅',
    },
    {
      name: t('Progress history', 'Historial de progreso'),
      icon: '📊',
      freeValue: t('7 days', '7 días'),
      premiumValue: t('1 year', '1 año'),
    },
    {
      name: t('Friends', 'Amigos'),
      icon: '👥',
      freeValue: '10',
      premiumValue: t('Unlimited', 'Ilimitados'),
    },
    {
      name: t('Create guilds', 'Crear gremios'),
      icon: '⚔️',
      freeValue: '❌',
      premiumValue: '✅',
    },
    {
      name: t('Create raids', 'Crear raids'),
      icon: '🐉',
      freeValue: '❌',
      premiumValue: '✅',
    },
    {
      name: t('Exclusive avatars', 'Avatares exclusivos'),
      icon: '🎭',
      freeValue: '❌',
      premiumValue: '✅',
    },
    {
      name: t('Custom quests', 'Quests personalizadas'),
      icon: '⚡',
      freeValue: t('1/week', '1/semana'),
      premiumValue: t('Unlimited', 'Ilimitadas'),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.crown}>👑</Text>
          <Text style={[styles.title, { color: theme.text }]}>Quest Premium</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('Unlock your full potential', 'Desbloquea todo tu potencial')}
          </Text>
        </View>

        {/* Current Status */}
        {status && (
          <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
            {status.isPremium ? (
              <>
                <Text style={styles.statusEmoji}>✨</Text>
                <View>
                  <Text style={[styles.statusTitle, { color: '#10B981' }]}>
                    Premium {status.premiumType === 'trial' ? t('(Trial)', '(Prueba)') : t('Active', 'Activo')}
                  </Text>
                  {status.daysLeft !== null && (
                    <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}>
                      {t(`${status.daysLeft} days remaining`, `${status.daysLeft} días restantes`)}
                    </Text>
                  )}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.statusEmoji}>🆓</Text>
                <View>
                  <Text style={[styles.statusTitle, { color: theme.text }]}>
                    {t('Free Plan', 'Plan Gratuito')}
                  </Text>
                  <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}>
                    {status.trialUsed ? t('Trial already used', 'Prueba ya usada') : t('Try 1 month free!', '¡Prueba 1 mes gratis!')}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Free Trial Button */}
        {status && !status.isPremium && !status.trialUsed && (
          <TouchableOpacity
            style={[styles.trialButton, { backgroundColor: '#10B981' }]}
            onPress={handleStartTrial}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.trialButtonText}>
                  🎁 {t('Start 1 Month Free', 'Empezar 1 Mes Gratis')}
                </Text>
                <Text style={styles.trialButtonSubtext}>
                  {t('No credit card required', 'Sin tarjeta de crédito')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Comparison Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableTitle, { color: theme.text }]}>
            {t('Plan Comparison', 'Comparación de Planes')}
          </Text>
          <View style={styles.tableLabels}>
            <Text style={[styles.tableLabel, { color: theme.textSecondary }]}>
              Free
            </Text>
            <Text style={[styles.tableLabel, { color: '#10B981' }]}>
              Premium
            </Text>
          </View>
        </View>

        {/* Features List */}
        <View style={[styles.featuresCard, { backgroundColor: theme.surface }]}>
          {features.map((feature, index) => (
            <FeatureRow
              key={index}
              {...feature}
              theme={theme}
            />
          ))}
        </View>

        {/* Subscription Plans from RevenueCat */}
        {(!status?.isPremium || status?.premiumType === 'trial') && (
          <View style={styles.plansSection}>
            <Text style={[styles.plansTitle, { color: theme.text }]}>
              {t('Choose your Plan', 'Elige tu Plan')}
            </Text>

            {rcLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : packages.length > 0 ? (
              <>
                {packages.map((pkg) => {
                  const isYearly = pkg.id.includes('yearly') || pkg.id.includes('annual');
                  const isLifetime = pkg.id.includes('lifetime');
                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[
                        styles.planCard,
                        { 
                          backgroundColor: theme.surface,
                          borderColor: selectedPlan === pkg.id ? theme.primary : theme.border,
                          borderWidth: selectedPlan === pkg.id ? 2 : 1,
                        }
                      ]}
                      onPress={() => setSelectedPlan(pkg.id)}
                    >
                      {isYearly && (
                        <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
                          <Text style={styles.popularText}>{t('Most Popular', 'Más Popular')}</Text>
                        </View>
                      )}
                      <View style={styles.planInfo}>
                        <Text style={[styles.planName, { color: theme.text }]}>
                          {pkg.title}
                        </Text>
                        {isYearly && (
                          <Text style={[styles.planSavings, { color: '#10B981' }]}>
                            {t('Save 50%', 'Ahorra 50%')}
                          </Text>
                        )}
                        {isLifetime && (
                          <Text style={[styles.planSavings, { color: '#10B981' }]}>
                            {t('One-time payment', 'Pago único')}
                          </Text>
                        )}
                      </View>
                      <View style={styles.planPrice}>
                        <Text style={[styles.priceText, { color: theme.text }]}>
                          {pkg.price}
                        </Text>
                        <Text style={[styles.periodText, { color: theme.textSecondary }]}>
                          {isLifetime ? t('forever', 'para siempre') : isYearly ? t('/year', '/año') : t('/month', '/mes')}
                        </Text>
                      </View>
                      <View 
                        style={[
                          styles.radioButton,
                          { 
                            borderColor: selectedPlan === pkg.id ? theme.primary : theme.border,
                            backgroundColor: selectedPlan === pkg.id ? theme.primary : 'transparent',
                          }
                        ]}
                      >
                        {selectedPlan === pkg.id && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              /* Fallback to static plans if RevenueCat fails */
              SUBSCRIPTION_PLANS.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    { 
                      backgroundColor: theme.surface,
                      borderColor: selectedPlan === plan.id ? theme.primary : theme.border,
                      borderWidth: selectedPlan === plan.id ? 2 : 1,
                    }
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.popularText}>{t('Most Popular', 'Más Popular')}</Text>
                    </View>
                  )}
                  <View style={styles.planInfo}>
                    <Text style={[styles.planName, { color: theme.text }]}>
                      {plan.name}
                    </Text>
                    {plan.savings && (
                      <Text style={[styles.planSavings, { color: '#10B981' }]}>
                        {plan.savings}
                      </Text>
                    )}
                  </View>
                  <View style={styles.planPrice}>
                    <Text style={[styles.priceText, { color: theme.text }]}>
                      {plan.priceDisplay}
                    </Text>
                    <Text style={[styles.periodText, { color: theme.textSecondary }]}>
                      {plan.period}
                    </Text>
                  </View>
                  <View 
                    style={[
                      styles.radioButton,
                      { 
                        borderColor: selectedPlan === plan.id ? theme.primary : theme.border,
                        backgroundColor: selectedPlan === plan.id ? theme.primary : 'transparent',
                      }
                    ]}
                  >
                    {selectedPlan === plan.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              style={[styles.purchaseButton, { backgroundColor: theme.primary }]}
              onPress={() => handlePurchase(selectedPlan)}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  {t('Subscribe Now', 'Suscribirse Ahora')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestorePurchases}
            >
              <Text style={[styles.restoreText, { color: theme.textSecondary }]}>
                {t('Restore previous purchases', 'Restaurar compras anteriores')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Legal */}
        <Text style={[styles.legal, { color: theme.textSecondary }]}>
          {t('By subscribing, you agree to our Terms of Service and Privacy Policy. Subscription renews automatically unless you cancel.', 'Al suscribirte, aceptas nuestros Términos de Servicio y Política de Privacidad. La suscripción se renueva automáticamente a menos que la canceles.')}
        </Text>
      </ScrollView>

      {/* Close button */}
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: theme.surface }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
  },
  crown: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  statusEmoji: {
    fontSize: 32,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  trialButton: {
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  trialButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  trialButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 12,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tableLabels: {
    flexDirection: 'row',
    gap: 32,
  },
  tableLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 60,
    textAlign: 'center',
  },
  featuresCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  featureIcon: {
    fontSize: 18,
  },
  featureName: {
    fontSize: 14,
    flex: 1,
  },
  featureValues: {
    flexDirection: 'row',
    gap: 20,
  },
  freeValue: {
    fontSize: 13,
    width: 60,
    textAlign: 'center',
  },
  premiumValue: {
    fontSize: 13,
    fontWeight: '600',
    width: 60,
    textAlign: 'center',
  },
  plansSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
  },
  planSavings: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  planPrice: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '800',
  },
  periodText: {
    fontSize: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  purchaseButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restoreText: {
    fontSize: 14,
  },
  legal: {
    fontSize: 11,
    textAlign: 'center',
    marginHorizontal: 32,
    marginTop: 24,
    lineHeight: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
  },
});

export default PremiumScreen;
