/**
 * GitHub Integration
 *
 * OAuth flow, track commits/PRs/issues, create dev-specific quests
 *
 * Use cases:
 * - Track daily commits (habit: "Code for 1 hour")
 * - Create quests: "Submit a PR today", "Review 2 pull requests"
 * - Monitor contribution streaks
 * - Gamify open source contributions
 */

import { supabase } from "../supabase";

// GitHub OAuth config (store in env)
const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.EXPO_PUBLIC_GITHUB_CLIENT_SECRET || "";
const REDIRECT_URI = "quest://github-callback"; // Deep link

export interface GitHubTokens {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  repo: string;
}

export interface GitHubPullRequest {
  id: number;
  title: string;
  state: "open" | "closed" | "merged";
  created_at: string;
  merged_at?: string;
  repo: string;
}

export interface GitHubActivity {
  commits_today: number;
  prs_opened_today: number;
  prs_merged_today: number;
  issues_opened_today: number;
  issues_closed_today: number;
  total_contributions_today: number;
}

/**
 * Generate GitHub OAuth URL
 */
export const getGitHubAuthUrl = (): string => {
  const scopes = ["repo", "read:user", "read:org"].join(" ");

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: scopes,
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for token
 */
export const exchangeGitHubCode = async (
  code: string
): Promise<GitHubTokens> => {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange GitHub code");
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error_description || "GitHub auth failed");
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type,
    scope: data.scope,
  };
};

/**
 * Get user's GitHub username
 */
export const getGitHubUser = async (accessToken: string): Promise<string> => {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub user");
  }

  const data = await response.json();
  return data.login;
};

/**
 * Get commits from last 24 hours
 */
export const getRecentCommits = async (
  accessToken: string,
  username: string,
  since?: Date
): Promise<GitHubCommit[]> => {
  const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get user's events (includes commits)
  const response = await fetch(
    `https://api.github.com/users/${username}/events?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub events");
  }

  const events = await response.json();
  const commits: GitHubCommit[] = [];

  events.forEach((event: any) => {
    if (event.type === "PushEvent") {
      const eventDate = new Date(event.created_at);
      if (eventDate >= sinceDate) {
        event.payload.commits.forEach((commit: any) => {
          commits.push({
            sha: commit.sha,
            message: commit.message,
            author: commit.author.name,
            date: event.created_at,
            repo: event.repo.name,
          });
        });
      }
    }
  });

  return commits;
};

/**
 * Get pull requests from last 24 hours
 */
export const getRecentPullRequests = async (
  accessToken: string,
  username: string,
  since?: Date
): Promise<GitHubPullRequest[]> => {
  const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000);

  const response = await fetch(
    `https://api.github.com/search/issues?q=author:${username}+type:pr+created:>${
      sinceDate.toISOString().split("T")[0]
    }`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub pull requests");
  }

  const data = await response.json();

  return data.items.map((pr: any) => ({
    id: pr.id,
    title: pr.title,
    state: pr.state,
    created_at: pr.created_at,
    merged_at: pr.pull_request?.merged_at,
    repo: pr.repository_url.split("/").slice(-2).join("/"),
  }));
};

/**
 * Save GitHub tokens to database
 */
export const saveGitHubTokens = async (
  userId: string,
  tokens: GitHubTokens,
  username: string
): Promise<void> => {
  await supabase.from("user_integrations").upsert({
    user_id: userId,
    integration_type: "github",
    access_token: tokens.access_token,
    is_active: true,
    metadata: {
      username,
      scope: tokens.scope,
    },
  });
};

/**
 * Get GitHub tokens from database
 */
export const getGitHubTokens = async (
  userId: string
): Promise<{
  access_token: string;
  username: string;
} | null> => {
  const { data } = await supabase
    .from("user_integrations")
    .select("access_token, metadata")
    .eq("user_id", userId)
    .eq("integration_type", "github")
    .eq("is_active", true)
    .single();

  if (!data) return null;

  return {
    access_token: data.access_token,
    username: data.metadata?.username,
  };
};

/**
 * Sync GitHub activity
 * - Import commits from last 24 hours
 * - Track PRs opened/merged
 * - Auto-complete coding habits
 * - Create contribution insights
 */
export const syncGitHubActivity = async (userId: string): Promise<number> => {
  const tokens = await getGitHubTokens(userId);
  if (!tokens) {
    throw new Error("No GitHub token found");
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Fetch commits and PRs
  const [commits, pullRequests] = await Promise.all([
    getRecentCommits(tokens.access_token, tokens.username, yesterday),
    getRecentPullRequests(tokens.access_token, tokens.username, yesterday),
  ]);

  let synced = 0;

  // Save daily activity summary
  if (commits.length > 0 || pullRequests.length > 0) {
    await supabase.from("user_activity_imports").insert({
      user_id: userId,
      source: "github",
      external_id: `github-${new Date().toISOString().split("T")[0]}`,
      activity_type: "coding",
      date: new Date().toISOString(),
      metadata: {
        commits_count: commits.length,
        prs_opened: pullRequests.filter((pr) => pr.state === "open").length,
        prs_merged: pullRequests.filter((pr) => pr.merged_at).length,
        repos: [...new Set(commits.map((c) => c.repo))],
        top_commit_messages: commits.slice(0, 5).map((c) => c.message),
      },
    });

    synced++;
  }

  // Auto-complete coding habits
  const { data: codingHabits } = await supabase
    .from("user_habits")
    .select("id, name")
    .eq("user_id", userId)
    .eq("is_active", true)
    .or(
      "name.ilike.%code%,name.ilike.%program%,name.ilike.%commit%,name.ilike.%dev%"
    );

  if (codingHabits && codingHabits.length > 0 && commits.length >= 1) {
    const today = new Date().toISOString().split("T")[0];

    for (const habit of codingHabits) {
      await supabase.from("user_habit_completions").upsert({
        user_id: userId,
        habit_id: habit.id,
        completion_date: today,
        notes: `Auto-synced from GitHub: ${commits.length} commits today`,
      });
    }
  }

  return synced;
};

/**
 * Get today's GitHub activity summary
 */
export const getTodayGitHubActivity = async (
  userId: string
): Promise<GitHubActivity | null> => {
  const tokens = await getGitHubTokens(userId);
  if (!tokens) return null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [commits, pullRequests] = await Promise.all([
    getRecentCommits(tokens.access_token, tokens.username, startOfDay),
    getRecentPullRequests(tokens.access_token, tokens.username, startOfDay),
  ]);

  const prsOpened = pullRequests.filter((pr) => pr.state === "open").length;
  const prsMerged = pullRequests.filter((pr) => pr.merged_at).length;

  return {
    commits_today: commits.length,
    prs_opened_today: prsOpened,
    prs_merged_today: prsMerged,
    issues_opened_today: 0, // TODO
    issues_closed_today: 0, // TODO
    total_contributions_today: commits.length + prsOpened + prsMerged,
  };
};

/**
 * Disconnect GitHub
 */
export const disconnectGitHub = async (userId: string): Promise<void> => {
  await supabase
    .from("user_integrations")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("integration_type", "github");
};
