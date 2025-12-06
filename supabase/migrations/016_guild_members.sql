-- =====================================================
-- Migration 016: Guild Members Table
-- Description: Track guild membership and roles
-- =====================================================

CREATE TABLE IF NOT EXISTS public.guild_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  contribution_xp INTEGER DEFAULT 0,
  UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);

ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guild members can view membership" ON public.guild_members;
CREATE POLICY "Guild members can view membership" ON public.guild_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guild_members gm 
      WHERE gm.guild_id = guild_members.guild_id 
      AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join guilds" ON public.guild_members;
CREATE POLICY "Users can join guilds" ON public.guild_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave guilds" ON public.guild_members;
CREATE POLICY "Users can leave guilds" ON public.guild_members
  FOR DELETE USING (auth.uid() = user_id);
