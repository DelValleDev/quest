-- =====================================================
-- BALANCED PRICING UPDATE
-- Migration: 016_balanced_pricing.sql
-- 
-- Philosophy:
-- - PRODUCTIVITY FIRST: Quest is a productivity tool, not a mobile game
-- - DAILY items = CHEAP (small boosts when needed)
-- - PERMANENT items = EXPENSIVE (weeks of discipline to earn)
-- - Ads = Minor bonus, NOT main income source
-- 
-- Economy: ~70 QC/day (half prices for $4.99 Premium)
-- Life Path = ~20 days of discipline
-- =====================================================

-- =====================================================
-- UPDATE FEATURE PRICES (Half prices - $4.99 Premium economy)
-- =====================================================

-- Delete old prices and insert new balanced ones
DELETE FROM feature_prices;

INSERT INTO feature_prices (id, name, name_es, description, description_es, qc_price, feature_type, is_active)
VALUES
    -- DAILY CONSUMABLES (cheap, small boosts)
    ('quest_extra', 'Extra Quest Today', 'Quest Extra Hoy', 'Add one more quest for today', 'Añade una quest más para hoy', 5, 'extra_quest', TRUE),
    ('ai_messages_5', 'AI Message Pack', 'Pack de Mensajes IA', '5 extra AI messages', '5 mensajes extra con IA', 25, 'ai_message_pack', TRUE),
    ('duel_daily', 'Extra Duel Today', 'Duelo Extra Hoy', 'One more duel for today (max 2/day)', 'Un duelo más para hoy (máx 2/día)', 50, 'extra_duel_slot', TRUE),
    
    -- SPECIAL (situational value)
    ('streak_revive', 'Revive Streak', 'Revivir Racha', 'Bring back your lost streak (conditions apply)', 'Recupera tu racha perdida (aplican condiciones)', 175, 'streak_protection', TRUE),
    
    -- GROUP/SOCIAL (moderately expensive)
    ('friend_slot', 'Extra Friend Slot', 'Amigo Extra', 'Permanently add one more friend slot', 'Añade permanentemente un amigo más', 250, 'extra_friend_slot', TRUE),
    ('raid_daily', 'Extra Raid Today', 'Raid Extra Hoy', 'One more raid for your whole group', 'Un raid más para todo tu grupo', 300, 'extra_raid_slot', TRUE),
    
    -- PERMANENT UNLOCKS (expensive, weeks of work)
    ('habit_slot', 'Extra Habit Slot', 'Hábito Extra', 'Permanently add one more habit slot', 'Añade permanentemente un hábito más', 400, 'extra_habit_slot', TRUE),
    ('life_path_slot', 'Extra Life Path', 'Camino de Vida Extra', 'Permanently add one more life path', 'Añade permanentemente un camino de vida', 1350, 'extra_life_path', TRUE);

-- =====================================================
-- UPDATE COIN PACKAGES (Real Money Purchases)
-- ~$2 per Life Path (1350 QC) - fits $4.99 Premium
-- =====================================================

-- Create coin_packages table if not exists
CREATE TABLE IF NOT EXISTS coin_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_es TEXT NOT NULL,
    coins_amount INTEGER NOT NULL,
    bonus_coins INTEGER DEFAULT 0,
    price_usd DECIMAL(10, 2) NOT NULL,
    price_mxn DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clear and insert new packages
DELETE FROM coin_packages;

INSERT INTO coin_packages (id, name, name_es, coins_amount, bonus_coins, price_usd, price_mxn, is_active, sort_order)
VALUES
    ('coins_50', 'Starter Pack', 'Paquete Inicial', 50, 0, 0.99, 19, TRUE, 1),
    ('coins_250', 'Basic Pack', 'Paquete Básico', 250, 25, 1.99, 39, TRUE, 2),
    ('coins_750', 'Popular Pack', 'Paquete Popular', 750, 100, 4.99, 89, TRUE, 3),
    ('coins_1500', 'Great Value', 'Gran Valor', 1500, 250, 8.99, 159, TRUE, 4),
    ('coins_3500', 'Ultimate Pack', 'Paquete Ultimate', 3500, 750, 17.99, 329, TRUE, 5);

-- Paquete breakdown (half economy):
-- coins_50:   50 QC = $0.99  - Entry level
-- coins_250:  275 QC = $1.99 - +10% bonus
-- coins_750:  850 QC = $4.99 - +13% bonus (same as Premium monthly!)
-- coins_1500: 1750 QC = $8.99 - +17% bonus = 1.3 Life Paths
-- coins_3500: 4250 QC = $17.99 - +21% bonus = 3.1 Life Paths

-- =====================================================
-- UPDATE USER_PURCHASED_FEATURES CHECK CONSTRAINT
-- =====================================================

-- Drop old constraint and add new one with extra_quest and extra_raid_slot
ALTER TABLE user_purchased_features DROP CONSTRAINT IF EXISTS user_purchased_features_feature_type_check;

ALTER TABLE user_purchased_features ADD CONSTRAINT user_purchased_features_feature_type_check 
CHECK (feature_type IN (
    'extra_life_path',
    'extra_duel_slot',
    'extra_habit_slot',
    'extra_friend_slot',
    'extra_raid_slot',
    'extra_quest',
    'streak_protection',
    'ai_message_pack'
));

-- =====================================================
-- ADD QUESTS TRACKING TO DAILY LIMITS
-- =====================================================

-- Add quests_used and quests_bonus columns if not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_daily_limits' AND column_name = 'quests_used') THEN
        ALTER TABLE user_daily_limits ADD COLUMN quests_used INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_daily_limits' AND column_name = 'quests_bonus') THEN
        ALTER TABLE user_daily_limits ADD COLUMN quests_bonus INTEGER DEFAULT 0;
    END IF;
END $$;

-- =====================================================
-- UPDATE AD REWARDS (MINIMAL - Ads are bonus, not main income)
-- =====================================================

-- First delete all existing data to avoid constraint violations
DELETE FROM ad_rewards;

-- Now update the check constraint to include extra_quest
ALTER TABLE ad_rewards DROP CONSTRAINT IF EXISTS ad_rewards_reward_type_check;
ALTER TABLE ad_rewards ADD CONSTRAINT ad_rewards_reward_type_check 
CHECK (reward_type IN (
    'quest_coins',
    'extra_duel',
    'extra_ai_message',
    'extra_quest',
    'xp_boost'
));

-- Max 10 QC/day from ads (2 ads x 5 QC)
-- This ensures gameplay > ads

INSERT INTO ad_rewards (id, name, name_es, reward_type, reward_amount, cooldown_minutes, max_daily, is_active)
VALUES
    -- Quest Coins - only 2 ads max, 5 QC each = 10 QC/day max
    ('ad_qc_5', 'Watch Ad for 5 QC', 'Ver Anuncio por 5 QC', 'quest_coins', 5, 0, 2, TRUE),
    
    -- Extra Duel - limited to 1/day max
    ('ad_duel', 'Watch Ad for Extra Duel', 'Ver Anuncio por Duelo Extra', 'extra_duel', 1, 0, 1, TRUE),
    
    -- AI Messages - +2 per ad, limited
    ('ad_ai', 'Watch Ad for 2 AI Messages', 'Ver Anuncio por 2 Mensajes IA', 'extra_ai_message', 2, 60, 2, TRUE),
    
    -- XP Boost - 2 hours, limited uses
    ('ad_xp', 'Watch Ad for 2x XP (2hrs)', 'Ver Anuncio por 2x XP (2hrs)', 'xp_boost', 120, 180, 2, TRUE),
    
    -- Extra Quest - 1 per ad, very limited
    ('ad_quest', 'Watch Ad for Extra Quest', 'Ver Anuncio por Quest Extra', 'extra_quest', 1, 120, 2, TRUE);

-- NO streak revive from ads (too powerful, must pay QC)

-- =====================================================
-- UPDATE FREE TIER LIMITS IN SUBSCRIPTION_TIERS
-- =====================================================

UPDATE subscription_tiers
SET features = jsonb_build_object(
    'ai_messages_daily', 5,
    'life_paths', 2,
    'habits', 5,
    'friends', 10,
    'duels_daily', 3,
    'raids_daily', 1,
    'quests_daily', 5  -- Free users get 5 quests per day
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
    'raids_daily', -1,
    'quests_daily', -1
)
WHERE id IN ('premium_monthly', 'premium_yearly', 'premium_lifetime');

-- =====================================================
-- UPDATE PURCHASE FUNCTION FOR NEW FEATURES
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
    v_current_bonus INTEGER;
BEGIN
    -- Get feature details
    SELECT * INTO v_feature
    FROM feature_prices
    WHERE id = p_feature_id AND is_active = TRUE;
    
    IF v_feature.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Feature not found');
    END IF;
    
    -- Check daily purchase limits for duels (max 2/day)
    IF v_feature.feature_type = 'extra_duel_slot' THEN
        SELECT COALESCE(duels_bonus, 0) INTO v_current_bonus
        FROM user_daily_limits
        WHERE user_id = p_user_id AND date = CURRENT_DATE;
        
        IF v_current_bonus >= 2 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Maximum 2 extra duels per day');
        END IF;
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
        -- PERMANENT UNLOCKS
        WHEN 'extra_life_path', 'extra_habit_slot', 'extra_friend_slot' THEN
            INSERT INTO user_purchased_features (user_id, feature_type, quantity, qc_spent)
            VALUES (p_user_id, v_feature.feature_type, 1, v_feature.qc_price);
            
        -- DAILY BONUSES
        WHEN 'extra_duel_slot' THEN
            INSERT INTO user_daily_limits (user_id, date, duels_bonus)
            VALUES (p_user_id, CURRENT_DATE, 1)
            ON CONFLICT (user_id, date) 
            DO UPDATE SET duels_bonus = user_daily_limits.duels_bonus + 1, updated_at = NOW();
            
        WHEN 'extra_raid_slot' THEN
            INSERT INTO user_daily_limits (user_id, date, raids_bonus)
            VALUES (p_user_id, CURRENT_DATE, 1)
            ON CONFLICT (user_id, date) 
            DO UPDATE SET raids_bonus = user_daily_limits.raids_bonus + 1, updated_at = NOW();
            
        WHEN 'extra_quest' THEN
            INSERT INTO user_daily_limits (user_id, date, quests_bonus)
            VALUES (p_user_id, CURRENT_DATE, 1)
            ON CONFLICT (user_id, date) 
            DO UPDATE SET quests_bonus = user_daily_limits.quests_bonus + 1, updated_at = NOW();
            
        WHEN 'ai_message_pack' THEN
            INSERT INTO user_daily_limits (user_id, date, ai_messages_bonus)
            VALUES (p_user_id, CURRENT_DATE, 10)
            ON CONFLICT (user_id, date) 
            DO UPDATE SET ai_messages_bonus = user_daily_limits.ai_messages_bonus + 10, updated_at = NOW();
            
        WHEN 'streak_protection' THEN
            -- Record the purchase, actual streak revive handled by app
            INSERT INTO user_purchased_features (user_id, feature_type, quantity, qc_spent)
            VALUES (p_user_id, v_feature.feature_type, 1, v_feature.qc_price);
            
        ELSE
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
-- UPDATE CAN_PERFORM_ACTION FOR QUESTS
-- =====================================================

CREATE OR REPLACE FUNCTION can_perform_action(
    p_user_id UUID,
    p_action TEXT -- 'duel', 'ai_message', 'raid', 'quest'
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
    
    -- Get or create daily limits
    INSERT INTO user_daily_limits (user_id, date)
    VALUES (p_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, date) DO NOTHING;
    
    SELECT * INTO v_limits
    FROM user_daily_limits
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
    -- Determine limits based on action
    CASE p_action
        WHEN 'duel' THEN
            v_max_allowed := COALESCE((v_tier_features->>'duels_daily')::INTEGER, 3);
            v_used := COALESCE(v_limits.duels_used, 0);
            v_bonus := COALESCE(v_limits.duels_bonus, 0);
        WHEN 'ai_message' THEN
            v_max_allowed := COALESCE((v_tier_features->>'ai_messages_daily')::INTEGER, 5);
            v_used := COALESCE(v_limits.ai_messages_used, 0);
            v_bonus := COALESCE(v_limits.ai_messages_bonus, 0);
        WHEN 'raid' THEN
            v_max_allowed := COALESCE((v_tier_features->>'raids_daily')::INTEGER, 1);
            v_used := COALESCE(v_limits.raids_used, 0);
            v_bonus := COALESCE(v_limits.raids_bonus, 0);
        WHEN 'quest' THEN
            v_max_allowed := COALESCE((v_tier_features->>'quests_daily')::INTEGER, 5);
            v_used := COALESCE(v_limits.quests_used, 0);
            v_bonus := COALESCE(v_limits.quests_bonus, 0);
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
-- UPDATE USE_DAILY_ACTION FOR QUESTS
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
        quests_used = CASE WHEN p_action = 'quest' THEN COALESCE(quests_used, 0) + 1 ELSE quests_used END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- UPDATE CLAIM_AD_REWARD FOR EXTRA_QUEST
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
    
    -- Check cooldown (0 = no cooldown)
    IF v_reward.cooldown_minutes > 0 THEN
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
    
    -- Ensure daily limits record exists
    INSERT INTO user_daily_limits (user_id, date)
    VALUES (p_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, date) DO NOTHING;
    
    -- Give reward based on type
    CASE v_reward.reward_type
        WHEN 'quest_coins' THEN
            PERFORM add_quest_coins(p_user_id, v_reward.reward_amount, 'ad_reward', NULL, 'ad', v_reward.name_es);
            
        WHEN 'extra_duel' THEN
            UPDATE user_daily_limits
            SET duels_bonus = COALESCE(duels_bonus, 0) + v_reward.reward_amount
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
            
        WHEN 'extra_ai_message' THEN
            UPDATE user_daily_limits
            SET ai_messages_bonus = COALESCE(ai_messages_bonus, 0) + v_reward.reward_amount
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
            
        WHEN 'extra_quest' THEN
            UPDATE user_daily_limits
            SET quests_bonus = COALESCE(quests_bonus, 0) + v_reward.reward_amount
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
            
        WHEN 'xp_boost' THEN
            -- XP boost tracking could be added here
            -- For now, just record it was claimed
            NULL;
    END CASE;
    
    -- Update ads watched counter
    UPDATE user_daily_limits
    SET ads_watched = COALESCE(ads_watched, 0) + 1
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
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
-- SUMMARY OF BALANCED PRICES
-- =====================================================
-- 
-- DAILY (cheap, frequent):
--   Quest Extra:     20 QC
--   AI Messages x10: 40 QC
--   Duel Extra:      50 QC (max 2/day)
--   Raid Extra:      75 QC
--
-- PERMANENT (expensive, one-time):
--   Friend Slot:    300 QC
--   Habit Slot:     500 QC
--   Life Path:     1500 QC
--
-- SPECIAL:
--   Streak Revive:  250 QC (no ads)
--
-- AD REWARDS:
--   20 QC:          No cooldown, max 20/day (400 QC max)
--   Extra Duel:     No cooldown, max 1/day
--   5 AI Messages:  30min cooldown, max 4/day (20 messages max)
--   3hr 2x XP:      3hr cooldown, max 2/day
--   Extra Quest:    1hr cooldown, max 3/day
-- =====================================================
