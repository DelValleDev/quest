-- Migration 026: Active Pillars System
-- Description: Allow users to choose which pillars they want to focus on
-- Date: 2024-12-05

-- Add is_active column to user_pillars
ALTER TABLE public.user_pillars 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add inactive_xp column to track XP earned while pillar is inactive
-- This XP can be applied when the pillar is activated
ALTER TABLE public.user_pillars 
ADD COLUMN IF NOT EXISTS inactive_xp INTEGER DEFAULT 0;

-- Add priority column for ordering active pillars
ALTER TABLE public.user_pillars 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Add activated_at timestamp
ALTER TABLE public.user_pillars 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster queries on active pillars
CREATE INDEX IF NOT EXISTS idx_user_pillars_active 
ON public.user_pillars(user_id, is_active) 
WHERE is_active = true;

-- Function to activate a pillar for a user
CREATE OR REPLACE FUNCTION activate_pillar(
  p_user_id UUID,
  p_pillar_id TEXT
) RETURNS void AS $$
BEGIN
  UPDATE public.user_pillars
  SET 
    is_active = true,
    activated_at = NOW(),
    -- Apply any inactive XP that was accumulated
    current_xp = current_xp + inactive_xp,
    inactive_xp = 0
  WHERE user_id = p_user_id AND pillar_id = p_pillar_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate a pillar for a user
CREATE OR REPLACE FUNCTION deactivate_pillar(
  p_user_id UUID,
  p_pillar_id TEXT
) RETURNS void AS $$
BEGIN
  UPDATE public.user_pillars
  SET is_active = false
  WHERE user_id = p_user_id AND pillar_id = p_pillar_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add XP to a pillar (handles active/inactive differently)
CREATE OR REPLACE FUNCTION add_pillar_xp(
  p_user_id UUID,
  p_pillar_id TEXT,
  p_xp_amount INTEGER
) RETURNS TABLE(
  new_level INTEGER,
  new_xp INTEGER,
  leveled_up BOOLEAN,
  was_active BOOLEAN
) AS $$
DECLARE
  v_is_active BOOLEAN;
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_xp_for_next_level INTEGER;
  v_leveled_up BOOLEAN := false;
BEGIN
  -- Get current pillar state
  SELECT is_active, current_xp, level
  INTO v_is_active, v_current_xp, v_current_level
  FROM public.user_pillars
  WHERE user_id = p_user_id AND pillar_id = p_pillar_id;

  IF v_is_active THEN
    -- Active pillar: add XP normally and check for level up
    v_new_xp := v_current_xp + p_xp_amount;
    v_new_level := v_current_level;
    
    -- Level up formula: 100 XP per level
    v_xp_for_next_level := v_current_level * 100;
    
    WHILE v_new_xp >= v_xp_for_next_level LOOP
      v_new_xp := v_new_xp - v_xp_for_next_level;
      v_new_level := v_new_level + 1;
      v_leveled_up := true;
      v_xp_for_next_level := v_new_level * 100;
    END LOOP;
    
    UPDATE public.user_pillars
    SET current_xp = v_new_xp, level = v_new_level
    WHERE user_id = p_user_id AND pillar_id = p_pillar_id;
    
    RETURN QUERY SELECT v_new_level, v_new_xp, v_leveled_up, true;
  ELSE
    -- Inactive pillar: store XP for later
    UPDATE public.user_pillars
    SET inactive_xp = inactive_xp + p_xp_amount
    WHERE user_id = p_user_id AND pillar_id = p_pillar_id;
    
    RETURN QUERY SELECT v_current_level, v_current_xp, false, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION activate_pillar(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_pillar(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_pillar_xp(UUID, TEXT, INTEGER) TO authenticated;

COMMENT ON COLUMN public.user_pillars.is_active IS 'Whether the user is currently focusing on this pillar';
COMMENT ON COLUMN public.user_pillars.inactive_xp IS 'XP accumulated while pillar was inactive, applied when activated';
COMMENT ON COLUMN public.user_pillars.priority IS 'Order priority for displaying active pillars';
COMMENT ON COLUMN public.user_pillars.activated_at IS 'When the pillar was last activated';
