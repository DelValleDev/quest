/**
 * Payments & In-App Purchases Service
 * Handles Premium subscriptions and Quest Coins purchases
 *
 * ARCHITECTURE:
 * - RevenueCat: Primary provider for iOS/Android (handles store communication)
 * - Supabase Webhooks: Receive events from RevenueCat to update database
 * - This service: Unified API for the app to use
 *
 * Flow:
 * 1. App calls purchaseSubscription() or purchaseCoins()
 * 2. RevenueCat handles the store purchase
 * 3. RevenueCat sends webhook to Supabase Edge Function
 * 4. Edge Function updates database (subscriptions, coins)
 * 5. App refreshes user state
 */

import { Platform, Alert } from "react-native";
import { supabase } from "./supabase";
import revenueCat, {
  type RevenueCatSubscription,
  type RevenueCatPackage,
} from "./revenueCat";

// =====================================================
// PRODUCT TYPE DEFINITIONS
// =====================================================

export interface CoinsProduct {
  id: string;
  amount: number;
  bonus: number;
  priceUSD: number;
  priceMXN: number;
  icon: string;
  popular?: boolean;
  bestValue?: boolean;
  appleProductId: string;
  googleProductId: string;
}

export interface SubscriptionProduct {
  id: string;
  name: string;
  description: string;
  priceUSD: number;
  priceMXN: number;
  period: "month" | "year" | "lifetime";
  savings?: string;
  appleProductId: string;
  googleProductId: string;
}

// =====================================================
// PRODUCT DEFINITIONS
// =====================================================

export const SUBSCRIPTION_PRODUCTS: Record<string, SubscriptionProduct> = {
  premium_monthly: {
    id: "premium_monthly",
    name: "Quest Premium Mensual",
    description: "Acceso completo a todas las funciones premium",
    priceUSD: 4.99,
    priceMXN: 89,
    period: "month",
    // Store product IDs (configure in App Store Connect / Google Play Console)
    appleProductId: "com.noneuronas.quest.premium.monthly",
    googleProductId: "premium_monthly",
  },
  premium_yearly: {
    id: "premium_yearly",
    name: "Quest Premium Anual",
    description: "Ahorra 40% con el plan anual",
    priceUSD: 35.99,
    priceMXN: 649,
    period: "year",
    savings: "40%",
    appleProductId: "com.noneuronas.quest.premium.yearly",
    googleProductId: "premium_yearly",
  },
  premium_lifetime: {
    id: "premium_lifetime",
    name: "Quest Premium de por vida",
    description: "Pago único, acceso permanente",
    priceUSD: 79.99,
    priceMXN: 1449,
    period: "lifetime",
    appleProductId: "com.noneuronas.quest.premium.lifetime",
    googleProductId: "premium_lifetime",
  },
};

// ~$2 per Life Path (1350 QC) - fits $4.99 Premium
export const QUEST_COINS_PRODUCTS: Record<string, CoinsProduct> = {
  coins_50: {
    id: "coins_50",
    amount: 50,
    bonus: 0,
    priceUSD: 0.99,
    priceMXN: 19,
    icon: "🪙",
    appleProductId: "com.noneuronas.quest.coins.50",
    googleProductId: "coins_50",
  },
  coins_250: {
    id: "coins_250",
    amount: 250,
    bonus: 25, // +10%
    priceUSD: 1.99,
    priceMXN: 39,
    icon: "💰",
    appleProductId: "com.noneuronas.quest.coins.250",
    googleProductId: "coins_250",
  },
  coins_750: {
    id: "coins_750",
    amount: 750,
    bonus: 100, // +13%
    priceUSD: 4.99,
    priceMXN: 89,
    icon: "💎",
    popular: true,
    appleProductId: "com.noneuronas.quest.coins.750",
    googleProductId: "coins_750",
  },
  coins_1500: {
    id: "coins_1500",
    amount: 1500,
    bonus: 250, // +17%
    priceUSD: 8.99,
    priceMXN: 159,
    icon: "👑",
    bestValue: true,
    appleProductId: "com.noneuronas.quest.coins.1500",
    googleProductId: "coins_1500",
  },
  coins_3500: {
    id: "coins_3500",
    amount: 3500,
    bonus: 750, // +21%
    priceUSD: 17.99,
    priceMXN: 329,
    icon: "🏆",
    appleProductId: "com.noneuronas.quest.coins.3500",
    googleProductId: "coins_3500",
  },
};

export type SubscriptionProductId = keyof typeof SUBSCRIPTION_PRODUCTS;
export type CoinsProductId = keyof typeof QUEST_COINS_PRODUCTS;

// =====================================================
// CONFIGURATION
// =====================================================

// Use RevenueCat in production, mock in development
const USE_REVENUCAT = !__DEV__ || true; // Set to false to use mock payments

// =====================================================
// PURCHASE TYPES
// =====================================================

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface PurchaseHistory {
  id: string;
  userId: string;
  productId: string;
  productType: "subscription" | "coins" | "item";
  amount?: number;
  priceUSD: number;
  transactionId: string;
  platform: "ios" | "android" | "web";
  status: "pending" | "completed" | "refunded" | "failed";
  createdAt: string;
}

// =====================================================
// PAYMENT SERVICE
// =====================================================

class PaymentService {
  private isInitialized = false;
  private iapModule: any = null;
  private revenueCatPackages: {
    premium: RevenueCatPackage[];
    coins: RevenueCatPackage[];
  } | null = null;

  /**
   * Initialize the payment service
   * Call this on app startup, after user is authenticated
   */
  async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (USE_REVENUCAT && Platform.OS !== "web") {
        // Initialize RevenueCat
        await revenueCat.initialize(userId);

        // Pre-fetch offerings
        try {
          this.revenueCatPackages = await revenueCat.getOfferings();
        } catch (e) {
          console.warn("Could not fetch RevenueCat offerings:", e);
        }
      } else if (Platform.OS !== "web") {
        // Fallback to expo-in-app-purchases (for testing)
        try {
          // @ts-ignore - Dynamic import
          this.iapModule = await import("expo-in-app-purchases");
          await this.iapModule.connectAsync();
          console.log("IAP connected successfully");
        } catch (e) {
          console.warn(
            "expo-in-app-purchases not available, using mock payments"
          );
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize payments:", error);
    }
  }

  /**
   * Identify user after login
   */
  async identifyUser(userId: string): Promise<void> {
    if (USE_REVENUCAT) {
      await revenueCat.identify(userId);
    }
  }

  /**
   * Logout user
   */
  async logoutUser(): Promise<void> {
    if (USE_REVENUCAT) {
      await revenueCat.logout();
    }
  }

  /**
   * Get available products from the store
   * Returns RevenueCat packages if available, otherwise static products
   */
  async getProducts(): Promise<{
    subscriptions: typeof SUBSCRIPTION_PRODUCTS;
    coins: typeof QUEST_COINS_PRODUCTS;
    rcPackages?: {
      premium: RevenueCatPackage[];
      coins: RevenueCatPackage[];
    };
  }> {
    // Try to get RevenueCat packages for real prices
    if (USE_REVENUCAT && !this.revenueCatPackages) {
      try {
        this.revenueCatPackages = await revenueCat.getOfferings();
      } catch (e) {
        console.warn("Could not fetch offerings:", e);
      }
    }

    return {
      subscriptions: SUBSCRIPTION_PRODUCTS,
      coins: QUEST_COINS_PRODUCTS,
      rcPackages: this.revenueCatPackages || undefined,
    };
  }

  // =====================================================
  // SUBSCRIPTION PURCHASES
  // =====================================================

  /**
   * Purchase a premium subscription
   * Uses RevenueCat in production
   */
  async purchaseSubscription(
    userId: string,
    productId: SubscriptionProductId
  ): Promise<PurchaseResult> {
    const product = SUBSCRIPTION_PRODUCTS[productId];
    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    try {
      if (Platform.OS === "web") {
        return this.handleWebPurchase(userId, product);
      }

      // Use RevenueCat
      if (USE_REVENUCAT && this.revenueCatPackages) {
        const rcPackage = this.revenueCatPackages.premium.find(
          (p) => p.id === productId || p.id.includes(productId)
        );

        if (rcPackage) {
          const result = await revenueCat.purchaseSubscription(rcPackage);

          if (result.success) {
            // RevenueCat webhook will update the database
            // But we can also do a quick local update
            await supabase
              .from("profiles")
              .update({
                subscription_tier: productId,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          }

          return result;
        }
      }

      // Fallback to expo-in-app-purchases
      if (this.iapModule) {
        const storeProductId =
          Platform.OS === "ios"
            ? product.appleProductId
            : product.googleProductId;

        const { responseCode, results } =
          await this.iapModule.purchaseItemAsync(storeProductId);

        if (responseCode === 0 && results?.[0]) {
          const transactionId = results[0].transactionId;
          await this.activateSubscription(userId, productId, transactionId);
          return { success: true, transactionId };
        } else {
          return { success: false, error: "Compra cancelada" };
        }
      }

      // Mock purchase for development
      return this.mockPurchase(userId, "subscription", productId);
    } catch (error: any) {
      console.error("Purchase error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate subscription after successful purchase
   */
  private async activateSubscription(
    userId: string,
    productId: SubscriptionProductId,
    transactionId: string
  ): Promise<void> {
    const product = SUBSCRIPTION_PRODUCTS[productId];

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (product.period === "month") {
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (product.period === "year") {
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }
    // lifetime = null expiration

    // Update or insert subscription
    const { error } = await supabase.from("user_subscriptions").upsert(
      {
        user_id: userId,
        tier_id:
          product.period === "lifetime"
            ? "premium_lifetime"
            : product.period === "year"
            ? "premium_yearly"
            : "premium_monthly",
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt?.toISOString() || null,
        payment_provider: Platform.OS === "ios" ? "apple" : "google",
        payment_id: transactionId,
      },
      { onConflict: "user_id" }
    );

    if (error) throw error;

    // Record transaction
    await this.recordTransaction(
      userId,
      productId,
      "subscription",
      product.priceUSD,
      transactionId
    );
  }

  // =====================================================
  // QUEST COINS PURCHASES
  // =====================================================

  /**
   * Purchase Quest Coins
   * Uses RevenueCat in production
   */
  async purchaseCoins(
    userId: string,
    productId: CoinsProductId
  ): Promise<PurchaseResult> {
    const product = QUEST_COINS_PRODUCTS[productId];
    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    try {
      if (Platform.OS === "web") {
        return this.handleWebPurchase(userId, product);
      }

      // Use RevenueCat
      if (USE_REVENUCAT && this.revenueCatPackages) {
        const rcPackage = this.revenueCatPackages.coins.find(
          (p) => p.id === productId || p.id.includes(productId)
        );

        if (rcPackage) {
          const result = await revenueCat.purchaseCoins(rcPackage);
          // RevenueCat webhook will add coins to user
          return result;
        }
      }

      // Fallback to expo-in-app-purchases
      if (this.iapModule) {
        const storeProductId =
          Platform.OS === "ios"
            ? product.appleProductId
            : product.googleProductId;

        const { responseCode, results } =
          await this.iapModule.purchaseItemAsync(storeProductId);

        if (responseCode === 0 && results?.[0]) {
          const transactionId = results[0].transactionId;
          await this.addCoinsToUser(userId, product.amount + product.bonus);
          await this.iapModule.finishTransactionAsync(results[0], true);
          await this.recordTransaction(
            userId,
            productId,
            "coins",
            product.priceUSD,
            transactionId,
            product.amount + product.bonus
          );
          return { success: true, transactionId };
        } else {
          return { success: false, error: "Compra cancelada" };
        }
      }

      // Mock purchase for development
      return this.mockPurchase(userId, "coins", productId);
    } catch (error: any) {
      console.error("Coins purchase error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add coins to user's balance
   */
  private async addCoinsToUser(userId: string, amount: number): Promise<void> {
    const { error } = await supabase.rpc("add_quest_coins", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: "purchase",
    });

    // If RPC doesn't exist, do direct update
    if (error) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("quest_coins")
        .eq("id", userId)
        .single();

      await supabase
        .from("profiles")
        .update({ quest_coins: (profile?.quest_coins || 0) + amount })
        .eq("id", userId);
    }
  }

  // =====================================================
  // RESTORE PURCHASES
  // =====================================================

  /**
   * Restore previous purchases (required for iOS)
   * Uses RevenueCat in production
   */
  async restorePurchases(userId: string): Promise<PurchaseResult> {
    try {
      // Use RevenueCat
      if (USE_REVENUCAT) {
        return await revenueCat.restorePurchases();
      }

      // Fallback to expo-in-app-purchases
      if (!this.iapModule) {
        return { success: false, error: "IAP no disponible" };
      }

      const { responseCode, results } =
        await this.iapModule.getPurchaseHistoryAsync();

      if (responseCode === 0 && results?.length > 0) {
        // Find the most recent subscription
        const subscriptionPurchases = results.filter((p: any) =>
          Object.values(SUBSCRIPTION_PRODUCTS).some(
            (prod) =>
              prod.appleProductId === p.productId ||
              prod.googleProductId === p.productId
          )
        );

        if (subscriptionPurchases.length > 0) {
          const latestPurchase = subscriptionPurchases[0];

          // Find which product was purchased
          let productId: SubscriptionProductId | null = null;
          for (const [key, prod] of Object.entries(SUBSCRIPTION_PRODUCTS)) {
            if (
              prod.appleProductId === latestPurchase.productId ||
              prod.googleProductId === latestPurchase.productId
            ) {
              productId = key as SubscriptionProductId;
              break;
            }
          }

          if (productId) {
            await this.activateSubscription(
              userId,
              productId,
              latestPurchase.transactionId
            );
            return {
              success: true,
              transactionId: latestPurchase.transactionId,
            };
          }
        }

        return { success: false, error: "No se encontraron compras previas" };
      }

      return { success: false, error: "No hay compras para restaurar" };
    } catch (error: any) {
      console.error("Restore error:", error);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Handle web purchases (redirect to Stripe)
   */
  private async handleWebPurchase(
    userId: string,
    product: any
  ): Promise<PurchaseResult> {
    // In production, create Stripe checkout session
    Alert.alert(
      "Compra Web",
      "Las compras web requieren configuración de Stripe. Por favor usa la app móvil.",
      [{ text: "OK" }]
    );
    return { success: false, error: "Compras web no disponibles aún" };
  }

  /**
   * Mock purchase for development/testing
   */
  private async mockPurchase(
    userId: string,
    type: "subscription" | "coins",
    productId: string
  ): Promise<PurchaseResult> {
    const mockTransactionId = `mock_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    if (type === "subscription") {
      await this.activateSubscription(
        userId,
        productId as SubscriptionProductId,
        mockTransactionId
      );
    } else if (type === "coins") {
      const product = QUEST_COINS_PRODUCTS[productId as CoinsProductId];
      if (product) {
        await this.addCoinsToUser(userId, product.amount + product.bonus);
        await this.recordTransaction(
          userId,
          productId,
          "coins",
          product.priceUSD,
          mockTransactionId,
          product.amount + product.bonus
        );
      }
    }

    return { success: true, transactionId: mockTransactionId };
  }

  /**
   * Record transaction in database
   */
  private async recordTransaction(
    userId: string,
    productId: string,
    productType: "subscription" | "coins" | "item",
    priceUSD: number,
    transactionId: string,
    amount?: number
  ): Promise<void> {
    await supabase.from("purchase_history").insert({
      user_id: userId,
      product_id: productId,
      product_type: productType,
      amount,
      price_usd: priceUSD,
      transaction_id: transactionId,
      platform: Platform.OS,
      status: "completed",
    });
  }

  /**
   * Get user's purchase history
   */
  async getPurchaseHistory(userId: string): Promise<PurchaseHistory[]> {
    const { data, error } = await supabase
      .from("purchase_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to get purchase history:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if user has active subscription
   * Uses RevenueCat in production for real-time status
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    // Check RevenueCat first
    if (USE_REVENUCAT) {
      const status = await revenueCat.getSubscriptionStatus();
      return status.isActive;
    }

    // Fallback to database
    const { data } = await supabase
      .from("user_subscriptions")
      .select("status, expires_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!data) return false;

    // Check if not expired
    if (data.expires_at) {
      return new Date(data.expires_at) > new Date();
    }

    return true; // Lifetime subscription
  }

  /**
   * Get subscription status (detailed)
   */
  async getSubscriptionStatus(userId: string): Promise<RevenueCatSubscription> {
    if (USE_REVENUCAT) {
      return await revenueCat.getSubscriptionStatus();
    }

    // Fallback to database
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    return {
      isActive: data?.is_active || false,
      tier: data?.subscription_tier || "free",
      expiresDate: data?.expires_date ? new Date(data.expires_date) : null,
      willRenew: data?.will_renew || false,
      productId: data?.product_id || null,
      managementUrl: data?.management_url || null,
    };
  }

  /**
   * Open subscription management (App Store/Play Store)
   */
  async openSubscriptionManagement(): Promise<void> {
    if (USE_REVENUCAT) {
      await revenueCat.openSubscriptionManagement();
    }
  }

  /**
   * Get user's coin balance
   */
  async getCoinBalance(userId: string): Promise<number> {
    const { data } = await supabase
      .from("profiles")
      .select("quest_coins")
      .eq("id", userId)
      .single();

    return data?.quest_coins || 0;
  }

  /**
   * Disconnect IAP on app close
   */
  async disconnect(): Promise<void> {
    if (this.iapModule) {
      try {
        await this.iapModule.disconnectAsync();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
  }
}

// Export singleton instance
export const Payments = new PaymentService();
export default Payments;
