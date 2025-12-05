-- =====================================================
-- MIGRATION 013: Guild AI System
-- Date: December 4, 2025
-- Description: AI participants in guilds that can chat, vote, analyze
-- =====================================================

-- =====================================================
-- GUILD AI MEMBERS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guild_ai_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Quest Bot',
  personality TEXT DEFAULT 'helpful', -- 'helpful', 'motivational', 'analytical', 'funny', 'strict'
  avatar TEXT DEFAULT '🤖',
  speaking_style TEXT DEFAULT 'neutral', -- 'formal', 'casual', 'mirror' (copies group style)
  is_active BOOLEAN DEFAULT true,
  can_vote BOOLEAN DEFAULT true,
  can_suggest_raids BOOLEAN DEFAULT true,
  can_analyze_progress BOOLEAN DEFAULT true,
  speak_frequency TEXT DEFAULT 'sometimes', -- 'rarely', 'sometimes', 'often', 'only_when_called'
  last_message_at TIMESTAMPTZ,
  messages_count INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.guild_ai_members ENABLE ROW LEVEL SECURITY;

-- Guild members can view AI members
CREATE POLICY "Guild members can view AI members"
  ON public.guild_ai_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = guild_ai_members.guild_id
        AND gm.user_id = auth.uid()
    )
  );

-- Guild admins can manage AI members
CREATE POLICY "Guild admins can manage AI members"
  ON public.guild_ai_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = guild_ai_members.guild_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- AI MESSAGE HISTORY IN GUILDS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guild_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  ai_member_id UUID REFERENCES public.guild_ai_members(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'chat', -- 'chat', 'analysis', 'suggestion', 'vote', 'celebration'
  context JSONB, -- Additional context about why the AI spoke
  triggered_by UUID REFERENCES auth.users(id), -- Who triggered the AI (if called)
  in_reply_to UUID, -- Reference to a guild message it's replying to
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.guild_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members can view AI messages"
  ON public.guild_ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = guild_ai_messages.guild_id
        AND gm.user_id = auth.uid()
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_guild_ai_messages_guild 
  ON public.guild_ai_messages(guild_id, created_at DESC);

-- =====================================================
-- AI LEARNING FROM GROUP (Style Mirroring)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guild_ai_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  ai_member_id UUID REFERENCES public.guild_ai_members(id) ON DELETE CASCADE,
  vocabulary JSONB DEFAULT '[]', -- Common phrases/words used in the group
  tone TEXT DEFAULT 'neutral', -- Detected tone
  avg_message_length INTEGER DEFAULT 50,
  emoji_usage JSONB DEFAULT '{}', -- Most used emojis
  topics JSONB DEFAULT '[]', -- Common discussion topics
  last_analyzed_at TIMESTAMPTZ,
  messages_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.guild_ai_learning ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- AI VOTES IN GUILD DECISIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guild_ai_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  ai_member_id UUID NOT NULL REFERENCES public.guild_ai_members(id) ON DELETE CASCADE,
  poll_id UUID, -- Reference to a poll if exists
  vote_type TEXT NOT NULL, -- 'yes', 'no', 'abstain', 'option_1', 'option_2', etc.
  reasoning TEXT, -- AI's reason for voting
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.guild_ai_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members can view AI votes"
  ON public.guild_ai_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = guild_ai_votes.guild_id
        AND gm.user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Add AI member to guild (Premium only)
CREATE OR REPLACE FUNCTION public.add_guild_ai_member(
  p_guild_id UUID,
  p_user_id UUID,
  p_name TEXT DEFAULT 'Quest Bot',
  p_personality TEXT DEFAULT 'helpful',
  p_speaking_style TEXT DEFAULT 'neutral'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_is_admin BOOLEAN;
  v_ai_id UUID;
BEGIN
  -- Check if user is premium
  SELECT is_premium INTO v_is_premium
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF NOT v_is_premium THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Esta función requiere Quest Premium'
    );
  END IF;
  
  -- Check if user is admin/owner
  SELECT EXISTS(
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id 
      AND user_id = p_user_id 
      AND role IN ('owner', 'admin')
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Solo admins pueden añadir IA al grupo'
    );
  END IF;
  
  -- Check if guild already has an AI member
  IF EXISTS(SELECT 1 FROM public.guild_ai_members WHERE guild_id = p_guild_id AND is_active) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Este grupo ya tiene un miembro IA activo'
    );
  END IF;
  
  -- Add AI member
  INSERT INTO public.guild_ai_members (
    guild_id, name, personality, speaking_style, created_by
  ) VALUES (
    p_guild_id, p_name, p_personality, p_speaking_style, p_user_id
  )
  RETURNING id INTO v_ai_id;
  
  -- Initialize learning data
  INSERT INTO public.guild_ai_learning (guild_id, ai_member_id)
  VALUES (p_guild_id, v_ai_id);
  
  -- Send introduction message
  INSERT INTO public.guild_ai_messages (
    guild_id, ai_member_id, message, message_type
  ) VALUES (
    p_guild_id, 
    v_ai_id, 
    '¡Hola! 👋 Soy ' || p_name || ', su nuevo compañero de grupo. Estoy aquí para ayudarles, motivarlos y participar en sus aventuras. ¡Pueden mencionarme cuando necesiten algo!',
    'chat'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'IA añadida al grupo',
    'ai_id', v_ai_id
  );
END;
$$;

-- Update AI personality/settings
CREATE OR REPLACE FUNCTION public.update_guild_ai_settings(
  p_guild_id UUID,
  p_ai_id UUID,
  p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.guild_ai_members
  SET 
    name = COALESCE(p_settings->>'name', name),
    personality = COALESCE(p_settings->>'personality', personality),
    speaking_style = COALESCE(p_settings->>'speaking_style', speaking_style),
    speak_frequency = COALESCE(p_settings->>'speak_frequency', speak_frequency),
    can_vote = COALESCE((p_settings->>'can_vote')::boolean, can_vote),
    can_suggest_raids = COALESCE((p_settings->>'can_suggest_raids')::boolean, can_suggest_raids),
    can_analyze_progress = COALESCE((p_settings->>'can_analyze_progress')::boolean, can_analyze_progress),
    is_active = COALESCE((p_settings->>'is_active')::boolean, is_active),
    updated_at = NOW()
  WHERE id = p_ai_id AND guild_id = p_guild_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Get AI member for guild
CREATE OR REPLACE FUNCTION public.get_guild_ai_member(p_guild_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ai RECORD;
BEGIN
  SELECT * INTO v_ai
  FROM public.guild_ai_members
  WHERE guild_id = p_guild_id AND is_active
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'id', v_ai.id,
    'name', v_ai.name,
    'avatar', v_ai.avatar,
    'personality', v_ai.personality,
    'speaking_style', v_ai.speaking_style,
    'speak_frequency', v_ai.speak_frequency,
    'can_vote', v_ai.can_vote,
    'can_suggest_raids', v_ai.can_suggest_raids,
    'can_analyze_progress', v_ai.can_analyze_progress,
    'messages_count', v_ai.messages_count,
    'last_message_at', v_ai.last_message_at
  );
END;
$$;

-- AI analyzes group progress
CREATE OR REPLACE FUNCTION public.guild_ai_analyze_progress(p_guild_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_analysis JSONB;
  v_members INTEGER;
  v_active_members INTEGER;
  v_avg_level DECIMAL;
  v_raids_completed INTEGER;
BEGIN
  -- Get basic stats
  SELECT COUNT(*), AVG(p.level)
  INTO v_members, v_avg_level
  FROM public.guild_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.guild_id = p_guild_id;
  
  -- Count raids completed
  SELECT COUNT(*) INTO v_raids_completed
  FROM public.raid_participants rp
  JOIN public.raids r ON r.id = rp.raid_id
  WHERE rp.status = 'completed'
    AND r.guild_id = p_guild_id;
  
  v_analysis := jsonb_build_object(
    'total_members', v_members,
    'average_level', ROUND(v_avg_level::numeric, 1),
    'raids_completed', v_raids_completed,
    'analysis_date', NOW()
  );
  
  RETURN v_analysis;
END;
$$;

-- =====================================================
-- AI PERSONALITIES
-- =====================================================
COMMENT ON TABLE public.guild_ai_members IS 
'AI Personalities:
- helpful: Amigable, siempre dispuesto a ayudar
- motivational: Energético, lleno de ánimos y celebraciones
- analytical: Enfocado en datos y progreso
- funny: Bromista, usa memes y humor
- strict: Serio, enfocado en metas y disciplina

Speaking Styles:
- formal: Lenguaje profesional y respetuoso
- casual: Relajado, usa emojis y jerga
- mirror: Copia el estilo del grupo
- neutral: Balanceado

Speak Frequency:
- rarely: Solo cuando es importante
- sometimes: De vez en cuando
- often: Participa activamente
- only_when_called: Solo responde cuando lo mencionan';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 013 completed: Guild AI system created';
END $$;
