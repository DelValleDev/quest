-- =====================================================
-- Migration 015: Guilds Table
-- Description: User groups/guilds for social features
-- =====================================================

CREATE TABLE IF NOT EXISTS public.guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏰',
  banner_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  max_members INTEGER DEFAULT 50,
  is_public BOOLEAN DEFAULT true,
  join_code TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guilds_creator ON guilds(created_by);
CREATE INDEX IF NOT EXISTS idx_guilds_join_code ON guilds(join_code);

ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public guilds" ON public.guilds;
CREATE POLICY "Anyone can view public guilds" ON public.guilds
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

DROP POLICY IF EXISTS "Creators can update own guilds" ON public.guilds;
CREATE POLICY "Creators can update own guilds" ON public.guilds
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create guilds" ON public.guilds;
CREATE POLICY "Authenticated users can create guilds" ON public.guilds
  FOR INSERT WITH CHECK (auth.uid() = created_by);
