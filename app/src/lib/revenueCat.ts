/**
 * RevenueCat Integration Service
 *
 * Handles all in-app purchases and subscriptions using RevenueCat SDK.
 * RevenueCat manages the connection to App Store and Google Play.
 *
 * Setup Required:
 * 1. Create account at https://www.revenuecat.com
 * 2. Create a project and get your API keys
 * 3. Configure products in App Store Connect / Google Play Console
 * 4. Set up webhooks to your Supabase Edge Function
 */

import { Platform } from "react-native";
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import { supabase } from "./supabase";
import {
  SUBSCRIPTION_PRODUCTS,
  QUEST_COINS_PRODUCTS,
  type PurchaseResult,
} from "./paymentTypes";

// =====================================================
// CONFIGURATION
// =====================================================

// RevenueCat API Keys (from your RevenueCat dashboard)
// Using the same test key for both platforms during development
// In production, you'll get separate keys for iOS (appl_xxx) and Android (goog_xxx)
const REVENUCAT_API_KEYS = {
  ios: "test_hjohowvQAjKuZPcxGZqHxmzbaRT",
  android: "test_hjohowvQAjKuZPcxGZqHxmzbaRT",
};

// Enable debug logging in development
const DEBUG_MODE = __DEV__;

// Offering identifiers (configure in RevenueCat dashboard)
const OFFERING_PREMIUM = "default"; // RevenueCat usa "default" por defecto
const OFFERING_COINS = "quest_coins";

// Entitlement identifier for premium access
const ENTITLEMENT_PREMIUM = "Quest Pro"; // Matches your RevenueCat entitlement

// =====================================================
// TYPES
// =====================================================

export interface RevenueCatSubscription {
  isActive: boolean;
  tier: "free" | "premium_monthly" | "premium_yearly" | "premium_lifetime";
  expiresDate: Date | null;
  willRenew: boolean;
  productId: string | null;
  managementUrl: string | null;
}

export interface RevenueCatPackage {
  id: string;
  title: string;
  description: string;
  price: string;
  priceNumber: number;
  currencyCode: string;
  packageType: "subscription" | "consumable";
  rcPackage: PurchasesPackage;
}

// =====================================================
// INITIALIZATION
// =====================================================

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this early in your app (e.g., in App.tsx)
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (isInitialized) {
    console.log("[RevenueCat] Already initialized");
    return;
  }

  try {
    // Set log level
    if (DEBUG_MODE) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Get the appropriate API key
    const apiKey =
      Platform.OS === "ios"
        ? REVENUCAT_API_KEYS.ios
        : REVENUCAT_API_KEYS.android;

    // Configure Purchases
    await Purchases.configure({
      apiKey,
      appUserID: userId || null, // null = anonymous, will use $RCAnonymousID
    });

    isInitialized = true;
    console.log("[RevenueCat] Initialized successfully");

    // If we have a user ID, ensure they're identified
    if (userId) {
      await identifyUser(userId);
    }
  } catch (error) {
    console.error("[RevenueCat] Initialization failed:", error);
    throw error;
  }
}

/**
 * Identify user with RevenueCat
 * Call this after user logs in
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!isInitialized) {
    await initializeRevenueCat(userId);
    return;
  }

  try {
    const { customerInfo } = await Purchases.logIn(userId);
    console.log("[RevenueCat] User identified:", userId);

    // Sync subscription status with Supabase
    await syncSubscriptionStatus(customerInfo);
  } catch (error) {
    console.error("[RevenueCat] Failed to identify user:", error);
    throw error;
  }
}

/**
 * Log out user from RevenueCat
 * Call this when user logs out
 */
export async function logoutUser(): Promise<void> {
  if (!isInitialized) return;

  try {
    await Purchases.logOut();
    console.log("[RevenueCat] User logged out");
  } catch (error) {
    console.error("[RevenueCat] Logout failed:", error);
  }
}

// =====================================================
// GET OFFERINGS (Available Products)
// =====================================================

/**
 * Get all available offerings from RevenueCat
 */
export async function getOfferings(): Promise<{
  premium: RevenueCatPackage[];
  coins: RevenueCatPackage[];
}> {
  if (!isInitialized) {
    throw new Error("RevenueCat not initialized");
  }

  try {
    const offerings = await Purchases.getOfferings();

    const result = {
      premium: [] as RevenueCatPackage[],
      coins: [] as RevenueCatPackage[],
    };

    // Get premium subscription packages
    const premiumOffering = offerings.all[OFFERING_PREMIUM];
    if (premiumOffering) {
      result.premium = premiumOffering.availablePackages.map((pkg) =>
        mapPackage(pkg, "subscription")
      );
    }

    // Get coins packages
    const coinsOffering = offerings.all[OFFERING_COINS];
    if (coinsOffering) {
      result.coins = coinsOffering.availablePackages.map((pkg) =>
        mapPackage(pkg, "consumable")
      );
    }

    return result;
  } catch (error) {
    console.error("[RevenueCat] Failed to get offerings:", error);
    throw error;
  }
}

/**
 * Map RevenueCat package to our format
 */
function mapPackage(
  pkg: PurchasesPackage,
  type: "subscription" | "consumable"
): RevenueCatPackage {
  return {
    id: pkg.identifier,
    title: pkg.product.title,
    description: pkg.product.description,
    price: pkg.product.priceString,
    priceNumber: pkg.product.price,
    currencyCode: pkg.product.currencyCode,
    packageType: type,
    rcPackage: pkg,
  };
}

// =====================================================
// PURCHASE FUNCTIONS
// =====================================================

/**
 * Purchase a subscription package
 */
export async function purchaseSubscription(
  pkg: RevenueCatPackage
): Promise<PurchaseResult> {
  if (!isInitialized) {
    return { success: false, error: "RevenueCat not initialized" };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg.rcPackage);

    // Check if premium is now active
    const isPremium =
      customerInfo.entitlements.active[ENTITLEMENT_PREMIUM] !== undefined;

    if (isPremium) {
      // Sync with Supabase
      await syncSubscriptionStatus(customerInfo);

      return {
        success: true,
        transactionId:
          customerInfo.originalAppUserId ||
          customerInfo.originalApplicationVersion ||
          undefined,
      };
    }

    return {
      success: false,
      error: "Purchase completed but premium not activated",
    };
  } catch (error: any) {
    return handlePurchaseError(error);
  }
}

/**
 * Purchase Quest Coins (consumable)
 */
export async function purchaseCoins(
  pkg: RevenueCatPackage
): Promise<PurchaseResult> {
  if (!isInitialized) {
    return { success: false, error: "RevenueCat not initialized" };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg.rcPackage);

    // For consumables, RevenueCat webhook will handle coin fulfillment
    // We can also handle it locally as a backup

    // Get product info to determine coins amount
    const productId = pkg.id;
    const coinsInfo = QUEST_COINS_PRODUCTS[productId];

    if (coinsInfo) {
      // Local fulfillment (webhook will also do this)
      const totalCoins = coinsInfo.amount + coinsInfo.bonus;

      await supabase.rpc("add_quest_coins", {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_amount: totalCoins,
        p_source: "iap_purchase",
        p_reference_id: null,
        p_category: "coins_purchase",
        p_description: productId,
      });
    }

    return {
      success: true,
      transactionId: customerInfo.originalAppUserId,
    };
  } catch (error: any) {
    return handlePurchaseError(error);
  }
}

/**
 * Handle purchase errors
 */
function handlePurchaseError(error: any): PurchaseResult {
  console.error("[RevenueCat] Purchase error:", error);

  // Check for user cancellation
  if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
    return {
      success: false,
      error: "cancelled",
    };
  }

  // Check for payment issues
  if (error.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
    return {
      success: false,
      error: "Payment pending - please complete payment",
    };
  }

  // Check for network issues
  if (error.code === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
    return {
      success: false,
      error: "Network error - please check your connection",
    };
  }

  // Check for already owned (subscriptions)
  if (error.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
    return {
      success: false,
      error: "You already have an active subscription",
    };
  }

  return {
    success: false,
    error: error.message || "Purchase failed",
  };
}

// =====================================================
// SUBSCRIPTION STATUS
// =====================================================

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<RevenueCatSubscription> {
  if (!isInitialized) {
    return {
      isActive: false,
      tier: "free",
      expiresDate: null,
      willRenew: false,
      productId: null,
      managementUrl: null,
    };
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return parseCustomerInfo(customerInfo);
  } catch (error) {
    console.error("[RevenueCat] Failed to get subscription status:", error);
    return {
      isActive: false,
      tier: "free",
      expiresDate: null,
      willRenew: false,
      productId: null,
      managementUrl: null,
    };
  }
}

/**
 * Parse CustomerInfo into our subscription format
 */
function parseCustomerInfo(customerInfo: CustomerInfo): RevenueCatSubscription {
  const premiumEntitlement =
    customerInfo.entitlements.active[ENTITLEMENT_PREMIUM];

  if (!premiumEntitlement) {
    return {
      isActive: false,
      tier: "free",
      expiresDate: null,
      willRenew: false,
      productId: null,
      managementUrl: customerInfo.managementURL,
    };
  }

  // Determine tier from product ID
  const productId = premiumEntitlement.productIdentifier;
  let tier: RevenueCatSubscription["tier"] = "premium_monthly";

  if (productId.includes("yearly")) {
    tier = "premium_yearly";
  } else if (productId.includes("lifetime")) {
    tier = "premium_lifetime";
  }

  return {
    isActive: true,
    tier,
    expiresDate: premiumEntitlement.expirationDate
      ? new Date(premiumEntitlement.expirationDate)
      : null,
    willRenew: !premiumEntitlement.willRenew
      ? false
      : premiumEntitlement.willRenew,
    productId,
    managementUrl: customerInfo.managementURL,
  };
}

/**
 * Sync subscription status with Supabase
 * Called after purchases and on app start
 */
async function syncSubscriptionStatus(
  customerInfo: CustomerInfo
): Promise<void> {
  try {
    const subscription = parseCustomerInfo(customerInfo);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    if (!userId) return;

    // Update profile subscription tier
    await supabase
      .from("profiles")
      .update({
        subscription_tier:
          subscription.tier === "free" ? "free" : subscription.tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    console.log("[RevenueCat] Synced subscription status:", subscription.tier);
  } catch (error) {
    console.error("[RevenueCat] Failed to sync subscription:", error);
  }
}

// =====================================================
// RESTORE PURCHASES
// =====================================================

/**
 * Restore previous purchases
 * For when user reinstalls app or switches devices
 */
export async function restorePurchases(): Promise<{
  restored: boolean;
  error?: string;
}> {
  if (!isInitialized) {
    return { restored: false, error: "RevenueCat not initialized" };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();

    // Check if any premium entitlement was restored
    const isPremium =
      customerInfo.entitlements.active[ENTITLEMENT_PREMIUM] !== undefined;

    if (isPremium) {
      await syncSubscriptionStatus(customerInfo);
      return { restored: true };
    }

    return { restored: false };
  } catch (error: any) {
    console.error("[RevenueCat] Restore failed:", error);
    return {
      restored: false,
      error: error.message || "Failed to restore purchases",
    };
  }
}

// =====================================================
// SUBSCRIPTION MANAGEMENT
// =====================================================

/**
 * Open subscription management page
 * iOS: Opens Settings > Subscriptions
 * Android: Opens Play Store subscription page
 */
export async function openSubscriptionManagement(): Promise<void> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const managementUrl = customerInfo.managementURL;

    if (managementUrl) {
      // Open in browser
      const { Linking } = await import("react-native");
      await Linking.openURL(managementUrl);
    }
  } catch (error) {
    console.error("[RevenueCat] Failed to open management:", error);
  }
}

// =====================================================
// LISTENER FOR PURCHASE UPDATES
// =====================================================

/**
 * Set up listener for customer info updates
 * Useful for detecting external changes (cancellations, renewals, etc.)
 */
export function setupPurchaseListener(
  onUpdate: (subscription: RevenueCatSubscription) => void
): () => void {
  const listener = (customerInfo: CustomerInfo) => {
    const subscription = parseCustomerInfo(customerInfo);
    onUpdate(subscription);

    // Also sync with Supabase
    syncSubscriptionStatus(customerInfo);
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  // Return unsubscribe function
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

// =====================================================
// PROMOTIONAL OFFERS (iOS Only)
// =====================================================

/**
 * Check eligibility for introductory pricing
 */
export async function checkTrialEligibility(
  productId: string
): Promise<boolean> {
  if (!isInitialized || Platform.OS !== "ios") {
    return false;
  }

  try {
    const eligibility =
      await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
    return eligibility[productId]?.status === 0; // 0 = ELIGIBLE
  } catch (error) {
    console.error("[RevenueCat] Trial eligibility check failed:", error);
    return false;
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

// Helper function to get subscription packages (used by PremiumScreen)
export async function getSubscriptionPackages(): Promise<RevenueCatPackage[]> {
  const offerings = await getOfferings();
  return offerings.premium;
}

// Helper function to purchase any package (wrapper for purchaseSubscription)
export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  cancelled?: boolean;
  error?: string;
}> {
  if (!isInitialized) {
    return { success: false, error: "RevenueCat not initialized" };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    // Check if premium is now active
    const isPremium =
      customerInfo.entitlements.active[ENTITLEMENT_PREMIUM] !== undefined;

    if (isPremium) {
      await syncSubscriptionStatus(customerInfo);
      return { success: true };
    }

    return {
      success: false,
      error: "Purchase completed but premium not activated",
    };
  } catch (error: any) {
    if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, cancelled: true };
    }
    return { success: false, error: error.message || "Purchase failed" };
  }
}

export const revenueCat = {
  initialize: initializeRevenueCat,
  identify: identifyUser,
  logout: logoutUser,
  getOfferings,
  getSubscriptionPackages,
  purchasePackage,
  purchaseSubscription,
  purchaseCoins,
  getSubscriptionStatus,
  restorePurchases,
  openSubscriptionManagement,
  setupPurchaseListener,
  checkTrialEligibility,
};

export default revenueCat;
