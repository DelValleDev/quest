-- =====================================================
-- Migration 001: Subscription Tiers
-- Description: Base subscription tier definitions (Free, Premium, Developer)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO public.subscription_tiers (id, name, price_monthly, price_yearly, features) VALUES
('free', 'Free', 0, 0, '{
  "max_daily_quests": 3,
  "max_life_paths": 1,
  "max_milestones_per_path": 5,
  "ai_coach_messages": 10,
  "ai_life_path_generation": false,
  "max_agenda_events": 20,
  "ads_enabled": true
}'),
('premium', 'Premium', 4.99, 35.99, '{
  "max_daily_quests": -1,
  "max_life_paths": -1,
  "max_milestones_per_path": -1,
  "ai_coach_messages": -1,
  "ai_life_path_generation": true,
  "max_agenda_events": -1,
  "ads_enabled": false
}'),
('developer', 'Developer', 0, 0, '{
  "max_daily_quests": -1,
  "max_life_paths": -1,
  "max_milestones_per_path": -1,
  "ai_coach_messages": -1,
  "ai_life_path_generation": true,
  "max_agenda_events": -1,
  "ads_enabled": false
}')
ON CONFLICT (id) DO NOTHING;
