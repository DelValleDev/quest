-- =====================================================
-- Migration 010: Premium Functions
-- Description: Functions to start trial and check premium status
-- =====================================================

CREATE OR REPLACE FUNCTION public.start_premium_trial(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT trial_used, is_premium INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF v_profile.trial_used THEN
    RETURN jsonb_build_object('success', false, 'message', 'Trial already used');
  END IF;
  
  IF v_profile.is_premium THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already premium');
  END IF;
  
  UPDATE public.profiles
  SET 
    is_premium = true,
    premium_type = 'trial',
    premium_started_at = NOW(),
    premium_expires_at = NOW() + INTERVAL '1 month',
    trial_used = true
  WHERE id = p_user_id;
  
  INSERT INTO public.subscription_history (user_id, subscription_type, expires_at, payment_provider)
  VALUES (p_user_id, 'trial', NOW() + INTERVAL '1 month', 'free_trial');
  
  RETURN jsonb_build_object(
    'success', true,
    'message', '1 month trial activated!',
    'expires_at', (NOW() + INTERVAL '1 month')::TEXT
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_premium_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_days_left INTEGER;
BEGIN
  SELECT is_premium, premium_type, premium_expires_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF v_profile.is_premium AND v_profile.premium_expires_at < NOW() THEN
    UPDATE public.profiles
    SET is_premium = false, premium_type = 'free'
    WHERE id = p_user_id;
    
    UPDATE public.subscription_history
    SET status = 'expired'
    WHERE user_id = p_user_id AND status = 'active' AND expires_at < NOW();
    
    RETURN jsonb_build_object(
      'is_premium', false,
      'premium_type', 'free',
      'expired', true
    );
  END IF;
  
  IF v_profile.premium_expires_at IS NOT NULL THEN
    v_days_left := EXTRACT(DAY FROM (v_profile.premium_expires_at - NOW()));
  END IF;
  
  RETURN jsonb_build_object(
    'is_premium', COALESCE(v_profile.is_premium, false),
    'premium_type', COALESCE(v_profile.premium_type, 'free'),
    'expires_at', v_profile.premium_expires_at,
    'days_left', v_days_left
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_premium_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_premium_status(UUID) TO authenticated;
