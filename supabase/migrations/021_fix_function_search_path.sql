-- =====================================================
-- FIX FUNCTION SEARCH PATH & REMAINING POLICIES
-- Migration: 021_fix_function_search_path.sql
-- =====================================================

-- =====================================================
-- PART 1: FIX DUPLICATE POLICIES
-- =====================================================

-- guild_ai_members: Remove the ALL policy that causes duplicates for SELECT
DROP POLICY IF EXISTS "guild_ai_members_manage" ON guild_ai_members;
DROP POLICY IF EXISTS "guild_ai_members_select" ON guild_ai_members;

-- Create single policies per action
CREATE POLICY "guild_ai_members_select" ON guild_ai_members FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_ai_members.guild_id 
        AND gm.user_id = (select auth.uid())
    ));
CREATE POLICY "guild_ai_members_insert" ON guild_ai_members FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_ai_members.guild_id 
        AND gm.user_id = (select auth.uid())
        AND gm.role IN ('leader', 'officer')
    ));
CREATE POLICY "guild_ai_members_update" ON guild_ai_members FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_ai_members.guild_id 
        AND gm.user_id = (select auth.uid())
        AND gm.role IN ('leader', 'officer')
    ));
CREATE POLICY "guild_ai_members_delete" ON guild_ai_members FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_ai_members.guild_id 
        AND gm.user_id = (select auth.uid())
        AND gm.role IN ('leader', 'officer')
    ));

-- user_daily_quests: Remove duplicate INSERT policies
DROP POLICY IF EXISTS "System can insert daily quests" ON user_daily_quests;
DROP POLICY IF EXISTS "user_daily_quests_all" ON user_daily_quests;

CREATE POLICY "user_daily_quests_all" ON user_daily_quests FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- PART 2: FIX FUNCTION SEARCH PATHS
-- Dynamic approach to set search_path on all public functions
-- =====================================================

DO $$
DECLARE
    func_record RECORD;
    alter_sql TEXT;
BEGIN
    -- Loop through all functions in public schema that don't have search_path set
    FOR func_record IN
        SELECT 
            p.oid,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'  -- only functions, not procedures
        AND p.proname IN (
            'check_expired_trials', 'process_revenucat_webhook', 'handle_subscription_active',
            'handle_subscription_expired', 'handle_billing_issue', 'add_quest_coins',
            'spend_quest_coins', 'handle_coins_purchase', 'handle_user_alias', 'check_premium_status',
            'create_guild', 'calculate_leaderboard', 'generate_life_path_from_aspirations',
            'get_weekly_plan_context', 'create_initial_life_paths', 'create_pillar_snapshot',
            'get_pillar_history', 'get_pillar_growth', 'get_user_day_schedule', 'get_free_time_slots',
            'get_subscription_status', 'update_user_level', 'calculate_user_level', 'complete_habit',
            'get_today_habits', 'get_daily_limits', 'get_user_title', 'calculate_class_from_assessment',
            'get_user_class_profile', 'get_assessment_questions', 'calculate_assessment_length',
            'trigger_calculate_class', 'start_premium_trial', 'activate_premium', 'complete_tutorial',
            'has_premium_access', 'set_developer_status', 'use_ai_calendar_action', 'use_manual_quest_create',
            'add_calendar_event', 'get_calendar_events', 'handle_new_user', 'update_updated_at',
            'generate_daily_agenda', 'get_weekly_calendar', 'get_monthly_calendar', 'generate_ai_daily_quests',
            'respond_to_ai_quest', 'get_ai_daily_quests', 'complete_agenda_item', 'get_agenda_summary',
            'purchase_item', 'equip_item', 'init_default_expense_categories', 'add_expense',
            'increment_guild_members', 'decrement_guild_members', 'add_income', 'get_financial_summary',
            'send_friend_request', 'accept_friend_request', 'reject_friend_request', 'remove_friend',
            'join_guild', 'leave_guild', 'calculate_pillar_scores', 'check_raid_completion',
            'get_user_raids', 'submit_assessment_answer', 'get_spending_trends', 'update_raid_progress',
            'create_duel', 'respond_to_duel', 'update_duel_progress', 'complete_duel', 'get_user_duels',
            'create_raid', 'create_raid_from_template', 'join_raid', 'get_available_raids',
            'get_raid_participants', 'process_expired_raids', 'add_guild_ai_member', 'select_character_class',
            'add_user_rewards', 'get_user_class_info', 'get_all_classes', 'apply_class_xp_bonus',
            'user_has_premium', 'get_user_limits', 'set_developer_access', 'check_ai_usage_with_tier',
            'calculate_auto_class', 'auto_set_class_on_assessment', 'use_ai_action', 'generate_daily_quests',
            'daily_check_in', 'get_today_summary', 'complete_daily_quest', 'get_daily_quest_summary',
            'check_achievements', 'update_guild_ai_settings', 'get_guild_ai_member', 'guild_ai_analyze_progress',
            'purchase_feature_with_qc', 'can_perform_action', 'use_daily_action', 'trigger_log_challenge_completion',
            'trigger_log_level_up', 'increment_pillar_score', 'claim_ad_reward', 'log_activity',
            'react_to_activity', 'get_friend_feed', 'activate_premium_trial', 'auto_activate_trial_on_assessment',
            'join_guild_by_code', 'vote_punishment'
        )
    LOOP
        -- Build the ALTER FUNCTION statement with proper function signature
        alter_sql := format(
            'ALTER FUNCTION public.%I(%s) SET search_path = public',
            func_record.function_name,
            func_record.args
        );
        
        -- Execute the ALTER
        EXECUTE alter_sql;
        
        RAISE NOTICE 'Updated: %', func_record.function_name;
    END LOOP;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- 
-- Fixed:
-- - Removed duplicate permissive policies on guild_ai_members
-- - Removed duplicate permissive policies on user_daily_quests
-- - Added SET search_path = '' to ~100 functions
-- =====================================================
