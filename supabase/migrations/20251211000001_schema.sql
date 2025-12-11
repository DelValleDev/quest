-- Tablas base
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  quest_coins INTEGER DEFAULT 100,
  user_class TEXT DEFAULT 'warrior',
  character_class TEXT,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  theme_mode TEXT DEFAULT 'dark',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pillars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  order_index INTEGER
);

INSERT INTO public.pillars (id, name, description, icon, color, order_index) VALUES
  ('physical', 'Físico', 'Salud, fitness, nutrición, sueño', '💪', '#EF4444', 1),
  ('mental', 'Mental', 'Aprendizaje, concentración, crecimiento', '🧠', '#3B82F6', 2),
  ('social', 'Social', 'Relaciones, comunicación, comunidad', '👥', '#EC4899', 3),
  ('professional', 'Profesional', 'Carrera, habilidades, productividad', '💼', '#10B981', 4),
  ('spiritual', 'Espiritual', 'Propósito, valores, gratitud', '✨', '#8B5CF6', 5),
  ('creative', 'Creativo', 'Arte, música, escritura, innovación', '🎨', '#F97316', 6)
ON CONFLICT (id) DO NOTHING;

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assessment_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users manage own pillars" ON public.user_pillars FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Everyone reads pillars" ON public.pillars FOR SELECT TO authenticated USING (true);
CREATE POLICY "Everyone reads questions" ON public.assessment_questions FOR SELECT USING (true);
CREATE POLICY "Users see own answers" ON public.user_assessment_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own answers" ON public.user_assessment_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own answers" ON public.user_assessment_answers FOR UPDATE USING (auth.uid() = user_id);

-- Funciones
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_pillars (user_id, pillar_id)
  SELECT NEW.id, id FROM public.pillars;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_pillars_updated_at
  BEFORE UPDATE ON public.user_pillars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
