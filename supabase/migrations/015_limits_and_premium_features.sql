-- =====================================================
-- LIMITS & PREMIUM FEATURES SYSTEM
-- Migration: 015_limits_and_premium_features.sql
-- =====================================================

-- =====================================================
-- USER DAILY LIMITS TABLE
-- Tracks daily usage for free users
-- =====================================================

CREATE TABLE IF NOT EXISTS user_daily_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Daily counters
    duels_used INTEGER DEFAULT 0,
    duels_bonus INTEGER DEFAULT 0,  -- Extra from QC or ads
    ai_messages_used INTEGER DEFAULT 0,
    ai_messages_bonus INTEGER DEFAULT 0,
    raids_used INTEGER DEFAULT 0,
    raids_bonus INTEGER DEFAULT 0,
    
    -- Ads watched today
    ads_watched INTEGER DEFAULT 0,
    last_ad_watched TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_limits_user_date ON user_daily_limits(user_id, date);

-- RLS
ALTER TABLE user_daily_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own limits"
    ON user_daily_limits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own limits"
    ON user_daily_limits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own limits"
    ON user_daily_limits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- USER PURCHASED FEATURES
-- Permanent unlocks purchased with QC
-- =====================================================

CREATE TABLE IF NOT EXISTS user_purchased_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_type TEXT NOT NULL CHECK (feature_type IN (
        'extra_life_path',      -- +1 life path slot
        'extra_duel_slot',      -- +1 duel today
        'extra_habit_slot',     -- +1 habit slot
        'extra_friend_slot',    -- +1 friend slot
        'extra_raid_slot',      -- +1 raid today
        'streak_protection',    -- One-time streak save
        'ai_message_pack'       -- Pack of AI messages
    )),
    quantity INTEGER DEFAULT 1,
    qc_spent INTEGER NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_purchased_features_user ON user_purchased_features(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchased_features_type ON user_purchased_features(feature_type);

-- RLS
ALTER TABLE user_purchased_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their purchased features"
    ON user_purchased_features FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- FEATURE PRICES (configurable)
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_prices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_es TEXT NOT NULL,
    description TEXT,
    description_es TEXT,
    qc_price INTEGER NOT NULL,
    feature_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO feature_prices (id, name, name_es, description, description_es, qc_price, feature_type)
VALUES
    ('life_path_slot', 'Extra Life Path', 'Camino de Vida Extra', 'Add one more life path slot permanently', 'Añade un camino de vida permanente', 2500, 'extra_life_path'),
    ('duel_daily', 'Extra Duel Today', 'Duelo Extra Hoy', 'One more duel for today (max 2/day)', 'Un duelo más para hoy (máx 2/día)', 300, 'extra_duel_slot'),
    ('ai_messages_10', 'AI Message Pack', 'Pack de Mensajes IA', '10 extra AI messages', '10 mensajes extra con IA', 250, 'ai_message_pack'),
    ('habit_slot', 'Extra Habit Slot', 'Hábito Extra', 'Add one more habit slot permanently', 'Añade un hábito permanente', 800, 'extra_habit_slot'),
    ('streak_revive', 'Revive Streak', 'Revivir Racha', 'Bring back your lost streak (special conditions apply)', 'Recupera tu racha perdida (aplican condiciones)', 500, 'streak_protection'),
    ('friend_slot', 'Extra Friend Slot', 'Amigo Extra', 'Add one more friend slot', 'Añade un amigo más', 200, 'extra_friend_slot'),
    ('raid_daily', 'Extra Raid Today', 'Raid Extra Hoy', 'One more raid for today', 'Un raid más para hoy', 400, 'extra_raid_slot')
ON CONFLICT (id) DO UPDATE SET
    qc_price = EXCLUDED.qc_price,
    description = EXCLUDED.description,
    description_es = EXCLUDED.description_es,
    is_active = EXCLUDED.is_active;

-- RLS for feature_prices (public read)
ALTER TABLE feature_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature prices"
    ON feature_prices FOR SELECT
    USING (true);

-- =====================================================
-- AD REWARDS CONFIG
-- =====================================================

CREATE TABLE IF NOT EXISTS ad_rewards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_es TEXT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN (
        'quest_coins',
        'extra_duel',
        'extra_ai_message',
        'xp_boost'
        -- streak_revive REMOVED from ads - too powerful
    )),
    reward_amount INTEGER NOT NULL,
    cooldown_minutes INTEGER DEFAULT 60, -- Minimum time between same reward (0 = no cooldown)
    max_daily INTEGER DEFAULT 5,         -- Max times per day
    is_active BOOLEAN DEFAULT TRUE
);

-- AD REWARDS:
-- - Quest Coins: Sin cooldown, máximo 15 al día (20 QC c/u = 300 QC/día máx)
-- - Duelo Extra: Max 1/día, cooldown 2 horas
-- - AI Messages: +5 mensajes, max 3/día  
-- - 2x XP: 3 horas de boost, max 2/día
-- - Streak Revive: NO DISPONIBLE con ads (solo QC)

INSERT INTO ad_rewards (id, name, name_es, reward_type, reward_amount, cooldown_minutes, max_daily)
VALUES
    ('ad_qc_20', 'Watch Ad for 20 QC', 'Ver Anuncio por 20 QC', 'quest_coins', 20, 0, 15),
    ('ad_duel', 'Watch Ad for Extra Duel', 'Ver Anuncio por Duelo Extra', 'extra_duel', 1, 120, 1),
    ('ad_ai', 'Watch Ad for AI Messages', 'Ver Anuncio por 5 Mensajes IA', 'extra_ai_message', 5, 60, 3),
    ('ad_xp', 'Watch Ad for 2x XP (3hrs)', 'Ver Anuncio por 2x XP (3hrs)', 'xp_boost', 180, 180, 2)
ON CONFLICT (id) DO UPDATE SET
    reward_amount = EXCLUDED.reward_amount,
    cooldown_minutes = EXCLUDED.cooldown_minutes,
    max_daily = EXCLUDED.max_daily;

-- RLS
ALTER TABLE ad_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ad rewards"
    ON ad_rewards FOR SELECT
    USING (true);

-- =====================================================
-- USER AD HISTORY (for cooldowns)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_ad_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ad_reward_id TEXT REFERENCES ad_rewards(id),
    watched_at TIMESTAMPTZ DEFAULT NOW(),
    reward_given BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_user_ad_history_user ON user_ad_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ad_history_watched ON user_ad_history(watched_at DESC);

-- RLS
ALTER TABLE user_ad_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their ad history"
    ON user_ad_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert ad history"
    ON user_ad_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTION: Get or Create Daily Limits
-- =====================================================

CREATE OR REPLACE FUNCTION get_daily_limits(p_user_id UUID)
RETURNS user_daily_limits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limits user_daily_limits;
BEGIN
    -- Try to get existing record for today
    SELECT * INTO v_limits
    FROM user_daily_limits
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
    -- If not exists, create it
    IF v_limits.id IS NULL THEN
        INSERT INTO user_daily_limits (user_id, date)
        VALUES (p_user_id, CURRENT_DATE)
        RETURNING * INTO v_limits;
    END IF;
    
    RETURN v_limits;
END;
$$;

-- =====================================================
-- FUNCTION: Check if user can do action
-- =====================================================

CREATE OR REPLACE FUNCTION can_perform_action(
    p_user_id UUID,
    p_action TEXT -- 'duel', 'ai_message', 'raid'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limits user_daily_limits;
    v_is_premium BOOLEAN;
    v_tier_features JSONB;
    v_max_allowed INTEGER;
    v_used INTEGER;
    v_bonus INTEGER;
    v_can_perform BOOLEAN;
    v_extra_purchased INTEGER;
BEGIN
    -- Check if premium
    SELECT 
        COALESCE(p.subscription_tier, 'free') != 'free',
        COALESCE(st.features, '{}')
    INTO v_is_premium, v_tier_features
    FROM profiles p
    LEFT JOIN subscription_tiers st ON st.id = p.subscription_tier
    WHERE p.id = p_user_id;
    
    -- Premium users can do unlimited
    IF v_is_premium THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'remaining', -1,
            'is_premium', true
        );
    END IF;
    
    -- Get daily limits
    v_limits := get_daily_limits(p_user_id);
    
    -- Get purchased extras for permanent features
    SELECT COALESCE(SUM(quantity), 0) INTO v_extra_purchased
    FROM user_purchased_features
    WHERE user_id = p_user_id 
    AND feature_type = CASE p_action
        WHEN 'duel' THEN 'extra_duel_slot'
        WHEN 'ai_message' THEN 'ai_message_pack'
        ELSE NULL
    END;
    
    -- Determine limits based on action
    CASE p_action
        WHEN 'duel' THEN
            v_max_allowed := COALESCE((v_tier_features->>'duels_daily')::INTEGER, 3);
            v_used := v_limits.duels_used;
            v_bonus := v_limits.duels_bonus + v_extra_purchased;
        WHEN 'ai_message' THEN
            v_max_allowed := COALESCE((v_tier_features->>'ai_messages_daily')::INTEGER, 5);
            v_used := v_limits.ai_messages_used;
            v_bonus := v_limits.ai_messages_bonus + (v_extra_purchased * 10);
        WHEN 'raid' THEN
            v_max_allowed := COALESCE((v_tier_features->>'raids_daily')::INTEGER, 1);
            v_used := v_limits.raids_used;
            v_bonus := v_limits.raids_bonus;
        ELSE
            RETURN jsonb_build_object('allowed', false, 'error', 'Unknown action');
    END CASE;
    
    v_can_perform := v_used < (v_max_allowed + v_bonus);
    
    RETURN jsonb_build_object(
        'allowed', v_can_perform,
        'used', v_used,
        'max', v_max_allowed,
        'bonus', v_bonus,
        'remaining', GREATEST(0, (v_max_allowed + v_bonus) - v_used),
        'is_premium', false
    );
END;
$$;

-- =====================================================
-- FUNCTION: Use daily action
-- =====================================================

CREATE OR REPLACE FUNCTION use_daily_action(
    p_user_id UUID,
    p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_can_perform JSONB;
BEGIN
    -- Check if allowed
    v_can_perform := can_perform_action(p_user_id, p_action);
    
    IF NOT (v_can_perform->>'allowed')::BOOLEAN THEN
        RETURN FALSE;
    END IF;
    
    -- If premium, no need to track
    IF (v_can_perform->>'is_premium')::BOOLEAN THEN
        RETURN TRUE;
    END IF;
    
    -- Update usage
    UPDATE user_daily_limits
    SET 
        duels_used = CASE WHEN p_action = 'duel' THEN duels_used + 1 ELSE duels_used END,
        ai_messages_used = CASE WHEN p_action = 'ai_message' THEN ai_messages_used + 1 ELSE ai_messages_used END,
        raids_used = CASE WHEN p_action = 'raid' THEN raids_used + 1 ELSE raids_used END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- FUNCTION: Purchase feature with QC
-- =====================================================

CREATE OR REPLACE FUNCTION purchase_feature_with_qc(
    p_user_id UUID,
    p_feature_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_feature feature_prices;
    v_success BOOLEAN;
BEGIN
    -- Get feature details
    SELECT * INTO v_feature
    FROM feature_prices
    WHERE id = p_feature_id AND is_active = TRUE;
    
    IF v_feature.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Feature not found');
    END IF;
    
    -- Try to spend QC
    v_success := spend_quest_coins(
        p_user_id,
        v_feature.qc_price,
        'shop_purchase',
        NULL,
        'feature',
        v_feature.name_es
    );
    
    IF NOT v_success THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient Quest Coins');
    END IF;
    
    -- Handle different feature types
    CASE v_feature.feature_type
        WHEN 'extra_life_path', 'extra_habit_slot', 'extra_friend_slot' THEN
            -- Permanent unlocks - add to purchased_features
            INSERT INTO user_purchased_features (user_id, feature_type, quantity, qc_spent)
            VALUES (p_user_id, v_feature.feature_type, 1, v_feature.qc_price);
            
        WHEN 'extra_duel_slot' THEN
            -- Check if already bought max 2 duels today
            DECLARE
                v_duels_bought_today INTEGER;
            BEGIN
                SELECT duels_bonus INTO v_duels_bought_today
                FROM user_daily_limits
                WHERE user_id = p_user_id AND date = CURRENT_DATE;
                
                IF v_duels_bought_today >= 2 THEN
                    -- Refund the QC
                    PERFORM add_quest_coins(p_user_id, v_feature.qc_price, 'refund', NULL, 'feature', 'Refund: max duels reached');
                    RETURN jsonb_build_object('success', false, 'error', 'Maximum 2 extra duels per day');
                END IF;
            END;
            
            -- Daily bonus
            UPDATE user_daily_limits
            SET duels_bonus = duels_bonus + 1, updated_at = NOW()
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
            
            IF NOT FOUND THEN
                INSERT INTO user_daily_limits (user_id, date, duels_bonus)
                VALUES (p_user_id, CURRENT_DATE, 1);
            END IF;
            
        WHEN 'extra_raid_slot' THEN
            -- Daily raid bonus
            UPDATE user_daily_limits
            SET raids_bonus = raids_bonus + 1, updated_at = NOW()
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
            
            IF NOT FOUND THEN
                INSERT INTO user_daily_limits (user_id, date, raids_bonus)
                VALUES (p_user_id, CURRENT_DATE, 1);
            END IF;
            
        WHEN 'ai_message_pack' THEN
            -- 10 extra AI messages today
            UPDATE user_daily_limits
            SET ai_messages_bonus = ai_messages_bonus + 10, updated_at = NOW()
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
            
            IF NOT FOUND THEN
                INSERT INTO user_daily_limits (user_id, date, ai_messages_bonus)
                VALUES (p_user_id, CURRENT_DATE, 10);
            END IF;
            
        WHEN 'streak_protection' THEN
            -- Revive streak - handled separately
            NULL;
    END CASE;
    
    RETURN jsonb_build_object(
        'success', true,
        'feature', v_feature.name_es,
        'qc_spent', v_feature.qc_price
    );
END;
$$;

-- =====================================================
-- FUNCTION: Claim Ad Reward
-- =====================================================

CREATE OR REPLACE FUNCTION claim_ad_reward(
    p_user_id UUID,
    p_ad_reward_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reward ad_rewards;
    v_last_watched TIMESTAMPTZ;
    v_times_today INTEGER;
    v_cooldown_passed BOOLEAN;
BEGIN
    -- Get reward config
    SELECT * INTO v_reward
    FROM ad_rewards
    WHERE id = p_ad_reward_id AND is_active = TRUE;
    
    IF v_reward.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reward not found');
    END IF;
    
    -- Check cooldown
    SELECT watched_at INTO v_last_watched
    FROM user_ad_history
    WHERE user_id = p_user_id AND ad_reward_id = p_ad_reward_id
    ORDER BY watched_at DESC
    LIMIT 1;
    
    v_cooldown_passed := v_last_watched IS NULL OR 
        (NOW() - v_last_watched) > (v_reward.cooldown_minutes || ' minutes')::INTERVAL;
    
    IF NOT v_cooldown_passed THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Cooldown active',
            'wait_minutes', EXTRACT(EPOCH FROM ((v_last_watched + (v_reward.cooldown_minutes || ' minutes')::INTERVAL) - NOW())) / 60
        );
    END IF;
    
    -- Check daily limit
    SELECT COUNT(*) INTO v_times_today
    FROM user_ad_history
    WHERE user_id = p_user_id 
    AND ad_reward_id = p_ad_reward_id
    AND watched_at::DATE = CURRENT_DATE;
    
    IF v_times_today >= v_reward.max_daily THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily limit reached');
    END IF;
    
    -- Record ad watch
    INSERT INTO user_ad_history (user_id, ad_reward_id)
    VALUES (p_user_id, p_ad_reward_id);
    
    -- Give reward based on type
    CASE v_reward.reward_type
        WHEN 'quest_coins' THEN
            PERFORM add_quest_coins(p_user_id, v_reward.reward_amount, 'ad_reward', NULL, 'ad', v_reward.name_es);
            
        WHEN 'extra_duel' THEN
            UPDATE user_daily_limits
            SET duels_bonus = duels_bonus + v_reward.reward_amount
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
            
        WHEN 'extra_ai_message' THEN
            UPDATE user_daily_limits
            SET ai_messages_bonus = ai_messages_bonus + v_reward.reward_amount
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
            
        WHEN 'xp_boost' THEN
            -- Could add XP boost tracking here
            NULL;
    END CASE;
    
    RETURN jsonb_build_object(
        'success', true,
        'reward_type', v_reward.reward_type,
        'reward_amount', v_reward.reward_amount,
        'times_today', v_times_today + 1,
        'max_daily', v_reward.max_daily
    );
END;
$$;

-- =====================================================
-- UPDATE SUBSCRIPTION TIERS FEATURES
-- =====================================================

UPDATE subscription_tiers
SET features = jsonb_build_object(
    'ai_messages_daily', 5,
    'life_paths', 2,
    'habits', 5,
    'friends', 10,
    'duels_daily', 3,
    'raids_daily', 1
)
WHERE id = 'free';

UPDATE subscription_tiers
SET features = jsonb_build_object(
    'unlimited', true,
    'ai_messages_daily', -1,
    'life_paths', -1,
    'habits', -1,
    'friends', -1,
    'duels_daily', -1,
    'raids_daily', -1
)
WHERE id IN ('premium_monthly', 'premium_yearly', 'premium_lifetime');

-- =====================================================
-- REFERRAL SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    qc_reward_referrer INTEGER DEFAULT 250,
    qc_reward_referred INTEGER DEFAULT 250,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(referred_id) -- Each user can only be referred once
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they're part of"
    ON referrals FOR SELECT
    USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Add referral_code to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
        ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE;
    END IF;
END $$;

-- Generate referral codes for existing users
UPDATE profiles
SET referral_code = UPPER(SUBSTRING(MD5(id::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_daily_limits TO authenticated;
GRANT EXECUTE ON FUNCTION can_perform_action TO authenticated;
GRANT EXECUTE ON FUNCTION use_daily_action TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_feature_with_qc TO authenticated;
GRANT EXECUTE ON FUNCTION claim_ad_reward TO authenticated;
