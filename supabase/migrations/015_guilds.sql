-- =====================================================
-- Migration 015: Guilds Table Extensions
-- Description: Add additional columns to guilds (table already exists in master schema)
-- =====================================================

DO $$
BEGIN
  -- Only add columns if they don't exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guilds') THEN
    -- Add banner_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'banner_url') THEN
      ALTER TABLE public.guilds ADD COLUMN banner_url TEXT;
    END IF;
    
    -- Add join_code if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'join_code') THEN
      ALTER TABLE public.guilds ADD COLUMN join_code TEXT UNIQUE;
    END IF;
    
    -- Add settings if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'settings') THEN
      ALTER TABLE public.guilds ADD COLUMN settings JSONB DEFAULT '{}';
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guilds' AND column_name = 'updated_at') THEN
      ALTER TABLE public.guilds ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- Create indexes only if they reference existing columns
CREATE INDEX IF NOT EXISTS idx_guilds_owner ON guilds(owner_id);
CREATE INDEX IF NOT EXISTS idx_guilds_join_code ON guilds(join_code) WHERE join_code IS NOT NULL;

-- RLS already enabled in master schema, just ensure policies are correct
DROP POLICY IF EXISTS "Owners can update own guilds" ON public.guilds;
CREATE POLICY "Owners can update own guilds" ON public.guilds
  FOR UPDATE USING (owner_id = auth.uid());
