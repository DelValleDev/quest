-- Migration 058: Retention System - Email Marketing, Come Back Rewards, Inactive Users
-- Description: Sistema de retención con emails automáticos y recompensas por volver

-- ===============================================
-- EMAIL CAMPAIGNS
-- ===============================================

CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('welcome', 'weekly_recap', 'inactive_user', 'premium_trial', 'achievement_unlocked', 'guild_invite')),
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL, -- Plantilla con variables {username}, {xp}, etc.
  trigger_condition JSONB, -- {"days_inactive": 7} o {"achievement_id": "..."}
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_sent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  sent_at TIMESTAMP DEFAULT NOW(),
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  converted BOOLEAN DEFAULT FALSE -- ¿El usuario volvió/compró premium?
);

-- ===============================================
-- COME BACK REWARDS
-- ===============================================

CREATE TABLE comeback_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  days_inactive INTEGER NOT NULL,
  reward_qc INTEGER DEFAULT 50,
  reward_xp INTEGER DEFAULT 0,
  bonus_message TEXT,
  claimed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, days_inactive)
);

-- ===============================================
-- INACTIVE USERS TRACKING
-- ===============================================

CREATE TABLE user_activity_tracking (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  last_login TIMESTAMP DEFAULT NOW(),
  last_task_completed TIMESTAMP,
  last_guild_interaction TIMESTAMP,
  days_since_login INTEGER DEFAULT 0,
  is_at_risk BOOLEAN DEFAULT FALSE, -- 7+ días sin login
  comeback_email_sent BOOLEAN DEFAULT FALSE,
  comeback_reward_sent BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- WEEKLY RECAP DATA
-- ===============================================

CREATE TABLE weekly_recap_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_xp_earned INTEGER DEFAULT 0,
  total_qc_earned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  streaks_maintained INTEGER DEFAULT 0,
  guild_interactions INTEGER DEFAULT 0,
  level_ups INTEGER DEFAULT 0,
  new_achievements INTEGER DEFAULT 0,
  top_achievement TEXT, -- Achievement más épico de la semana
  personalized_message TEXT, -- Mensaje generado por IA
  email_sent_at TIMESTAMP,
  UNIQUE(user_id, week_start)
);

-- ===============================================
-- FUNCIONES
-- ===============================================

-- Función para marcar usuarios en riesgo
CREATE OR REPLACE FUNCTION mark_at_risk_users()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_activity_tracking
  SET 
    is_at_risk = TRUE,
    days_since_login = EXTRACT(DAY FROM NOW() - last_login)::INTEGER
  WHERE last_login < NOW() - INTERVAL '7 days'
  AND is_at_risk = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para enviar comeback reward
CREATE OR REPLACE FUNCTION send_comeback_reward(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_days_inactive INTEGER;
  v_reward_qc INTEGER;
BEGIN
  -- Calcular días inactivo
  SELECT EXTRACT(DAY FROM NOW() - last_login)::INTEGER
  INTO v_days_inactive
  FROM user_activity_tracking
  WHERE user_id = p_user_id;
  
  -- No enviar si no estuvo inactivo suficiente tiempo
  IF v_days_inactive < 7 THEN
    RETURN FALSE;
  END IF;
  
  -- Calcular recompensa (más días = más QC)
  v_reward_qc := LEAST(200, 50 + (v_days_inactive - 7) * 5);
  
  -- Insertar reward
  INSERT INTO comeback_rewards (user_id, days_inactive, reward_qc, bonus_message)
  VALUES (
    p_user_id,
    v_days_inactive,
    v_reward_qc,
    '¡Te extrañamos! Toma ' || v_reward_qc || ' QC como regalo de bienvenida.'
  )
  ON CONFLICT (user_id, days_inactive) DO NOTHING;
  
  -- Dar QC al usuario
  UPDATE profiles
  SET quest_coins = quest_coins + v_reward_qc
  WHERE id = p_user_id;
  
  -- Marcar como enviado
  UPDATE user_activity_tracking
  SET comeback_reward_sent = TRUE
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar weekly recap
CREATE OR REPLACE FUNCTION generate_weekly_recap(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_recap_id UUID;
  v_week_start DATE := DATE_TRUNC('week', NOW())::DATE - INTERVAL '7 days';
  v_week_end DATE := DATE_TRUNC('week', NOW())::DATE - INTERVAL '1 day';
  v_xp_earned INTEGER;
  v_tasks_completed INTEGER;
BEGIN
  -- Calcular stats de la semana
  SELECT 
    COALESCE(SUM(xp_earned), 0),
    COALESCE(COUNT(*), 0)
  INTO v_xp_earned, v_tasks_completed
  FROM tasks
  WHERE user_id = p_user_id
  AND completed_at BETWEEN v_week_start AND v_week_end;
  
  -- Insertar recap
  INSERT INTO weekly_recap_data (
    user_id,
    week_start,
    week_end,
    total_xp_earned,
    tasks_completed,
    personalized_message
  ) VALUES (
    p_user_id,
    v_week_start,
    v_week_end,
    v_xp_earned,
    v_tasks_completed,
    'Esta semana completaste ' || v_tasks_completed || ' tareas y ganaste ' || v_xp_earned || ' XP. ¡Sigue así!'
  )
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    total_xp_earned = EXCLUDED.total_xp_earned,
    tasks_completed = EXCLUDED.tasks_completed,
    personalized_message = EXCLUDED.personalized_message
  RETURNING id INTO v_recap_id;
  
  RETURN v_recap_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- DATOS INICIALES CAMPAIGNS
-- ===============================================

INSERT INTO email_campaigns (name, type, subject, body_template, trigger_condition) VALUES
(
  'Welcome Email',
  'welcome',
  '¡Bienvenido a Quest, {username}!',
  'Hola {username}, ¡Gracias por unirte a Quest! Aquí hay algunos consejos para empezar...',
  '{}'::jsonb
),
(
  'Weekly Recap',
  'weekly_recap',
  'Tu resumen semanal - {week_start} a {week_end}',
  'Esta semana ganaste {xp} XP y completaste {tasks} tareas. {personalized_message}',
  '{}'::jsonb
),
(
  'Inactive 7 Days',
  'inactive_user',
  '¡Te extrañamos en Quest!',
  'Hola {username}, hace {days} días que no te vemos. ¡Vuelve y reclama tu recompensa de {reward_qc} QC!',
  '{"days_inactive": 7}'::jsonb
),
(
  'Premium Trial Ending',
  'premium_trial',
  'Tu prueba premium termina pronto',
  'Hola {username}, tu prueba de Quest Premium termina en 3 días. ¡Actualiza ahora y mantén todos los beneficios!',
  '{"premium_trial_ends_in_days": 3}'::jsonb
);

-- Indexes
CREATE INDEX idx_email_sent_log_user ON email_sent_log(user_id, sent_at);
CREATE INDEX idx_user_activity_at_risk ON user_activity_tracking(is_at_risk) WHERE is_at_risk = TRUE;
CREATE INDEX idx_comeback_rewards_user ON comeback_rewards(user_id, claimed_at);
CREATE INDEX idx_weekly_recap_user_week ON weekly_recap_data(user_id, week_start);

COMMENT ON TABLE email_campaigns IS 'Campañas de email automáticas para retención';
COMMENT ON TABLE comeback_rewards IS 'Recompensas para usuarios que vuelven después de inactividad';
COMMENT ON TABLE weekly_recap_data IS 'Datos para email de resumen semanal';
