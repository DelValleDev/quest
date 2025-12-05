-- =====================================================
-- QUEST APP - SUBSCRIPTION & PREMIUM SYSTEM
-- Complete subscription system with Free/Premium/Developer tiers
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD SUBSCRIPTION COLUMNS TO PROFILES
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_developer BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS developer_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_developer_badge BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lifetime_premium BOOLEAN DEFAULT FALSE;

-- Add column for auto class (no manual selection)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_class TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_class TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_affinities JSONB;

-- =====================================================
-- 2. SUBSCRIPTION TIERS REFERENCE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description TEXT,
  description_es TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

-- Insert tiers
INSERT INTO public.subscription_tiers (id, name, name_es, description, description_es, price_monthly, price_yearly, features, sort_order)
VALUES 
  ('free', 'Free', 'Gratis', 'Basic Quest experience', 'Experiencia básica de Quest', 0, 0, '{
    "daily_quests_ai": 3,
    "calendar_ai_help": 1,
    "quest_coach_messages": 10,
    "max_habits": 5,
    "max_custom_quests": 3,
    "social_groups": 1,
    "raids_per_week": 1,
    "duels_per_day": 3,
    "themes": ["default"],
    "badges_visible": true,
    "leaderboard_access": true,
    "analytics": "basic",
    "max_life_paths": 1,
    "max_milestones_per_path": 5,
    "ai_life_path_generation": false,
    "life_path_templates": ["basic"],
    "max_agenda_events": 20
  }'::jsonb, 1),
  
  ('premium', 'Premium', 'Premium', 'Full Quest experience', 'Experiencia completa de Quest', 4.99, 39.99, '{
    "daily_quests_ai": 10,
    "calendar_ai_help": 5,
    "quest_coach_messages": -1,
    "max_habits": -1,
    "max_custom_quests": -1,
    "social_groups": -1,
    "raids_per_week": -1,
    "duels_per_day": -1,
    "themes": ["all"],
    "badges_visible": true,
    "leaderboard_access": true,
    "analytics": "advanced",
    "ai_deep_analysis": true,
    "priority_support": true,
    "exclusive_quests": true,
    "custom_avatars": true,
    "max_life_paths": -1,
    "max_milestones_per_path": -1,
    "ai_life_path_generation": true,
    "life_path_templates": ["all"],
    "max_agenda_events": -1
  }'::jsonb, 2),
  
  ('developer', 'Developer', 'Desarrollador', 'Creator access', 'Acceso de creador', 0, 0, '{
    "daily_quests_ai": -1,
    "calendar_ai_help": -1,
    "quest_coach_messages": -1,
    "max_habits": -1,
    "max_custom_quests": -1,
    "social_groups": -1,
    "raids_per_week": -1,
    "duels_per_day": -1,
    "themes": ["all"],
    "badges_visible": true,
    "leaderboard_access": true,
    "analytics": "full",
    "ai_deep_analysis": true,
    "priority_support": true,
    "exclusive_quests": true,
    "custom_avatars": true,
    "developer_tools": true,
    "api_access": true,
    "max_life_paths": -1,
    "max_milestones_per_path": -1,
    "ai_life_path_generation": true,
    "life_path_templates": ["all"],
    "max_agenda_events": -1
  }'::jsonb, 0)
ON CONFLICT (id) DO UPDATE SET
  features = EXCLUDED.features,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly;

-- =====================================================
-- 3. PAYMENT HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_provider TEXT, -- 'stripe', 'apple', 'google', 'paypal'
  provider_payment_id TEXT,
  provider_subscription_id TEXT,
  
  -- What was purchased
  tier_id TEXT REFERENCES public.subscription_tiers(id),
  billing_period TEXT, -- 'monthly', 'yearly', 'lifetime'
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- 4. FUNCTION: CHECK IF USER HAS PREMIUM
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_has_premium(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT 
    subscription_tier,
    subscription_expires_at,
    is_developer,
    lifetime_premium
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  -- Developer always has premium
  IF v_profile.is_developer = TRUE THEN
    RETURN TRUE;
  END IF;
  
  -- Lifetime premium
  IF v_profile.lifetime_premium = TRUE THEN
    RETURN TRUE;
  END IF;
  
  -- Active subscription
  IF v_profile.subscription_tier = 'premium' AND 
     (v_profile.subscription_expires_at IS NULL OR v_profile.subscription_expires_at > NOW()) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- =====================================================
-- 5. FUNCTION: GET USER'S FEATURE LIMITS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_limits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
  v_is_developer BOOLEAN;
  v_features JSONB;
BEGIN
  SELECT 
    COALESCE(subscription_tier, 'free'),
    COALESCE(is_developer, FALSE)
  INTO v_tier, v_is_developer
  FROM profiles
  WHERE id = p_user_id;
  
  -- Developer gets developer tier
  IF v_is_developer THEN
    v_tier := 'developer';
  END IF;
  
  -- Get features for tier
  SELECT features INTO v_features
  FROM subscription_tiers
  WHERE id = v_tier;
  
  -- Add tier info
  v_features := v_features || jsonb_build_object(
    'current_tier', v_tier,
    'is_premium', user_has_premium(p_user_id)
  );
  
  RETURN COALESCE(v_features, '{}'::jsonb);
END;
$$;

-- =====================================================
-- 6. FUNCTION: SET DEVELOPER ACCESS BY EMAIL
-- This is how you (the developer) get premium for free
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_developer_access(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    is_developer = TRUE,
    developer_email = p_email,
    subscription_tier = 'developer',
    updated_at = NOW()
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = p_email
  );
END;
$$;

-- =====================================================
-- 7. FUNCTION: CHECK AI USAGE WITH TIER LIMITS
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_ai_usage_with_tier(
  p_user_id UUID,
  p_action_type TEXT -- 'quest_creation', 'calendar_help', 'coach_message'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limits JSONB;
  v_daily_limit INTEGER;
  v_today_count INTEGER;
  v_limit_key TEXT;
BEGIN
  -- Get user's limits
  v_limits := get_user_limits(p_user_id);
  
  -- Map action to limit key
  CASE p_action_type
    WHEN 'quest_creation' THEN v_limit_key := 'daily_quests_ai';
    WHEN 'calendar_help' THEN v_limit_key := 'calendar_ai_help';
    WHEN 'coach_message' THEN v_limit_key := 'quest_coach_messages';
    ELSE v_limit_key := 'daily_quests_ai';
  END CASE;
  
  -- Get limit (-1 means unlimited)
  v_daily_limit := (v_limits->>v_limit_key)::INTEGER;
  
  -- Unlimited
  IF v_daily_limit = -1 THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'remaining', -1,
      'limit', -1,
      'is_unlimited', TRUE
    );
  END IF;
  
  -- Count today's usage
  SELECT COUNT(*) INTO v_today_count
  FROM ia_usage_tracking
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND created_at::DATE = CURRENT_DATE;
  
  IF v_today_count >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'remaining', 0,
      'limit', v_daily_limit,
      'is_unlimited', FALSE,
      'message_en', 'Daily limit reached. Upgrade to Premium for more!',
      'message_es', '¡Límite diario alcanzado! Actualiza a Premium para más.'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', TRUE,
    'remaining', v_daily_limit - v_today_count,
    'limit', v_daily_limit,
    'is_unlimited', FALSE
  );
END;
$$;

-- =====================================================
-- 8. FUNCTION: CALCULATE AUTO CLASS FROM ASSESSMENT
-- No manual class selection - calculated automatically
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_auto_class(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pillar_scores JSONB;
  v_affinities JSONB := '{}';
  v_primary_class TEXT;
  v_secondary_class TEXT;
  v_highest_score FLOAT := 0;
  v_second_highest FLOAT := 0;
  v_pillar TEXT;
  v_score FLOAT;
  v_class_mappings JSONB := '{
    "physical": "warrior",
    "mental": "sage",
    "social": "connector",
    "creative": "creator",
    "professional": "achiever",
    "spiritual": "monk"
  }';
BEGIN
  -- Get pillar scores
  SELECT pillar_scores INTO v_pillar_scores
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_pillar_scores IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'No pillar scores found'
    );
  END IF;
  
  -- Calculate class affinities and find primary/secondary
  FOR v_pillar, v_score IN SELECT * FROM jsonb_each_text(v_pillar_scores)
  LOOP
    v_score := v_score::FLOAT;
    
    -- Build affinities
    v_affinities := v_affinities || jsonb_build_object(
      v_class_mappings->>v_pillar, v_score
    );
    
    -- Track highest
    IF v_score > v_highest_score THEN
      v_second_highest := v_highest_score;
      v_secondary_class := v_primary_class;
      v_highest_score := v_score;
      v_primary_class := v_class_mappings->>v_pillar;
    ELSIF v_score > v_second_highest THEN
      v_second_highest := v_score;
      v_secondary_class := v_class_mappings->>v_pillar;
    END IF;
  END LOOP;
  
  -- Update profile with auto-calculated class
  UPDATE profiles
  SET 
    user_class = v_primary_class,
    primary_class = v_primary_class,
    secondary_class = v_secondary_class,
    class_affinities = v_affinities,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'primary_class', v_primary_class,
    'secondary_class', v_secondary_class,
    'affinities', v_affinities
  );
END;
$$;

-- =====================================================
-- 9. FIX RLS FOR CHALLENGES - Allow users to create
-- =====================================================

-- Allow authenticated users to INSERT their own AI-generated challenges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'challenges' 
    AND policyname = 'Users can create AI challenges'
  ) THEN
    CREATE POLICY "Users can create AI challenges" ON public.challenges
      FOR INSERT TO authenticated 
      WITH CHECK (
        -- Only allow inserting challenges tagged as ai_generated
        'ai_generated' = ANY(tags) OR tags IS NULL
      );
  END IF;
END
$$;

-- =====================================================
-- 10. TRIGGER: AUTO-SET CLASS AFTER ASSESSMENT
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_set_class_on_assessment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When assessment is completed, auto-calculate class
  IF NEW.assessment_completed = TRUE AND 
     (OLD.assessment_completed IS NULL OR OLD.assessment_completed = FALSE) AND
     NEW.pillar_scores IS NOT NULL THEN
    
    PERFORM calculate_auto_class(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_class_on_assessment ON profiles;
CREATE TRIGGER trigger_auto_class_on_assessment
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.assessment_completed = TRUE)
  EXECUTE FUNCTION auto_set_class_on_assessment();

-- =====================================================
-- 11. CREATE IA_USAGE_TRACKING IF NOT EXISTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ia_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'quest_creation', 'calendar_help', 'coach_message'
  action_details JSONB,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ia_usage_user_date ON ia_usage_tracking(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ia_usage_action ON ia_usage_tracking(action_type, created_at);

-- Enable RLS
ALTER TABLE public.ia_usage_tracking ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ia_usage_tracking' 
    AND policyname = 'Users can view own usage'
  ) THEN
    CREATE POLICY "Users can view own usage" ON public.ia_usage_tracking
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ia_usage_tracking' 
    AND policyname = 'Users can insert own usage'
  ) THEN
    CREATE POLICY "Users can insert own usage" ON public.ia_usage_tracking
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- =====================================================
-- 12. FUNCTION: USE AI ACTION (with tracking)
-- =====================================================
CREATE OR REPLACE FUNCTION public.use_ai_action(
  p_user_id UUID,
  p_action_type TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_check JSONB;
BEGIN
  -- Check if allowed
  v_check := check_ai_usage_with_tier(p_user_id, p_action_type);
  
  IF NOT (v_check->>'allowed')::BOOLEAN THEN
    RETURN v_check;
  END IF;
  
  -- Track usage
  INSERT INTO ia_usage_tracking (user_id, action_type, action_details)
  VALUES (p_user_id, p_action_type, p_details);
  
  RETURN v_check;
END;
$$;

-- =====================================================
-- 13. VIEW: USER SUBSCRIPTION STATUS
-- =====================================================
CREATE OR REPLACE VIEW public.user_subscription_status AS
SELECT 
  p.id AS user_id,
  p.display_name,
  p.subscription_tier,
  p.subscription_expires_at,
  p.is_developer,
  p.lifetime_premium,
  p.show_developer_badge,
  user_has_premium(p.id) AS has_premium,
  get_user_limits(p.id) AS limits,
  CASE 
    WHEN p.is_developer THEN 'developer'
    WHEN p.lifetime_premium THEN 'lifetime'
    WHEN p.subscription_tier = 'premium' AND p.subscription_expires_at > NOW() THEN 'premium_active'
    WHEN p.subscription_tier = 'premium' AND p.subscription_expires_at <= NOW() THEN 'premium_expired'
    ELSE 'free'
  END AS subscription_status
FROM profiles p;

-- =====================================================
-- 14. RLS POLICIES FOR NEW TABLES
-- =====================================================
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read tiers
CREATE POLICY "Anyone can read tiers" ON public.subscription_tiers
  FOR SELECT TO authenticated USING (TRUE);

-- Users can only see own payment history
CREATE POLICY "Users can view own payments" ON public.payment_history
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 15. SETUP YOUR DEVELOPER ACCOUNT
-- Run this with your email to get free premium forever:
-- SELECT set_developer_access('your-email@example.com');
-- =====================================================

-- Example usage comment:
-- To make yourself the developer with free premium:
-- SELECT set_developer_access('delvalledev@gmail.com');

-- =====================================================
-- DONE! 🎉
-- =====================================================
