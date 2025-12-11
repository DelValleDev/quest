-- =====================================================
-- SISTEMA DE CLASES
-- Sistema de clases que determina el enfoque del usuario
-- =====================================================

-- =====================================================
-- TABLA DE CLASES DE PERSONAJE
-- =====================================================
CREATE TABLE IF NOT EXISTS character_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  primary_pillar TEXT NOT NULL, -- Pilar principal de enfoque
  secondary_pillar TEXT, -- Enfoque secundario
  color TEXT NOT NULL,
  challenge_distribution JSONB NOT NULL DEFAULT '{"primary": 0.6, "secondary": 0.2, "others": 0.2}'
);

-- =====================================================
-- INSERT CHARACTER CLASSES
-- =====================================================
INSERT INTO character_classes (id, name, icon, description, primary_pillar, secondary_pillar, color, challenge_distribution) VALUES
(
  'warrior',
  'The Warrior',
  '💪',
  'Masters of physical prowess. Warriors focus on exercise, nutrition, and building a strong body. They believe the body is the foundation of all achievement.',
  'physical',
  'mental',
  '#EF4444',
  '{"primary": 0.60, "secondary": 0.20, "others": 0.20}'
),
(
  'sage',
  'The Sage',
  '🧠',
  'Seekers of knowledge and productivity. Sages dedicate themselves to learning, reading, and mental growth. They believe wisdom is the key to everything.',
  'mental',
  'professional',
  '#3B82F6',
  '{"primary": 0.60, "secondary": 0.20, "others": 0.20}'
),
(
  'connector',
  'The Connector',
  '❤️',
  'Builders of relationships and community. Connectors thrive on social bonds, helping others, and creating meaningful connections.',
  'social',
  'spiritual',
  '#EC4899',
  '{"primary": 0.60, "secondary": 0.20, "others": 0.20}'
),
(
  'creator',
  'The Creator',
  '🎨',
  'Visionaries of art and innovation. Creators express themselves through art, music, writing, and bringing new ideas to life.',
  'creative',
  'mental',
  '#F97316',
  '{"primary": 0.60, "secondary": 0.20, "others": 0.20}'
),
(
  'achiever',
  'The Achiever',
  '💼',
  'Ambitious professionals and entrepreneurs. Achievers focus on career growth, building skills, and reaching professional milestones.',
  'professional',
  'mental',
  '#10B981',
  '{"primary": 0.60, "secondary": 0.20, "others": 0.20}'
),
(
  'monk',
  'The Monk',
  '🕉️',
  'Seekers of inner peace and purpose. Monks dedicate themselves to spiritual growth, mindfulness, and finding deeper meaning.',
  'spiritual',
  'physical',
  '#8B5CF6',
  '{"primary": 0.60, "secondary": 0.20, "others": 0.20}'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ADD CLASS TO PROFILES
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS character_class TEXT REFERENCES character_classes(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class_changed_at TIMESTAMPTZ;

-- =====================================================
-- CLASS BONUSES TABLE (Optional features for each class)
-- =====================================================
CREATE TABLE IF NOT EXISTS class_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL REFERENCES character_classes(id),
  bonus_type TEXT NOT NULL, -- 'xp_multiplier', 'coin_bonus', 'streak_bonus', 'unlock_feature'
  bonus_value DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  bonus_description TEXT NOT NULL,
  pillar_id TEXT, -- Which pillar this bonus applies to
  is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- INSERT CLASS BONUSES
-- =====================================================
INSERT INTO class_bonuses (class_id, bonus_type, bonus_value, bonus_description, pillar_id) VALUES
-- Warrior bonuses
('warrior', 'xp_multiplier', 1.15, '+15% XP for physical challenges', 'physical'),
('warrior', 'streak_bonus', 1.10, '+10% streak bonus for daily workouts', 'physical'),

-- Sage bonuses
('sage', 'xp_multiplier', 1.15, '+15% XP for mental challenges', 'mental'),
('sage', 'coin_bonus', 1.10, '+10% QC for completing reading challenges', 'mental'),

-- Connector bonuses
('connector', 'xp_multiplier', 1.15, '+15% XP for social challenges', 'social'),
('connector', 'unlock_feature', 1.00, 'Early access to group raids', NULL),

-- Creator bonuses
('creator', 'xp_multiplier', 1.15, '+15% XP for creative challenges', 'creative'),
('creator', 'coin_bonus', 1.15, '+15% QC for completing creative quests', 'creative'),

-- Achiever bonuses
('achiever', 'xp_multiplier', 1.15, '+15% XP for professional challenges', 'professional'),
('achiever', 'coin_bonus', 1.10, '+10% QC for all completed challenges', NULL),

-- Monk bonuses
('monk', 'xp_multiplier', 1.15, '+15% XP for spiritual challenges', 'spiritual'),
('monk', 'streak_bonus', 1.15, '+15% streak multiplier for meditation', 'spiritual');

-- =====================================================
-- SELECT CLASS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION select_character_class(
  p_user_id UUID,
  p_class_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_class character_classes%ROWTYPE;
  v_can_change BOOLEAN := true;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Get class
  SELECT * INTO v_class FROM character_classes WHERE id = p_class_id;
  
  IF v_class IS NULL THEN
    RAISE EXCEPTION 'Invalid class';
  END IF;
  
  -- Check if user can change class (once per month)
  IF v_profile.character_class IS NOT NULL AND v_profile.class_changed_at IS NOT NULL THEN
    IF v_profile.class_changed_at > now() - INTERVAL '30 days' THEN
      v_can_change := false;
    END IF;
  END IF;
  
  IF NOT v_can_change AND v_profile.character_class != p_class_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You can only change class once per month',
      'next_change_available', v_profile.class_changed_at + INTERVAL '30 days'
    );
  END IF;
  
  -- Update user class
  UPDATE profiles
  SET 
    character_class = p_class_id,
    class_changed_at = CASE 
      WHEN character_class IS NULL THEN NULL -- First selection doesn't set cooldown
      ELSE now()
    END
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'class', json_build_object(
      'id', v_class.id,
      'name', v_class.name,
      'icon', v_class.icon,
      'description', v_class.description,
      'primary_pillar', v_class.primary_pillar,
      'color', v_class.color
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET USER CLASS INFO
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_class_info(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_class character_classes%ROWTYPE;
  v_bonuses JSON;
BEGIN
  -- Get profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF v_profile.character_class IS NULL THEN
    RETURN json_build_object(
      'has_class', false,
      'class', NULL,
      'bonuses', NULL
    );
  END IF;
  
  -- Get class
  SELECT * INTO v_class FROM character_classes WHERE id = v_profile.character_class;
  
  -- Get bonuses
  SELECT json_agg(json_build_object(
    'type', bonus_type,
    'value', bonus_value,
    'description', bonus_description,
    'pillar', pillar_id
  ))
  INTO v_bonuses
  FROM class_bonuses
  WHERE class_id = v_profile.character_class AND is_active = true;
  
  RETURN json_build_object(
    'has_class', true,
    'class', json_build_object(
      'id', v_class.id,
      'name', v_class.name,
      'icon', v_class.icon,
      'description', v_class.description,
      'primary_pillar', v_class.primary_pillar,
      'secondary_pillar', v_class.secondary_pillar,
      'color', v_class.color,
      'distribution', v_class.challenge_distribution
    ),
    'bonuses', v_bonuses,
    'can_change', (v_profile.class_changed_at IS NULL OR v_profile.class_changed_at <= now() - INTERVAL '30 days'),
    'next_change_available', CASE 
      WHEN v_profile.class_changed_at IS NULL THEN NULL
      ELSE v_profile.class_changed_at + INTERVAL '30 days'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET ALL CLASSES
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_classes()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  icon TEXT,
  description TEXT,
  primary_pillar TEXT,
  secondary_pillar TEXT,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.name,
    cc.icon,
    cc.description,
    cc.primary_pillar,
    cc.secondary_pillar,
    cc.color
  FROM character_classes cc
  ORDER BY cc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- APPLY CLASS BONUS TO XP
-- =====================================================
CREATE OR REPLACE FUNCTION apply_class_xp_bonus(
  p_user_id UUID,
  p_base_xp INT,
  p_pillar_id TEXT
)
RETURNS INT AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_multiplier DECIMAL(5,2) := 1.0;
BEGIN
  -- Get profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF v_profile.character_class IS NULL THEN
    RETURN p_base_xp;
  END IF;
  
  -- Get XP multiplier for this pillar
  SELECT COALESCE(bonus_value, 1.0)
  INTO v_multiplier
  FROM class_bonuses
  WHERE class_id = v_profile.character_class
    AND bonus_type = 'xp_multiplier'
    AND (pillar_id = p_pillar_id OR pillar_id IS NULL)
    AND is_active = true
  ORDER BY pillar_id NULLS LAST -- Specific pillar bonus takes priority
  LIMIT 1;
  
  RETURN (p_base_xp * v_multiplier)::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE character_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_bonuses ENABLE ROW LEVEL SECURITY;

-- Everyone can read classes
CREATE POLICY "Anyone can view classes" ON character_classes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view class bonuses" ON class_bonuses
  FOR SELECT USING (true);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_class ON profiles(character_class);
CREATE INDEX IF NOT EXISTS idx_class_bonuses_class ON class_bonuses(class_id);
