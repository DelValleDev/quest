/// <reference path="../deno.d.ts" />
/**
 * RevenueCat Webhook Handler
 *
 * Supabase Edge Function to receive and process RevenueCat webhook events.
 *
 * Deploy with:
 * supabase functions deploy revenucat-webhook
 *
 * Configure webhook URL in RevenueCat dashboard:
 * https://<project-ref>.supabase.co/functions/v1/revenucat-webhook
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-revenuecat-webhook-auth",
};

// RevenueCat webhook authorization header (set in RevenueCat dashboard)
// Store this in Supabase secrets: supabase secrets set REVENUCAT_WEBHOOK_AUTH_HEADER=your-secret
const REVENUCAT_WEBHOOK_SECRET =
  Deno.env.get("REVENUCAT_WEBHOOK_AUTH_HEADER") || "";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify webhook authenticity (optional but recommended)
    const authHeader = req.headers.get("x-revenuecat-webhook-auth") || "";

    if (REVENUCAT_WEBHOOK_SECRET && authHeader !== REVENUCAT_WEBHOOK_SECRET) {
      console.error("Invalid webhook auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the webhook payload
    const payload = await req.json();
    console.log("RevenueCat webhook received:", payload.event?.type);

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Extract the event
    const event = payload.event;
    if (!event) {
      return new Response(JSON.stringify({ error: "No event in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType = event.type;
    const appUserId = event.app_user_id;
    const productId = event.product_id;

    console.log(`Processing ${eventType} for user ${appUserId}`);

    // Determine subscription tier from product ID
    let subscriptionTier = "free";
    if (productId) {
      if (productId.includes("lifetime")) {
        subscriptionTier = "premium_lifetime";
      } else if (productId.includes("yearly") || productId.includes("annual")) {
        subscriptionTier = "premium_yearly";
      } else if (productId.includes("monthly")) {
        subscriptionTier = "premium_monthly";
      }
    }

    // Calculate expiration date
    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null;

    // Handle different event types
    switch (eventType) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION":
        // Activate or update subscription
        await supabase
          .from("profiles")
          .update({
            subscription_tier: subscriptionTier,
            subscription_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", appUserId);

        // Log the transaction
        await supabase.from("subscription_transactions").insert({
          user_id: appUserId,
          event_type: eventType,
          product_id: productId,
          price: event.price || 0,
          currency: event.currency || "USD",
          store: event.store,
          transaction_id: event.transaction_id,
          original_transaction_id: event.original_transaction_id,
          environment: event.environment,
          expires_at: expiresAt,
        });
        break;

      case "EXPIRATION":
      case "BILLING_ISSUE":
        // Handle grace period or expiration
        const gracePeriodEnd = event.grace_period_expiration_at_ms
          ? new Date(event.grace_period_expiration_at_ms).toISOString()
          : null;

        if (eventType === "EXPIRATION" || !gracePeriodEnd) {
          // Subscription fully expired
          await supabase
            .from("profiles")
            .update({
              subscription_tier: "free",
              subscription_expires_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", appUserId);
        } else {
          // In grace period - keep premium but mark billing issue
          await supabase
            .from("profiles")
            .update({
              subscription_expires_at: gracePeriodEnd,
              updated_at: new Date().toISOString(),
            })
            .eq("id", appUserId);
        }
        break;

      case "CANCELLATION":
        // User cancelled but subscription still active until period end
        // Don't change tier, just log
        console.log(`User ${appUserId} cancelled, expires at ${expiresAt}`);
        break;

      case "NON_RENEWING_PURCHASE":
        // One-time purchase (Quest Coins)
        if (productId?.includes("coins")) {
          // Determine coin amount from product ID
          let coinAmount = 0;
          if (productId.includes("100")) coinAmount = 110;
          else if (productId.includes("500")) coinAmount = 600;
          else if (productId.includes("1000")) coinAmount = 1300;
          else if (productId.includes("2500")) coinAmount = 3500;
          else if (productId.includes("5000")) coinAmount = 7500;
          else if (productId.includes("10000")) coinAmount = 16000;

          if (coinAmount > 0) {
            // Add coins to user
            await supabase.rpc("add_quest_coins", {
              p_user_id: appUserId,
              p_amount: coinAmount,
              p_source: "iap_purchase",
              p_reference_id: event.transaction_id,
              p_category: "coins_purchase",
              p_description: productId,
            });
          }
        }
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    console.log("Webhook processed successfully");

    return new Response(
      JSON.stringify({ success: true, event_type: eventType }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Webhook handler error:", error);

    // Return 200 anyway so RevenueCat doesn't keep retrying
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * RevenueCat Event Types Reference:
 *
 * SUBSCRIPTION EVENTS:
 * - INITIAL_PURCHASE: First subscription purchase
 * - RENEWAL: Subscription renewed
 * - PRODUCT_CHANGE: User upgraded/downgraded
 * - CANCELLATION: User cancelled (will expire at period end)
 * - UNCANCELLATION: User reactivated before expiry
 * - EXPIRATION: Subscription expired
 * - BILLING_ISSUE: Payment failed (in grace period)
 * - SUBSCRIBER_ALIAS: RevenueCat linked two users
 *
 * NON-SUBSCRIPTION EVENTS:
 * - NON_RENEWING_PURCHASE: One-time purchase (Quest Coins)
 *
 * TRIAL EVENTS:
 * - TRIAL_STARTED: Free trial started
 * - TRIAL_CONVERTED: Trial converted to paid
 * - TRIAL_CANCELLED: Trial cancelled
 */
