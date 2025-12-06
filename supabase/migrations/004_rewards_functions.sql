-- =====================================================
-- Migration 004: Rewards Helper Functions
-- Description: Functions to add XP, coins, and increment pillar scores
-- =====================================================

CREATE OR REPLACE FUNCTION add_user_rewards(p_user_id UUID, p_xp INTEGER, p_coins INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    total_xp = COALESCE(total_xp, 0) + p_xp,
    quest_coins = COALESCE(quest_coins, 0) + p_coins,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION increment_pillar_score(p_user_id UUID, p_pillar TEXT, p_points INTEGER)
RETURNS void AS $$
DECLARE
  current_scores JSONB;
  new_score INTEGER;
BEGIN
  SELECT pillar_scores INTO current_scores
  FROM profiles WHERE id = p_user_id;
  
  IF current_scores IS NULL THEN
    current_scores := '{}'::JSONB;
  END IF;
  
  new_score := LEAST(100, COALESCE((current_scores->>p_pillar)::INTEGER, 50) + p_points);
  
  UPDATE profiles
  SET 
    pillar_scores = jsonb_set(current_scores, ARRAY[p_pillar], to_jsonb(new_score)),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION add_user_rewards(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_pillar_score(UUID, TEXT, INTEGER) TO authenticated;
