-- =====================================================
-- Migration 017: Guild AI Mentor Settings
-- Description: AI mentor configuration per guild
-- =====================================================

CREATE TABLE IF NOT EXISTS public.guild_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE UNIQUE,
  mentor_name TEXT DEFAULT 'Guild Mentor',
  mentor_personality TEXT DEFAULT 'friendly',
  focus_pillars TEXT[] DEFAULT ARRAY['physical', 'mental'],
  custom_prompts JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guild_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guild admins can manage AI settings" ON public.guild_ai_settings;
CREATE POLICY "Guild admins can manage AI settings" ON public.guild_ai_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guild_members 
      WHERE guild_id = guild_ai_settings.guild_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Guild members can view AI settings" ON public.guild_ai_settings;
CREATE POLICY "Guild members can view AI settings" ON public.guild_ai_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guild_members 
      WHERE guild_id = guild_ai_settings.guild_id 
      AND user_id = auth.uid()
    )
  );
