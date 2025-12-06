-- Migration 040: Notificaciones, Desafíos Grupales, Leaderboard, Bad Habits, Perfect Streaks
-- Description: Sistema completo de notificaciones, retos grupales mejorados, malos hábitos, y Quest como miembro virtual

-- ===============================================
-- 1. SISTEMA DE NOTIFICACIONES (Ya existe, solo agregamos función helper)
-- ===============================================

-- Función helper para crear notificación (compatible con tabla existente)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}',
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, notification_type, title, message, action_data, action_url)
  VALUES (p_user_id, p_type, p_title, p_body, p_data, p_action_url)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 2. MALOS HÁBITOS (Bad Habits)
-- ===============================================

-- Tabla de malos hábitos
CREATE TABLE IF NOT EXISTS bad_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  penalty_qc INT DEFAULT 10, -- QC que se pierden al fallar
  penalty_xp INT DEFAULT 5, -- XP que se pierde
  tracking_type TEXT DEFAULT 'binary', -- 'binary' (sí/no), 'count' (veces al día)
  max_allowed_per_day INT DEFAULT 0, -- Para tracking_type='count'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Logs de malos hábitos
CREATE TABLE IF NOT EXISTS bad_habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bad_habit_id UUID NOT NULL REFERENCES bad_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  times_done INT DEFAULT 1, -- Cuántas veces se cayó en el mal hábito
  notes TEXT,
  penalty_applied_qc INT DEFAULT 0,
  penalty_applied_xp INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bad_habit_id, log_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bad_habits_user ON bad_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_bad_habit_logs_habit ON bad_habit_logs(bad_habit_id);
CREATE INDEX IF NOT EXISTS idx_bad_habit_logs_date ON bad_habit_logs(log_date DESC);

-- RLS
ALTER TABLE bad_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE bad_habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their bad habits"
ON bad_habits FOR ALL
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their bad habit logs"
ON bad_habit_logs FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Función para registrar mal hábito (aplica penalización)
CREATE OR REPLACE FUNCTION log_bad_habit(
  p_bad_habit_id UUID,
  p_user_id UUID,
  p_times_done INT DEFAULT 1,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_habit bad_habits;
  v_penalty_qc INT;
  v_penalty_xp INT;
  v_new_qc INT;
  v_new_xp INT;
BEGIN
  -- Obtener hábito
  SELECT * INTO v_habit FROM bad_habits WHERE id = p_bad_habit_id AND user_id = p_user_id;
  
  IF v_habit IS NULL THEN
    RAISE EXCEPTION 'Bad habit not found';
  END IF;
  
  -- Calcular penalización
  v_penalty_qc := v_habit.penalty_qc * p_times_done;
  v_penalty_xp := v_habit.penalty_xp * p_times_done;
  
  -- Aplicar penalización (no puede ser negativo)
  UPDATE profiles
  SET 
    quest_coins = GREATEST(0, quest_coins - v_penalty_qc),
    total_xp = GREATEST(0, total_xp - v_penalty_xp)
  WHERE id = p_user_id
  RETURNING quest_coins, total_xp INTO v_new_qc, v_new_xp;
  
  -- Registrar log
  INSERT INTO bad_habit_logs (bad_habit_id, user_id, log_date, times_done, notes, penalty_applied_qc, penalty_applied_xp)
  VALUES (p_bad_habit_id, p_user_id, CURRENT_DATE, p_times_done, p_notes, v_penalty_qc, v_penalty_xp)
  ON CONFLICT (bad_habit_id, log_date) DO UPDATE
  SET 
    times_done = bad_habit_logs.times_done + p_times_done,
    penalty_applied_qc = bad_habit_logs.penalty_applied_qc + v_penalty_qc,
    penalty_applied_xp = bad_habit_logs.penalty_applied_xp + v_penalty_xp,
    notes = COALESCE(p_notes, bad_habit_logs.notes);
  
  -- Crear notificación
  PERFORM create_notification(
    p_user_id,
    'bad_habit',
    '⚠️ Mal Hábito Registrado',
    format('Perdiste %s QC y %s XP por %s', v_penalty_qc, v_penalty_xp, v_habit.name),
    jsonb_build_object('bad_habit_id', p_bad_habit_id, 'penalty_qc', v_penalty_qc, 'penalty_xp', v_penalty_xp)
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'penalty_qc', v_penalty_qc,
    'penalty_xp', v_penalty_xp,
    'new_qc', v_new_qc,
    'new_xp', v_new_xp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 3. PERFECT STREAKS (Rachas Perfectas)
-- ===============================================

-- Tabla de rachas perfectas (todas las quests completadas N días seguidos)
CREATE TABLE IF NOT EXISTS perfect_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE, -- NULL si está activa
  days_count INT DEFAULT 1,
  type TEXT DEFAULT 'daily_quests', -- 'daily_quests', 'habits', 'challenges', 'all'
  bonus_qc_earned INT DEFAULT 0,
  bonus_xp_earned INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perfect_streaks_user ON perfect_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_perfect_streaks_active ON perfect_streaks(user_id, end_date) WHERE end_date IS NULL;

-- RLS
ALTER TABLE perfect_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their perfect streaks"
ON perfect_streaks FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Función para actualizar perfect streak
CREATE OR REPLACE FUNCTION update_perfect_streak(
  p_user_id UUID,
  p_type TEXT DEFAULT 'daily_quests'
)
RETURNS JSONB AS $$
DECLARE
  v_current_streak perfect_streaks;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_bonus_qc INT := 0;
  v_bonus_xp INT := 0;
  v_all_completed BOOLEAN;
BEGIN
  -- Verificar si completó todo ayer (según tipo)
  IF p_type = 'daily_quests' THEN
    SELECT COUNT(*) = COUNT(*) FILTER (WHERE completed)
    INTO v_all_completed
    FROM user_daily_quests
    WHERE user_id = p_user_id 
    AND quest_date = v_yesterday;
  END IF;
  
  -- Obtener racha activa
  SELECT * INTO v_current_streak
  FROM perfect_streaks
  WHERE user_id = p_user_id 
  AND type = p_type 
  AND end_date IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_all_completed THEN
    IF v_current_streak IS NULL THEN
      -- Crear nueva racha
      INSERT INTO perfect_streaks (user_id, start_date, type, days_count)
      VALUES (p_user_id, v_yesterday, p_type, 1);
    ELSE
      -- Incrementar racha existente
      UPDATE perfect_streaks
      SET 
        days_count = days_count + 1,
        updated_at = NOW()
      WHERE id = v_current_streak.id;
      
      -- Bonus cada 7 días
      IF (v_current_streak.days_count + 1) % 7 = 0 THEN
        v_bonus_qc := 50;
        v_bonus_xp := 100;
        
        UPDATE profiles
        SET quest_coins = quest_coins + v_bonus_qc, total_xp = total_xp + v_bonus_xp
        WHERE id = p_user_id;
        
        UPDATE perfect_streaks
        SET bonus_qc_earned = bonus_qc_earned + v_bonus_qc, bonus_xp_earned = bonus_xp_earned + v_bonus_xp
        WHERE id = v_current_streak.id;
        
        PERFORM create_notification(
          p_user_id,
          'streak',
          '🔥 Perfect Streak Milestone!',
          format('¡%s días de racha perfecta! +%s QC, +%s XP', v_current_streak.days_count + 1, v_bonus_qc, v_bonus_xp),
          jsonb_build_object('streak_id', v_current_streak.id, 'days', v_current_streak.days_count + 1)
        );
      END IF;
    END IF;
  ELSE
    -- Romper racha si existe
    IF v_current_streak IS NOT NULL THEN
      UPDATE perfect_streaks
      SET end_date = v_yesterday
      WHERE id = v_current_streak.id;
      
      PERFORM create_notification(
        p_user_id,
        'streak',
        '💔 Racha Perdida',
        format('Tu racha de %s días ha terminado. ¡Empieza una nueva!', v_current_streak.days_count),
        jsonb_build_object('streak_id', v_current_streak.id, 'days', v_current_streak.days_count)
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object('success', TRUE, 'bonus_qc', v_bonus_qc, 'bonus_xp', v_bonus_xp);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 4. QUEST COMO MIEMBRO VIRTUAL DE GRUPOS
-- ===============================================

-- Agregar columna para activar Quest en grupos
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS quest_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS quest_personality TEXT DEFAULT 'motivational'; -- 'motivational', 'strict', 'funny', 'analytical'
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS quest_auto_messages BOOLEAN DEFAULT TRUE; -- Envía mensajes automáticos
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS quest_moderate BOOLEAN DEFAULT FALSE; -- Modera contenido

-- Tabla de mensajes automáticos de Quest en grupos
CREATE TABLE IF NOT EXISTS guild_quest_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- 'daily_summary', 'weekly_report', 'motivation', 'warning', 'celebration'
  content TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_guild_quest_messages_guild ON guild_quest_messages(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_quest_messages_pending ON guild_quest_messages(guild_id, scheduled_for) WHERE sent = FALSE;

-- RLS
ALTER TABLE guild_quest_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members can view Quest messages"
ON guild_quest_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = guild_quest_messages.guild_id
    AND gm.user_id = auth.uid()
  )
);

-- ===============================================
-- 5. LEADERBOARD MEJORADO (con más categorías)
-- ===============================================

-- Vista materializada para leaderboard global (actualizar cada hora)
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_global AS
SELECT 
  p.id,
  p.display_name,
  p.avatar_url,
  p.level,
  p.total_xp,
  p.quest_coins,
  p.character_class,
  -- Métricas adicionales
  (SELECT COUNT(*) FROM user_daily_quests udq WHERE udq.user_id = p.id AND udq.completed) as total_quests_completed,
  (SELECT COUNT(*) FROM achievements a JOIN user_achievements ua ON a.id = ua.achievement_id WHERE ua.user_id = p.id) as total_achievements,
  (SELECT COALESCE(MAX(days_count), 0) FROM perfect_streaks WHERE user_id = p.id) as best_streak,
  (SELECT COALESCE(SUM(days_count), 0) FROM perfect_streaks WHERE user_id = p.id) as total_streak_days,
  -- Rankings
  RANK() OVER (ORDER BY p.total_xp DESC) as xp_rank,
  RANK() OVER (ORDER BY p.level DESC, p.total_xp DESC) as level_rank,
  RANK() OVER (ORDER BY p.quest_coins DESC) as qc_rank
FROM profiles p;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_global_id ON leaderboard_global(id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_global_xp ON leaderboard_global(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_global_level ON leaderboard_global(level DESC, total_xp DESC);

-- Vista para leaderboard de guilds
CREATE OR REPLACE VIEW leaderboard_guilds AS
SELECT 
  g.id,
  g.name,
  g.icon,
  g.description,
  COUNT(gm.user_id) as member_count,
  COALESCE(AVG(p.level), 0) as avg_level,
  COALESCE(SUM(p.total_xp), 0) as total_xp,
  (SELECT COUNT(*) FROM user_daily_quests udq 
   JOIN guild_members gm2 ON udq.user_id = gm2.user_id 
   WHERE gm2.guild_id = g.id AND udq.completed) as total_quests_completed,
  RANK() OVER (ORDER BY COALESCE(SUM(p.total_xp), 0) DESC) as rank
FROM guilds g
LEFT JOIN guild_members gm ON g.id = gm.guild_id
LEFT JOIN profiles p ON gm.user_id = p.id
GROUP BY g.id, g.name, g.icon, g.description;

-- ===============================================
-- 6. DESAFÍOS GRUPALES MEJORADOS
-- ===============================================

-- Agregar columnas a raids para mejorar funcionalidad
ALTER TABLE raids ADD COLUMN IF NOT EXISTS penalty_type TEXT DEFAULT 'vote'; -- 'vote', 'fixed', 'none'
ALTER TABLE raids ADD COLUMN IF NOT EXISTS penalty_description TEXT;
ALTER TABLE raids ADD COLUMN IF NOT EXISTS auto_check_progress BOOLEAN DEFAULT FALSE; -- Quest verifica progreso automáticamente

-- Tabla de votaciones de castigos para raids
CREATE TABLE IF NOT EXISTS raid_penalty_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_id UUID NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  failed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  penalty_suggestion TEXT NOT NULL,
  votes INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(raid_id, voter_id, failed_user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_raid_penalty_votes_raid ON raid_penalty_votes(raid_id);
CREATE INDEX IF NOT EXISTS idx_raid_penalty_votes_failed_user ON raid_penalty_votes(failed_user_id);

-- RLS
ALTER TABLE raid_penalty_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Raid participants can vote penalties"
ON raid_penalty_votes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM raid_participants rp
    WHERE rp.raid_id = raid_penalty_votes.raid_id
    AND rp.user_id = auth.uid()
  )
);

-- Función para Quest: analizar progreso del grupo
CREATE OR REPLACE FUNCTION quest_analyze_guild_progress(p_guild_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_members INT;
  v_active_today INT;
  v_completion_rate DECIMAL;
  v_struggling_members JSONB;
  v_top_performers JSONB;
  v_report JSONB;
BEGIN
  -- Contar miembros
  SELECT COUNT(*) INTO v_total_members FROM guild_members WHERE guild_id = p_guild_id;
  
  -- Contar activos hoy
  SELECT COUNT(DISTINCT udq.user_id) INTO v_active_today
  FROM user_daily_quests udq
  JOIN guild_members gm ON udq.user_id = gm.user_id
  WHERE gm.guild_id = p_guild_id 
  AND udq.quest_date = CURRENT_DATE
  AND udq.completed = TRUE;
  
  -- Calcular tasa de completitud
  v_completion_rate := CASE WHEN v_total_members > 0 THEN (v_active_today::DECIMAL / v_total_members) * 100 ELSE 0 END;
  
  -- Identificar miembros con dificultades (completaron <50% esta semana)
  SELECT jsonb_agg(jsonb_build_object(
    'user_id', p.id,
    'display_name', p.display_name,
    'completion_rate', completion_rate
  ))
  INTO v_struggling_members
  FROM (
    SELECT 
      p.id,
      p.display_name,
      (COUNT(*) FILTER (WHERE udq.completed) * 100.0 / COUNT(*)) as completion_rate
    FROM profiles p
    JOIN guild_members gm ON p.id = gm.user_id
    LEFT JOIN user_daily_quests udq ON p.id = udq.user_id 
      AND udq.quest_date >= CURRENT_DATE - INTERVAL '7 days'
    WHERE gm.guild_id = p_guild_id
    GROUP BY p.id, p.display_name
    HAVING (COUNT(*) FILTER (WHERE udq.completed) * 100.0 / COUNT(*)) < 50
  ) p;
  
  -- Top performers (completaron 100% esta semana)
  SELECT jsonb_agg(jsonb_build_object(
    'user_id', p.id,
    'display_name', p.display_name,
    'completion_rate', completion_rate
  ))
  INTO v_top_performers
  FROM (
    SELECT 
      p.id,
      p.display_name,
      (COUNT(*) FILTER (WHERE udq.completed) * 100.0 / COUNT(*)) as completion_rate
    FROM profiles p
    JOIN guild_members gm ON p.id = gm.user_id
    LEFT JOIN user_daily_quests udq ON p.id = udq.user_id 
      AND udq.quest_date >= CURRENT_DATE - INTERVAL '7 days'
    WHERE gm.guild_id = p_guild_id
    GROUP BY p.id, p.display_name
    HAVING (COUNT(*) FILTER (WHERE udq.completed) * 100.0 / COUNT(*)) = 100
  ) p;
  
  -- Generar reporte
  v_report := jsonb_build_object(
    'guild_id', p_guild_id,
    'total_members', v_total_members,
    'active_today', v_active_today,
    'completion_rate', v_completion_rate,
    'struggling_members', COALESCE(v_struggling_members, '[]'::jsonb),
    'top_performers', COALESCE(v_top_performers, '[]'::jsonb),
    'generated_at', NOW()
  );
  
  RETURN v_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE notifications IS 'Sistema de notificaciones push y en-app';
COMMENT ON TABLE bad_habits IS 'Malos hábitos que el usuario quiere evitar (con penalizaciones)';
COMMENT ON TABLE bad_habit_logs IS 'Registro diario de caídas en malos hábitos';
COMMENT ON TABLE perfect_streaks IS 'Rachas perfectas de completitud (con bonos cada 7 días)';
COMMENT ON TABLE guild_quest_messages IS 'Mensajes automáticos de Quest en grupos';
COMMENT ON TABLE raid_penalty_votes IS 'Votaciones de castigos en raids fallidos';
COMMENT ON FUNCTION quest_analyze_guild_progress IS 'Quest analiza el progreso del grupo y genera reporte inteligente';
