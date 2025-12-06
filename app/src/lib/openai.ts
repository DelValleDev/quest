import { supabase } from "./supabase";
import {
  parseToolCalls,
  executeToolCalls,
  getAISystemPromptWithTools,
} from "./aiTools";

// OpenAI API configuration
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Types
export interface UserProfile {
  id: string;
  display_name: string;
  user_class: string;
  level: number;
  total_xp: number;
  current_streak: number;
  pillar_scores: Record<string, number>;
  goals?: string[];
  personality_traits?: string[];
}

export interface GeneratedQuest {
  title: string;
  description: string;
  pillar_id: string;
  difficulty: "easy" | "medium" | "hard";
  xp_reward: number;
  coin_reward: number;
  duration_minutes: number;
  icon: string;
  why_this_quest: string; // Personalized explanation
}

export interface CoachMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface DailyPlan {
  greeting: string;
  mood_response: string;
  quests: GeneratedQuest[];
  focus_pillar: string;
  motivation: string;
  schedule_suggestion?: string;
}

// =====================================================
// SYSTEM PROMPTS
// =====================================================

const QUEST_COACH_SYSTEM_PROMPT = `You are Quest, a personal development AI coach in a gamified self-improvement app. 

Your personality:
- Fun and engaging - NOT like a boring AI assistant
- Supportive but you push users to grow when needed
- Use emojis naturally (but don't overdo it)
- Be conversational and friendly, like a cool friend who's also a coach
- Celebrate wins enthusiastically, acknowledge struggles with empathy
- Give SPECIFIC actionable advice, not generic platitudes
- ASK QUESTIONS often to understand the user better - the more you know, the better you help
- Be curious about their life, dreams, challenges, and habits

CONVERSATION STYLE:
- Keep responses concise (it's a mobile app)
- Ask follow-up questions to dig deeper
- Reference specific things you know about them
- Make jokes occasionally when appropriate
- Be real - don't be fake positive all the time
- If they share something personal, acknowledge it genuinely

CRITICAL - ASK MORE QUESTIONS:
- In your FIRST conversation with a user, ask 2-3 deep questions about their life, dreams, and struggles
- Don't just answer - ALWAYS include at least one follow-up question in your responses
- Questions should be:
  * Specific to what they're working on
  * Help you understand their WHY (motivation)
  * Uncover obstacles or patterns
  * Build deeper connection
- Examples: "What made you choose this goal?", "What's been the hardest part?", "How would achieving this change your life?", "What happens if you don't do this?"

LEARNING SYSTEM:
- You have a "WHAT I'VE LEARNED ABOUT YOU" section in the context
- This stores important information about the user (motivations, obstacles, dreams, fears, preferences, etc.)
- Use this information to personalize your responses and make connections
- The system automatically extracts learnings from conversations
- Reference what you've learned: "I remember you mentioned...", "Based on what you told me about..."
- The more conversations, the better you know them - use that knowledge!

You have FULL ACCESS to the user's data:
- Personality assessment scores (6 pillars: physical, mental, social, professional, spiritual, creative)
- Current goals and class (warrior, sage, connector, creator, achiever, monk)
- Streak and level
- ALL their Life Paths (long-term goals) with milestones
- ALL their Habits and completion history
- ALL their Quests (daily challenges) - completed and pending
- Their entire profile and progress
- Previous conversations (use chat history to build continuity)

YOUR SUPERPOWERS:
1. View and analyze ALL their data to give personalized advice
2. Create Life Paths, Habits, and Quests tailored to what they need
3. Identify patterns, weaknesses, and strengths in their behavior
4. Create quests that address BAD HABITS or things they need to CHANGE
5. Be proactive - suggest things before they ask
6. You have COMPLETE visibility into their bad habits, including:
   - What the bad habit is (with description)
   - How often they do it (occurrences)
   - When they last did it
   - Recent activity patterns (last 7/30 days)
   - Notes they've written about it

CRITICAL - DEEP BAD HABIT CONTEXT:
You have access to EVERYTHING about their bad habits. Use this to create TARGETED quests:

Example 1 - Pornography/Fap Addiction:
If they track "pornography" or "fap" as a bad habit, create quests like:
- "Delete all social media apps that trigger you for 3 days"
- "Unfollow all Instagram models/OnlyFans accounts you follow"
- "Install a website blocker (Freedom, Cold Turkey) and block 5 trigger sites"
- "When you feel the urge, do 20 pushups instead - track it"
- "Write a letter to your future self about why you want to quit"
- "Call an accountability partner when you feel tempted"

Example 2 - Social Media Addiction:
If they track "scrolling Instagram/TikTok", create quests like:
- "Delete TikTok from your phone for 48 hours"
- "Set screen time limits: 30min/day for Instagram"
- "Unfollow 20 accounts that make you feel bad about yourself"
- "Post your screen time stats in your accountability group"

Example 3 - Junk Food/Eating:
If they track "eating junk food", create quests like:
- "Remove all junk food from your house - donate or throw it away"
- "Meal prep 3 healthy meals for tomorrow"
- "When you crave junk food, drink water and wait 10 minutes first"

IMPORTANT - PERSONALIZED QUESTS:
When creating quests, make them SPECIFIC to:
1. Their EXACT bad habit (not generic "be better")
2. Their Life Path goals (connect the quest to their bigger vision)
3. Their recent patterns (if they relapsed 3 times this week, address it)
4. Their triggers and context (if they mentioned stress triggers it, address stress)

Example: If user has Life Path "Become spiritually strong" + Bad Habit "watch porn", create:
"Spend 30 minutes in prayer/meditation asking for strength to overcome your struggles"

Always respond in the user's language (Spanish if they write in Spanish).
When the user asks about their progress or goals, reference their ACTUAL Life Paths, Habits, and Quests.`;

const QUEST_GENERATION_PROMPT = `You are a quest generator for a personal development app.

Given the user's profile, generate personalized daily challenges that:
1. Target their WEAKEST pillars (based on assessment scores)
2. Align with their CLASS focus (warrior=physical, sage=mental, connector=social, creator=creative)
3. Are SPECIFIC and ACTIONABLE (not vague like "be more productive")
4. Have clear completion criteria
5. Fit their schedule and lifestyle

DIFFICULTY RULES (IMPORTANT - based on time/effort required):
- "easy": 5-10 minutes, minimal effort (quick tasks, simple habits)
- "medium": 15-30 minutes, moderate effort (focused work, meaningful activities)  
- "hard": 30-60+ minutes, significant effort (deep work, challenging goals)

XP REWARDS based on difficulty:
- easy: 10-20 XP, 2-5 coins
- medium: 25-35 XP, 6-10 coins
- hard: 40-60 XP, 12-20 coins

For each quest, explain WHY you chose it based on their profile.

Return JSON format only, no markdown:
{
  "quests": [
    {
      "title": "Short catchy title",
      "description": "What to do specifically",
      "pillar_id": "physical|mental|social|professional|spiritual|creative",
      "difficulty": "easy|medium|hard",
      "xp_reward": 10-60,
      "coin_reward": 2-20,
      "duration_minutes": 5-60,
      "icon": "emoji",
      "why_this_quest": "Personal explanation of why this helps THEM"
    }
  ],
  "focus_pillar": "the pillar they should focus on today",
  "motivation": "personalized motivational message"
}`;

// =====================================================
// OPENAI API CALLS
// =====================================================

async function callOpenAI(
  messages: CoachMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
  } = {}
): Promise<string> {
  const { temperature = 0.7, max_tokens = 1000, json_mode = false } = options;

  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key not configured. Set EXPO_PUBLIC_OPENAI_API_KEY in your environment."
    );
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cost-effective for this use case
        messages,
        temperature,
        max_tokens,
        ...(json_mode && { response_format: { type: "json_object" } }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

// =====================================================
// QUEST COACH FUNCTIONS
// =====================================================

/**
 * Check if user is asking to create quests
 */
function isQuestCreationRequest(message: string): boolean {
  const questKeywords = [
    "crear quest",
    "create quest",
    "crea un quest",
    "crea una quest",
    "dame un quest",
    "dame una quest",
    "give me a quest",
    "give me quests",
    "nueva misión",
    "nuevo reto",
    "nuevo desafío",
    "new quest",
    "new challenge",
    "quiero un quest",
    "quiero una misión",
    "i want a quest",
    "want a quest",
    "generar quest",
    "generate quest",
    "genera un quest",
    "genera quests",
    "crear reto",
    "crear desafío",
    "dame retos",
    "dame desafíos",
    "misiones para hoy",
    "quests for today",
    "retos para hoy",
    "asignar quest",
    "assign quest",
    "crear misión",
    "nueva misión",
  ];

  const lowerMessage = message.toLowerCase();
  return questKeywords.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Chat with Quest AI coach - Now with tool execution!
 */
export async function chatWithQuest(
  userId: string,
  message: string,
  conversationHistory: CoachMessage[] = []
): Promise<string> {
  // Check if user wants to create quests the old way
  if (isQuestCreationRequest(message)) {
    try {
      const dailyPlan = await generatePersonalizedQuests(userId);
      const questList = dailyPlan.quests
        .map(
          (q, i) =>
            `${i + 1}. ${q.icon} **${q.title}** (${q.pillar_id}) - ${
              q.xp_reward
            } XP\n   ${q.description}`
        )
        .join("\n\n");

      return `¡Listo! 🎯 He creado ${dailyPlan.quests.length} quests personalizadas para ti:\n\n${questList}\n\n💡 **Enfoque de hoy:** ${dailyPlan.focus_pillar}\n\n${dailyPlan.motivation}\n\n*Los quests ya están en tu lista. ¡Ve a completarlos! 💪*`;
    } catch (error) {
      console.error("Error creating quests:", error);
      return "❌ Hubo un problema al crear tus quests. Por favor intenta de nuevo en unos momentos.";
    }
  }

  // Get COMPLETE user context (Life Paths, Habits, Quests, Profile)
  const userContext = await getCompleteUserContext(userId);

  // Enhanced system prompt with tool capabilities
  const systemMessage = `${getAISystemPromptWithTools()}

${userContext}

IMPORTANT: The user expects you to know EVERYTHING about their Life Paths, Habits, and Quests.
When they ask "what are my life paths?" or "what habits do I have?", refer to the data above.
You can create, modify, or delete any of these items based on the conversation.`;

  const messages: CoachMessage[] = [
    { role: "system", content: systemMessage },
    ...conversationHistory,
    { role: "user", content: message },
  ];

  const response = await callOpenAI(messages, {
    temperature: 0.8,
    max_tokens: 1500,
  });

  // Parse and execute any tool calls in the response
  const toolCalls = parseToolCalls(response);
  let finalResponse = response;

  if (toolCalls.length > 0) {
    // Execute the tools
    const toolResults = await executeToolCalls(userId, toolCalls);

    // Remove tool tags from response and add results
    finalResponse = response.replace(/\[TOOL:\w+\].*?\[\/TOOL\]/g, "").trim();

    // Add tool execution results to the response
    const resultMessages = toolResults.map((r) => r.message).join("\n");
    if (resultMessages) {
      finalResponse = finalResponse + "\n\n" + resultMessages;
    }
  }

  // Save conversation to database
  await saveConversation(userId, message, finalResponse);

  // Extract and save learnings from this conversation (async, non-blocking)
  extractAndSaveLearnings(userId, message, finalResponse).catch((error) =>
    console.error("Error extracting learnings:", error)
  );

  return finalResponse;
}

/**
 * Generate personalized daily quests
 */
export async function generatePersonalizedQuests(
  userId: string,
  mood?: string,
  availableTime?: number // minutes available today
): Promise<DailyPlan> {
  const profile = await getUserProfileForAI(userId);
  const todaySchedule = await getUserCalendarEvents(userId);
  const activePillars = await getActivePillars(userId);

  // Filter pillar scores to only active ones for weakness detection
  const activePillarScores = Object.fromEntries(
    Object.entries(profile.pillar_scores).filter(([key]) =>
      activePillars.includes(key)
    )
  );

  const prompt = `${QUEST_GENERATION_PROMPT}

USER PROFILE:
- Name: ${profile.display_name}
- Class: ${profile.user_class} (focus: ${getClassFocus(profile.user_class)})
- Level: ${profile.level}
- Current streak: ${profile.current_streak} days
- Pillar assessment scores (1-100): ${JSON.stringify(profile.pillar_scores)}
- Weakest pillar: ${getWeakestPillar(activePillarScores)}
- Goals: ${profile.goals?.join(", ") || "Not set"}

ACTIVE PILLARS (user is focusing on these):
${activePillars.map((p) => `- ${p}`).join("\n")}

INACTIVE PILLARS (user is NOT focusing on these right now):
${
  ["physical", "mental", "social", "professional", "spiritual", "creative"]
    .filter((p) => !activePillars.includes(p))
    .map((p) => `- ${p}`)
    .join("\n") || "- None (all active)"
}

TODAY'S CONTEXT:
- Mood: ${mood || "not specified"}
- Available time: ${
    availableTime ? `${availableTime} minutes` : "not specified"
  }
- Calendar events: ${
    todaySchedule.length > 0
      ? todaySchedule.map((e) => `${e.time}: ${e.title}`).join(", ")
      : "No events"
  }

QUEST DISTRIBUTION (IMPORTANT):
- 80% of quests MUST be from ACTIVE PILLARS (${activePillars.join(", ")})
- 20% can be from inactive pillars for balance (optional, max 1-2 quests)
- If user has only 1-2 active pillars, focus ALL quests on those
- Inactive pillar quests should be simple/easy to not overwhelm

Generate 5-7 quests following this distribution strictly.
Make them SPECIFIC to their profile, not generic.`;

  const messages: CoachMessage[] = [
    { role: "system", content: prompt },
    { role: "user", content: "Generate my personalized quests for today." },
  ];

  const response = await callOpenAI(messages, {
    temperature: 0.7,
    max_tokens: 2000,
    json_mode: true,
  });

  try {
    const parsed = JSON.parse(response);

    // Save generated quests to database
    await saveGeneratedQuests(userId, parsed.quests);

    return {
      greeting: `Hey ${profile.display_name}! 👋`,
      mood_response: mood ? getMoodResponse(mood) : "",
      quests: parsed.quests,
      focus_pillar: parsed.focus_pillar,
      motivation: parsed.motivation,
    };
  } catch (e) {
    console.error("Failed to parse quest response:", e);
    throw new Error("Failed to generate quests");
  }
}

/**
 * Get morning check-in response with personalized plan
 */
export async function getMorningPlan(
  userId: string,
  mood: string,
  energy: "low" | "medium" | "high",
  availableTime: number
): Promise<DailyPlan> {
  const profile = await getUserProfileForAI(userId);

  const messages: CoachMessage[] = [
    {
      role: "system",
      content: `You are Quest, generating a morning plan for ${
        profile.display_name
      }.
      
Their mood is "${mood}" and energy level is "${energy}".
They have ${availableTime} minutes available today.
Their weakest pillar is ${getWeakestPillar(profile.pillar_scores)}.
Their streak is ${profile.current_streak} days.

Create an encouraging, personalized morning message and adjust quest difficulty based on their energy level.
If energy is low, suggest easier quests. If high, push them more.

Respond in JSON format:
{
  "greeting": "personalized morning message",
  "mood_response": "acknowledge their mood",
  "focus_tip": "one specific focus suggestion for today",
  "quests": [...array of 5-7 quests...],
  "motivation": "end with motivation"
}`,
    },
    { role: "user", content: "Good morning! Give me my plan for today." },
  ];

  const response = await callOpenAI(messages, { json_mode: true });
  return JSON.parse(response);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get user's active pillars from database
 */
async function getActivePillars(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_pillars")
    .select("pillar_id, is_active")
    .eq("user_id", userId);

  if (error || !data) {
    // Default: all pillars active
    return [
      "physical",
      "mental",
      "social",
      "professional",
      "spiritual",
      "creative",
    ];
  }

  // Filter to only active pillars (default to true for backwards compat)
  const active = data
    .filter((p) => p.is_active !== false)
    .map((p) => p.pillar_id);

  // Return all pillars if none are marked active (backwards compat)
  return active.length > 0
    ? active
    : ["physical", "mental", "social", "professional", "spiritual", "creative"];
}

async function getUserProfileForAI(userId: string): Promise<UserProfile> {
  // Only select columns that exist in the database
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, user_class, level, total_xp, current_streak, pillar_scores"
    )
    .eq("id", userId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    display_name: data.display_name || "Adventurer",
    user_class: data.user_class || "warrior",
    level: data.level || 1,
    total_xp: data.total_xp || 0,
    current_streak: data.current_streak || 0,
    pillar_scores: data.pillar_scores || {
      physical: 50,
      mental: 50,
      social: 50,
      professional: 50,
      spiritual: 50,
      creative: 50,
    },
    goals: [],
    personality_traits: [],
  };
}

/**
 * Get COMPLETE user context for AI (Life Paths, Habits, Quests, Achievements, Guilds, etc.)
 * The AI should know EVERYTHING about the user
 */
async function getCompleteUserContext(userId: string): Promise<string> {
  const profile = await getUserProfileForAI(userId);

  // Fetch Life Paths with milestones
  const { data: lifePaths } = await supabase
    .from("life_paths")
    .select(
      `
      id, title, description, pillar_id, vision_statement, 
      why_important, target_date, status, progress_percentage,
      path_milestones(id, title, target_date, status, completed_date)
    `
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Fetch Active Habits
  const { data: habits } = await supabase
    .from("user_habits")
    .select(
      "id, name, description, target_pillar, frequency, current_streak, best_streak, total_completions"
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("current_streak", { ascending: false });

  // Fetch Bad Habits with recent logs
  const { data: badHabits } = await supabase
    .from("bad_habits")
    .select(
      "id, habit_name, description, qc_penalty, occurrences, last_occurred_at, created_at"
    )
    .eq("user_id", userId)
    .order("occurrences", { ascending: false });

  // Fetch recent bad habit logs (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: badHabitLogs } = await supabase
    .from("bad_habit_logs")
    .select("bad_habit_id, qc_lost, notes, created_at")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch Today's Quests
  const today = new Date().toISOString().split("T")[0];
  const { data: quests } = await supabase
    .from("user_daily_quests")
    .select(
      `
      id, status, completed_at,
      challenges(id, title, description, pillar_id, difficulty, xp_reward)
    `
    )
    .eq("user_id", userId)
    .eq("assigned_date", today);

  // Fetch Unlocked Achievements
  const { data: achievements } = await supabase
    .from("achievement_logs")
    .select(
      `
      id, unlocked_at,
      achievements(id, name, description, category, rarity, xp_reward, icon)
    `
    )
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false })
    .limit(20);

  // Fetch User Pillars with levels
  const { data: userPillars } = await supabase
    .from("user_pillars")
    .select("pillar_id, level, current_xp, is_active, priority, inactive_xp")
    .eq("user_id", userId)
    .order("priority", { ascending: true });

  // Fetch Guild memberships
  const { data: guildMemberships } = await supabase
    .from("guild_members")
    .select(
      `
      role, joined_at,
      guilds(id, name, description, member_count)
    `
    )
    .eq("user_id", userId);

  // Fetch User Streaks
  const { data: streaks } = await supabase
    .from("user_streaks")
    .select("streak_type, current_streak, longest_streak, last_activity_date")
    .eq("user_id", userId);

  // Fetch recent chat history (last 10 messages for context)
  const { data: chatHistory } = await supabase
    .from("chat_history")
    .select("message, is_user, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch Weekly Review if exists
  const weekStart = getWeekStart();
  const { data: weeklyReview } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .single();

  // Fetch User Context Learnings (what AI has learned about the user)
  const { data: userLearningsData } = await supabase.rpc(
    "get_user_context_for_ai",
    { p_user_id: userId }
  );
  const userLearnings = userLearningsData?.[0]?.context || {};

  // Build comprehensive context string
  let context = `=== COMPLETE USER PROFILE ===
Name: ${profile.display_name}
Class: ${profile.user_class}
Level: ${profile.level} (${profile.total_xp} XP total)
Daily Streak: ${profile.current_streak} days 🔥

=== PILLAR LEVELS & FOCUS ===
${
  userPillars && userPillars.length > 0
    ? userPillars
        .map(
          (p: any) =>
            `• ${p.pillar_id.toUpperCase()}: Level ${p.level} (${
              p.current_xp
            } XP) ${
              p.is_active
                ? "✅ Active"
                : `❌ Inactive (${p.inactive_xp} XP pending)`
            }`
        )
        .join("\n")
    : `Pillar Scores: ${JSON.stringify(profile.pillar_scores)}`
}
Active Pillars (user is focusing on): ${
    userPillars
      ?.filter((p: any) => p.is_active)
      .map((p: any) => p.pillar_id)
      .join(", ") || "All"
  }
Weakest Pillar: ${getWeakestPillar(profile.pillar_scores)}
Strongest Pillar: ${getStrongestPillar(profile.pillar_scores)}

=== LIFE PATHS (Long-term Goals) ===
${
  lifePaths && lifePaths.length > 0
    ? lifePaths
        .map(
          (lp: any) => `
• ${lp.title} (${lp.pillar_id}) - ${lp.progress_percentage || 0}% complete
  Vision: ${lp.vision_statement || "N/A"}
  Why Important: ${lp.why_important || "N/A"}
  Target Date: ${lp.target_date || "Not set"}
  Milestones:
${
  lp.path_milestones && lp.path_milestones.length > 0
    ? lp.path_milestones
        .map(
          (m: any) =>
            `    - ${m.title} (${m.status})${
              m.completed_date ? " ✅ " + m.completed_date : ""
            }`
        )
        .join("\n")
    : "    (No milestones yet)"
}
`
        )
        .join("\n")
    : "(No Life Paths created yet)"
}

=== ACTIVE HABITS (Positive) ===
${
  habits && habits.length > 0
    ? habits
        .map(
          (h: any) => `
• ${h.name} (${h.target_pillar || "general"}) - ${h.frequency}
  Current Streak: ${h.current_streak} days 🔥 | Best: ${h.best_streak} days
  Total Completions: ${h.total_completions}
  ${h.description || ""}`
        )
        .join("\n")
    : "(No active habits)"
}

=== BAD HABITS (Things to ELIMINATE) ===
${
  badHabits && badHabits.length > 0
    ? badHabits
        .map((bh: any) => {
          const recentLogs =
            badHabitLogs?.filter((log: any) => log.bad_habit_id === bh.id) ||
            [];
          const last7Days = recentLogs.filter((log: any) => {
            const logDate = new Date(log.created_at);
            const now = new Date();
            const diffDays = Math.floor(
              (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            return diffDays <= 7;
          });

          return `
• ⚠️ ${bh.habit_name} - QC Penalty: ${bh.qc_penalty}
  ${bh.description ? `Description: ${bh.description}` : ""}
  Total Occurrences: ${bh.occurrences}
  Last Occurred: ${
    bh.last_occurred_at
      ? new Date(bh.last_occurred_at).toLocaleDateString()
      : "Never"
  }
  Recent Activity (last 7 days): ${last7Days.length} times
  ${
    last7Days.length > 0
      ? `  Recent Notes:\n${last7Days
          .slice(0, 3)
          .map(
            (log: any) =>
              `    - ${log.notes || "No notes"} (${new Date(
                log.created_at
              ).toLocaleDateString()})`
          )
          .join("\n")}`
      : ""
  }`;
        })
        .join("\n")
    : "(No bad habits tracked - which is GREAT! 🎉)"
}

CRITICAL - BAD HABITS AI COACHING:
You have FULL visibility into the user's bad habits. Use this to:
1. Create SPECIFIC quests that help them break these habits
   Example: If they struggle with "scrolling social media", create quests like:
   - "Delete Instagram from your phone for 24 hours"
   - "Use 30 minutes you'd spend on TikTok to read a book instead"
   - "Unfollow 10 accounts that don't add value to your life"

2. Ask DEEP QUESTIONS to understand the root cause:
   - "What triggers you to [bad habit]?"
   - "What need is this habit fulfilling?"
   - "What would your life look like without this?"
   - "What's the real cost of continuing this habit?"

3. Suggest REPLACEMENT behaviors:
   - Not just "stop doing X", but "do Y instead"
   - Find healthier alternatives that meet the same need
   
4. Track patterns and celebrate progress:
   - "I noticed you haven't logged [bad habit] in 5 days! What changed?"
   - "You mentioned [trigger] - is that still happening?"

5. Be REAL and empathetic, not judgmental:
   - Bad habits are hard to break
   - Relapse is part of recovery
   - Focus on progress, not perfection

=== TODAY'S QUESTS ===
${
  quests && quests.length > 0
    ? quests
        .map(
          (q: any) => `
• ${q.challenges?.title || "Unknown"} (${q.challenges?.pillar_id || "N/A"})
  Status: ${q.status} ${q.status === "completed" ? "✅" : "⏳"}
  Difficulty: ${q.challenges?.difficulty || "N/A"} | XP: ${
            q.challenges?.xp_reward || 0
          }
  ${q.challenges?.description || ""}`
        )
        .join("\n")
    : "(No quests assigned today)"
}

=== ACHIEVEMENTS UNLOCKED (${achievements?.length || 0} shown) ===
${
  achievements && achievements.length > 0
    ? achievements
        .map(
          (a: any) => `
• ${a.achievements?.icon || "🏆"} ${a.achievements?.name} (${
            a.achievements?.rarity
          })
  ${a.achievements?.description}
  Unlocked: ${new Date(a.unlocked_at).toLocaleDateString()}`
        )
        .join("\n")
    : "(No achievements unlocked yet)"
}

=== GUILDS & SOCIAL ===
${
  guildMemberships && guildMemberships.length > 0
    ? guildMemberships
        .map(
          (g: any) => `
• ${g.guilds?.name} (${g.role})
  ${g.guilds?.description || ""}
  Members: ${g.guilds?.member_count || 0}`
        )
        .join("\n")
    : "(Not a member of any guild)"
}

=== STREAKS ===
${
  streaks && streaks.length > 0
    ? streaks
        .map(
          (s: any) => `
• ${s.streak_type}: ${s.current_streak} days (Best: ${s.longest_streak})`
        )
        .join("\n")
    : `Daily Streak: ${profile.current_streak} days`
}

=== THIS WEEK'S REVIEW ===
${
  weeklyReview
    ? `Goals Set: ${weeklyReview.goals_count || 0}
Quests Completed: ${weeklyReview.quests_completed || 0}
XP Earned: ${weeklyReview.xp_earned || 0}
Focus: ${weeklyReview.focus_areas || "N/A"}`
    : "(No weekly review yet)"
}

=== WHAT I'VE LEARNED ABOUT YOU ===
${
  Object.keys(userLearnings).length > 0
    ? Object.entries(userLearnings)
        .map(([category, items]: [string, any]) => {
          if (!items || Object.keys(items).length === 0) return "";
          return `${category.toUpperCase()}:\n${Object.entries(items)
            .map(([key, value]: [string, any]) => `  • ${key}: ${value}`)
            .join("\n")}`;
        })
        .filter((x) => x)
        .join("\n\n")
    : "(I'm still getting to know you - this is why I ask questions!)"
}

=== EXTERNAL INTEGRATIONS & ACTIVITY DATA ===
${await getIntegrationsContext(userId)}

=== RECENT CONVERSATION CONTEXT ===
${
  chatHistory && chatHistory.length > 0
    ? chatHistory
        .reverse()
        .map(
          (c: any) =>
            `${c.is_user ? "User" : "AI"}: ${c.message.substring(0, 100)}...`
        )
        .join("\n")
    : "(New conversation)"
}

Today's Date: ${new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}
Current Time: ${new Date().toLocaleTimeString("es-ES")}`;

  return context;
}

/**
 * Get integrations context for AI
 * - Connected apps (Strava, Spotify, GitHub, etc.)
 * - Recent activities synced
 * - Patterns and insights from external data
 */
async function getIntegrationsContext(userId: string): Promise<string> {
  // Fetch active integrations
  const { data: integrations } = await supabase
    .from("user_integrations")
    .select("integration_type, is_active, last_synced_at, metadata")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!integrations || integrations.length === 0) {
    return `No external integrations connected.

💡 TIP FOR AI: Suggest connecting relevant integrations based on their goals:
- If they have physical pillar goals → suggest Strava or Apple Health
- If they mention coding/dev work → suggest GitHub
- If they struggle with motivation → suggest Spotify (music mood tracking)`;
  }

  let context = `Connected Apps (${integrations.length}):\n`;

  // Fetch recent activities from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentActivities } = await supabase
    .from("user_activity_imports")
    .select(
      "source, activity_type, distance_meters, duration_seconds, calories, date, metadata"
    )
    .eq("user_id", userId)
    .gte("date", sevenDaysAgo.toISOString())
    .order("date", { ascending: false })
    .limit(20);

  // Build context for each integration
  for (const integration of integrations) {
    const type = integration.integration_type;
    const lastSynced = integration.last_synced_at
      ? new Date(integration.last_synced_at).toLocaleDateString()
      : "Never";

    context += `\n• ${getIntegrationEmoji(type)} ${type.toUpperCase()}`;
    context += `\n  Last synced: ${lastSynced}`;

    // Add integration-specific insights
    const activities =
      recentActivities?.filter((a: any) => a.source === type) || [];

    if (activities.length > 0) {
      context += `\n  Recent activity (last 7 days): ${activities.length} events`;

      if (type === "strava") {
        const totalDistance = activities.reduce(
          (sum: number, a: any) => sum + (a.distance_meters || 0),
          0
        );
        const totalDuration = activities.reduce(
          (sum: number, a: any) => sum + (a.duration_seconds || 0),
          0
        );
        const totalCalories = activities.reduce(
          (sum: number, a: any) => sum + (a.calories || 0),
          0
        );

        context += `\n    - Total distance: ${(totalDistance / 1000).toFixed(
          1
        )}km`;
        context += `\n    - Total time: ${Math.floor(
          totalDuration / 60
        )} minutes`;
        context += `\n    - Calories burned: ${totalCalories}`;
        context += `\n    - Activities: ${activities
          .slice(0, 3)
          .map((a: any) => a.activity_type)
          .join(", ")}`;
      } else if (type === "spotify") {
        const avgMood =
          activities.reduce(
            (sum: number, a: any) => sum + (a.metadata?.mood_score || 50),
            0
          ) / activities.length;
        const avgEnergy =
          activities.reduce(
            (sum: number, a: any) => sum + (a.metadata?.energy_level || 50),
            0
          ) / activities.length;

        context += `\n    - Average mood score: ${Math.round(avgMood)}/100 ${
          avgMood < 40
            ? "⚠️ (concerning - mostly sad music)"
            : avgMood > 70
            ? "✅ (uplifting!)"
            : ""
        }`;
        context += `\n    - Average energy: ${Math.round(avgEnergy)}/100`;
        context += `\n    - Total listening time: ${Math.floor(
          activities.reduce(
            (sum: number, a: any) => sum + (a.duration_seconds || 0),
            0
          ) / 60
        )} minutes`;
      } else if (type === "github") {
        const totalCommits = activities.reduce(
          (sum: number, a: any) => sum + (a.metadata?.commits_count || 0),
          0
        );
        const totalPRs = activities.reduce(
          (sum: number, a: any) => sum + (a.metadata?.prs_opened || 0),
          0
        );

        context += `\n    - Total commits: ${totalCommits}`;
        context += `\n    - PRs opened: ${totalPRs}`;
        context += `\n    - Active repos: ${
          activities[0]?.metadata?.repos?.join(", ") || "N/A"
        }`;
      }
    } else {
      context += `\n  ⚠️ No activity detected in last 7 days`;
    }
  }

  // Add AI coaching tips based on integration data
  context += `\n\nCRITICAL - HOW TO USE INTEGRATION DATA:

1. CREATE TARGETED QUESTS based on their activity:
   - If Strava shows they run regularly → "Beat your 5km PR"
   - If GitHub shows coding daily → "Refactor one messy function today"
   - If Spotify mood is low → "Listen to 30 minutes of uplifting music"

2. DETECT PATTERNS AND RED FLAGS:
   - Strava: 0 workouts for 7 days → "What's blocking you from exercising?"
   - Spotify: Mood score < 40 for 3+ days → "Your music suggests you're struggling. Want to talk?"
   - GitHub: 0 commits for 3+ days (when usually active) → "Let's break that coding freeze"

3. CELEBRATE WINS:
   - Strava: New distance PR → "You crushed that run! 🏃‍♂️"
   - GitHub: High commit streak → "You're on fire with coding! 💻"
   - Spotify: Mood improved → "Love seeing your music choices getting more uplifting!"

4. AUTO-COMPLETION AWARENESS:
   - When they sync Strava, habits like "exercise" auto-complete
   - They might not manually log, but data proves they did it
   - Acknowledge: "I see you knocked out that workout! (auto-detected from Strava)"

5. PERSONALIZED RECOMMENDATIONS:
   - If they have NO integrations but mention fitness → suggest Strava
   - If they mention music/mood → suggest Spotify
   - If they're a developer → suggest GitHub`;

  return context;
}

/**
 * Get emoji for integration type
 */
function getIntegrationEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    strava: "🏃",
    spotify: "🎵",
    github: "💻",
    apple_health: "❤️",
    google_fit: "🤖",
    todoist: "✅",
    google_calendar: "📅",
    notion: "📝",
  };
  return emojiMap[type] || "🔗";
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split("T")[0];
}

async function getUserCalendarEvents(
  userId: string
): Promise<Array<{ time: string; title: string }>> {
  // TODO: Implement calendar integration
  // For now, return empty array
  const { data } = await supabase
    .from("user_calendar_events")
    .select("start_time, title")
    .eq("user_id", userId)
    .gte("start_time", new Date().toISOString().split("T")[0])
    .lte("start_time", new Date().toISOString().split("T")[0] + "T23:59:59")
    .order("start_time");

  return (data || []).map((e) => ({
    time: new Date(e.start_time).toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    title: e.title,
  }));
}

async function saveConversation(
  userId: string,
  userMessage: string,
  aiResponse: string
) {
  await supabase.from("quest_conversations").insert({
    user_id: userId,
    user_message: userMessage,
    ai_response: aiResponse,
  });
}

/**
 * Extract learnings from user messages and AI responses
 * Looks for patterns that indicate important personal information
 */
async function extractAndSaveLearnings(
  userId: string,
  userMessage: string,
  aiResponse: string
) {
  const learnings: Array<{
    category: string;
    key: string;
    value: string;
    confidence: number;
  }> = [];

  // Pattern matching for different types of learnings
  const patterns = {
    motivation: [
      /(?:me motiva|me inspira|me impulsa|mi motivación es|quiero lograr)\s+(.+)/gi,
      /(?:mi objetivo es|mi meta es|aspiro a|sueño con)\s+(.+)/gi,
    ],
    obstacle: [
      /(?:mi problema es|tengo dificultad|me cuesta|el obstáculo es)\s+(.+)/gi,
      /(?:no puedo|me bloquea|me impide|lucho con)\s+(.+)/gi,
    ],
    dream: [
      /(?:mi sueño es|sueño con|me gustaría|algún día quiero)\s+(.+)/gi,
      /(?:mi visión es|imagino que|aspiro a ser)\s+(.+)/gi,
    ],
    fear: [
      /(?:me da miedo|temo que|me preocupa|tengo miedo de)\s+(.+)/gi,
      /(?:me asusta|me aterra|pánico a)\s+(.+)/gi,
    ],
    preference: [
      /(?:prefiero|me gusta más|disfruto|me encanta)\s+(.+)/gi,
      /(?:odio|detesto|no me gusta|no soporto)\s+(.+)/gi,
    ],
  };

  // Extract learnings from user message
  for (const [category, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const matches = [...userMessage.matchAll(regex)];
      for (const match of matches) {
        if (match[1] && match[1].length > 5) {
          // Avoid very short captures
          learnings.push({
            category,
            key: match[1].substring(0, 50).trim(), // First 50 chars as key
            value: match[1].trim(),
            confidence: 0.8,
          });
        }
      }
    }
  }

  // Look for explicit statements in user message
  const explicitPatterns = [
    {
      regex: /trabajo (?:como|en|de)\s+(.+?)(?:\.|,|$)/gi,
      category: "preference",
      key: "occupation",
    },
    {
      regex: /tengo\s+(\d+)\s+años/gi,
      category: "preference",
      key: "age",
    },
    {
      regex: /vivo en\s+(.+?)(?:\.|,|$)/gi,
      category: "preference",
      key: "location",
    },
    {
      regex: /mi familia\s+(.+?)(?:\.|,|$)/gi,
      category: "preference",
      key: "family_context",
    },
  ];

  for (const pattern of explicitPatterns) {
    const matches = [...userMessage.matchAll(pattern.regex)];
    for (const match of matches) {
      if (match[1]) {
        learnings.push({
          category: pattern.category,
          key: pattern.key,
          value: match[1].trim(),
          confidence: 0.9,
        });
      }
    }
  }

  // Save learnings to database
  for (const learning of learnings) {
    try {
      await supabase.rpc("save_user_learning", {
        p_user_id: userId,
        p_category: learning.category,
        p_key: learning.key,
        p_value: learning.value,
        p_confidence: learning.confidence,
      });
    } catch (error) {
      console.error("Error saving learning:", error);
    }
  }

  return learnings.length;
}

async function saveGeneratedQuests(userId: string, quests: GeneratedQuest[]) {
  const today = new Date().toISOString().split("T")[0];

  for (const quest of quests) {
    try {
      // First, insert the challenge
      const { data: challenge, error: challengeError } = await supabase
        .from("challenges")
        .insert({
          title: quest.title,
          description: quest.description,
          pillar_id: quest.pillar_id,
          difficulty: quest.difficulty,
          xp_reward: quest.xp_reward,
          coin_reward: quest.coin_reward,
          duration_minutes: quest.duration_minutes,
          icon: quest.icon,
          is_daily: true,
          tags: ["ai_generated"],
        })
        .select("id")
        .single();

      if (challengeError) {
        console.error("Failed to create challenge:", challengeError);
        continue;
      }

      // Then assign to user
      const { error: assignError } = await supabase
        .from("user_daily_quests")
        .insert({
          user_id: userId,
          daily_quest_id: challenge.id,
          assigned_date: today,
        });

      if (assignError) {
        console.error("Failed to assign quest to user:", assignError);
      }
    } catch (err) {
      console.error("Error in saveGeneratedQuests:", err);
    }
  }
}

async function saveGeneratedLifePaths(
  userId: string,
  lifePaths: GeneratedLifePath[]
): Promise<string[]> {
  const createdIds: string[] = [];

  for (const path of lifePaths) {
    try {
      // Create Life Path
      const { data: pathData, error: pathError } = await supabase
        .from("life_paths")
        .insert({
          user_id: userId,
          title: path.title,
          description: path.description,
          pillar_id: path.pillar_id,
          vision_statement: path.vision_statement,
          why_important: path.why_important,
          target_date: path.target_date,
          status: "active",
          ai_generated: true,
        })
        .select("id")
        .single();

      if (pathError) {
        console.error("Failed to create life path:", pathError);
        createdIds.push(""); // Push empty string to maintain index alignment
        continue;
      }

      createdIds.push(pathData.id);

      // Create Milestones
      if (path.milestones && path.milestones.length > 0) {
        const milestonesToInsert = path.milestones.map((m, index) => ({
          life_path_id: pathData.id,
          user_id: userId,
          title: m.title,
          target_date: m.target_date,
          sort_order: index,
          status: "pending",
          ai_suggested: true,
        }));

        const { error: milestoneError } = await supabase
          .from("path_milestones")
          .insert(milestonesToInsert);

        if (milestoneError) {
          console.error("Failed to create milestones:", milestoneError);
        }
      }
    } catch (err) {
      console.error("Error in saveGeneratedLifePaths:", err);
      createdIds.push("");
    }
  }
  return createdIds;
}

async function saveGeneratedHabits(
  userId: string,
  habits: GeneratedHabit[],
  createdPathIds: string[] = []
) {
  for (const habit of habits) {
    try {
      let linkedPathId = null;

      // Try to link to a life path if index is provided and we have a valid ID
      if (
        habit.life_path_index !== undefined &&
        habit.life_path_index >= 0 &&
        createdPathIds[habit.life_path_index]
      ) {
        linkedPathId = createdPathIds[habit.life_path_index];
      }

      // Create Habit
      const { data: habitData, error: habitError } = await supabase
        .from("habits")
        .insert({
          user_id: userId,
          title: habit.title,
          description: habit.description,
          pillar_id: habit.pillar_id,
          frequency: habit.frequency,
          times_per_day: habit.times_per_day,
          is_active: true,
          is_ai_suggested: true,
        })
        .select("id")
        .single();

      if (habitError) {
        console.error("Failed to create habit:", habitError);
        continue;
      }

      // If linked to a path, create the link in path_habits
      if (linkedPathId) {
        await supabase.from("path_habits").insert({
          life_path_id: linkedPathId,
          user_id: userId,
          habit_id: habitData.id,
          title: habit.title,
          description: habit.description,
          pillar_id: habit.pillar_id,
          frequency: habit.frequency,
          target_per_period: habit.times_per_day,
        });
      }
    } catch (err) {
      console.error("Error in saveGeneratedHabits:", err);
    }
  }
}

function getWeakestPillar(scores: Record<string, number>): string {
  if (!scores || Object.keys(scores).length === 0) return "physical";
  return Object.entries(scores).reduce((a, b) => (a[1] < b[1] ? a : b))[0];
}

function getStrongestPillar(scores: Record<string, number>): string {
  if (!scores || Object.keys(scores).length === 0) return "physical";
  return Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
}

function getClassFocus(userClass: string): string {
  const focuses: Record<string, string> = {
    warrior: "physical health and discipline",
    sage: "mental growth and learning",
    connector: "social relationships and community",
    creator: "creativity and self-expression",
    achiever: "professional growth and goals",
    monk: "spiritual peace and mindfulness",
  };
  return focuses[userClass] || "balanced growth";
}

function getMoodResponse(mood: string): string {
  const responses: Record<string, string> = {
    great: "Amazing! Let's channel that energy into something powerful! 🔥",
    good: "Nice! A good foundation to build on today 💪",
    okay: "That's okay! Small steps forward are still progress 🌱",
    bad: "I hear you. Let's focus on one small win today - you've got this 🤗",
    terrible:
      "Rough day. Let's be gentle with ourselves but still move forward, even if it's tiny steps 💙",
  };
  return responses[mood] || "Let's make today count! 🎯";
}

// =====================================================
// ASSESSMENT ANALYSIS WITH AI
// =====================================================

export interface GeneratedLifePath {
  title: string;
  description: string;
  pillar_id: string;
  vision_statement: string;
  why_important: string;
  target_date: string; // YYYY-MM-DD
  milestones: {
    title: string;
    target_date: string;
  }[];
}

export interface GeneratedHabit {
  title: string;
  description: string;
  pillar_id: string;
  frequency: "daily" | "weekly";
  times_per_day: number;
  life_path_index?: number; // Index in the life_paths array, if linked
}

export interface AssessmentAnalysis {
  pillar_scores: Record<string, number>;
  personality_summary: string;
  strengths: string[];
  areas_to_improve: string[];
  recommended_class: string;
  personalized_goals: string[];
  initial_quests: GeneratedQuest[];
  life_paths: GeneratedLifePath[];
  habits: GeneratedHabit[];
  coach_welcome_message: string;
}

interface AssessmentQuestion {
  id: string;
  pillar: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
}

interface AssessmentAnswer {
  question_id: string;
  answer_value?: number;
  answer_choice?: string;
  answer_choices?: string[];
}

/**
 * Analyze user's assessment with AI to generate personalized profile
 */
export async function analyzeAssessmentWithAI(
  questions: AssessmentQuestion[],
  answers: Record<string, AssessmentAnswer>,
  userName?: string,
  language: string = "es",
  activePillars: string[] = [
    "physical",
    "mental",
    "social",
    "professional",
    "spiritual",
    "creative",
  ]
): Promise<AssessmentAnalysis> {
  // Build a readable summary of Q&A
  const qaSummary = questions
    .map((q) => {
      const answer = answers[q.id];
      let answerText = "No answer";

      if (answer) {
        if (answer.answer_value !== undefined) {
          answerText = `${answer.answer_value}/100`;
        } else if (answer.answer_choice) {
          answerText = answer.answer_choice;
        } else if (answer.answer_choices && answer.answer_choices.length > 0) {
          answerText = answer.answer_choices.join(", ");
        }
      }

      return `[${q.pillar.toUpperCase()}] ${q.question_text}\n→ ${answerText}`;
    })
    .join("\n\n");

  const langInstruction =
    language === "es"
      ? "IMPORTANTE: Responde COMPLETAMENTE en español. Todos los textos, resúmenes, fortalezas, metas y mensajes deben estar en español."
      : "Respond in English.";

  // Build pillar context for the AI
  const pillarContext = `
USER'S ACTIVE PILLARS (FOCUS AREAS):
The user has chosen to focus on these life areas: ${activePillars.join(", ")}.

IMPORTANT INSTRUCTIONS FOR GENERATION:
- Generate Life Paths ONLY for the active pillars listed above.
- Generate Habits primarily (80%) for active pillars, with occasional (20%) suggestions for other areas.
- Generate initial quests mostly (80%) for active pillars, but some (20%) for other areas to encourage exploration.
- Pillar scores should still be calculated for ALL 6 pillars based on assessment responses.
`;

  const prompt = `You are analyzing a personality assessment for a gamified self-improvement app called Quest.

${langInstruction}

${pillarContext}

Based on these questions and answers, create a detailed analysis:

ASSESSMENT RESPONSES:
${qaSummary}

Analyze this and return JSON with:
{
  "pillar_scores": {
    "physical": 0-100,
    "mental": 0-100,
    "social": 0-100,
    "professional": 0-100,
    "spiritual": 0-100,
    "creative": 0-100
  },
  "personality_summary": "2-3 sentence summary of who they are and their current life situation",
  "strengths": ["3-4 key strengths based on high scores"],
  "areas_to_improve": ["3-4 areas they need to work on based on low scores"],
  "recommended_class": "warrior|sage|connector|creator|achiever|monk - pick the best fit",
  "personalized_goals": ["3-5 specific goals tailored to their profile"],
  "initial_quests": [
    {
      "title": "First quest title",
      "description": "What to do",
      "pillar_id": "the pillar it helps",
      "difficulty": "easy",
      "xp_reward": 20,
      "coin_reward": 5,
      "duration_minutes": 15,
      "icon": "emoji",
      "why_this_quest": "Why this is perfect for them specifically"
    }
  ],
  "life_paths": [
    {
      "title": "Long term goal title (e.g. Master a New Language)",
      "description": "Short description",
      "pillar_id": "mental",
      "vision_statement": "I see myself speaking fluently...",
      "why_important": "It matters because...",
      "target_date": "YYYY-MM-DD (approx 3-6 months from now)",
      "milestones": [
        { "title": "Learn basic vocabulary", "target_date": "YYYY-MM-DD" },
        { "title": "Hold a 5 min conversation", "target_date": "YYYY-MM-DD" },
        { "title": "Read a children's book", "target_date": "YYYY-MM-DD" }
      ]
    }
  ],
  "habits": [
    {
      "title": "Habit title",
      "description": "Habit description",
      "pillar_id": "mental",
      "frequency": "daily",
      "times_per_day": 1,
      "life_path_index": 0 // Optional: index of the life_path this habit supports. -1 if standalone.
    }
  ],
  "coach_welcome_message": "A warm, personalized welcome message from Quest (the AI coach) addressing them by name${
    userName ? ` (${userName})` : ""
  } and acknowledging their specific situation"
}

Generate:
1. 5 initial quests: 4 for their ACTIVE PILLARS (weakest areas within those), 1 for a secondary pillar to encourage exploration.
2. 2 Life Paths: BOTH must be for ACTIVE PILLARS ONLY. Make sure they are distinct and NOT generic. Pick from: ${activePillars.join(
    ", "
  )}.
3. Each Life Path MUST have 3-5 sequential milestones (small steps to reach the goal).
4. 3 Habits: At least 2 for ACTIVE PILLARS, 1 can be for general wellbeing or secondary pillar.

REMEMBER: Life Paths MUST be for active pillars only: ${activePillars.join(
    ", "
  )}.

Be specific and personal - reference their actual answers.
The welcome message should feel like a real coach who understands them.`;

  const messages: CoachMessage[] = [
    { role: "system", content: prompt },
    { role: "user", content: "Analyze my assessment and create my profile." },
  ];

  try {
    const response = await callOpenAI(messages, {
      temperature: 0.7,
      max_tokens: 2500,
      json_mode: true,
    });

    const analysis = JSON.parse(response) as AssessmentAnalysis;
    return analysis;
  } catch (error) {
    console.error("AI Assessment analysis failed:", error);
    // Return fallback analysis if AI fails
    return generateFallbackAnalysis(questions, answers);
  }
}

/**
 * Fallback if AI fails - calculate scores locally
 */
function generateFallbackAnalysis(
  questions: AssessmentQuestion[],
  answers: Record<string, AssessmentAnswer>
): AssessmentAnalysis {
  const pillarScores: Record<string, number> = {};
  const pillarCounts: Record<string, number> = {};

  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer) continue;

    const pillar = question.pillar;
    if (!pillarScores[pillar]) {
      pillarScores[pillar] = 0;
      pillarCounts[pillar] = 0;
    }

    if (answer.answer_value !== undefined) {
      pillarScores[pillar] += answer.answer_value;
      pillarCounts[pillar]++;
    } else if (answer.answer_choice) {
      const options = question.options || [];
      const index = options.indexOf(answer.answer_choice);
      pillarScores[pillar] += (index + 1) * 20;
      pillarCounts[pillar]++;
    } else if (answer.answer_choices && answer.answer_choices.length > 0) {
      pillarScores[pillar] += Math.min(answer.answer_choices.length * 20, 100);
      pillarCounts[pillar]++;
    }
  }

  const scores: Record<string, number> = {};
  for (const pillar of Object.keys(pillarScores)) {
    scores[pillar] = Math.round(
      pillarScores[pillar] / (pillarCounts[pillar] || 1)
    );
  }

  // Find weakest and strongest
  const entries = Object.entries(scores);
  const weakest =
    entries.length > 0
      ? entries.reduce((a, b) => (a[1] < b[1] ? a : b))[0]
      : "physical";
  const strongest =
    entries.length > 0
      ? entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0]
      : "mental";

  return {
    pillar_scores: scores,
    personality_summary:
      "You're on a journey of self-improvement. Let's work together to unlock your potential!",
    strengths: [`Strong in ${strongest}`, "Committed to growth", "Self-aware"],
    areas_to_improve: [
      `Focus on ${weakest}`,
      "Build consistency",
      "Set specific goals",
    ],
    recommended_class:
      strongest === "physical"
        ? "warrior"
        : strongest === "mental"
        ? "sage"
        : strongest === "social"
        ? "connector"
        : strongest === "creative"
        ? "creator"
        : strongest === "professional"
        ? "achiever"
        : "monk",
    personalized_goals: [
      `Improve your ${weakest} score`,
      "Build a daily routine",
      "Complete your first week of quests",
    ],
    initial_quests: [
      {
        title: "Morning Mindfulness",
        description: "Start your day with 5 minutes of deep breathing",
        pillar_id: "spiritual",
        difficulty: "easy",
        xp_reward: 15,
        coin_reward: 3,
        duration_minutes: 5,
        icon: "🧘",
        why_this_quest: "A gentle start to build your daily habit",
      },
    ],
    life_paths: [],
    habits: [],
    coach_welcome_message:
      "Hey there! I'm Quest, your personal AI coach. I've analyzed your assessment and I'm excited to help you grow. Let's start this journey together! 🚀",
  };
}

// =====================================================
// LIFE PATH EXPANSION WITH AI
// =====================================================

interface LifePathExpansion {
  milestones: Array<{
    title: string;
    description: string;
    target_date: string;
  }>;
  habits: Array<{
    title: string;
    description: string;
    frequency: string;
    times_per_day: number;
  }>;
  quests: Array<{
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    xp_reward: number;
    coin_reward: number;
    duration_minutes: number;
    icon: string;
  }>;
}

/**
 * Expand a Life Path with AI-generated milestones, habits, and quests
 * Called when a new Life Path is created (manually or by AI)
 */
export async function expandLifePathWithAI(
  userId: string,
  lifePathId: string,
  pathTitle: string,
  pathVision: string | null,
  pillarId: string,
  timeframeMonths: number = 6
): Promise<{ success: boolean; message: string }> {
  try {
    // Get user context for personalization
    const userContext = await getCompleteUserContext(userId);

    // Calculate intensity based on timeframe
    const intensity =
      timeframeMonths <= 3 ? "HIGH" : timeframeMonths <= 9 ? "MEDIUM" : "LOW";
    const habitsCount =
      timeframeMonths <= 3 ? "3-5" : timeframeMonths <= 9 ? "2-4" : "2-3";
    const questsCount =
      timeframeMonths <= 3 ? "5-7" : timeframeMonths <= 9 ? "3-5" : "3-4";

    const prompt = `You are generating a complete action plan for a Life Path goal.

LIFE PATH DETAILS:
- Title: "${pathTitle}"
- Vision: "${pathVision || "Not specified"}"
- Pillar: ${pillarId}
- Timeframe: ${timeframeMonths} months
- Intensity: ${intensity} (shorter timeframe = higher intensity and frequency)

USER CONTEXT:
${userContext}

Generate a PERSONALIZED action plan that includes:

1. MILESTONES (4-6 steps to achieve this goal):
   - Progressive steps from start to goal
   - Specific, measurable achievements
   - Spread evenly over the ${timeframeMonths}-month timeframe
   - First milestone should be achievable within ${Math.ceil(
     timeframeMonths / 6
   )} month(s)

2. HABITS (${habitsCount} daily/weekly habits):
   - Habits that support achieving this goal
   - Based on what you know about the user
   - Should address user's weaknesses if relevant
   - Frequency should match the ${intensity} intensity (shorter timeframe = higher frequency)
   - For ${intensity} intensity: prefer daily habits with multiple times per day

3. QUESTS (${questsCount} immediate actionable tasks):
   - Specific tasks the user can do TODAY or THIS WEEK
   - Based on user's current situation and what needs to change
   - Include quests that address bad habits or behaviors
   - Make them personal - reference things the AI knows about the user
   - For ${intensity} intensity: create more challenging quests with higher XP rewards

IMPORTANT FOR QUESTS:
- Make quests that help the user CHANGE what needs to change
- If user has bad habits or behaviors conflicting with their goal, create quests to address them
- Be specific and personal, not generic
- Example: If user wants spiritual growth but listens to inappropriate music, create a quest like "Spend 30 minutes removing songs that don't align with your values from your playlist"

Return ONLY valid JSON (no markdown):
{
  "milestones": [
    {"title": "...", "description": "...", "target_date": "YYYY-MM-DD"}
  ],
  "habits": [
    {"title": "...", "description": "...", "frequency": "daily|weekly", "times_per_day": 1}
  ],
  "quests": [
    {"title": "...", "description": "...", "difficulty": "easy|medium|hard", "xp_reward": 10-60, "coin_reward": 2-20, "duration_minutes": 5-60, "icon": "emoji"}
  ]
}`;

    const messages: CoachMessage[] = [
      { role: "system", content: prompt },
      { role: "user", content: `Generate action plan for: "${pathTitle}"` },
    ];

    const response = await callOpenAI(messages, {
      temperature: 0.7,
      max_tokens: 2000,
      json_mode: true,
    });

    const expansion: LifePathExpansion = JSON.parse(response);

    // Save milestones
    if (expansion.milestones && expansion.milestones.length > 0) {
      const milestonesToInsert = expansion.milestones.map((m, index) => ({
        life_path_id: lifePathId,
        user_id: userId,
        title: m.title,
        description: m.description,
        target_date: m.target_date,
        sort_order: index,
        status: "pending",
        ai_suggested: true,
      }));

      await supabase.from("path_milestones").insert(milestonesToInsert);
    }

    // Save habits
    if (expansion.habits && expansion.habits.length > 0) {
      for (const habit of expansion.habits) {
        // Create habit
        const { data: habitData, error: habitError } = await supabase
          .from("habits")
          .insert({
            user_id: userId,
            title: habit.title,
            description: habit.description,
            pillar_id: pillarId,
            frequency: habit.frequency,
            times_per_day: habit.times_per_day,
            is_active: true,
            is_ai_suggested: true,
          })
          .select("id")
          .single();

        if (!habitError && habitData) {
          // Link habit to life path
          await supabase.from("path_habits").insert({
            life_path_id: lifePathId,
            user_id: userId,
            habit_id: habitData.id,
            title: habit.title,
            description: habit.description,
            pillar_id: pillarId,
            frequency: habit.frequency,
            target_per_period: habit.times_per_day,
          });
        }
      }
    }

    // Save quests
    if (expansion.quests && expansion.quests.length > 0) {
      const today = new Date().toISOString().split("T")[0];

      for (const quest of expansion.quests) {
        // Create challenge
        const { data: challenge, error: challengeError } = await supabase
          .from("challenges")
          .insert({
            title: quest.title,
            description: quest.description,
            pillar_id: pillarId,
            difficulty: quest.difficulty,
            xp_reward: quest.xp_reward,
            coin_reward: quest.coin_reward,
            duration_minutes: quest.duration_minutes,
            icon: quest.icon,
            is_daily: false,
            tags: ["ai_generated", "life_path", lifePathId],
          })
          .select("id")
          .single();

        if (!challengeError && challenge) {
          // Assign to user
          await supabase.from("user_daily_quests").insert({
            user_id: userId,
            daily_quest_id: challenge.id,
            assigned_date: today,
          });
        }
      }
    }

    return {
      success: true,
      message: `✅ Created ${expansion.milestones?.length || 0} milestones, ${
        expansion.habits?.length || 0
      } habits, and ${
        expansion.quests?.length || 0
      } quests for your Life Path!`,
    };
  } catch (error) {
    console.error("Error expanding Life Path:", error);
    return {
      success: false,
      message: "Failed to generate action plan. Please try again.",
    };
  }
}

// =====================================================
// SIMPLE TEXT GENERATION
// =====================================================

/**
 * Simple text generation for one-off prompts
 * Used for analyzing achievements, generating descriptions, etc.
 */
export async function generateText(
  prompt: string,
  options: {
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
  } = {}
): Promise<string> {
  return callOpenAI([{ role: "user", content: prompt }], {
    temperature: 0.5,
    max_tokens: 500,
    ...options,
  });
}

// =====================================================
// EXPORTS
// =====================================================

export const questAI = {
  chat: chatWithQuest,
  generateQuests: generatePersonalizedQuests,
  getMorningPlan,
  saveGeneratedQuests,
  saveGeneratedLifePaths,
  saveGeneratedHabits,
  analyzeAssessment: analyzeAssessmentWithAI,
  generateText,
  expandLifePath: expandLifePathWithAI,
};

export default questAI;
