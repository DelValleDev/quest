-- Migration 053: Advanced Gamification System
-- Description: Sistema de clases/roles, árbol de habilidades, y sistema de combos

-- ===============================================
-- CLASES/ROLES DEL JUEGO
-- ===============================================

-- Tipos de clases disponibles
CREATE TYPE user_class AS ENUM ('warrior', 'mage', 'rogue', 'monk', 'scholar', 'leader');

-- Tabla de clases con stats base
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type user_class UNIQUE NOT NULL,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji o URL
  base_stats JSONB DEFAULT '{
    "strength": 10,
    "intelligence": 10,
    "agility": 10,
    "charisma": 10,
    "discipline": 10,
    "creativity": 10
  }'::jsonb,
  unlock_level INTEGER DEFAULT 1,
  is_premium_only BOOLEAN DEFAULT false
);

-- Clase del usuario
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_class user_class DEFAULT 'warrior';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class_selected_at TIMESTAMP;

-- Stats del usuario (basados en su clase)
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  strength INTEGER DEFAULT 10, -- Físico
  intelligence INTEGER DEFAULT 10, -- Mental
  agility INTEGER DEFAULT 10, -- Adaptabilidad
  charisma INTEGER DEFAULT 10, -- Social
  discipline INTEGER DEFAULT 10, -- Hábitos
  creativity INTEGER DEFAULT 10, -- Creatividad
  total_points INTEGER DEFAULT 60,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- ÁRBOL DE HABILIDADES
-- ===============================================

CREATE TABLE skill_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  skill_type TEXT, -- passive, active, ultimate
  required_class user_class[],
  required_level INTEGER DEFAULT 1,
  required_skills UUID[], -- Habilidades prerequisito
  qc_cost INTEGER DEFAULT 0,
  effects JSONB, -- { "xp_boost": 1.1, "qc_multiplier": 1.05, etc }
  max_level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skill_tree(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

-- ===============================================
-- SISTEMA DE COMBOS
-- ===============================================

CREATE TABLE combo_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_name TEXT UNIQUE NOT NULL,
  description TEXT,
  required_actions JSONB, -- [{"type": "complete_task", "count": 3, "timeframe": "1 hour"}]
  rewards JSONB, -- {"xp": 50, "qc": 10, "multiplier": 1.5}
  cooldown_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE user_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  combo_id UUID REFERENCES combo_definitions(id),
  current_streak INTEGER DEFAULT 0,
  last_triggered TIMESTAMP,
  total_triggered INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar clases por defecto (SIN referencias espirituales)
INSERT INTO classes (class_type, name_es, name_en, description, icon, base_stats, unlock_level) VALUES
('warrior', 'Guerrero', 'Warrior', 'Maestro del físico y la disciplina. +20% XP en tareas físicas.', '⚔️', '{"strength": 15, "intelligence": 8, "agility": 12, "charisma": 8, "discipline": 12, "creativity": 5}'::jsonb, 1),
('scholar', 'Académico', 'Scholar', 'Experto en aprendizaje. +20% XP en tareas mentales.', '📚', '{"strength": 5, "intelligence": 15, "agility": 8, "charisma": 10, "discipline": 12, "creativity": 10}'::jsonb, 1),
('leader', 'Líder', 'Leader', 'Inspirador natural. +20% XP en tareas sociales y de grupos.', '👑', '{"strength": 8, "intelligence": 12, "agility": 10, "charisma": 15, "discipline": 10, "creativity": 5}'::jsonb, 1),
('rogue', 'Aventurero', 'Rogue', 'Adaptable y versátil. +10% XP en todas las tareas.', '🎯', '{"strength": 10, "intelligence": 10, "agility": 15, "charisma": 12, "discipline": 8, "creativity": 5}'::jsonb, 5),
('monk', 'Monje', 'Monk', 'Maestro de la disciplina interior. Rachas dan +30% QC extra.', '🧘', '{"strength": 10, "intelligence": 12, "agility": 8, "charisma": 8, "discipline": 15, "creativity": 7}'::jsonb, 10),
('mage', 'Creativo', 'Mage', 'Pensador innovador. +20% XP en tareas creativas.', '✨', '{"strength": 5, "intelligence": 12, "agility": 10, "charisma": 10, "discipline": 8, "creativity": 15}'::jsonb, 15);

-- Insertar habilidades básicas
INSERT INTO skill_tree (skill_name, description, skill_type, required_class, required_level, qc_cost, effects, max_level) VALUES
-- Habilidades universales
('task_master', 'Completa tareas +10% más rápido', 'passive', ARRAY['warrior','scholar','leader','rogue','monk','mage']::user_class[], 5, 100, '{"task_speed_bonus": 1.1}'::jsonb, 5),
('coin_collector', '+5% QC en todas las recompensas', 'passive', ARRAY['warrior','scholar','leader','rogue','monk','mage']::user_class[], 1, 50, '{"qc_multiplier": 1.05}'::jsonb, 10),
('xp_boost', '+10% XP en todas las actividades', 'passive', ARRAY['warrior','scholar','leader','rogue','monk','mage']::user_class[], 10, 200, '{"xp_multiplier": 1.1}'::jsonb, 5),

-- Warrior
('iron_will', 'Rachas físicas dan +25% XP extra', 'passive', ARRAY['warrior']::user_class[], 5, 150, '{"physical_streak_bonus": 1.25}'::jsonb, 3),
('second_wind', 'Recupera 50 QC al completar retos difíciles', 'active', ARRAY['warrior']::user_class[], 15, 300, '{"qc_recovery": 50}'::jsonb, 1),

-- Scholar
('quick_learner', '+30% XP en tareas de aprendizaje', 'passive', ARRAY['scholar']::user_class[], 5, 150, '{"learning_xp_bonus": 1.3}'::jsonb, 3),
('deep_focus', 'Sesiones de estudio de 2h+ dan triple XP', 'passive', ARRAY['scholar']::user_class[], 20, 400, '{"focus_multiplier": 3}'::jsonb, 1),

-- Leader
('inspire', 'Tu progreso da +10% XP a guild members', 'passive', ARRAY['leader']::user_class[], 10, 250, '{"guild_inspiration": 1.1}'::jsonb, 3),
('rally_cry', 'Activa: Todo el guild gana +50% XP por 1 hora (cooldown: 7 días)', 'active', ARRAY['leader']::user_class[], 25, 500, '{"guild_boost": 1.5, "duration_hours": 1}'::jsonb, 1);

-- Insertar combos por defecto
INSERT INTO combo_definitions (combo_name, description, required_actions, rewards, cooldown_hours) VALUES
('morning_warrior', 'Completa 3 tareas antes de las 10am', '[{"type": "complete_task", "count": 3, "before_time": "10:00"}]'::jsonb, '{"xp": 100, "qc": 20, "multiplier": 1.5}'::jsonb, 24),
('perfect_day', 'Completa todas tus tareas del día', '[{"type": "complete_all_daily_tasks"}]'::jsonb, '{"xp": 200, "qc": 50, "title": "Día Perfecto"}'::jsonb, 24),
('streak_master', 'Mantén 3 rachas activas simultáneamente', '[{"type": "active_streaks", "count": 3}]'::jsonb, '{"xp": 150, "qc": 30}'::jsonb, 168),
('social_butterfly', 'Interactúa en 5 guild feeds en 1 día', '[{"type": "guild_interaction", "count": 5, "timeframe": "1 day"}]'::jsonb, '{"xp": 80, "qc": 15}'::jsonb, 24);

-- Función para calcular stats basados en clase
CREATE OR REPLACE FUNCTION calculate_user_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_class user_class;
  v_base_stats JSONB;
  v_level INTEGER;
  v_bonus_per_level INTEGER := 2;
BEGIN
  -- Obtener clase y nivel
  SELECT user_class, level INTO v_class, v_level
  FROM profiles
  WHERE id = p_user_id;
  
  -- Obtener stats base de la clase
  SELECT base_stats INTO v_base_stats
  FROM classes
  WHERE class_type = v_class;
  
  -- Calcular stats finales (base + bonus por nivel)
  INSERT INTO user_stats (user_id, strength, intelligence, agility, charisma, discipline, creativity, total_points)
  VALUES (
    p_user_id,
    (v_base_stats->>'strength')::int + (v_level * v_bonus_per_level),
    (v_base_stats->>'intelligence')::int + (v_level * v_bonus_per_level),
    (v_base_stats->>'agility')::int + (v_level * v_bonus_per_level),
    (v_base_stats->>'charisma')::int + (v_level * v_bonus_per_level),
    (v_base_stats->>'discipline')::int + (v_level * v_bonus_per_level),
    (v_base_stats->>'creativity')::int + (v_level * v_bonus_per_level),
    ((v_base_stats->>'strength')::int + (v_base_stats->>'intelligence')::int + 
     (v_base_stats->>'agility')::int + (v_base_stats->>'charisma')::int + 
     (v_base_stats->>'discipline')::int + (v_base_stats->>'creativity')::int) + 
     (v_level * v_bonus_per_level * 6)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    strength = EXCLUDED.strength,
    intelligence = EXCLUDED.intelligence,
    agility = EXCLUDED.agility,
    charisma = EXCLUDED.charisma,
    discipline = EXCLUDED.discipline,
    creativity = EXCLUDED.creativity,
    total_points = EXCLUDED.total_points,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_combos_user ON user_combos(user_id);
CREATE INDEX idx_skill_tree_class ON skill_tree USING GIN(required_class);

COMMENT ON TABLE classes IS 'Clases/Roles del juego con stats base (SIN referencias espirituales)';
COMMENT ON TABLE skill_tree IS 'Árbol de habilidades desbloqueables con QC';
COMMENT ON TABLE user_combos IS 'Sistema de combos: completar acciones seguidas = bonus XP/QC';
