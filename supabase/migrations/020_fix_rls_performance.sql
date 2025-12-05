-- =====================================================
-- FIX RLS PERFORMANCE WARNINGS
-- Migration: 020_fix_rls_performance.sql
-- 
-- Fixes:
-- 1. auth_rls_initplan: Replace auth.uid() with (select auth.uid())
-- 2. multiple_permissive_policies: Remove duplicate policies
-- 3. security_definer_view: Add SECURITY INVOKER to views
-- =====================================================

-- =====================================================
-- PART 1: FIX SECURITY DEFINER VIEWS
-- =====================================================

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
-- PART 2: REMOVE DUPLICATE POLICIES
-- =====================================================

-- activity_reactions: Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Users can manage own reactions" ON activity_reactions;
DROP POLICY IF EXISTS "Users can view all reactions" ON activity_reactions;
CREATE POLICY "activity_reactions_all" ON activity_reactions FOR ALL
    USING (user_id = (select auth.uid()) OR true)
    WITH CHECK (user_id = (select auth.uid()));

-- guild_ai_members: Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Guild admins can manage AI members" ON guild_ai_members;
DROP POLICY IF EXISTS "Guild members can view AI members" ON guild_ai_members;
CREATE POLICY "guild_ai_members_select" ON guild_ai_members FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_ai_members.guild_id 
        AND gm.user_id = (select auth.uid())
    ));
CREATE POLICY "guild_ai_members_manage" ON guild_ai_members FOR ALL
    USING (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_ai_members.guild_id 
        AND gm.user_id = (select auth.uid())
        AND gm.role IN ('leader', 'officer')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_ai_members.guild_id 
        AND gm.user_id = (select auth.uid())
        AND gm.role IN ('leader', 'officer')
    ));

-- guild_members: Remove duplicate policies
DROP POLICY IF EXISTS "Users can join guilds" ON guild_members;
DROP POLICY IF EXISTS "guild_members_insert" ON guild_members;
DROP POLICY IF EXISTS "Members can view guild members" ON guild_members;
DROP POLICY IF EXISTS "guild_members_select" ON guild_members;
DROP POLICY IF EXISTS "Users can leave guilds" ON guild_members;

CREATE POLICY "guild_members_view" ON guild_members FOR SELECT USING (true);
CREATE POLICY "guild_members_join" ON guild_members FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "guild_members_leave" ON guild_members FOR DELETE
    USING (user_id = (select auth.uid()));

-- guilds: Remove duplicate policies
DROP POLICY IF EXISTS "Authenticated users can create guilds" ON guilds;
DROP POLICY IF EXISTS "Users can create guilds" ON guilds;
DROP POLICY IF EXISTS "guilds_insert" ON guilds;
DROP POLICY IF EXISTS "Anyone can view public guilds" ON guilds;
DROP POLICY IF EXISTS "guilds_select" ON guilds;
DROP POLICY IF EXISTS "Guild owners can update" ON guilds;
DROP POLICY IF EXISTS "guilds_update" ON guilds;

CREATE POLICY "guilds_view" ON guilds FOR SELECT
    USING (is_public = true OR owner_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM guild_members gm WHERE gm.guild_id = guilds.id AND gm.user_id = (select auth.uid())
    ));
CREATE POLICY "guilds_create" ON guilds FOR INSERT
    WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "guilds_modify" ON guilds FOR UPDATE
    USING (owner_id = (select auth.uid()));

-- habits: Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Users can manage own habits" ON habits;
DROP POLICY IF EXISTS "Users can view own habits" ON habits;
CREATE POLICY "habits_all" ON habits FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- preset_habits: Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Anyone can view preset habits" ON preset_habits;
DROP POLICY IF EXISTS "preset_habits_select" ON preset_habits;
CREATE POLICY "preset_habits_view" ON preset_habits FOR SELECT USING (true);

-- user_class_affinities: Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Users can manage own affinities" ON user_class_affinities;
DROP POLICY IF EXISTS "Users can view own affinities" ON user_class_affinities;
CREATE POLICY "user_class_affinities_all" ON user_class_affinities FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- user_pillar_focus: Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Users can manage own pillar focus" ON user_pillar_focus;
DROP POLICY IF EXISTS "Users can view own pillar focus" ON user_pillar_focus;
CREATE POLICY "user_pillar_focus_all" ON user_pillar_focus FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- PART 3: FIX auth_rls_initplan WARNINGS
-- Replace auth.uid() with (select auth.uid())
-- =====================================================

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = (select auth.uid()) OR true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = (select auth.uid()));
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = (select auth.uid()));

-- user_pillars
DROP POLICY IF EXISTS "Users can manage own pillars" ON user_pillars;
CREATE POLICY "user_pillars_all" ON user_pillars FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- user_challenges
DROP POLICY IF EXISTS "Users can manage own challenges" ON user_challenges;
CREATE POLICY "user_challenges_all" ON user_challenges FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- user_achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;
CREATE POLICY "user_achievements_select" ON user_achievements FOR SELECT
    USING (user_id = (select auth.uid()));
CREATE POLICY "user_achievements_insert" ON user_achievements FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

-- daily_quest_pool
DROP POLICY IF EXISTS "Users can view own daily quests" ON daily_quest_pool;
DROP POLICY IF EXISTS "Users can insert own daily quests" ON daily_quest_pool;
DROP POLICY IF EXISTS "Users can update own daily quests" ON daily_quest_pool;
CREATE POLICY "daily_quest_pool_all" ON daily_quest_pool FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- user_inventory
DROP POLICY IF EXISTS "Users can view own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can insert own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON user_inventory;
CREATE POLICY "user_inventory_all" ON user_inventory FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- user_purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON user_purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON user_purchases;
CREATE POLICY "user_purchases_select" ON user_purchases FOR SELECT
    USING (user_id = (select auth.uid()));
CREATE POLICY "user_purchases_insert" ON user_purchases FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

-- friend_requests
DROP POLICY IF EXISTS "Users can view own friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update own friend requests" ON friend_requests;
CREATE POLICY "friend_requests_select" ON friend_requests FOR SELECT
    USING (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()));
CREATE POLICY "friend_requests_insert" ON friend_requests FOR INSERT
    WITH CHECK (sender_id = (select auth.uid()));
CREATE POLICY "friend_requests_update" ON friend_requests FOR UPDATE
    USING (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

-- friends
DROP POLICY IF EXISTS "Users can view own friends" ON friends;
DROP POLICY IF EXISTS "Users can insert friends" ON friends;
DROP POLICY IF EXISTS "Users can delete friends" ON friends;
CREATE POLICY "friends_select" ON friends FOR SELECT
    USING (user_id = (select auth.uid()) OR friend_id = (select auth.uid()));
CREATE POLICY "friends_insert" ON friends FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "friends_delete" ON friends FOR DELETE
    USING (user_id = (select auth.uid()) OR friend_id = (select auth.uid()));

-- guild_challenges
DROP POLICY IF EXISTS "Guild members can view challenges" ON guild_challenges;
CREATE POLICY "guild_challenges_select" ON guild_challenges FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_challenges.guild_id 
        AND gm.user_id = (select auth.uid())
    ));

-- user_assessment_answers
DROP POLICY IF EXISTS "Users can view own answers" ON user_assessment_answers;
DROP POLICY IF EXISTS "Users can insert own answers" ON user_assessment_answers;
DROP POLICY IF EXISTS "Users can update own answers" ON user_assessment_answers;
CREATE POLICY "user_assessment_answers_all" ON user_assessment_answers FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- challenge_duels
DROP POLICY IF EXISTS "Users can view own duels" ON challenge_duels;
DROP POLICY IF EXISTS "Users can create duels" ON challenge_duels;
DROP POLICY IF EXISTS "Participants can update duels" ON challenge_duels;
CREATE POLICY "challenge_duels_select" ON challenge_duels FOR SELECT
    USING (challenger_id = (select auth.uid()) OR opponent_id = (select auth.uid()));
CREATE POLICY "challenge_duels_insert" ON challenge_duels FOR INSERT
    WITH CHECK (challenger_id = (select auth.uid()));
CREATE POLICY "challenge_duels_update" ON challenge_duels FOR UPDATE
    USING (challenger_id = (select auth.uid()) OR opponent_id = (select auth.uid()));

-- group_challenges
DROP POLICY IF EXISTS "Users can create group challenges" ON group_challenges;
CREATE POLICY "group_challenges_insert" ON group_challenges FOR INSERT
    WITH CHECK (creator_id = (select auth.uid()));

-- raids
DROP POLICY IF EXISTS "Users can view raids they participate in" ON raids;
DROP POLICY IF EXISTS "Users can create raids" ON raids;
CREATE POLICY "raids_select" ON raids FOR SELECT
    USING (creator_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM raid_participants rp 
        WHERE rp.raid_id = raids.id 
        AND rp.user_id = (select auth.uid())
    ));
CREATE POLICY "raids_insert" ON raids FOR INSERT
    WITH CHECK (creator_id = (select auth.uid()));

-- activity_feed
DROP POLICY IF EXISTS "Users can insert own activities" ON activity_feed;
DROP POLICY IF EXISTS "Users can view public activities" ON activity_feed;
CREATE POLICY "activity_feed_select" ON activity_feed FOR SELECT
    USING (user_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM friends f 
        WHERE (f.user_id = (select auth.uid()) AND f.friend_id = activity_feed.user_id)
        OR (f.friend_id = (select auth.uid()) AND f.user_id = activity_feed.user_id)
    ));
CREATE POLICY "activity_feed_insert" ON activity_feed FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

-- raid_participants
DROP POLICY IF EXISTS "Users can view raid participants" ON raid_participants;
DROP POLICY IF EXISTS "Users can join raids" ON raid_participants;
DROP POLICY IF EXISTS "Users can update their own progress" ON raid_participants;
CREATE POLICY "raid_participants_select" ON raid_participants FOR SELECT
    USING (user_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM raids r WHERE r.id = raid_participants.raid_id AND r.creator_id = (select auth.uid())
    ));
CREATE POLICY "raid_participants_insert" ON raid_participants FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "raid_participants_update" ON raid_participants FOR UPDATE
    USING (user_id = (select auth.uid()));

-- user_daily_quests
DROP POLICY IF EXISTS "Users can view own daily quests" ON user_daily_quests;
DROP POLICY IF EXISTS "Users can update own daily quests" ON user_daily_quests;
CREATE POLICY "user_daily_quests_all" ON user_daily_quests FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- habit_logs
DROP POLICY IF EXISTS "Users can view own habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Users can insert own habit logs" ON habit_logs;
CREATE POLICY "habit_logs_select" ON habit_logs FOR SELECT
    USING (user_id = (select auth.uid()));
CREATE POLICY "habit_logs_insert" ON habit_logs FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

-- calendar_events
DROP POLICY IF EXISTS "Users manage own calendar events" ON calendar_events;
CREATE POLICY "calendar_events_all" ON calendar_events FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- daily_agenda_items
DROP POLICY IF EXISTS "Users manage own agenda" ON daily_agenda_items;
CREATE POLICY "daily_agenda_items_all" ON daily_agenda_items FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- ai_daily_quests
DROP POLICY IF EXISTS "Users manage own ai quests" ON ai_daily_quests;
CREATE POLICY "ai_daily_quests_all" ON ai_daily_quests FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- ia_usage_tracking
DROP POLICY IF EXISTS "Users can view own usage" ON ia_usage_tracking;
DROP POLICY IF EXISTS "Users can insert own usage" ON ia_usage_tracking;
CREATE POLICY "ia_usage_tracking_all" ON ia_usage_tracking FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- payment_history
DROP POLICY IF EXISTS "Users can view own payments" ON payment_history;
CREATE POLICY "payment_history_select" ON payment_history FOR SELECT
    USING (user_id = (select auth.uid()));

-- user_aspirational_answers
DROP POLICY IF EXISTS "Users can manage own aspirational answers" ON user_aspirational_answers;
CREATE POLICY "user_aspirational_answers_all" ON user_aspirational_answers FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- life_paths
DROP POLICY IF EXISTS "Users can manage own life paths" ON life_paths;
CREATE POLICY "life_paths_all" ON life_paths FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- path_milestones
DROP POLICY IF EXISTS "Users can manage own milestones" ON path_milestones;
CREATE POLICY "path_milestones_all" ON path_milestones FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- weekly_plans
DROP POLICY IF EXISTS "Users can manage own weekly plans" ON weekly_plans;
CREATE POLICY "weekly_plans_all" ON weekly_plans FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- weekly_objectives
DROP POLICY IF EXISTS "Users can manage own objectives" ON weekly_objectives;
CREATE POLICY "weekly_objectives_all" ON weekly_objectives FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- path_habits
DROP POLICY IF EXISTS "Users can manage own path habits" ON path_habits;
CREATE POLICY "path_habits_all" ON path_habits FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- agenda_events
DROP POLICY IF EXISTS "Users can manage own agenda events" ON agenda_events;
CREATE POLICY "agenda_events_all" ON agenda_events FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- user_schedules
DROP POLICY IF EXISTS "Users can manage own schedules" ON user_schedules;
CREATE POLICY "user_schedules_all" ON user_schedules FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- ai_conversations
DROP POLICY IF EXISTS "Users can access own AI conversations" ON ai_conversations;
CREATE POLICY "ai_conversations_all" ON ai_conversations FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- achievement_logs
DROP POLICY IF EXISTS "Users can manage own achievement logs" ON achievement_logs;
CREATE POLICY "achievement_logs_all" ON achievement_logs FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- chat_history
DROP POLICY IF EXISTS "Users can view their own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON chat_history;
CREATE POLICY "chat_history_all" ON chat_history FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- pillar_level_snapshots
DROP POLICY IF EXISTS "Users can view own snapshots" ON pillar_level_snapshots;
DROP POLICY IF EXISTS "Users can insert own snapshots" ON pillar_level_snapshots;
DROP POLICY IF EXISTS "Users can delete own snapshots" ON pillar_level_snapshots;
CREATE POLICY "pillar_level_snapshots_all" ON pillar_level_snapshots FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- subscription_history
DROP POLICY IF EXISTS "Users can view own subscription history" ON subscription_history;
CREATE POLICY "subscription_history_select" ON subscription_history FOR SELECT
    USING (user_id = (select auth.uid()));

-- expense_categories
DROP POLICY IF EXISTS "Users can manage own categories" ON expense_categories;
CREATE POLICY "expense_categories_all" ON expense_categories FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- financial_transactions
DROP POLICY IF EXISTS "Users can manage own transactions" ON financial_transactions;
CREATE POLICY "financial_transactions_all" ON financial_transactions FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- budget_goals
DROP POLICY IF EXISTS "Users can manage own goals" ON budget_goals;
CREATE POLICY "budget_goals_all" ON budget_goals FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- monthly_budgets
DROP POLICY IF EXISTS "Users can manage own budgets" ON monthly_budgets;
CREATE POLICY "monthly_budgets_all" ON monthly_budgets FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- financial_insights
DROP POLICY IF EXISTS "Users can view own insights" ON financial_insights;
CREATE POLICY "financial_insights_select" ON financial_insights FOR SELECT
    USING (user_id = (select auth.uid()));

-- user_daily_limits
DROP POLICY IF EXISTS "Users can view their own limits" ON user_daily_limits;
DROP POLICY IF EXISTS "Users can update their own limits" ON user_daily_limits;
DROP POLICY IF EXISTS "Users can insert their own limits" ON user_daily_limits;
CREATE POLICY "user_daily_limits_all" ON user_daily_limits FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- guild_ai_messages
DROP POLICY IF EXISTS "Guild members can view AI messages" ON guild_ai_messages;
CREATE POLICY "guild_ai_messages_select" ON guild_ai_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_ai_messages.guild_id 
        AND gm.user_id = (select auth.uid())
    ));

-- guild_ai_votes
DROP POLICY IF EXISTS "Guild members can view AI votes" ON guild_ai_votes;
CREATE POLICY "guild_ai_votes_select" ON guild_ai_votes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_ai_votes.guild_id 
        AND gm.user_id = (select auth.uid())
    ));

-- purchase_history
DROP POLICY IF EXISTS "Users can view their own purchases" ON purchase_history;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON purchase_history;
CREATE POLICY "purchase_history_select" ON purchase_history FOR SELECT
    USING (user_id = (select auth.uid()));
CREATE POLICY "purchase_history_insert" ON purchase_history FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

-- qc_transactions
DROP POLICY IF EXISTS "Users can view their own QC transactions" ON qc_transactions;
CREATE POLICY "qc_transactions_select" ON qc_transactions FOR SELECT
    USING (user_id = (select auth.uid()));

-- user_purchased_features
DROP POLICY IF EXISTS "Users can view their purchased features" ON user_purchased_features;
CREATE POLICY "user_purchased_features_select" ON user_purchased_features FOR SELECT
    USING (user_id = (select auth.uid()));

-- user_ad_history
DROP POLICY IF EXISTS "Users can view their ad history" ON user_ad_history;
DROP POLICY IF EXISTS "Users can insert ad history" ON user_ad_history;
CREATE POLICY "user_ad_history_all" ON user_ad_history FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- referrals
DROP POLICY IF EXISTS "Users can view referrals they're part of" ON referrals;
CREATE POLICY "referrals_select" ON referrals FOR SELECT
    USING (referrer_id = (select auth.uid()) OR referred_id = (select auth.uid()));

-- guild_messages
DROP POLICY IF EXISTS "guild_messages_select" ON guild_messages;
DROP POLICY IF EXISTS "guild_messages_insert" ON guild_messages;
CREATE POLICY "guild_messages_view" ON guild_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_messages.guild_id 
        AND gm.user_id = (select auth.uid())
    ));
CREATE POLICY "guild_messages_create" ON guild_messages FOR INSERT
    WITH CHECK (user_id = (select auth.uid()) AND EXISTS (
        SELECT 1 FROM guild_members gm 
        WHERE gm.guild_id = guild_messages.guild_id 
        AND gm.user_id = (select auth.uid())
    ));

-- user_subscriptions (fix from 019)
DROP POLICY IF EXISTS "user_subscriptions_select" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_insert" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update" ON user_subscriptions;
CREATE POLICY "user_subscriptions_all" ON user_subscriptions FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- coin_purchases (fix from 019)
DROP POLICY IF EXISTS "coin_purchases_select" ON coin_purchases;
DROP POLICY IF EXISTS "coin_purchases_insert" ON coin_purchases;
CREATE POLICY "coin_purchases_all" ON coin_purchases FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- guild_invites (fix from 019)
DROP POLICY IF EXISTS "guild_invites_select" ON guild_invites;
DROP POLICY IF EXISTS "guild_invites_insert" ON guild_invites;
DROP POLICY IF EXISTS "guild_invites_update" ON guild_invites;
CREATE POLICY "guild_invites_view" ON guild_invites FOR SELECT
    USING (
        invited_user_id = (select auth.uid()) 
        OR invited_by = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM guild_members gm 
            WHERE gm.guild_id = guild_invites.guild_id 
            AND gm.user_id = (select auth.uid()) 
            AND gm.role IN ('leader', 'officer')
        )
    );
CREATE POLICY "guild_invites_create" ON guild_invites FOR INSERT
    WITH CHECK (invited_by = (select auth.uid()));
CREATE POLICY "guild_invites_modify" ON guild_invites FOR UPDATE
    USING (invited_user_id = (select auth.uid()) OR invited_by = (select auth.uid()));

-- punishment_options (fix from 019)
DROP POLICY IF EXISTS "punishment_options_select" ON punishment_options;
DROP POLICY IF EXISTS "punishment_options_insert" ON punishment_options;
CREATE POLICY "punishment_options_view" ON punishment_options FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM punishment_proposals pp
            JOIN guild_members gm ON gm.guild_id = pp.guild_id
            WHERE pp.id = punishment_options.proposal_id
            AND gm.user_id = (select auth.uid())
        )
    );
CREATE POLICY "punishment_options_create" ON punishment_options FOR INSERT
    WITH CHECK (proposed_by = (select auth.uid()));

-- leaderboards (fix from 019)
DROP POLICY IF EXISTS "leaderboards_select" ON leaderboards;
CREATE POLICY "leaderboards_view" ON leaderboards FOR SELECT
    USING (
        scope = 'global' 
        OR (scope = 'guild' AND EXISTS (
            SELECT 1 FROM guild_members gm 
            WHERE gm.guild_id = leaderboards.guild_id 
            AND gm.user_id = (select auth.uid())
        ))
        OR scope = 'friends'
    );

-- =====================================================
-- SUMMARY
-- =====================================================
-- 
-- Fixed ~100+ RLS policy warnings:
-- - Replaced all auth.uid() with (select auth.uid()) for performance
-- - Removed duplicate permissive policies
-- - Added SECURITY INVOKER to views
-- =====================================================
