import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type PricingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Pricing'>;

interface Props {
  navigation: PricingScreenNavigationProp;
}

const freeFeatures = [
  'Tareas y hábitos ilimitados',
  'Sistema de rachas básico',
  'XP y niveles',
  '100 Quest Coins al mes gratis',
  'Chat en guilds ilimitado',
  'Posts y reacciones',
  'Quest AI en 1 guild',
  'Notificaciones básicas (3 max)',
];

const premiumFeatures = [
  '✅ Todo de Free +',
  '🤖 Quest AI en guilds ilimitados',
  '💰 Quest Finanzas (control de gastos)',
  '📊 Análisis avanzado con gráficos',
  '🎯 Retos exclusivos premium',
  '🏆 Guild Wars y competencias',
  '👥 Party System (bonus cooperativo)',
  '🧙 Sistema de clases y habilidades',
  '🔔 Notificaciones personalizadas ilimitadas',
  '📈 Insights semanales con IA',
  '🎨 Temas visuales exclusivos',
  '💎 500 Quest Coins al mes',
  '🚀 Acceso anticipado a nuevas features',
];

export default function PricingScreen({ navigation }: Props) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const monthlyPrice = 4.99;
  const yearlyPrice = 39.99; // 2 meses gratis
  const yearlySavings = ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12) * 100).toFixed(0);

  const handleSubscribe = (plan: 'monthly' | 'yearly') => {
    Alert.alert(
      'Próximamente',
      'La integración con pagos estará disponible próximamente. Por ahora, disfruta Quest Free.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Elige tu plan</Text>
        <Text style={styles.headerSubtitle}>
          Empieza gratis. Actualiza cuando estés listo.
        </Text>
      </View>

      {/* Billing Period Toggle */}
      <View style={styles.billingToggle}>
        <TouchableOpacity
          style={[
            styles.billingOption,
            billingPeriod === 'monthly' && styles.billingOptionActive
          ]}
          onPress={() => setBillingPeriod('monthly')}
        >
          <Text
            style={[
              styles.billingOptionText,
              billingPeriod === 'monthly' && styles.billingOptionTextActive
            ]}
          >
            Mensual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.billingOption,
            billingPeriod === 'yearly' && styles.billingOptionActive
          ]}
          onPress={() => setBillingPeriod('yearly')}
        >
          <Text
            style={[
              styles.billingOptionText,
              billingPeriod === 'yearly' && styles.billingOptionTextActive
            ]}
          >
            Anual
          </Text>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsBadgeText}>Ahorra {yearlySavings}%</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Free Plan */}
      <View style={styles.planCard}>
        <Text style={styles.planName}>Free</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>$0</Text>
          <Text style={styles.priceUnit}>/mes</Text>
        </View>
        <Text style={styles.planDescription}>
          Perfecto para empezar tu aventura
        </Text>
        <View style={styles.featuresContainer}>
          {freeFeatures.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.subscribeButton, styles.freeButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.subscribeButtonText, styles.freeButtonText]}>
            Plan Actual
          </Text>
        </TouchableOpacity>
      </View>

      {/* Premium Plan */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={[styles.planCard, styles.premiumCard]}
      >
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
        </View>
        <Text style={[styles.planName, styles.premiumText]}>Premium</Text>
        <View style={styles.priceContainer}>
          <Text style={[styles.price, styles.premiumText]}>
            ${billingPeriod === 'monthly' ? monthlyPrice : (yearlyPrice / 12).toFixed(2)}
          </Text>
          <Text style={[styles.priceUnit, styles.premiumText]}>/mes</Text>
        </View>
        {billingPeriod === 'yearly' && (
          <Text style={[styles.planDescription, styles.premiumText]}>
            ${yearlyPrice}/año (facturado anualmente)
          </Text>
        )}
        <View style={styles.featuresContainer}>
          {premiumFeatures.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={[styles.featureIcon, styles.premiumText]}>✓</Text>
              <Text style={[styles.featureText, styles.premiumText]}>{feature}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.subscribeButton, styles.premiumButton]}
          onPress={() => handleSubscribe(billingPeriod)}
        >
          <Text style={styles.premiumButtonText}>
            Comenzar Premium
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* FAQ */}
      <View style={styles.faqSection}>
        <Text style={styles.faqTitle}>Preguntas frecuentes</Text>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>¿Puedo cancelar en cualquier momento?</Text>
          <Text style={styles.faqAnswer}>
            Sí, puedes cancelar tu suscripción cuando quieras. No hay contratos ni penalizaciones.
          </Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>¿Qué pasa con mis datos si cancelo?</Text>
          <Text style={styles.faqAnswer}>
            Todos tus datos se mantienen intactos. Simplemente perderás acceso a features premium.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 30,
    elevation: 2,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  billingOptionActive: {
    backgroundColor: '#667eea',
  },
  billingOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  billingOptionTextActive: {
    color: 'white',
  },
  savingsBadge: {
    backgroundColor: '#38f9d7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  premiumCard: {
    borderWidth: 3,
    borderColor: '#ffd700',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#ffd700',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  priceUnit: {
    fontSize: 18,
    color: '#6c757d',
    marginLeft: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 20,
  },
  premiumText: {
    color: 'white',
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 18,
    color: '#28a745',
    marginRight: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  freeButton: {
    backgroundColor: '#e9ecef',
  },
  freeButtonText: {
    color: '#6c757d',
  },
  premiumButton: {
    backgroundColor: 'white',
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  premiumButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  faqSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  faqTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
});
