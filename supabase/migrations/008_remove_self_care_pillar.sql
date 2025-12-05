-- =====================================================
-- MIGRATION 008: Remove Self-Care Pillar & Consolidate to 6 Pillars
-- Date: December 4, 2025
-- Description: Convert all self_care references to physical
-- =====================================================

-- 1. Update life_paths table
UPDATE public.life_paths
SET pillar_id = 'physical'
WHERE pillar_id = 'self_care';

-- 2. Update habits table
UPDATE public.habits
SET pillar_id = 'physical'
WHERE pillar_id = 'self_care';

-- 3. Update ai_daily_quests table (tiene pillar_id)
UPDATE public.ai_daily_quests
SET pillar_id = 'physical'
WHERE pillar_id = 'self_care';

-- 4. Update weekly_objectives table
UPDATE public.weekly_objectives
SET pillar_id = 'physical'
WHERE pillar_id = 'self_care';

-- 5. Update path_habits table
UPDATE public.path_habits
SET pillar_id = 'physical'
WHERE pillar_id = 'self_care';

-- NOTA: user_daily_quests NO tiene pillar_id directo, 
-- referencia a challenges que sí tiene pillar_id
-- Actualizar challenges en su lugar:
UPDATE public.challenges
SET pillar_id = 'physical'
WHERE pillar_id = 'self_care';

-- 6. Update profiles.selected_pillars (TEXT[] array, NOT JSONB)
-- Replace 'self_care' with 'physical' in the array
UPDATE public.profiles
SET selected_pillars = array_replace(selected_pillars, 'self_care', 'physical')
WHERE 'self_care' = ANY(selected_pillars);

-- Remove duplicates if physical was already in the array
UPDATE public.profiles
SET selected_pillars = (
  SELECT ARRAY(SELECT DISTINCT unnest(selected_pillars))
)
WHERE 'physical' = ANY(selected_pillars);

-- 7. Update profiles.pillar_scores (JSONB object)
-- Merge self_care score into physical
UPDATE public.profiles
SET pillar_scores = (
  pillar_scores 
  - 'self_care' 
  || jsonb_build_object(
    'physical', 
    COALESCE((pillar_scores->>'physical')::numeric, 0) + COALESCE((pillar_scores->>'self_care')::numeric, 0)
  )
)
WHERE pillar_scores ? 'self_care';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 008 completed: self_care merged into physical';
END $$;
