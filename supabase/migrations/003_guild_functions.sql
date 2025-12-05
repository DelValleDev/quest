-- =====================================================
-- Migration: Add Guild Helper Functions
-- =====================================================

-- Function to increment guild member count
CREATE OR REPLACE FUNCTION increment_guild_members(guild_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE guilds
  SET member_count = member_count + 1
  WHERE id = guild_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement guild member count
CREATE OR REPLACE FUNCTION decrement_guild_members(guild_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE guilds
  SET member_count = GREATEST(0, member_count - 1)
  WHERE id = guild_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for guilds if not exists
DO $$ 
BEGIN
  -- Allow anyone to view public guilds
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guilds' AND policyname = 'Anyone can view public guilds'
  ) THEN
    CREATE POLICY "Anyone can view public guilds" ON public.guilds
      FOR SELECT USING (is_public = true);
  END IF;

  -- Allow authenticated users to create guilds
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guilds' AND policyname = 'Authenticated users can create guilds'
  ) THEN
    CREATE POLICY "Authenticated users can create guilds" ON public.guilds
      FOR INSERT WITH CHECK (auth.uid() = owner_id);
  END IF;

  -- Guild owners can update their guilds
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guilds' AND policyname = 'Guild owners can update'
  ) THEN
    CREATE POLICY "Guild owners can update" ON public.guilds
      FOR UPDATE USING (auth.uid() = owner_id);
  END IF;
END $$;

-- Guild members policies
DO $$ 
BEGIN
  -- Users can view members of guilds they belong to
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guild_members' AND policyname = 'Members can view guild members'
  ) THEN
    CREATE POLICY "Members can view guild members" ON public.guild_members
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM guild_members gm
          WHERE gm.guild_id = guild_members.guild_id
          AND gm.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM guilds g
          WHERE g.id = guild_members.guild_id
          AND g.is_public = true
        )
      );
  END IF;

  -- Users can join public guilds
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guild_members' AND policyname = 'Users can join guilds'
  ) THEN
    CREATE POLICY "Users can join guilds" ON public.guild_members
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM guilds g
          WHERE g.id = guild_id
          AND g.is_public = true
          AND g.member_count < g.max_members
        )
      );
  END IF;

  -- Users can leave guilds
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guild_members' AND policyname = 'Users can leave guilds'
  ) THEN
    CREATE POLICY "Users can leave guilds" ON public.guild_members
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_guild_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_guild_members(UUID) TO authenticated;
