import { supabase } from "./supabase";

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
- Supportive but not so soft - you push users to grow
- Use emojis naturally but not excessively
- Speak directly to the user (you, your)
- Be concise - mobile app, not essays
- Celebrate wins, acknowledge struggles
- Give actionable advice, not generic platitudes

You have access to the user's:
- Personality assessment scores (6 pillars: physical, mental, social, professional, spiritual, creative)
- Current goals and class (warrior, sage, connector, creator, achiever, monk)
- Streak and level
- Today's completed and pending quests

Your job:
1. Generate personalized daily quests based on their weak areas and goals
2. Provide motivation and accountability
3. Answer questions about habits, productivity, wellness
4. Help them plan their day/week
5. Celebrate achievements and support through failures

Always respond in the user's language (Spanish if they write in Spanish).`;

const QUEST_GENERATION_PROMPT = `You are a quest generator for a personal development app.

Given the user's profile, generate personalized daily challenges that:
1. Target their WEAKEST pillars (based on assessment scores)
2. Align with their CLASS focus (warrior=physical, sage=mental, connector=social, creator=creative)
3. Are SPECIFIC and ACTIONABLE (not vague like "be more productive")
4. Have clear completion criteria
5. Fit their schedule and lifestyle

For each quest, explain WHY you chose it based on their profile.

Return JSON format only, no markdown:
{
  "quests": [
    {
      "title": "Short catchy title",
      "description": "What to do specifically",
      "pillar_id": "physical|mental|social|professional|spiritual|creative",
      "difficulty": "easy|medium|hard",
      "xp_reward": 15-50,
      "coin_reward": 3-15,
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
 * Chat with Quest AI coach
 */
export async function chatWithQuest(
  userId: string,
  message: string,
  conversationHistory: CoachMessage[] = []
): Promise<string> {
  // Get user profile for context
  const profile = await getUserProfileForAI(userId);

  const systemMessage = `${QUEST_COACH_SYSTEM_PROMPT}

USER PROFILE:
- Name: ${profile.display_name}
- Class: ${profile.user_class}
- Level: ${profile.level}
- Streak: ${profile.current_streak} days
- Pillar scores: ${JSON.stringify(profile.pillar_scores)}
- Weakest area: ${getWeakestPillar(profile.pillar_scores)}
- Strongest area: ${getStrongestPillar(profile.pillar_scores)}`;

  const messages: CoachMessage[] = [
    { role: "system", content: systemMessage },
    ...conversationHistory,
    { role: "user", content: message },
  ];

  const response = await callOpenAI(messages, { temperature: 0.8 });

  // Save conversation to database
  await saveConversation(userId, message, response);

  return response;
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

  const prompt = `${QUEST_GENERATION_PROMPT}

USER PROFILE:
- Name: ${profile.display_name}
- Class: ${profile.user_class} (focus: ${getClassFocus(profile.user_class)})
- Level: ${profile.level}
- Current streak: ${profile.current_streak} days
- Pillar assessment scores (1-100): ${JSON.stringify(profile.pillar_scores)}
- Weakest pillar: ${getWeakestPillar(profile.pillar_scores)}
- Goals: ${profile.goals?.join(", ") || "Not set"}

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

Generate 5-7 quests:
- 2-3 for their WEAKEST pillar
- 2 for their CLASS focus
- 1-2 for balance in other areas

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

async function getUserProfileForAI(userId: string): Promise<UserProfile> {
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
  };
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

async function saveGeneratedQuests(userId: string, quests: GeneratedQuest[]) {
  const today = new Date().toISOString().split("T")[0];

  for (const quest of quests) {
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
        is_ai_generated: true,
      })
      .select("id")
      .single();

    if (challengeError) {
      console.error("Failed to create challenge:", challengeError);
      continue;
    }

    // Then assign to user
    await supabase.from("user_daily_quests").insert({
      user_id: userId,
      daily_quest_id: challenge.id,
      assigned_date: today,
      ai_reason: quest.why_this_quest,
    });
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
// EXPORTS
// =====================================================

export const questAI = {
  chat: chatWithQuest,
  generateQuests: generatePersonalizedQuests,
  getMorningPlan,
  saveGeneratedQuests,
};

export default questAI;
