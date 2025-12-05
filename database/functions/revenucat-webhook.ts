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
    // Verify webhook authenticity
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

    // Build event object for our function
    const eventData = {
      id: event.id,
      type: event.type,
      app_user_id: {
        value: event.app_user_id,
      },
      product_id: event.product_id,
      price: event.price,
      currency: event.currency,
      store: event.store,
      environment: event.environment,
      original_transaction_id: event.original_transaction_id,
      expires_date: event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null,
      purchased_at: event.purchased_at_ms
        ? new Date(event.purchased_at_ms).toISOString()
        : null,
      original_purchase_date: event.original_purchased_at_ms
        ? new Date(event.original_purchased_at_ms).toISOString()
        : null,
      transaction_id: event.transaction_id,
      subscriber: payload.subscriber,
      grace_period_expires_date: event.grace_period_expiration_at_ms
        ? new Date(event.grace_period_expiration_at_ms).toISOString()
        : null,
    };

    // Call our database function to process the webhook
    const { data, error } = await supabase.rpc("process_revenucat_webhook", {
      p_event: eventData,
    });

    if (error) {
      console.error("Error processing webhook:", error);

      // Still return 200 to RevenueCat so they don't retry
      // But log the error for debugging
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          event_id: event.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Webhook processed successfully:", data);

    return new Response(JSON.stringify({ success: true, result: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
