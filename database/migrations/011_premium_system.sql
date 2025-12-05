-- =====================================================
-- MIGRATION 011: Premium Subscription System
-- Date: December 4, 2025
-- Description: Add premium subscription tracking
-- =====================================================

-- Add premium columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS premium_type TEXT DEFAULT 'free' CHECK (premium_type IN ('free', 'trial', 'monthly', 'yearly', 'lifetime')),
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_seen_tutorial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tutorial_step INTEGER DEFAULT 0;

-- Create subscription history table
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  payment_provider TEXT, -- 'stripe', 'apple', 'google', 'manual'
  payment_id TEXT, -- External payment reference
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'refunded')),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscription history"
  ON public.subscription_history FOR SELECT
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_subscription_history_user 
  ON public.subscription_history(user_id, created_at DESC);

-- Function to start free trial (1 month)
CREATE OR REPLACE FUNCTION public.start_premium_trial(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Check if user already used trial
  SELECT trial_used, is_premium INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF v_profile.trial_used THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Ya has usado tu prueba gratuita'
    );
  END IF;
  
  IF v_profile.is_premium THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Ya tienes premium activo'
    );
  END IF;
  
  -- Start trial
  UPDATE public.profiles
  SET 
    is_premium = true,
    premium_type = 'trial',
    premium_started_at = NOW(),
    premium_expires_at = NOW() + INTERVAL '1 month',
    trial_used = true
  WHERE id = p_user_id;
  
  -- Log in history
  INSERT INTO public.subscription_history (
    user_id, subscription_type, expires_at, payment_provider
  ) VALUES (
    p_user_id, 'trial', NOW() + INTERVAL '1 month', 'free_trial'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', '¡Prueba premium de 1 mes activada!',
    'expires_at', (NOW() + INTERVAL '1 month')::TEXT
  );
END;
$$;

-- Function to check and update premium status
CREATE OR REPLACE FUNCTION public.check_premium_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_days_left INTEGER;
BEGIN
  SELECT is_premium, premium_type, premium_expires_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- If premium has expired
  IF v_profile.is_premium AND v_profile.premium_expires_at < NOW() THEN
    UPDATE public.profiles
    SET is_premium = false, premium_type = 'free'
    WHERE id = p_user_id;
    
    -- Update subscription history
    UPDATE public.subscription_history
    SET status = 'expired'
    WHERE user_id = p_user_id 
      AND status = 'active'
      AND expires_at < NOW();
    
    RETURN jsonb_build_object(
      'is_premium', false,
      'premium_type', 'free',
      'expired', true,
      'message', 'Tu premium ha expirado'
    );
  END IF;
  
  -- Calculate days left
  IF v_profile.premium_expires_at IS NOT NULL THEN
    v_days_left := EXTRACT(DAY FROM (v_profile.premium_expires_at - NOW()));
  ELSE
    v_days_left := NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'is_premium', COALESCE(v_profile.is_premium, false),
    'premium_type', COALESCE(v_profile.premium_type, 'free'),
    'expires_at', v_profile.premium_expires_at,
    'days_left', v_days_left,
    'expired', false
  );
END;
$$;

-- Function to activate premium subscription
CREATE OR REPLACE FUNCTION public.activate_premium(
  p_user_id UUID,
  p_type TEXT, -- 'monthly', 'yearly', 'lifetime'
  p_payment_id TEXT DEFAULT NULL,
  p_payment_provider TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_amount DECIMAL(10,2);
BEGIN
  -- Set expiration based on type
  CASE p_type
    WHEN 'monthly' THEN 
      v_expires_at := NOW() + INTERVAL '1 month';
      v_amount := 4.99;
    WHEN 'yearly' THEN 
      v_expires_at := NOW() + INTERVAL '1 year';
      v_amount := 29.99;
    WHEN 'lifetime' THEN 
      v_expires_at := NOW() + INTERVAL '100 years';
      v_amount := 79.99;
    ELSE
      RETURN jsonb_build_object('success', false, 'message', 'Tipo de suscripción inválido');
  END CASE;
  
  -- Update profile
  UPDATE public.profiles
  SET 
    is_premium = true,
    premium_type = p_type,
    premium_started_at = NOW(),
    premium_expires_at = v_expires_at
  WHERE id = p_user_id;
  
  -- Log in history
  INSERT INTO public.subscription_history (
    user_id, subscription_type, expires_at, amount_paid, 
    payment_provider, payment_id
  ) VALUES (
    p_user_id, p_type, v_expires_at, v_amount,
    p_payment_provider, p_payment_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', '¡Premium activado!',
    'type', p_type,
    'expires_at', v_expires_at::TEXT
  );
END;
$$;

-- Function to mark tutorial as seen
CREATE OR REPLACE FUNCTION public.complete_tutorial(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET has_seen_tutorial = true, tutorial_step = -1
  WHERE id = p_user_id;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 011 completed: Premium subscription system created';
END $$;
