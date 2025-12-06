/**
 * PaywallModal Component
 * Shows when user tries to access a premium feature
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore, useLanguageStore } from '../store';
import { getTheme } from '../theme/colors';
import { PREMIUM_FEATURES, PremiumFeatureId } from '../lib/premium';

const { width } = Dimensions.get('window');

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  featureId?: PremiumFeatureId;
  customTitle?: string;
  customMessage?: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  featureId,
  customTitle,
  customMessage,
}) => {
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  
  // Translation helper
  const t = (en: string, es: string) => language === 'es' ? es : en;

  const feature = featureId ? PREMIUM_FEATURES[featureId] : null;

  const handleViewPlans = () => {
    onClose();
    navigation.navigate('Premium');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          {/* Crown */}
          <View style={[styles.crownContainer, { backgroundColor: '#F59E0B20' }]}>
            <Text style={styles.crown}>👑</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            {customTitle || t('Premium Feature', 'Función Premium')}
          </Text>

          {/* Feature info */}
          {feature && (
            <View style={[styles.featureCard, { backgroundColor: theme.surface }]}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureInfo}>
                <Text style={[styles.featureName, { color: theme.text }]}>
                  {feature.name}
                </Text>
                <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          )}

          {/* Message */}
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {customMessage || 
              t('This feature is only available for Premium users. Upgrade your plan to unlock all features.', 'Esta función está disponible solo para usuarios Premium. Actualiza tu plan para desbloquear todas las funcionalidades.')
            }
          </Text>

          {/* Benefits preview */}
          <View style={styles.benefits}>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={[styles.benefitText, { color: theme.text }]}>
                {t('Unlimited access to all features', 'Acceso ilimitado a todas las funciones')}
              </Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={[styles.benefitText, { color: theme.text }]}>
                {t('Unlimited chat with Quest Coach', 'Chat ilimitado con Quest Coach')}
              </Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={[styles.benefitText, { color: theme.text }]}>
                {t('Unlimited Life Paths and habits', 'Life Paths y hábitos ilimitados')}
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleViewPlans}
          >
            <Text style={styles.primaryButtonText}>
              👑 {t('View Premium Plans', 'Ver Planes Premium')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onClose}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
              {t('Not now', 'Ahora no')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Hook for easy paywall usage
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PremiumService } from '../lib/premium';

export const usePaywall = () => {
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<PremiumFeatureId | undefined>();
  const [paywallMessage, setPaywallMessage] = useState<string | undefined>();

  const checkFeature = useCallback(async (
    featureId: PremiumFeatureId,
    onAllowed?: () => void
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const result = await PremiumService.canUseFeature(user.id, featureId);

      if (result.allowed) {
        onAllowed?.();
        return true;
      }

      setPaywallFeature(featureId);
      setPaywallMessage(result.reason);
      setShowPaywall(true);
      return false;
    } catch (error) {
      console.error('Error checking feature:', error);
      return false;
    }
  }, []);

  const closePaywall = useCallback(() => {
    setShowPaywall(false);
    setPaywallFeature(undefined);
    setPaywallMessage(undefined);
  }, []);

  const PaywallComponent = useCallback(() => (
    <PaywallModal
      visible={showPaywall}
      onClose={closePaywall}
      featureId={paywallFeature}
      customMessage={paywallMessage}
    />
  ), [showPaywall, paywallFeature, paywallMessage, closePaywall]);

  return {
    checkFeature,
    showPaywall,
    closePaywall,
    PaywallComponent,
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: width - 48,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  crownContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  crown: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
    gap: 12,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  benefits: {
    width: '100%',
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  benefitIcon: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 14,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
  },
});

export default PaywallModal;
