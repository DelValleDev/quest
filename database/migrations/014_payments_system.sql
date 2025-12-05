-- =====================================================
-- PURCHASE HISTORY & PAYMENTS SYSTEM
-- Migration: 014_payments_system.sql
-- =====================================================

-- Purchase history table
CREATE TABLE IF NOT EXISTS purchase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('subscription', 'coins', 'item')),
    amount INTEGER, -- For coins purchases
    price_usd DECIMAL(10, 2) NOT NULL,
    price_local DECIMAL(10, 2), -- Local currency price
    currency TEXT DEFAULT 'USD',
    transaction_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
    receipt_data TEXT, -- Store receipt for verification
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_status ON purchase_history(status);
CREATE INDEX IF NOT EXISTS idx_purchase_history_transaction_id ON purchase_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_created_at ON purchase_history(created_at DESC);

-- RLS policies
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
    ON purchase_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
    ON purchase_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- QUEST COINS TRANSACTIONS
-- =====================================================

-- QC transaction types
CREATE TABLE IF NOT EXISTS qc_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive = earned, Negative = spent
    balance_after INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'purchase',      -- Bought with real money
        'quest_reward',  -- Earned from completing quests
        'achievement',   -- Earned from achievements
        'duel_win',      -- Won from duel
        'raid_reward',   -- Raid completion
        'streak_bonus',  -- Streak milestones
        'referral',      -- Referral bonus
        'gift',          -- Gift from friend
        'shop_purchase', -- Spent in shop
        'duel_stake',    -- Staked in duel
        'refund',        -- Refunded
        'admin'          -- Admin adjustment
    )),
    reference_id UUID, -- Link to related entity (quest, duel, shop item, etc.)
    reference_type TEXT, -- 'quest', 'duel', 'raid', 'shop_item', 'achievement'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qc_transactions_user_id ON qc_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_qc_transactions_type ON qc_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_qc_transactions_created_at ON qc_transactions(created_at DESC);

-- RLS
ALTER TABLE qc_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own QC transactions"
    ON qc_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTION: Add Quest Coins
-- =====================================================

CREATE OR REPLACE FUNCTION add_quest_coins(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'quest_reward',
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT quest_coins INTO v_current_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF v_current_balance IS NULL THEN
        v_current_balance := 0;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- Ensure balance doesn't go negative
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient Quest Coins';
    END IF;
    
    -- Update balance
    UPDATE profiles
    SET quest_coins = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO qc_transactions (
        user_id,
        amount,
        balance_after,
        transaction_type,
        reference_id,
        reference_type,
        description
    ) VALUES (
        p_user_id,
        p_amount,
        v_new_balance,
        p_reason,
        p_reference_id,
        p_reference_type,
        p_description
    );
    
    RETURN v_new_balance;
END;
$$;

-- =====================================================
-- FUNCTION: Spend Quest Coins (with validation)
-- =====================================================

CREATE OR REPLACE FUNCTION spend_quest_coins(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'shop_purchase',
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Use negative amount for spending
    v_new_balance := add_quest_coins(
        p_user_id,
        -p_amount,
        p_reason,
        p_reference_id,
        p_reference_type,
        p_description
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- =====================================================
-- SUBSCRIPTION TIERS (if not exists)
-- =====================================================

INSERT INTO subscription_tiers (id, name, name_es, description, description_es, price_monthly, price_yearly, currency, features, is_active, sort_order)
VALUES 
    ('free', 'Free', 'Gratis', 'Basic access to Quest', 'Acceso básico a Quest', 0, 0, 'USD', '{"ai_messages_daily": 5, "life_paths": 2, "habits": 5, "friends": 10}', true, 0),
    ('premium_monthly', 'Premium Monthly', 'Premium Mensual', 'Full access to all premium features', 'Acceso completo a todas las funciones premium', 4.99, 59.88, 'USD', '{"unlimited": true, "ai_messages_daily": -1, "life_paths": -1, "habits": -1, "friends": -1}', true, 1),
    ('premium_yearly', 'Premium Yearly', 'Premium Anual', 'Save 40% with yearly plan', 'Ahorra 40% con el plan anual', 2.99, 35.99, 'USD', '{"unlimited": true, "ai_messages_daily": -1, "life_paths": -1, "habits": -1, "friends": -1}', true, 2),
    ('premium_lifetime', 'Premium Lifetime', 'Premium de por vida', 'One-time payment, forever access', 'Pago único, acceso permanente', 79.99, 79.99, 'USD', '{"unlimited": true, "lifetime": true, "ai_messages_daily": -1, "life_paths": -1, "habits": -1, "friends": -1}', true, 3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_es = EXCLUDED.name_es,
    description = EXCLUDED.description,
    description_es = EXCLUDED.description_es,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    currency = EXCLUDED.currency,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION add_quest_coins TO authenticated;
GRANT EXECUTE ON FUNCTION spend_quest_coins TO authenticated;
