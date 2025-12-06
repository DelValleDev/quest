-- =====================================================
-- Migration 001: Subscription Tiers
-- Description: Base subscription tier definitions (Free, Premium, Developer)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_es TEXT,
  description TEXT,
  description_es TEXT,
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscription_tiers' AND column_name = 'display_order') THEN
    ALTER TABLE public.subscription_tiers ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscription_tiers' AND column_name = 'description') THEN
    ALTER TABLE public.subscription_tiers ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscription_tiers' AND column_name = 'description_es') THEN
    ALTER TABLE public.subscription_tiers ADD COLUMN description_es TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscription_tiers' AND column_name = 'currency') THEN
    ALTER TABLE public.subscription_tiers ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;
END $$;

-- Seed data with Spanish translations
INSERT INTO public.subscription_tiers (
  id, name, name_es, description, description_es, 
  price_monthly, price_yearly, currency, features, display_order
) VALUES
('free', 'Free', 'Gratis', 'Basic features for getting started', 'Funciones básicas para empezar', 
0, 0, 'USD', '{
  "max_daily_quests": 3,
  "max_life_paths": 1,
  "max_milestones_per_path": 5,
  "ai_coach_messages": 10,
  "ai_life_path_generation": false,
  "max_agenda_events": 20,
  "ads_enabled": true
}', 0),
('premium', 'Premium', 'Premium', 'Unlock all features and unlimited access', 'Desbloquea todas las funciones y acceso ilimitado', 
4.99, 35.99, 'USD', '{
  "max_daily_quests": -1,
  "max_life_paths": -1,
  "max_milestones_per_path": -1,
  "ai_coach_messages": -1,
  "ai_life_path_generation": true,
  "max_agenda_events": -1,
  "ads_enabled": false
}', 1),
('developer', 'Developer', 'Desarrollador', 'Full access for development and testing', 'Acceso completo para desarrollo y pruebas', 
0, 0, 'USD', '{
  "max_daily_quests": -1,
  "max_life_paths": -1,
  "max_milestones_per_path": -1,
  "ai_coach_messages": -1,
  "ai_life_path_generation": true,
  "max_agenda_events": -1,
  "ads_enabled": false
}', 2)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_es = EXCLUDED.name_es,
  description = EXCLUDED.description,
  description_es = EXCLUDED.description_es,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features;
