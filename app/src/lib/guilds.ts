/**
 * Guilds Service
 * Handles guild management, raids, punishments, and leaderboards
 */

import { supabase } from "./supabase";

// =====================================================
// TYPES
// =====================================================

export interface Guild {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  banner_url?: string;
  is_public: boolean;
  max_members: number;
  min_level_required: number;
  invite_code: string;
  total_xp: number;
  total_raids_completed: number;
  current_raid_streak: number;
  leader_id: string;
  created_at: string;
  member_count?: number;
}

export interface GuildMember {
  id: string;
  guild_id: string;
  user_id: string;
  role: "leader" | "officer" | "member";
  xp_contributed: number;
  raids_participated: number;
  raids_completed: number;
  punishments_received: number;
  joined_at: string;
  last_active_at: string;
  // Joined from profiles
  display_name?: string;
  avatar_url?: string;
  level?: number;
}

export interface GuildRaid {
  id: string;
  guild_id: string;
  title: string;
  description?: string;
  raid_type: "challenge" | "competition" | "boss";
  target_type: "quests" | "habits" | "xp" | "streak" | "custom";
  target_value: number;
  current_value: number;
  starts_at: string;
  ends_at: string;
  xp_reward_per_member: number;
  bonus_coins: number;
  status: "pending" | "active" | "completed" | "failed" | "cancelled";
  created_by: string;
  progress_percent?: number;
}

export interface PunishmentProposal {
  id: string;
  guild_id: string;
  target_user_id: string;
  reason_type:
    | "raid_fail"
    | "duel_loss"
    | "bet_loss"
    | "streak_break"
    | "custom";
  reason_description?: string;
  status: "voting" | "decided" | "completed" | "cancelled";
  voting_ends_at: string;
  winning_punishment_id?: string;
  options?: PunishmentOption[];
  target_user?: {
    display_name: string;
    avatar_url?: string;
  };
}

export interface PunishmentOption {
  id: string;
  proposal_id: string;
  title: string;
  description?: string;
  severity: "light" | "medium" | "hard" | "extreme";
  vote_count: number;
  proposed_by: string;
  user_voted?: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  rank: number;
  value: number;
  display_name: string;
  avatar_url?: string;
}

export interface UserTitle {
  id: string;
  name: string;
  name_es: string;
  icon: string;
  color: string;
  min_level: number;
}

// =====================================================
// GUILD MANAGEMENT
// =====================================================

/**
 * Create a new guild
 */
export async function createGuild(
  name: string,
  description?: string,
  isPublic: boolean = true
): Promise<{ success: boolean; guildId?: string; error?: string }> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return { success: false, error: "No autenticado" };

  const { data, error } = await supabase.rpc("create_guild", {
    p_user_id: userId.user.id,
    p_name: name,
    p_description: description,
    p_is_public: isPublic,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, guildId: data };
}

/**
 * Get user's guilds
 */
export async function getMyGuilds(): Promise<Guild[]> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return [];

  const { data, error } = await supabase
    .from("guild_members")
    .select(
      `
      guild_id,
      role,
      guilds (
        id, name, description, avatar_url, banner_url,
        is_public, max_members, invite_code,
        total_xp, total_raids_completed, current_raid_streak,
        leader_id, created_at
      )
    `
    )
    .eq("user_id", userId.user.id);

  if (error || !data) return [];

  return data.map((m: any) => ({
    ...m.guilds,
    my_role: m.role,
  }));
}

/**
 * Get guild details with members
 */
export async function getGuildDetails(guildId: string): Promise<{
  guild: Guild | null;
  members: GuildMember[];
  activeRaid: GuildRaid | null;
}> {
  // Get guild
  const { data: guild } = await supabase
    .from("guilds")
    .select("*")
    .eq("id", guildId)
    .single();

  // Get members with profile info
  const { data: members } = await supabase
    .from("guild_members")
    .select(
      `
      *,
      profiles:user_id (display_name, avatar_url, level)
    `
    )
    .eq("guild_id", guildId)
    .order("xp_contributed", { ascending: false });

  // Get active raid
  const { data: activeRaid } = await supabase
    .from("guild_raids")
    .select("*")
    .eq("guild_id", guildId)
    .eq("status", "active")
    .single();

  return {
    guild: guild || null,
    members: (members || []).map((m: any) => ({
      ...m,
      display_name: m.profiles?.display_name,
      avatar_url: m.profiles?.avatar_url,
      level: m.profiles?.level,
    })),
    activeRaid: activeRaid
      ? {
          ...activeRaid,
          progress_percent: Math.round(
            (activeRaid.current_value / activeRaid.target_value) * 100
          ),
        }
      : null,
  };
}

/**
 * Join guild by invite code
 */
export async function joinGuildByCode(
  inviteCode: string
): Promise<{
  success: boolean;
  guildId?: string;
  guildName?: string;
  error?: string;
}> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return { success: false, error: "No autenticado" };

  const { data, error } = await supabase.rpc("join_guild_by_code", {
    p_user_id: userId.user.id,
    p_invite_code: inviteCode,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: data.success,
    guildId: data.guild_id,
    guildName: data.guild_name,
    error: data.error,
  };
}

/**
 * Leave guild
 */
export async function leaveGuild(guildId: string): Promise<boolean> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return false;

  const { error } = await supabase
    .from("guild_members")
    .delete()
    .eq("guild_id", guildId)
    .eq("user_id", userId.user.id);

  return !error;
}

/**
 * Search public guilds
 */
export async function searchGuilds(query: string): Promise<Guild[]> {
  const { data } = await supabase
    .from("guilds")
    .select("*, member_count:guild_members(count)")
    .eq("is_public", true)
    .ilike("name", `%${query}%`)
    .limit(20);

  return (data || []).map((g: any) => ({
    ...g,
    member_count: g.member_count?.[0]?.count || 0,
  }));
}

// =====================================================
// RAIDS
// =====================================================

/**
 * Create a raid
 */
export async function createRaid(
  guildId: string,
  params: {
    title: string;
    description?: string;
    targetType: GuildRaid["target_type"];
    targetValue: number;
    durationHours: number;
    xpReward?: number;
    bonusCoins?: number;
  }
): Promise<{ success: boolean; raidId?: string; error?: string }> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return { success: false, error: "No autenticado" };

  const endsAt = new Date(Date.now() + params.durationHours * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("guild_raids")
    .insert({
      guild_id: guildId,
      title: params.title,
      description: params.description,
      target_type: params.targetType,
      target_value: params.targetValue,
      ends_at: endsAt.toISOString(),
      duration_hours: params.durationHours,
      xp_reward_per_member: params.xpReward || 100,
      bonus_coins: params.bonusCoins || 0,
      created_by: userId.user.id,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Auto-join all members to raid
  const { data: members } = await supabase
    .from("guild_members")
    .select("user_id")
    .eq("guild_id", guildId);

  if (members && data) {
    await supabase.from("raid_participants").insert(
      members.map((m: any) => ({
        raid_id: data.id,
        user_id: m.user_id,
      }))
    );
  }

  return { success: true, raidId: data?.id };
}

/**
 * Update raid progress
 */
export async function contributeToRaid(
  raidId: string,
  contribution: number
): Promise<{ success: boolean; completed?: boolean; progress?: number }> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return { success: false };

  const { data, error } = await supabase.rpc("update_raid_progress", {
    p_raid_id: raidId,
    p_user_id: userId.user.id,
    p_contribution: contribution,
  });

  if (error) {
    return { success: false };
  }

  return {
    success: data.success,
    completed: data.completed,
    progress: data.progress_percent,
  };
}

/**
 * Get raid history for guild
 */
export async function getRaidHistory(
  guildId: string,
  limit: number = 10
): Promise<GuildRaid[]> {
  const { data } = await supabase
    .from("guild_raids")
    .select("*")
    .eq("guild_id", guildId)
    .in("status", ["completed", "failed"])
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

// =====================================================
// PUNISHMENT VOTING
// =====================================================

/**
 * Create punishment proposal
 */
export async function createPunishmentProposal(
  guildId: string,
  targetUserId: string,
  reasonType: PunishmentProposal["reason_type"],
  reasonDescription?: string
): Promise<{ success: boolean; proposalId?: string }> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return { success: false };

  const { data, error } = await supabase
    .from("punishment_proposals")
    .insert({
      guild_id: guildId,
      target_user_id: targetUserId,
      reason_type: reasonType,
      reason_description: reasonDescription,
      created_by: userId.user.id,
    })
    .select("id")
    .single();

  return { success: !error, proposalId: data?.id };
}

/**
 * Add punishment option
 */
export async function addPunishmentOption(
  proposalId: string,
  title: string,
  description?: string,
  severity: PunishmentOption["severity"] = "medium"
): Promise<boolean> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return false;

  const { error } = await supabase.from("punishment_options").insert({
    proposal_id: proposalId,
    title,
    description,
    severity,
    proposed_by: userId.user.id,
  });

  return !error;
}

/**
 * Vote on punishment
 */
export async function votePunishment(
  proposalId: string,
  optionId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return { success: false, error: "No autenticado" };

  const { data, error } = await supabase.rpc("vote_punishment", {
    p_user_id: userId.user.id,
    p_proposal_id: proposalId,
    p_option_id: optionId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data.success, error: data.error };
}

/**
 * Get active punishment proposals for guild
 */
export async function getActivePunishments(
  guildId: string
): Promise<PunishmentProposal[]> {
  const { data: userId } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("punishment_proposals")
    .select(
      `
      *,
      target_user:target_user_id (display_name, avatar_url),
      punishment_options (*)
    `
    )
    .eq("guild_id", guildId)
    .eq("status", "voting")
    .order("created_at", { ascending: false });

  if (!data) return [];

  // Check if user voted on each option
  const proposalsWithVotes = await Promise.all(
    data.map(async (proposal: any) => {
      if (!userId.user) return proposal;

      const { data: vote } = await supabase
        .from("punishment_votes")
        .select("option_id")
        .eq("proposal_id", proposal.id)
        .eq("user_id", userId.user.id)
        .single();

      return {
        ...proposal,
        options: proposal.punishment_options.map((opt: any) => ({
          ...opt,
          user_voted: vote?.option_id === opt.id,
        })),
      };
    })
  );

  return proposalsWithVotes;
}

// =====================================================
// LEADERBOARDS
// =====================================================

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  type: "xp_total" | "level" | "streak" | "quests_completed",
  scope: "global" | "guild" | "friends" = "global",
  guildId?: string
): Promise<LeaderboardEntry[]> {
  // First try to get cached leaderboard
  const { data: cached } = await supabase
    .from("leaderboards")
    .select("rankings, calculated_at")
    .eq("scope", scope)
    .eq("leaderboard_type", type)
    .eq("guild_id", guildId || null)
    .single();

  // If cached and less than 5 minutes old, use it
  if (cached && cached.rankings) {
    const age = Date.now() - new Date(cached.calculated_at).getTime();
    if (age < 5 * 60 * 1000) {
      return cached.rankings as LeaderboardEntry[];
    }
  }

  // Calculate fresh leaderboard
  await supabase.rpc("calculate_leaderboard", {
    p_scope: scope,
    p_type: type,
    p_guild_id: guildId || null,
  });

  // Fetch updated
  const { data } = await supabase
    .from("leaderboards")
    .select("rankings")
    .eq("scope", scope)
    .eq("leaderboard_type", type)
    .eq("guild_id", guildId || null)
    .single();

  return (data?.rankings as LeaderboardEntry[]) || [];
}

/**
 * Get user's rank in leaderboard
 */
export async function getMyRank(
  type: "xp_total" | "level" | "streak",
  scope: "global" | "guild" = "global",
  guildId?: string
): Promise<{ rank: number; total: number } | null> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return null;

  const leaderboard = await getLeaderboard(type, scope, guildId);
  const myEntry = leaderboard.find((e) => e.user_id === userId.user!.id);

  if (!myEntry) return null;

  return {
    rank: myEntry.rank,
    total: leaderboard.length,
  };
}

// =====================================================
// TITLES
// =====================================================

/**
 * Get user's title based on level
 */
export async function getUserTitle(level: number): Promise<UserTitle | null> {
  const { data } = await supabase.rpc("get_user_title", {
    p_level: level,
  });

  if (!data || data.length === 0) return null;
  return data[0];
}

/**
 * Get all available titles
 */
export async function getAllTitles(): Promise<UserTitle[]> {
  const { data } = await supabase
    .from("user_titles")
    .select("*")
    .order("min_level", { ascending: true });

  return data || [];
}

// =====================================================
// GUILD CHAT
// =====================================================

/**
 * Send message to guild chat
 */
export async function sendGuildMessage(
  guildId: string,
  content: string
): Promise<boolean> {
  const { data: userId } = await supabase.auth.getUser();
  if (!userId.user) return false;

  const { error } = await supabase.from("guild_messages").insert({
    guild_id: guildId,
    user_id: userId.user.id,
    content,
  });

  return !error;
}

/**
 * Get guild messages
 */
export async function getGuildMessages(
  guildId: string,
  limit: number = 50
): Promise<any[]> {
  const { data } = await supabase
    .from("guild_messages")
    .select(
      `
      *,
      user:user_id (display_name, avatar_url)
    `
    )
    .eq("guild_id", guildId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).reverse();
}

/**
 * Subscribe to guild messages (realtime)
 */
export function subscribeToGuildMessages(
  guildId: string,
  onMessage: (message: any) => void
) {
  const channel = supabase
    .channel(`guild-messages-${guildId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "guild_messages",
        filter: `guild_id=eq.${guildId}`,
      },
      (payload) => {
        onMessage(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =====================================================
// EXPORTS
// =====================================================

export const GuildService = {
  // Guild management
  createGuild,
  getMyGuilds,
  getGuildDetails,
  joinGuildByCode,
  leaveGuild,
  searchGuilds,

  // Raids
  createRaid,
  contributeToRaid,
  getRaidHistory,

  // Punishments
  createPunishmentProposal,
  addPunishmentOption,
  votePunishment,
  getActivePunishments,

  // Leaderboards
  getLeaderboard,
  getMyRank,

  // Titles
  getUserTitle,
  getAllTitles,

  // Chat
  sendGuildMessage,
  getGuildMessages,
  subscribeToGuildMessages,
};

export default GuildService;
