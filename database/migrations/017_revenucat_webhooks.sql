-- =====================================================
-- REVENUCAT WEBHOOKS & PURCHASE TRACKING
-- Migration: 017_revenucat_webhooks.sql
-- 
-- Handles:
-- - Webhook events from RevenueCat
-- - Purchase validation
-- - Subscription status sync
-- - Quest Coins fulfillment
-- =====================================================

-- =====================================================
-- REVENUCAT EVENTS TABLE
-- Stores all webhook events for audit/debugging
-- =====================================================

CREATE TABLE IF NOT EXISTS revenucat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL, -- RevenueCat event ID (for idempotency)
    event_type TEXT NOT NULL,
    app_user_id TEXT NOT NULL, -- RevenueCat app_user_id (maps to our user_id)
    product_id TEXT,
    price DECIMAL(10, 2),
    currency TEXT,
    store TEXT, -- 'APP_STORE', 'PLAY_STORE', 'STRIPE'
    environment TEXT, -- 'SANDBOX', 'PRODUCTION'
    original_transaction_id TEXT,
    expires_date TIMESTAMPTZ,
    purchased_at TIMESTAMPTZ,
    raw_payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_revenucat_events_user ON revenucat_events(app_user_id);
CREATE INDEX IF NOT EXISTS idx_revenucat_events_type ON revenucat_events(event_type);
CREATE INDEX IF NOT EXISTS idx_revenucat_events_processed ON revenucat_events(processed);

-- =====================================================
-- USER SUBSCRIPTIONS TABLE
-- Current subscription state for each user
-- =====================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    revenucat_user_id TEXT, -- RevenueCat's app_user_id
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    product_id TEXT, -- Current product (premium_monthly, etc.)
    store TEXT, -- Where they subscribed
    original_purchase_date TIMESTAMPTZ,
    expires_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE,
    will_renew BOOLEAN DEFAULT TRUE,
    is_sandbox BOOLEAN DEFAULT FALSE,
    management_url TEXT, -- Link to manage subscription
    unsubscribe_detected_at TIMESTAMPTZ,
    billing_issues_detected_at TIMESTAMPTZ,
    grace_period_expires_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires ON user_subscriptions(expires_date);

-- =====================================================
-- COIN PURCHASES TABLE
-- Track all Quest Coins purchases
-- =====================================================

CREATE TABLE IF NOT EXISTS coin_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    revenucat_event_id TEXT UNIQUE, -- Links to revenucat_events
    product_id TEXT NOT NULL, -- coins_50, coins_250, etc.
    coins_base INTEGER NOT NULL,
    coins_bonus INTEGER DEFAULT 0,
    coins_total INTEGER NOT NULL,
    price DECIMAL(10, 2),
    currency TEXT,
    store TEXT,
    transaction_id TEXT,
    is_sandbox BOOLEAN DEFAULT FALSE,
    fulfilled BOOLEAN DEFAULT FALSE,
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_purchases_user ON coin_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_purchases_fulfilled ON coin_purchases(fulfilled);

-- =====================================================
-- PROCESS REVENUCAT WEBHOOK
-- Main function to handle incoming events
-- =====================================================

CREATE OR REPLACE FUNCTION process_revenucat_webhook(
    p_event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id TEXT;
    v_event_type TEXT;
    v_app_user_id TEXT;
    v_user_id UUID;
    v_product_id TEXT;
    v_result JSONB;
BEGIN
    -- Extract event info
    v_event_id := p_event->>'id';
    v_event_type := p_event->>'type';
    v_app_user_id := p_event->'app_user_id'->>'value';
    
    -- Check for duplicate (idempotency)
    IF EXISTS (SELECT 1 FROM revenucat_events WHERE event_id = v_event_id) THEN
        RETURN jsonb_build_object('success', true, 'message', 'Event already processed');
    END IF;
    
    -- Extract product_id from subscriber info
    v_product_id := p_event->'subscriber'->'subscriptions'->0->>'product_identifier';
    IF v_product_id IS NULL THEN
        v_product_id := p_event->'subscriber'->'non_subscriptions'->0->>'product_identifier';
    END IF;
    
    -- Store the event
    INSERT INTO revenucat_events (
        event_id,
        event_type,
        app_user_id,
        product_id,
        price,
        currency,
        store,
        environment,
        original_transaction_id,
        expires_date,
        purchased_at,
        raw_payload
    )
    VALUES (
        v_event_id,
        v_event_type,
        v_app_user_id,
        v_product_id,
        (p_event->>'price')::DECIMAL,
        p_event->>'currency',
        p_event->>'store',
        p_event->>'environment',
        p_event->>'original_transaction_id',
        (p_event->>'expires_date')::TIMESTAMPTZ,
        (p_event->>'purchased_at')::TIMESTAMPTZ,
        p_event
    );
    
    -- Try to find user by RevenueCat app_user_id
    -- RevenueCat should use our user_id as app_user_id
    BEGIN
        v_user_id := v_app_user_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        -- If not a UUID, try to look up by revenucat_user_id
        SELECT user_id INTO v_user_id
        FROM user_subscriptions
        WHERE revenucat_user_id = v_app_user_id
        LIMIT 1;
    END;
    
    -- If we can't find the user, log error but don't fail
    IF v_user_id IS NULL THEN
        UPDATE revenucat_events
        SET error_message = 'User not found: ' || v_app_user_id
        WHERE event_id = v_event_id;
        
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'User not found',
            'app_user_id', v_app_user_id
        );
    END IF;
    
    -- Process based on event type
    CASE v_event_type
        -- SUBSCRIPTION EVENTS
        WHEN 'INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE' THEN
            v_result := handle_subscription_active(v_user_id, p_event);
            
        WHEN 'CANCELLATION', 'EXPIRATION' THEN
            v_result := handle_subscription_expired(v_user_id, p_event);
            
        WHEN 'BILLING_ISSUE', 'BILLING_ISSUES' THEN
            v_result := handle_billing_issue(v_user_id, p_event);
            
        -- NON-SUBSCRIPTION (Quest Coins)
        WHEN 'NON_RENEWING_PURCHASE' THEN
            v_result := handle_coins_purchase(v_user_id, p_event, v_event_id);
            
        -- OTHER EVENTS
        WHEN 'SUBSCRIBER_ALIAS' THEN
            -- Link RevenueCat user to our user
            v_result := handle_user_alias(v_user_id, p_event);
            
        ELSE
            v_result := jsonb_build_object('success', true, 'message', 'Event type not handled');
    END CASE;
    
    -- Mark as processed
    UPDATE revenucat_events
    SET processed = TRUE, processed_at = NOW()
    WHERE event_id = v_event_id;
    
    RETURN v_result;
END;
$$;

-- =====================================================
-- HANDLE SUBSCRIPTION ACTIVE
-- When user purchases or renews subscription
-- =====================================================

CREATE OR REPLACE FUNCTION handle_subscription_active(
    p_user_id UUID,
    p_event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_id TEXT;
    v_subscription_tier TEXT;
    v_expires_date TIMESTAMPTZ;
BEGIN
    -- Get product info
    v_product_id := p_event->>'product_id';
    v_expires_date := (p_event->>'expires_date')::TIMESTAMPTZ;
    
    -- Map product to tier
    v_subscription_tier := CASE 
        WHEN v_product_id LIKE '%monthly%' THEN 'premium_monthly'
        WHEN v_product_id LIKE '%yearly%' THEN 'premium_yearly'
        WHEN v_product_id LIKE '%lifetime%' THEN 'premium_lifetime'
        ELSE 'premium_monthly'
    END;
    
    -- Update or create subscription record
    INSERT INTO user_subscriptions (
        user_id,
        revenucat_user_id,
        subscription_tier,
        product_id,
        store,
        original_purchase_date,
        expires_date,
        is_active,
        will_renew,
        is_sandbox,
        updated_at
    )
    VALUES (
        p_user_id,
        p_event->'app_user_id'->>'value',
        v_subscription_tier,
        v_product_id,
        p_event->>'store',
        COALESCE((p_event->>'original_purchase_date')::TIMESTAMPTZ, NOW()),
        v_expires_date,
        TRUE,
        TRUE,
        p_event->>'environment' = 'SANDBOX',
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        subscription_tier = v_subscription_tier,
        product_id = v_product_id,
        store = EXCLUDED.store,
        expires_date = v_expires_date,
        is_active = TRUE,
        will_renew = TRUE,
        billing_issues_detected_at = NULL,
        updated_at = NOW();
    
    -- Update profile subscription tier
    UPDATE profiles
    SET 
        subscription_tier = v_subscription_tier,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'action', 'subscription_activated',
        'tier', v_subscription_tier,
        'expires', v_expires_date
    );
END;
$$;

-- =====================================================
-- HANDLE SUBSCRIPTION EXPIRED
-- When subscription is cancelled or expires
-- =====================================================

CREATE OR REPLACE FUNCTION handle_subscription_expired(
    p_user_id UUID,
    p_event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update subscription record
    UPDATE user_subscriptions
    SET 
        is_active = FALSE,
        will_renew = FALSE,
        unsubscribe_detected_at = CASE 
            WHEN p_event->>'type' = 'CANCELLATION' THEN NOW() 
            ELSE unsubscribe_detected_at 
        END,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Downgrade profile to free tier
    UPDATE profiles
    SET 
        subscription_tier = 'free',
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'action', 'subscription_expired',
        'tier', 'free'
    );
END;
$$;

-- =====================================================
-- HANDLE BILLING ISSUE
-- When there's a payment problem
-- =====================================================

CREATE OR REPLACE FUNCTION handle_billing_issue(
    p_user_id UUID,
    p_event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_grace_period TIMESTAMPTZ;
BEGIN
    v_grace_period := (p_event->>'grace_period_expires_date')::TIMESTAMPTZ;
    
    -- Update subscription with billing issue
    UPDATE user_subscriptions
    SET 
        billing_issues_detected_at = NOW(),
        grace_period_expires_date = v_grace_period,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Don't downgrade yet if in grace period
    -- RevenueCat will send EXPIRATION if not resolved
    
    RETURN jsonb_build_object(
        'success', true,
        'action', 'billing_issue_logged',
        'grace_period_expires', v_grace_period
    );
END;
$$;

-- =====================================================
-- HANDLE COINS PURCHASE
-- Non-subscription purchase (Quest Coins)
-- =====================================================

CREATE OR REPLACE FUNCTION handle_coins_purchase(
    p_user_id UUID,
    p_event JSONB,
    p_revenucat_event_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_id TEXT;
    v_coins_base INTEGER;
    v_coins_bonus INTEGER;
    v_coins_total INTEGER;
BEGIN
    v_product_id := p_event->>'product_id';
    
    -- Get coins amount from our config
    SELECT 
        coins_amount,
        bonus_coins,
        coins_amount + bonus_coins
    INTO v_coins_base, v_coins_bonus, v_coins_total
    FROM coin_packages
    WHERE id = v_product_id;
    
    -- If product not found, try to extract from product_id
    IF v_coins_base IS NULL THEN
        -- Parse from id like 'coins_50', 'coins_250', etc.
        v_coins_base := COALESCE(
            (regexp_match(v_product_id, 'coins_(\d+)'))[1]::INTEGER,
            0
        );
        v_coins_bonus := 0;
        v_coins_total := v_coins_base;
    END IF;
    
    -- Record the purchase
    INSERT INTO coin_purchases (
        user_id,
        revenucat_event_id,
        product_id,
        coins_base,
        coins_bonus,
        coins_total,
        price,
        currency,
        store,
        transaction_id,
        is_sandbox,
        fulfilled,
        fulfilled_at
    )
    VALUES (
        p_user_id,
        p_revenucat_event_id,
        v_product_id,
        v_coins_base,
        v_coins_bonus,
        v_coins_total,
        (p_event->>'price')::DECIMAL,
        p_event->>'currency',
        p_event->>'store',
        p_event->>'transaction_id',
        p_event->>'environment' = 'SANDBOX',
        TRUE,
        NOW()
    );
    
    -- Add coins to user
    PERFORM add_quest_coins(
        p_user_id,
        v_coins_total,
        'iap_purchase',
        NULL,
        'coins_purchase',
        v_product_id
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'action', 'coins_purchased',
        'coins_base', v_coins_base,
        'coins_bonus', v_coins_bonus,
        'coins_total', v_coins_total
    );
END;
$$;

-- =====================================================
-- HANDLE USER ALIAS
-- Link RevenueCat ID to our user
-- =====================================================

CREATE OR REPLACE FUNCTION handle_user_alias(
    p_user_id UUID,
    p_event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_revenucat_id TEXT;
BEGIN
    v_revenucat_id := p_event->'app_user_id'->>'value';
    
    -- Update or create subscription record with alias
    INSERT INTO user_subscriptions (
        user_id,
        revenucat_user_id,
        subscription_tier
    )
    VALUES (
        p_user_id,
        v_revenucat_id,
        'free'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        revenucat_user_id = v_revenucat_id,
        updated_at = NOW();
    
    RETURN jsonb_build_object(
        'success', true,
        'action', 'user_aliased',
        'revenucat_id', v_revenucat_id
    );
END;
$$;

-- =====================================================
-- CHECK SUBSCRIPTION STATUS
-- Called by the app to verify current subscription
-- =====================================================

CREATE OR REPLACE FUNCTION get_subscription_status(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription user_subscriptions;
    v_is_active BOOLEAN;
BEGIN
    -- Get subscription record
    SELECT * INTO v_subscription
    FROM user_subscriptions
    WHERE user_id = p_user_id;
    
    -- If no subscription, return free tier
    IF v_subscription.id IS NULL THEN
        RETURN jsonb_build_object(
            'tier', 'free',
            'is_premium', false,
            'is_active', false
        );
    END IF;
    
    -- Check if still active (lifetime never expires)
    v_is_active := v_subscription.is_active AND (
        v_subscription.subscription_tier = 'premium_lifetime' OR
        v_subscription.expires_date IS NULL OR
        v_subscription.expires_date > NOW()
    );
    
    -- If expired, downgrade
    IF NOT v_is_active AND v_subscription.subscription_tier != 'free' THEN
        UPDATE profiles
        SET subscription_tier = 'free'
        WHERE id = p_user_id;
        
        UPDATE user_subscriptions
        SET is_active = FALSE
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN jsonb_build_object(
        'tier', CASE WHEN v_is_active THEN v_subscription.subscription_tier ELSE 'free' END,
        'is_premium', v_is_active,
        'is_active', v_is_active,
        'product_id', v_subscription.product_id,
        'expires_date', v_subscription.expires_date,
        'will_renew', v_subscription.will_renew,
        'has_billing_issues', v_subscription.billing_issues_detected_at IS NOT NULL,
        'store', v_subscription.store,
        'management_url', v_subscription.management_url
    );
END;
$$;

-- =====================================================
-- RPC for checking subscription (for app use)
-- =====================================================

-- Drop if exists and recreate
DROP FUNCTION IF EXISTS check_premium_status(UUID);

CREATE OR REPLACE FUNCTION check_premium_status(
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN get_subscription_status(COALESCE(p_user_id, auth.uid()));
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_premium_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_status TO authenticated;

-- =====================================================
-- SUMMARY
-- =====================================================
-- 
-- Tables:
-- - revenucat_events: All webhook events (audit log)
-- - user_subscriptions: Current subscription state
-- - coin_purchases: Quest Coins purchase history
--
-- Functions:
-- - process_revenucat_webhook: Main webhook handler
-- - handle_subscription_active: Activate subscription
-- - handle_subscription_expired: Deactivate subscription
-- - handle_billing_issue: Log payment problems
-- - handle_coins_purchase: Fulfill coins purchases
-- - check_premium_status: RPC for app to check status
-- =====================================================
