-- 000_create_profiles.sql

-- Minimal profiles table required by the app
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant minimal access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
