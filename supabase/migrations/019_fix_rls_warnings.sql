-- =====================================================
-- FIX RLS AND SECURITY WARNINGS
-- Migration: 019_fix_rls_warnings.sql
-- =====================================================

-- =====================================================
-- ENABLE RLS ON TABLES MISSING IT
-- =====================================================

-- Tables that need RLS enabled
ALTER TABLE coin_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenucat_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE punishment_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR coin_packages (read-only for all)
-- =====================================================

DROP POLICY IF EXISTS "coin_packages_select" ON coin_packages;
CREATE POLICY "coin_packages_select" ON coin_packages FOR SELECT
    USING (true); -- Everyone can see coin packages

-- =====================================================
-- RLS POLICIES FOR revenucat_events (admin only, service role)
-- =====================================================

DROP POLICY IF EXISTS "revenucat_events_service_only" ON revenucat_events;
-- No policy = only service role can access (via Edge Function)

-- =====================================================
-- RLS POLICIES FOR user_subscriptions
-- =====================================================

DROP POLICY IF EXISTS "user_subscriptions_select" ON user_subscriptions;
CREATE POLICY "user_subscriptions_select" ON user_subscriptions FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_subscriptions_insert" ON user_subscriptions;
CREATE POLICY "user_subscriptions_insert" ON user_subscriptions FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_subscriptions_update" ON user_subscriptions;
CREATE POLICY "user_subscriptions_update" ON user_subscriptions FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES FOR coin_purchases
-- =====================================================

DROP POLICY IF EXISTS "coin_purchases_select" ON coin_purchases;
CREATE POLICY "coin_purchases_select" ON coin_purchases FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "coin_purchases_insert" ON coin_purchases;
CREATE POLICY "coin_purchases_insert" ON coin_purchases FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES FOR preset_habits (read-only for all)
-- =====================================================

DROP POLICY IF EXISTS "preset_habits_select" ON preset_habits;
CREATE POLICY "preset_habits_select" ON preset_habits FOR SELECT
    USING (true); -- Everyone can see preset habits

-- =====================================================
-- RLS POLICIES FOR guild_invites
-- =====================================================

DROP POLICY IF EXISTS "guild_invites_select" ON guild_invites;
CREATE POLICY "guild_invites_select" ON guild_invites FOR SELECT
    USING (
        invited_user_id = auth.uid() 
        OR invited_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM guild_members gm 
            WHERE gm.guild_id = guild_invites.guild_id 
            AND gm.user_id = auth.uid() 
            AND gm.role IN ('leader', 'officer')
        )
    );

DROP POLICY IF EXISTS "guild_invites_insert" ON guild_invites;
CREATE POLICY "guild_invites_insert" ON guild_invites FOR INSERT
    WITH CHECK (invited_by = auth.uid());

DROP POLICY IF EXISTS "guild_invites_update" ON guild_invites;
CREATE POLICY "guild_invites_update" ON guild_invites FOR UPDATE
    USING (invited_user_id = auth.uid() OR invited_by = auth.uid());

-- =====================================================
-- RLS POLICIES FOR punishment_options
-- =====================================================

DROP POLICY IF EXISTS "punishment_options_select" ON punishment_options;
CREATE POLICY "punishment_options_select" ON punishment_options FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM punishment_proposals pp
            JOIN guild_members gm ON gm.guild_id = pp.guild_id
            WHERE pp.id = punishment_options.proposal_id
            AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "punishment_options_insert" ON punishment_options;
CREATE POLICY "punishment_options_insert" ON punishment_options FOR INSERT
    WITH CHECK (proposed_by = auth.uid());

-- =====================================================
-- RLS POLICIES FOR leaderboards (read-only for all)
-- =====================================================

DROP POLICY IF EXISTS "leaderboards_select" ON leaderboards;
CREATE POLICY "leaderboards_select" ON leaderboards FOR SELECT
    USING (
        scope = 'global' 
        OR (scope = 'guild' AND EXISTS (
            SELECT 1 FROM guild_members gm 
            WHERE gm.guild_id = leaderboards.guild_id 
            AND gm.user_id = auth.uid()
        ))
        OR scope = 'friends'
    );

-- =====================================================
-- RLS POLICIES FOR user_titles (read-only for all)
-- =====================================================

DROP POLICY IF EXISTS "user_titles_select" ON user_titles;
CREATE POLICY "user_titles_select" ON user_titles FOR SELECT
    USING (true); -- Everyone can see titles

-- =====================================================
-- FIX SECURITY DEFINER VIEWS
-- Must explicitly set SECURITY INVOKER
-- =====================================================

-- Drop and recreate user_subscription_status view with SECURITY INVOKER
DROP VIEW IF EXISTS user_subscription_status;
CREATE VIEW user_subscription_status 
WITH (security_invoker = true)
AS
SELECT 
    p.id as user_id,
    p.subscription_tier,
    p.subscription_expires_at,
    p.trial_used,
    CASE 
        WHEN p.is_developer THEN true
        WHEN p.subscription_tier IN ('premium_monthly', 'premium_yearly', 'premium_lifetime') 
             AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > NOW()) THEN true
        ELSE false
    END as has_premium
FROM profiles p;

-- Drop and recreate leaderboard_global view with SECURITY INVOKER
DROP VIEW IF EXISTS leaderboard_global;
CREATE VIEW leaderboard_global 
WITH (security_invoker = true)
AS
SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.level,
    p.total_xp,
    p.current_streak,
    ROW_NUMBER() OVER (ORDER BY p.total_xp DESC) as rank
FROM profiles p
WHERE p.level > 0
ORDER BY p.total_xp DESC
LIMIT 100;

-- =====================================================
-- SUMMARY
-- =====================================================
-- 
-- Fixed RLS on:
-- - coin_packages (public read)
-- - revenucat_events (service role only)
-- - user_subscriptions (user owns)
-- - coin_purchases (user owns)
-- - preset_habits (public read)
-- - guild_invites (involved users)
-- - punishment_options (guild members)
-- - leaderboards (public/guild members)
-- - user_titles (public read)
--
-- Fixed SECURITY DEFINER views:
-- - user_subscription_status
-- - leaderboard_global
-- =====================================================
