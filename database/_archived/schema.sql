-- =====================================================
-- QUEST APP - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE
-- Extended user data (linked to auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  
  -- Gamification
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  quest_coins INTEGER DEFAULT 100, -- Starting bonus
  
  -- User class (warrior, sage, connector, creator)
  user_class TEXT DEFAULT 'warrior',
  
  -- Streak tracking
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  
  -- Preferences
  theme_mode TEXT DEFAULT 'dark',
  notifications_enabled BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. PILLARS TABLE (Reference)
-- The 6 life pillars
-- =====================================================
CREATE TABLE public.pillars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  order_index INTEGER
);

-- Insert the 6 pillars
INSERT INTO public.pillars (id, name, description, icon, color, order_index) VALUES
  ('physical', 'Physical', 'Health, fitness, nutrition, sleep', '💪', '#EF4444', 1),
  ('mental', 'Mental', 'Learning, focus, mindfulness, growth', '🧠', '#3B82F6', 2),
  ('social', 'Social', 'Relationships, communication, community', '👥', '#EC4899', 3),
  ('professional', 'Professional', 'Career, skills, productivity, goals', '💼', '#10B981', 4),
  ('spiritual', 'Spiritual', 'Purpose, values, gratitude, reflection', '✨', '#8B5CF6', 5),
  ('creative', 'Creative', 'Art, music, writing, innovation', '🎨', '#F97316', 6);

-- =====================================================
-- 3. USER_PILLARS TABLE
-- User's progress in each pillar
-- =====================================================
CREATE TABLE public.user_pillars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pillar_id TEXT REFERENCES public.pillars(id) ON DELETE CASCADE,
  
  -- Progress
  level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  xp_to_next_level INTEGER DEFAULT 100,
  
  -- Stats
  challenges_completed INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- in minutes
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, pillar_id)
);

-- =====================================================
-- 4. CHALLENGES TABLE
-- Available challenges/quests
-- =====================================================
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT REFERENCES public.pillars(id),
  
  -- Difficulty & rewards
  difficulty TEXT DEFAULT 'medium', -- easy, medium, hard, epic
  xp_reward INTEGER DEFAULT 25,
  coin_reward INTEGER DEFAULT 5,
  
  -- Requirements
  duration_minutes INTEGER, -- estimated time
  is_daily BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  
  -- Metadata
  icon TEXT,
  tags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some starter challenges
INSERT INTO public.challenges (title, description, pillar_id, difficulty, xp_reward, coin_reward, duration_minutes, is_daily, icon) VALUES
  -- Physical
  ('Morning Stretch', 'Do 10 minutes of stretching when you wake up', 'physical', 'easy', 15, 3, 10, true, '🧘'),
  ('Hydration Hero', 'Drink 8 glasses of water today', 'physical', 'easy', 20, 5, null, true, '💧'),
  ('Power Walk', 'Take a 30-minute walk outside', 'physical', 'medium', 30, 8, 30, false, '🚶'),
  ('No Sugar Day', 'Avoid added sugars for the entire day', 'physical', 'hard', 50, 15, null, true, '🍎'),
  
  -- Mental
  ('5-Minute Meditation', 'Practice mindfulness meditation', 'mental', 'easy', 15, 3, 5, true, '🧘‍♂️'),
  ('Read 20 Pages', 'Read from a book or article', 'mental', 'medium', 25, 6, 30, false, '📚'),
  ('Learn Something New', 'Watch an educational video or take a lesson', 'mental', 'medium', 30, 8, 20, false, '🎓'),
  ('Digital Detox Hour', 'No phone/social media for 1 hour', 'mental', 'hard', 40, 12, 60, false, '📵'),
  
  -- Social
  ('Reach Out', 'Message or call a friend you haven''t talked to recently', 'social', 'easy', 20, 5, 10, false, '💬'),
  ('Compliment Someone', 'Give a genuine compliment to someone', 'social', 'easy', 15, 3, 5, true, '😊'),
  ('Help a Stranger', 'Do a random act of kindness', 'social', 'medium', 35, 10, null, false, '🤝'),
  
  -- Professional
  ('Plan Your Day', 'Write down your top 3 priorities for today', 'professional', 'easy', 15, 3, 5, true, '📝'),
  ('Deep Work Session', 'Focus on important work for 90 minutes', 'professional', 'hard', 50, 15, 90, false, '🎯'),
  ('Learn a Skill', 'Spend 30 minutes learning a professional skill', 'professional', 'medium', 30, 8, 30, false, '💡'),
  
  -- Spiritual
  ('Gratitude Journal', 'Write 3 things you''re grateful for', 'spiritual', 'easy', 15, 3, 5, true, '🙏'),
  ('Reflect & Review', 'Spend 10 minutes reflecting on your day', 'spiritual', 'easy', 20, 5, 10, true, '✨'),
  ('Nature Connection', 'Spend 20 minutes in nature without devices', 'spiritual', 'medium', 30, 8, 20, false, '🌿'),
  
  -- Creative
  ('Daily Sketch', 'Draw or doodle something for 10 minutes', 'creative', 'easy', 15, 3, 10, true, '✏️'),
  ('Write 300 Words', 'Write anything - journal, story, ideas', 'creative', 'medium', 25, 6, 15, false, '✍️'),
  ('Try Something New', 'Experiment with a new creative activity', 'creative', 'medium', 35, 10, 30, false, '🎨');

-- =====================================================
-- 5. USER_CHALLENGES TABLE
-- User's challenge progress/history
-- =====================================================
CREATE TABLE public.user_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'active', -- active, completed, failed, skipped
  
  -- Tracking
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- For daily challenges
  scheduled_date DATE,
  
  -- Notes
  notes TEXT,
  
  UNIQUE(user_id, challenge_id, scheduled_date)
);

-- =====================================================
-- 6. ACHIEVEMENTS TABLE
-- Unlockable achievements/badges
-- =====================================================
CREATE TABLE public.achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER DEFAULT 0,
  coin_reward INTEGER DEFAULT 0,
  
  -- Requirements (JSON for flexibility)
  requirement_type TEXT, -- streak, challenges_completed, level_reached, etc.
  requirement_value INTEGER,
  requirement_pillar TEXT REFERENCES public.pillars(id)
);

-- Insert starter achievements
INSERT INTO public.achievements (id, name, description, icon, xp_reward, coin_reward, requirement_type, requirement_value) VALUES
  ('first_challenge', 'First Steps', 'Complete your first challenge', '🌟', 50, 20, 'challenges_completed', 1),
  ('streak_3', 'Getting Consistent', 'Maintain a 3-day streak', '🔥', 75, 30, 'streak', 3),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day streak', '⚡', 150, 50, 'streak', 7),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day streak', '👑', 500, 200, 'streak', 30),
  ('level_5', 'Rising Star', 'Reach level 5', '⭐', 100, 40, 'level_reached', 5),
  ('level_10', 'Dedicated', 'Reach level 10', '🏆', 250, 100, 'level_reached', 10),
  ('all_pillars', 'Well Rounded', 'Complete a challenge in all 6 pillars', '🎯', 200, 75, 'pillars_touched', 6);

-- =====================================================
-- 7. USER_ACHIEVEMENTS TABLE
-- Achievements unlocked by users
-- =====================================================
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User Pillars: Users can only access their own
CREATE POLICY "Users can manage own pillars" ON public.user_pillars
  FOR ALL USING (auth.uid() = user_id);

-- User Challenges: Users can only access their own
CREATE POLICY "Users can manage own challenges" ON public.user_challenges
  FOR ALL USING (auth.uid() = user_id);

-- User Achievements: Users can only access their own
CREATE POLICY "Users can manage own achievements" ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id);

-- Pillars, Challenges, Achievements are readable by all authenticated users
ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pillars" ON public.pillars
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can read challenges" ON public.challenges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can read achievements" ON public.achievements
  FOR SELECT TO authenticated USING (true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Initialize all 6 pillars for the user
  INSERT INTO public.user_pillars (user_id, pillar_id)
  SELECT NEW.id, id FROM public.pillars;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Apply to user_pillars
CREATE TRIGGER update_user_pillars_updated_at
  BEFORE UPDATE ON public.user_pillars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- DONE! 🎉
-- =====================================================
