-- Migration 054: Guild Wars & Mentor System & Party System
-- Description: Competencias entre guilds, sistema de mentores, y party system cooperativo

-- ===============================================
-- GUILD WARS
-- ===============================================

CREATE TABLE guild_wars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_a_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  guild_b_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  war_type TEXT CHECK (war_type IN ('weekly_challenge', 'raid_race', 'xp_battle', 'streak_war')),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  prize_pool_qc INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
  winner_guild_id UUID REFERENCES guilds(id),
  guild_a_score INTEGER DEFAULT 0,
  guild_b_score INTEGER DEFAULT 0,
  rules JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE guild_war_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id UUID REFERENCES guild_wars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  contribution_score INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  UNIQUE(war_id, user_id)
);

-- ===============================================
-- MENTOR SYSTEM
-- ===============================================

CREATE TABLE mentor_program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mentee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
  specialty TEXT, -- 'fitness', 'productivity', 'social', etc.
  sessions_completed INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mentor_id, mentee_id),
  CHECK (mentor_id != mentee_id)
);

-- Requisitos para ser mentor: nivel 50+
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_mentor BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mentor_specialty TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mentees_count INTEGER DEFAULT 0;

-- Tabla de sesiones de mentoría
CREATE TABLE mentor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_program_id UUID REFERENCES mentor_program(id) ON DELETE CASCADE,
  session_type TEXT, -- 'goal_setting', 'progress_review', 'accountability_check'
  notes TEXT,
  mentor_feedback TEXT,
  mentee_feedback TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- PARTY SYSTEM (2-4 amigos)
-- ===============================================

CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_name TEXT NOT NULL,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 4 CHECK (max_members BETWEEN 2 AND 4),
  current_members INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  party_bonus JSONB DEFAULT '{"xp_multiplier": 1.1, "qc_bonus": 5}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('leader', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  contribution_score INTEGER DEFAULT 0,
  UNIQUE(party_id, user_id)
);

-- Retos cooperativos de party
CREATE TABLE party_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  challenge_name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT, -- 'combined_xp', 'tasks_completed', 'streaks_maintained'
  goal_target INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  reward_qc INTEGER,
  reward_xp INTEGER,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'failed')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- FUNCIONES
-- ===============================================

-- Función para verificar si usuario puede ser mentor
CREATE OR REPLACE FUNCTION check_mentor_eligibility(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_level INTEGER;
  v_account_age_days INTEGER;
BEGIN
  SELECT 
    level,
    EXTRACT(DAY FROM NOW() - created_at)
  INTO v_level, v_account_age_days
  FROM profiles
  WHERE id = p_user_id;
  
  -- Requisitos: Nivel 50+ y cuenta de 90+ días
  RETURN v_level >= 50 AND v_account_age_days >= 90;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para aplicar bonus de party
CREATE OR REPLACE FUNCTION apply_party_bonus(
  p_user_id UUID,
  p_xp_earned INTEGER,
  p_qc_earned INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_party_id UUID;
  v_bonus JSONB;
  v_final_xp INTEGER;
  v_final_qc INTEGER;
BEGIN
  -- Verificar si usuario está en un party activo
  SELECT p.id, p.party_bonus
  INTO v_party_id, v_bonus
  FROM parties p
  JOIN party_members pm ON p.id = pm.party_id
  WHERE pm.user_id = p_user_id
  AND p.is_active = true
  LIMIT 1;
  
  -- Si no está en party, retornar valores normales
  IF v_party_id IS NULL THEN
    RETURN jsonb_build_object('xp', p_xp_earned, 'qc', p_qc_earned, 'bonus_applied', false);
  END IF;
  
  -- Aplicar multiplicadores
  v_final_xp := p_xp_earned * (v_bonus->>'xp_multiplier')::float;
  v_final_qc := p_qc_earned + (v_bonus->>'qc_bonus')::int;
  
  RETURN jsonb_build_object(
    'xp', v_final_xp,
    'qc', v_final_qc,
    'bonus_applied', true,
    'party_id', v_party_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para iniciar Guild War
CREATE OR REPLACE FUNCTION start_guild_war(
  p_guild_a_id UUID,
  p_guild_b_id UUID,
  p_war_type TEXT,
  p_duration_days INTEGER,
  p_prize_pool INTEGER
) RETURNS UUID AS $$
DECLARE
  v_war_id UUID;
BEGIN
  INSERT INTO guild_wars (
    guild_a_id,
    guild_b_id,
    war_type,
    start_date,
    end_date,
    prize_pool_qc,
    status
  ) VALUES (
    p_guild_a_id,
    p_guild_b_id,
    p_war_type,
    NOW(),
    NOW() + (p_duration_days || ' days')::interval,
    p_prize_pool,
    'active'
  )
  RETURNING id INTO v_war_id;
  
  RETURN v_war_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes
CREATE INDEX idx_guild_wars_active ON guild_wars(status, start_date, end_date);
CREATE INDEX idx_mentor_program_status ON mentor_program(status);
CREATE INDEX idx_parties_active ON parties(is_active);
CREATE INDEX idx_party_challenges_status ON party_challenges(status, ends_at);

COMMENT ON TABLE guild_wars IS 'Competencias entre guilds con prizes y rankings';
COMMENT ON TABLE mentor_program IS 'Sistema de mentores: usuarios nivel 50+ guían newbies';
COMMENT ON TABLE parties IS 'Party System: grupos de 2-4 amigos para retos cooperativos con bonus XP/QC';
