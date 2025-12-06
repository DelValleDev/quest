/**
 * Payment Types - Shared types for payment system
 * This file breaks the circular dependency between revenueCat.ts and payments.ts
 */

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

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  error?: string;
  errorCode?: string;
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
