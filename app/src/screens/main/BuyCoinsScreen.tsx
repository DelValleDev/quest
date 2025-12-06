import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeStore, useAuthStore, useLanguageStore } from "../../store";
import { getTheme } from "../../theme/colors";
import {
  Payments,
  QUEST_COINS_PRODUCTS,
  SUBSCRIPTION_PRODUCTS,
  type CoinsProductId,
  type SubscriptionProductId,
} from "../../lib/payments";
import type { RootStackParamList } from "../../../App";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const BuyCoinsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  
  // Translation helper
  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CoinsProductId | null>(
    null
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const balance = await Payments.getCoinBalance(user.id);
      setCurrentBalance(balance);
    } catch (error) {
      console.error("Failed to load balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user || !selectedProduct) return;

    setPurchasing(true);
    setShowConfirmModal(false);

    try {
      const result = await Payments.purchaseCoins(user.id, selectedProduct);

      if (result.success) {
        const product = QUEST_COINS_PRODUCTS[selectedProduct];
        const totalCoins = product.amount + product.bonus;

        Alert.alert(
          t('🎉 Purchase successful!', '🎉 ¡Compra exitosa!'),
          t(`You received ${totalCoins.toLocaleString()} Quest Coins`, `Has recibido ${totalCoins.toLocaleString()} Quest Coins`),
          [{ text: t('Awesome!', '¡Genial!'), onPress: loadBalance }]
        );
      } else {
        Alert.alert(t('Error', 'Error'), result.error || t('Could not complete purchase', 'No se pudo completar la compra'));
      }
    } catch (error: any) {
      Alert.alert(t('Error', 'Error'), error.message || t('Error processing purchase', 'Error al procesar la compra'));
    } finally {
      setPurchasing(false);
      setSelectedProduct(null);
    }
  };

  const openConfirmModal = (productId: CoinsProductId) => {
    setSelectedProduct(productId);
    setShowConfirmModal(true);
  };

  const renderCoinPackage = (productId: CoinsProductId) => {
    const product = QUEST_COINS_PRODUCTS[productId];
    const totalCoins = product.amount + product.bonus;

    return (
      <TouchableOpacity
        key={productId}
        style={[
          styles.packageCard,
          {
            backgroundColor: theme.surface,
            borderColor: product.popular
              ? "#F59E0B"
              : product.bestValue
                ? "#22C55E"
                : theme.border,
            borderWidth: product.popular || product.bestValue ? 2 : 1,
          },
        ]}
        onPress={() => openConfirmModal(productId)}
        disabled={purchasing}
      >
        {/* Badge */}
        {product.popular && (
          <View style={[styles.badge, { backgroundColor: "#F59E0B" }]}>
            <Text style={styles.badgeText}>⭐ {t('POPULAR', 'POPULAR')}</Text>
          </View>
        )}
        {product.bestValue && (
          <View style={[styles.badge, { backgroundColor: "#22C55E" }]}>
            <Text style={styles.badgeText}>💎 {t('BEST VALUE', 'MEJOR VALOR')}</Text>
          </View>
        )}

        {/* Icon */}
        <Text style={styles.packageIcon}>{product.icon}</Text>

        {/* Amount */}
        <Text style={[styles.packageAmount, { color: theme.text }]}>
          {product.amount.toLocaleString()}
        </Text>

        {/* Bonus */}
        {product.bonus > 0 && (
          <Text style={[styles.packageBonus, { color: "#22C55E" }]}>
            +{product.bonus.toLocaleString()} BONUS
          </Text>
        )}

        {/* Total */}
        <Text style={[styles.packageTotal, { color: theme.textSecondary }]}>
          = {totalCoins.toLocaleString()} QC
        </Text>

        {/* Price */}
        <View style={[styles.priceContainer, { backgroundColor: theme.primary }]}>
          <Text style={styles.priceText}>${product.priceUSD} USD</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={[styles.backText, { color: theme.primary }]}>
            ← {t('Back', 'Volver')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('Buy Quest Coins', 'Comprar Quest Coins')}
        </Text>
      </View>

      {/* Current Balance */}
      <View
        style={[styles.balanceCard, { backgroundColor: theme.primary + "20" }]}
      >
        <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
          {t('Your current balance', 'Tu balance actual')}
        </Text>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceIcon}>🪙</Text>
          <Text style={[styles.balanceAmount, { color: theme.primary }]}>
            {currentBalance.toLocaleString()}
          </Text>
          <Text style={[styles.balanceUnit, { color: theme.text }]}>QC</Text>
        </View>
      </View>

      {/* Packages */}
      <ScrollView
        contentContainerStyle={styles.packagesContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('Choose a package', 'Elige un paquete')}
        </Text>

        <View style={styles.packagesGrid}>
          {(Object.keys(QUEST_COINS_PRODUCTS) as CoinsProductId[]).map(
            renderCoinPackage
          )}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: theme.textMuted }]}>
            💡 {t('Quest Coins can be used for:', 'Los Quest Coins se pueden usar para:')}
          </Text>
          <Text style={[styles.infoItem, { color: theme.textSecondary }]}>
            • {t('Buy exclusive avatars and themes', 'Comprar avatares y temas exclusivos')}
          </Text>
          <Text style={[styles.infoItem, { color: theme.textSecondary }]}>
            • {t('Unlock XP boosters', 'Desbloquear boosters de XP')}
          </Text>
          <Text style={[styles.infoItem, { color: theme.textSecondary }]}>
            • {t('Bet on duels with friends', 'Apostar en duelos con amigos')}
          </Text>
          <Text style={[styles.infoItem, { color: theme.textSecondary }]}>
            • {t('Customize your Quest mascot', 'Personalizar tu Quest mascota')}
          </Text>
        </View>
      </ScrollView>

      {/* Confirm Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            {selectedProduct && (
              <>
                <Text style={styles.modalIcon}>
                  {QUEST_COINS_PRODUCTS[selectedProduct].icon}
                </Text>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {t('Confirm purchase', 'Confirmar compra')}
                </Text>
                <Text style={[styles.modalAmount, { color: theme.primary }]}>
                  {(
                    QUEST_COINS_PRODUCTS[selectedProduct].amount +
                    QUEST_COINS_PRODUCTS[selectedProduct].bonus
                  ).toLocaleString()}{" "}
                  Quest Coins
                </Text>
                <Text style={[styles.modalPrice, { color: theme.textSecondary }]}>
                  ${QUEST_COINS_PRODUCTS[selectedProduct].priceUSD} USD
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: theme.border }]}
                    onPress={() => setShowConfirmModal(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: theme.text }]}>
                      {t('Cancel', 'Cancelar')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: theme.primary }]}
                    onPress={handlePurchase}
                    disabled={purchasing}
                  >
                    {purchasing ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={[styles.modalButtonText, { color: "#FFF" }]}>
                        {t('Buy', 'Comprar')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: "500",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  balanceCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceIcon: {
    fontSize: 32,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "bold",
  },
  balanceUnit: {
    fontSize: 20,
    fontWeight: "600",
  },
  packagesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  packagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  packageCard: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 4,
    position: "relative",
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    paddingVertical: 4,
    alignItems: "center",
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  packageIcon: {
    fontSize: 40,
    marginTop: 20,
    marginBottom: 8,
  },
  packageAmount: {
    fontSize: 24,
    fontWeight: "bold",
  },
  packageBonus: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  packageTotal: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  priceContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priceText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  infoSection: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  infoText: {
    fontSize: 14,
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    marginBottom: 6,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  modalIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalAmount: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
