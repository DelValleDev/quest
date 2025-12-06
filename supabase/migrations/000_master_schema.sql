-- ==============================================================================
-- 🏰 QUEST APP - MASTER DATABASE SCHEMA (COMPLETE)
-- ==============================================================================
-- This file contains the entire database structure for the Quest App.
-- Run this in the Supabase SQL Editor to set up the complete database.
--
-- SECTIONS:
-- 1.  EXTENSIONS & SETUP
-- 2.  CORE TABLES (Profiles, Pillars)
-- 3.  GAMIFICATION (Classes, Levels, XP)
-- 4.  HABITS SYSTEM
-- 5.  CHALLENGES & QUESTS
-- 6.  ASSESSMENT SYSTEM
-- 7.  SOCIAL SYSTEM (Friends, Guilds, Raids, Duels)
-- 8.  SHOP & INVENTORY
-- 9.  CALENDAR & AGENDA
-- 10. LIFE PATHS & GOALS
-- 11. SUBSCRIPTION & PREMIUM
-- 12. ACTIVITY FEED
-- 13. AI & USAGE TRACKING
-- 14. VIEWS & ANALYTICS
-- 15. FUNCTIONS & TRIGGERS
-- 16. RLS POLICIES
-- 17. SEED DATA (Core data only)
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS & SETUP
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For search

-- ==============================================================================
-- 2. CORE TABLES
-- ==============================================================================

-- 2.1 PROFILES (Extended user data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  
  -- Gamification
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  quest_coins INTEGER DEFAULT 100,
  
  -- Character Class
  character_class TEXT, -- warrior, sage, etc.
  primary_class TEXT,
  secondary_class TEXT,
  class_affinities JSONB,
  class_changed_at TIMESTAMPTZ,
  
  -- Streak & Activity
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  daily_check_in_date DATE,
  mood_today TEXT,
  
  -- Stats
  challenges_completed INTEGER DEFAULT 0,
  habits_completed_today INTEGER DEFAULT 0,
  total_habits_completed INTEGER DEFAULT 0,
  
  -- Assessment & Onboarding
  assessment_completed BOOLEAN DEFAULT false,
  has_completed_assessment BOOLEAN DEFAULT false,
  initial_setup_completed BOOLEAN DEFAULT false,
  pillar_scores JSONB DEFAULT '{}',
  personality_traits JSONB DEFAULT '{}',
  goals TEXT[],
  
  -- Preferences
  theme_mode TEXT DEFAULT 'dark',
  notifications_enabled BOOLEAN DEFAULT true,
  preferred_language TEXT DEFAULT 'en',
  
  -- Subscription
  subscription_tier TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  subscription_started_at TIMESTAMPTZ,
  is_premium BOOLEAN DEFAULT false,
  premium_expires_at TIMESTAMPTZ,
  is_developer BOOLEAN DEFAULT false,
  developer_email TEXT,
  show_developer_badge BOOLEAN DEFAULT true,
  lifetime_premium BOOLEAN DEFAULT false,
  trial_started_at TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT false,
  
  -- Limits & Counters
  ai_calendar_uses_today INTEGER DEFAULT 0,
  ai_calendar_last_reset DATE,
  daily_quest_creates_today INTEGER DEFAULT 0,
  daily_quest_creates_last_reset DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 PILLARS (Life areas)
CREATE TABLE IF NOT EXISTS public.pillars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  order_index INTEGER
);

-- 2.3 USER PILLARS (Progress per pillar)
CREATE TABLE IF NOT EXISTS public.user_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pillar_id TEXT REFERENCES public.pillars(id) ON DELETE CASCADE,
  
  level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  xp_to_next_level INTEGER DEFAULT 100,
  
  challenges_completed INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, pillar_id)
);

-- 2.4 USER PILLAR FOCUS
CREATE TABLE IF NOT EXISTS public.user_pillar_focus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pillar_id TEXT REFERENCES public.pillars(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pillar_id)
);

-- ==============================================================================
-- 3. GAMIFICATION (Classes)
-- ==============================================================================

-- 3.1 CHARACTER CLASSES
CREATE TABLE IF NOT EXISTS public.character_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  primary_pillar TEXT NOT NULL,
  secondary_pillar TEXT,
  color TEXT NOT NULL,
  challenge_distribution JSONB NOT NULL DEFAULT '{"primary": 0.6, "secondary": 0.2, "others": 0.2}'
);

-- 3.2 CLASS BONUSES
CREATE TABLE IF NOT EXISTS public.class_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT REFERENCES public.character_classes(id),
  bonus_type TEXT NOT NULL, -- xp_multiplier, coin_bonus, etc.
  bonus_value DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  bonus_description TEXT NOT NULL,
  pillar_id TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 3.3 USER CLASS AFFINITIES (Calculated from assessment)
CREATE TABLE IF NOT EXISTS public.user_class_affinities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  warrior_pct DECIMAL(5,2) DEFAULT 0,
  sage_pct DECIMAL(5,2) DEFAULT 0,
  connector_pct DECIMAL(5,2) DEFAULT 0,
  creator_pct DECIMAL(5,2) DEFAULT 0,
  achiever_pct DECIMAL(5,2) DEFAULT 0,
  monk_pct DECIMAL(5,2) DEFAULT 0,
  primary_class TEXT REFERENCES public.character_classes(id),
  secondary_class TEXT REFERENCES public.character_classes(id),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ==============================================================================
-- 4. HABITS SYSTEM
-- ==============================================================================

-- 4.1 HABITS
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT REFERENCES public.pillars(id),
  icon TEXT DEFAULT '✅',
  
  frequency TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, specific_days
  frequency_days TEXT[],
  times_per_day INTEGER DEFAULT 1,
  
  preferred_time TIME,
  time_of_day TEXT, -- morning, afternoon, evening
  
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  
  xp_reward INTEGER DEFAULT 10,
  coin_reward INTEGER DEFAULT 2,
  
  is_active BOOLEAN DEFAULT true,
  is_ai_suggested BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 HABIT LOGS
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  log_date DATE DEFAULT CURRENT_DATE,
  completion_number INTEGER DEFAULT 1,
  notes TEXT,
  mood TEXT,
  UNIQUE(habit_id, log_date, completion_number)
);

-- 4.3 PRESET HABITS
CREATE TABLE IF NOT EXISTS public.preset_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id TEXT REFERENCES public.pillars(id),
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_en TEXT,
  description_es TEXT,
  icon TEXT DEFAULT '✅',
  frequency TEXT DEFAULT 'daily',
  time_of_day TEXT DEFAULT 'anytime',
  xp_reward INTEGER DEFAULT 10,
  category TEXT,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. CHALLENGES & QUESTS
-- ==============================================================================

-- 5.1 CHALLENGES (The library of quests)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT REFERENCES public.pillars(id),
  difficulty TEXT DEFAULT 'medium',
  xp_reward INTEGER DEFAULT 25,
  coin_reward INTEGER DEFAULT 5,
  duration_minutes INTEGER,
  is_daily BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  icon TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2 USER CHALLENGES (History)
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- active, completed, failed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  scheduled_date DATE,
  notes TEXT,
  UNIQUE(user_id, challenge_id, scheduled_date)
);

-- 5.3 USER DAILY QUESTS (Assigned for today)
CREATE TABLE IF NOT EXISTS public.user_daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_quest_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  verification_type TEXT DEFAULT 'honor',
  verification_photo_url TEXT,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, daily_quest_id, assigned_date)
);

-- 5.4 DAILY QUEST POOL (Rotation)
CREATE TABLE IF NOT EXISTS public.daily_quest_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, challenge_id, date)
);

-- 5.5 AI DAILY QUESTS
CREATE TABLE IF NOT EXISTS public.ai_daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '⚡',
  pillar_id TEXT REFERENCES public.pillars(id),
  difficulty TEXT DEFAULT 'medium',
  xp_reward INTEGER DEFAULT 50,
  coin_reward INTEGER DEFAULT 10,
  estimated_minutes INTEGER DEFAULT 15,
  suggested_time TEXT,
  status TEXT DEFAULT 'available',
  completed_at TIMESTAMPTZ,
  generation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.6 ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  pillar_id TEXT REFERENCES public.pillars(id),
  xp_reward INTEGER DEFAULT 50,
  coin_reward INTEGER DEFAULT 10,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  icon TEXT NOT NULL,
  rarity TEXT DEFAULT 'common',
  is_hidden BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.7 USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ==============================================================================
-- 6. ASSESSMENT SYSTEM
-- ==============================================================================

-- 6.1 ASSESSMENT QUESTIONS
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_text_en TEXT,
  question_type TEXT NOT NULL,
  options JSONB,
  options_en JSONB,
  weight INTEGER DEFAULT 1,
  reverse_score BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL,
  priority TEXT DEFAULT 'extended',
  question_category TEXT DEFAULT 'current_state',
  class_affinity JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.2 USER ASSESSMENT ANSWERS
CREATE TABLE IF NOT EXISTS public.user_assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  answer_value INTEGER,
  answer_choice TEXT,
  answer_choices JSONB,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- 6.3 ASPIRATIONAL QUESTIONS
CREATE TABLE IF NOT EXISTS public.aspirational_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  placeholder TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.4 USER ASPIRATIONAL ANSWERS
CREATE TABLE IF NOT EXISTS public.user_aspirational_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.aspirational_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_choice TEXT,
  answer_choices JSONB,
  answer_value INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- ==============================================================================
-- 7. SOCIAL SYSTEM
-- ==============================================================================

-- 7.1 FRIEND REQUESTS
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(sender_id, receiver_id)
);

-- 7.2 FRIENDS
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenges_together INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- 7.3 GUILDS
CREATE TABLE IF NOT EXISTS public.guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '⚔️',
  banner_color TEXT DEFAULT '#8B5CF6',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 50,
  min_level INTEGER DEFAULT 1,
  total_xp BIGINT DEFAULT 0,
  member_count INTEGER DEFAULT 1,
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.4 GUILD MEMBERS
CREATE TABLE IF NOT EXISTS public.guild_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  xp_contributed BIGINT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, user_id)
);

-- 7.5 GUILD CHALLENGES
CREATE TABLE IF NOT EXISTS public.guild_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  goal_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 100,
  coin_reward INTEGER DEFAULT 50,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.6 RAIDS
CREATE TABLE IF NOT EXISTS public.raids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  target_value INT NOT NULL DEFAULT 1,
  target_unit TEXT NOT NULL DEFAULT 'units',
  xp_reward INT NOT NULL DEFAULT 200,
  coin_reward INT NOT NULL DEFAULT 50,
  duration_hours INT NOT NULL DEFAULT 2,
  min_participants INT NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'active',
  success_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.70,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.7 RAID PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.raid_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_id UUID NOT NULL REFERENCES public.raids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined',
  current_progress INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(raid_id, user_id)
);

-- 7.8 RAID TEMPLATES
CREATE TABLE IF NOT EXISTS public.raid_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  target_value INT NOT NULL,
  target_unit TEXT NOT NULL,
  xp_reward INT NOT NULL DEFAULT 200,
  duration_hours INT NOT NULL DEFAULT 2,
  pillar_id TEXT,
  icon TEXT DEFAULT '⚡',
  is_active BOOLEAN DEFAULT true
);

-- 7.9 DUELS (1v1)
CREATE TABLE IF NOT EXISTS public.challenge_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_id UUID REFERENCES public.challenges(id),
  challenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  opponent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stake_type TEXT DEFAULT 'honor',
  stake_amount INTEGER DEFAULT 0,
  custom_stake TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  winner_id UUID REFERENCES public.profiles(id),
  challenger_progress JSONB DEFAULT '{"value": 0, "notes": []}',
  opponent_progress JSONB DEFAULT '{"value": 0, "notes": []}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 7.10 GROUP CHALLENGES
CREATE TABLE IF NOT EXISTS public.group_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_id UUID REFERENCES public.challenges(id),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_type TEXT DEFAULT 'competitive',
  stake_type TEXT DEFAULT 'honor',
  stake_amount INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  min_participants INTEGER DEFAULT 3,
  max_participants INTEGER DEFAULT 10,
  punishment_proposals JSONB DEFAULT '[]',
  punishment_votes JSONB DEFAULT '{}',
  selected_punishment TEXT,
  winner_ids UUID[] DEFAULT '{}',
  loser_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_challenge_id UUID REFERENCES public.group_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  progress JSONB DEFAULT '{"value": 0, "notes": []}',
  completed_at TIMESTAMPTZ,
  final_rank INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_challenge_id, user_id)
);

-- ==============================================================================
-- 8. SHOP & INVENTORY
-- ==============================================================================

-- 8.1 SHOP ITEMS
CREATE TABLE IF NOT EXISTS public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  price INTEGER NOT NULL,
  original_price INTEGER,
  item_data JSONB DEFAULT '{}',
  icon TEXT NOT NULL,
  preview_image TEXT,
  rarity TEXT DEFAULT 'common',
  is_available BOOLEAN DEFAULT true,
  is_limited BOOLEAN DEFAULT false,
  available_until TIMESTAMPTZ,
  stock INTEGER,
  required_level INTEGER DEFAULT 1,
  required_achievement_id UUID REFERENCES public.achievements(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.2 USER INVENTORY
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.shop_items(id) ON DELETE CASCADE,
  is_equipped BOOLEAN DEFAULT false,
  equipped_slot TEXT,
  quantity INTEGER DEFAULT 1,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- 8.3 USER PURCHASES
CREATE TABLE IF NOT EXISTS public.user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.shop_items(id) ON DELETE CASCADE,
  price_paid INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. CALENDAR & AGENDA
-- ==============================================================================

-- 9.1 CALENDAR EVENTS
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  recurrence_end_date DATE,
  parent_event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  event_type TEXT DEFAULT 'personal',
  color TEXT DEFAULT '#6366F1',
  icon TEXT DEFAULT '📅',
  location TEXT,
  reminder_minutes INTEGER[] DEFAULT ARRAY[10, 30],
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.2 DAILY AGENDA ITEMS
CREATE TABLE IF NOT EXISTS public.daily_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  agenda_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  item_type TEXT NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  quest_id UUID,
  event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📌',
  color TEXT DEFAULT '#6B7280',
  pillar_id TEXT,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 5,
  duration_minutes INTEGER DEFAULT 15,
  created_by TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.3 CALENDAR INTEGRATIONS
CREATE TABLE IF NOT EXISTS public.user_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- google, apple, outlook
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  sync_settings JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ==============================================================================
-- 10. LIFE PATHS & GOALS
-- ==============================================================================

-- 10.1 LIFE PATHS
CREATE TABLE IF NOT EXISTS public.life_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT REFERENCES public.pillars(id),
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#8B5CF6',
  vision_statement TEXT,
  why_important TEXT,
  target_date DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  progress_percentage INTEGER DEFAULT 0,
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.2 MILESTONES
CREATE TABLE IF NOT EXISTS public.path_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  life_path_id UUID REFERENCES public.life_paths(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  success_criteria TEXT,
  target_date DATE,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  ai_suggested BOOLEAN DEFAULT FALSE,
  ai_tips JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.3 WEEKLY PLANS
CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.path_milestones(id) ON DELETE SET NULL,
  week_start DATE NOT NULL,
  week_number INTEGER,
  year INTEGER,
  main_focus TEXT,
  secondary_goals TEXT[],
  ai_generated_plan JSONB,
  weekly_reflection TEXT,
  satisfaction_score INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, week_start)
);

-- 10.4 WEEKLY OBJECTIVES
CREATE TABLE IF NOT EXISTS public.weekly_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id UUID REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT REFERENCES public.pillars(id),
  target_type TEXT DEFAULT 'completion',
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  unit TEXT,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  linked_habit_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.5 PATH HABITS
CREATE TABLE IF NOT EXISTS public.path_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  life_path_id UUID REFERENCES public.life_paths(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT,
  frequency TEXT DEFAULT 'daily',
  frequency_days INTEGER[],
  target_per_period INTEGER DEFAULT 1,
  preferred_time TEXT,
  duration_minutes INTEGER,
  is_keystone BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. SUBSCRIPTION & PREMIUM
-- ==============================================================================

-- 11.1 SUBSCRIPTION TIERS
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description TEXT,
  description_es TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

-- 11.2 PAYMENT HISTORY
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_provider TEXT,
  provider_payment_id TEXT,
  provider_subscription_id TEXT,
  tier_id TEXT REFERENCES public.subscription_tiers(id),
  billing_period TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ==============================================================================
-- 12. ACTIVITY FEED
-- ==============================================================================

-- 12.1 ACTIVITY FEED
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
  achievement_id UUID,
  duel_id UUID,
  raid_id UUID,
  pillar_id TEXT REFERENCES public.pillars(id),
  xp_earned INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  new_level INTEGER,
  streak_days INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12.2 ACTIVITY REACTIONS
CREATE TABLE IF NOT EXISTS public.activity_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- ==============================================================================
-- 13. AI & USAGE TRACKING
-- ==============================================================================

-- 13.1 AI CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.quest_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13.2 AI USAGE TRACKING
CREATE TABLE IF NOT EXISTS public.ia_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_details JSONB,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 14. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_pillars_user ON public.user_pillars(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON public.user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_quests_user_date ON public.user_daily_quests(user_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_date ON public.activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time ON public.calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_daily_agenda_user_date ON public.daily_agenda_items(user_id, agenda_date);
CREATE INDEX IF NOT EXISTS idx_life_paths_user ON public.life_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_raids_status ON public.raids(status);
CREATE INDEX IF NOT EXISTS idx_duels_status ON public.challenge_duels(status);

-- ==============================================================================
-- 15. RLS POLICIES (Simplified for Master Schema)
-- ==============================================================================
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_aspirational_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raid_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_conversations ENABLE ROW LEVEL SECURITY;

-- Standard "Users can manage own data" policy
-- (Applied to most user_* tables)
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own pillars" ON public.user_pillars FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own habits" ON public.habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own habit logs" ON public.habit_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own challenges" ON public.user_challenges FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own daily quests" ON public.user_daily_quests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own achievements" ON public.user_achievements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own assessment" ON public.user_assessment_answers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own aspirations" ON public.user_aspirational_answers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own inventory" ON public.user_inventory FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own purchases" ON public.user_purchases FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own calendar" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own agenda" ON public.daily_agenda_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own life paths" ON public.life_paths FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own milestones" ON public.path_milestones FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own weekly plans" ON public.weekly_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own conversations" ON public.quest_conversations FOR ALL USING (auth.uid() = user_id);

-- Public Read Tables
CREATE POLICY "Anyone can read pillars" ON public.pillars FOR SELECT USING (true);
CREATE POLICY "Anyone can read challenges" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Anyone can read achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Anyone can read shop items" ON public.shop_items FOR SELECT USING (true);
CREATE POLICY "Anyone can read classes" ON public.character_classes FOR SELECT USING (true);
CREATE POLICY "Anyone can read tiers" ON public.subscription_tiers FOR SELECT USING (true);
CREATE POLICY "Anyone can read questions" ON public.assessment_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can read aspirational questions" ON public.aspirational_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can read raid templates" ON public.raid_templates FOR SELECT USING (true);

-- Social Policies
CREATE POLICY "Users can view own friend requests" ON public.friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send friend requests" ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own friend requests" ON public.friend_requests FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "Users can view friends" ON public.friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Anyone can view public guilds" ON public.guilds FOR SELECT USING (is_public = true);
CREATE POLICY "Guild members can view guild" ON public.guilds FOR SELECT USING (EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = guilds.id AND user_id = auth.uid()));
CREATE POLICY "Users can create guilds" ON public.guilds FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view guild members" ON public.guild_members FOR SELECT USING (true);
CREATE POLICY "Users can join guilds" ON public.guild_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view raids they participate in" ON public.raids FOR SELECT USING (id IN (SELECT raid_id FROM public.raid_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can create raids" ON public.raids FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can view raid participants" ON public.raid_participants FOR SELECT USING (raid_id IN (SELECT raid_id FROM public.raid_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can join raids" ON public.raid_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own duels" ON public.challenge_duels FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "Users can create duels" ON public.challenge_duels FOR INSERT WITH CHECK (auth.uid() = challenger_id);

-- Activity Feed
CREATE POLICY "Users can view public activity" ON public.activity_feed FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert own activity" ON public.activity_feed FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 16. FUNCTIONS & TRIGGERS
-- ==============================================================================

-- 16.1 Handle New User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), split_part(NEW.email, '@', 1));
  
  INSERT INTO public.user_pillars (user_id, pillar_id)
  SELECT NEW.id, id FROM public.pillars;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 16.2 Update Timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 16.3 Generate Daily Quests
CREATE OR REPLACE FUNCTION generate_daily_quests(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_today DATE := CURRENT_DATE;
  v_pillar_scores JSONB;
  v_weakest_pillar TEXT;
  v_quest RECORD;
  v_assigned INTEGER := 0;
  v_target_count INTEGER := 5 + floor(random() * 3)::INTEGER; -- 5-7 quests
BEGIN
  -- Check if already generated today
  SELECT COUNT(*) INTO v_count
  FROM public.user_daily_quests
  WHERE user_id = p_user_id AND assigned_date = v_today;
  
  IF v_count > 0 THEN
    RETURN v_count; -- Already generated
  END IF;
  
  -- Get user's pillar scores to prioritize weak areas
  SELECT pillar_scores INTO v_pillar_scores
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Find weakest pillar if assessment completed
  IF v_pillar_scores IS NOT NULL THEN
    SELECT key INTO v_weakest_pillar
    FROM jsonb_each_text(v_pillar_scores)
    ORDER BY value::numeric ASC
    LIMIT 1;
  END IF;
  
  -- Assign quests - prioritize weak pillar (2 quests from it)
  IF v_weakest_pillar IS NOT NULL THEN
    FOR v_quest IN
      SELECT id FROM public.challenges
      WHERE is_daily = true 
      AND pillar_id = v_weakest_pillar
      ORDER BY random()
      LIMIT 2
    LOOP
      INSERT INTO public.user_daily_quests (user_id, daily_quest_id, assigned_date)
      VALUES (p_user_id, v_quest.id, v_today)
      ON CONFLICT DO NOTHING;
      v_assigned := v_assigned + 1;
    END LOOP;
  END IF;
  
  -- Fill remaining slots with random quests from all pillars
  FOR v_quest IN
    SELECT c.id FROM public.challenges c
    WHERE c.is_daily = true
    AND c.id NOT IN (
      SELECT daily_quest_id FROM public.user_daily_quests
      WHERE user_id = p_user_id AND assigned_date = v_today
    )
    ORDER BY random()
    LIMIT (v_target_count - v_assigned)
  LOOP
    INSERT INTO public.user_daily_quests (user_id, daily_quest_id, assigned_date)
    VALUES (p_user_id, v_quest.id, v_today)
    ON CONFLICT DO NOTHING;
    v_assigned := v_assigned + 1;
  END LOOP;
  
  RETURN v_assigned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16.4 Check Achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_profile RECORD;
  v_achievement RECORD;
  v_awarded INTEGER := 0;
  v_value INTEGER;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  
  FOR v_achievement IN
    SELECT * FROM public.achievements
    WHERE id NOT IN (
      SELECT achievement_id FROM public.user_achievements WHERE user_id = p_user_id
    )
  LOOP
    v_value := NULL;
    
    -- Check requirement based on type
    CASE v_achievement.requirement_type
      WHEN 'streak_days' THEN
        v_value := v_profile.current_streak;
      WHEN 'challenges_completed' THEN
        v_value := v_profile.challenges_completed;
      WHEN 'total_xp' THEN
        v_value := v_profile.total_xp;
      WHEN 'pillar_level' THEN
        SELECT level INTO v_value
        FROM public.user_pillars
        WHERE user_id = p_user_id AND pillar_id = v_achievement.pillar_id;
      ELSE
        CONTINUE;
    END CASE;
    
    IF v_value IS NOT NULL AND v_value >= v_achievement.requirement_value THEN
      -- Award achievement
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_achievement.id)
      ON CONFLICT DO NOTHING;
      
      -- Award achievement rewards
      UPDATE public.profiles
      SET
        total_xp = total_xp + v_achievement.xp_reward,
        quest_coins = quest_coins + v_achievement.coin_reward
      WHERE id = p_user_id;
      
      v_awarded := v_awarded + 1;
    END IF;
  END LOOP;
  
  RETURN v_awarded;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16.5 Complete Daily Quest
CREATE OR REPLACE FUNCTION complete_daily_quest(
  p_user_id UUID,
  p_quest_assignment_id UUID,
  p_verification_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_quest RECORD;
  v_challenge RECORD;
  v_profile RECORD;
  v_pillar RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - 1;
  v_new_streak INTEGER;
  v_new_level INTEGER;
  v_pillar_new_level INTEGER;
  v_pillar_new_xp INTEGER;
  v_all_completed BOOLEAN;
  v_bonus_xp INTEGER := 0;
  v_total_xp INTEGER;
  v_total_coins INTEGER;
BEGIN
  -- Get the quest assignment
  SELECT * INTO v_quest
  FROM public.user_daily_quests
  WHERE id = p_quest_assignment_id
  AND user_id = p_user_id
  AND assigned_date = v_today;
  
  IF v_quest IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest not found or not assigned today');
  END IF;
  
  IF v_quest.completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest already completed');
  END IF;
  
  -- Get challenge details
  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = v_quest.daily_quest_id;
  
  -- Get current profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Calculate streak
  IF v_profile.last_activity_date = v_yesterday THEN
    v_new_streak := v_profile.current_streak + 1;
  ELSIF v_profile.last_activity_date = v_today THEN
    v_new_streak := v_profile.current_streak;
  ELSE
    v_new_streak := 1;
  END IF;
  
  -- Mark quest as completed
  UPDATE public.user_daily_quests
  SET 
    completed = true,
    completed_at = NOW(),
    verification_photo_url = p_verification_photo_url,
    verified = CASE WHEN p_verification_photo_url IS NOT NULL THEN true ELSE false END,
    verified_at = CASE WHEN p_verification_photo_url IS NOT NULL THEN NOW() ELSE NULL END
  WHERE id = p_quest_assignment_id;
  
  -- Check if all daily quests completed for bonus
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_daily_quests
    WHERE user_id = p_user_id
    AND assigned_date = v_today
    AND completed = false
  ) INTO v_all_completed;
  
  IF v_all_completed THEN
    v_bonus_xp := 50; -- Bonus for completing all daily quests
  END IF;
  
  v_total_xp := v_challenge.xp_reward + v_bonus_xp;
  v_total_coins := v_challenge.coin_reward;
  
  -- Update profile
  v_new_level := FLOOR((v_profile.total_xp + v_total_xp) / 100) + 1;
  
  UPDATE public.profiles
  SET
    total_xp = total_xp + v_total_xp,
    quest_coins = quest_coins + v_total_coins,
    level = v_new_level,
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    last_activity_date = v_today,
    challenges_completed = challenges_completed + 1
  WHERE id = p_user_id;
  
  -- Update pillar
  SELECT * INTO v_pillar
  FROM public.user_pillars
  WHERE user_id = p_user_id AND pillar_id = v_challenge.pillar_id;
  
  IF v_pillar IS NOT NULL THEN
    v_pillar_new_xp := v_pillar.current_xp + v_challenge.xp_reward;
    v_pillar_new_level := v_pillar.level;
    
    -- Check for level up
    WHILE v_pillar_new_xp >= (v_pillar_new_level * 100) LOOP
      v_pillar_new_xp := v_pillar_new_xp - (v_pillar_new_level * 100);
      v_pillar_new_level := v_pillar_new_level + 1;
    END LOOP;
    
    UPDATE public.user_pillars
    SET
      current_xp = v_pillar_new_xp,
      level = v_pillar_new_level,
      challenges_completed = challenges_completed + 1
    WHERE user_id = p_user_id AND pillar_id = v_challenge.pillar_id;
  END IF;
  
  -- Check for achievements
  PERFORM check_achievements(p_user_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_earned', v_total_xp,
    'coins_earned', v_total_coins,
    'new_level', v_new_level,
    'new_streak', v_new_streak,
    'all_completed_bonus', v_all_completed,
    'pillar', v_challenge.pillar_id,
    'pillar_level', v_pillar_new_level
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16.6 Get Daily Quest Summary
CREATE OR REPLACE FUNCTION get_daily_quest_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_total INTEGER;
  v_completed INTEGER;
  v_quests JSONB;
BEGIN
  -- Generate quests if not exists
  PERFORM generate_daily_quests(p_user_id);
  
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true)
  INTO v_total, v_completed
  FROM public.user_daily_quests
  WHERE user_id = p_user_id AND assigned_date = v_today;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', udq.id,
      'completed', udq.completed,
      'completed_at', udq.completed_at,
      'challenge', jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'description', c.description,
        'pillar_id', c.pillar_id,
        'difficulty', c.difficulty,
        'xp_reward', c.xp_reward,
        'coin_reward', c.coin_reward,
        'icon', c.icon,
        'duration_minutes', c.duration_minutes
      )
    )
    ORDER BY udq.completed, c.pillar_id
  ) INTO v_quests
  FROM public.user_daily_quests udq
  JOIN public.challenges c ON c.id = udq.daily_quest_id
  WHERE udq.user_id = p_user_id AND udq.assigned_date = v_today;
  
  RETURN jsonb_build_object(
    'date', v_today,
    'total', v_total,
    'completed', v_completed,
    'progress', CASE WHEN v_total > 0 THEN ROUND((v_completed::numeric / v_total) * 100, 1) ELSE 0 END,
    'quests', COALESCE(v_quests, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 17. SEED DATA (Core)
-- ==============================================================================

-- Pillars
INSERT INTO public.pillars (id, name, description, icon, color, order_index) VALUES
  ('physical', 'Physical', 'Health, fitness, nutrition', '💪', '#EF4444', 1),
  ('mental', 'Mental', 'Learning, focus, growth', '🧠', '#3B82F6', 2),
  ('social', 'Social', 'Relationships, community', '👥', '#EC4899', 3),
  ('professional', 'Professional', 'Career, skills, goals', '💼', '#10B981', 4),
  ('spiritual', 'Spiritual', 'Purpose, peace, values', '✨', '#8B5CF6', 5),
  ('creative', 'Creative', 'Art, expression, innovation', '🎨', '#F97316', 6)
ON CONFLICT (id) DO NOTHING;

-- Classes
INSERT INTO public.character_classes (id, name, icon, description, primary_pillar, color) VALUES
  ('warrior', 'The Warrior', '💪', 'Masters of physical prowess', 'physical', '#EF4444'),
  ('sage', 'The Sage', '🧠', 'Seekers of knowledge', 'mental', '#3B82F6'),
  ('connector', 'The Connector', '❤️', 'Builders of community', 'social', '#EC4899'),
  ('creator', 'The Creator', '🎨', 'Visionaries of art', 'creative', '#F97316'),
  ('achiever', 'The Achiever', '💼', 'Ambitious professionals', 'professional', '#10B981'),
  ('monk', 'The Monk', '🕉️', 'Seekers of inner peace', 'spiritual', '#8B5CF6')
ON CONFLICT (id) DO NOTHING;

-- Subscription Tiers
INSERT INTO public.subscription_tiers (id, name, name_es, price_monthly, features) VALUES
  ('free', 'Free', 'Gratis', 0, '{"daily_quests": 3, "ai_limit": 1}'::jsonb),
  ('premium', 'Premium', 'Premium', 4.99, '{"daily_quests": 10, "ai_limit": -1}'::jsonb),
  ('developer', 'Developer', 'Desarrollador', 0, '{"daily_quests": -1, "ai_limit": -1}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- END OF MASTER SCHEMA
-- ==============================================================================
