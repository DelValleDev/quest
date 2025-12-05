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
- Supportive but not so soft - you push users to grow
- Use emojis naturally but not excessively
- Speak directly to the user (you, your)
- Be concise - mobile app, not essays
- Celebrate wins, acknowledge struggles
- Give actionable advice, not generic platitudes

You have FULL ACCESS to the user's data:
- Personality assessment scores (6 pillars: physical, mental, social, professional, spiritual, creative)
- Current goals and class (warrior, sage, connector, creator, achiever, monk)
- Streak and level
- ALL their Life Paths (long-term goals) with milestones
- ALL their Habits and completion history
- ALL their Quests (daily challenges) - completed and pending
- Their entire profile and progress

YOU CAN:
1. View and analyze ALL their data
2. Create new Life Paths, Habits, and Quests
3. Modify existing Life Paths, Habits, and Quests
4. Delete or archive Life Paths, Habits, and Quests
5. Provide insights based on their complete history

Your job:
1. Generate personalized daily quests based on their weak areas and goals
2. Provide motivation and accountability
3. Answer questions about habits, productivity, wellness
4. Help them plan their day/week
5. Celebrate achievements and support through failures
6. PROACTIVELY manage their Life Paths, Habits, and Quests based on conversation

Always respond in the user's language (Spanish if they write in Spanish).
When the user asks about their progress or goals, reference their ACTUAL Life Paths, Habits, and Quests.`;

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
      "id, display_name, user_class, level, total_xp, current_streak, pillar_scores, goals, personality_traits"
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
    goals: data.goals || [],
    personality_traits: data.personality_traits || [],
  };
}

/**
 * Get COMPLETE user context for AI (Life Paths, Habits, Quests)
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
    .from("habits")
    .select(
      "id, title, description, pillar_id, frequency, current_streak, times_per_day"
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("current_streak", { ascending: false });

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

  // Build context string
  let context = `USER PROFILE:
- Name: ${profile.display_name}
- Class: ${profile.user_class}
- Level: ${profile.level} (${profile.total_xp} XP)
- Current Streak: ${profile.current_streak} days 🔥
- Pillar Scores: ${JSON.stringify(profile.pillar_scores)}
- Weakest Pillar: ${getWeakestPillar(profile.pillar_scores)}
- Strongest Pillar: ${getStrongestPillar(profile.pillar_scores)}

LIFE PATHS (Long-term Goals):
${
  lifePaths && lifePaths.length > 0
    ? lifePaths
        .map(
          (lp: any) => `
  • ${lp.title} (${lp.pillar_id}) - ${lp.progress_percentage || 0}% complete
    Vision: ${lp.vision_statement || "N/A"}
    Status: ${lp.status}
    Target: ${lp.target_date || "Not set"}
    Milestones:
${
  lp.path_milestones && lp.path_milestones.length > 0
    ? lp.path_milestones
        .map(
          (m: any) =>
            `      - ${m.title} (${m.status})${
              m.completed_date ? ` ✅ Completed: ${m.completed_date}` : ""
            }`
        )
        .join("\n")
    : "      (No milestones yet)"
}
`
        )
        .join("\n")
    : "(No Life Paths created yet)"
}

ACTIVE HABITS:
${
  habits && habits.length > 0
    ? habits
        .map(
          (h: any) => `
  • ${h.title} (${h.pillar_id}) - ${h.frequency}, ${h.times_per_day}x/day
    Streak: ${h.current_streak} days 🔥
    ${h.description || ""}
`
        )
        .join("\n")
    : "(No active habits)"
}

TODAY'S QUESTS:
${
  quests && quests.length > 0
    ? quests
        .map(
          (q: any) => `
  • ${q.challenges?.title || "Unknown"} (${q.challenges?.pillar_id || "N/A"})
    Status: ${q.status} ${q.status === "completed" ? "✅" : "⏳"}
    ${q.challenges?.description || ""}
`
        )
        .join("\n")
    : "(No quests assigned today)"
}

Today's date: ${new Date().toLocaleDateString("es-ES")}`;

  return context;
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
  language: string = "es"
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

  const prompt = `You are analyzing a personality assessment for a gamified self-improvement app called Quest.

${langInstruction}

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
1. 5 initial quests targeting their weakest areas.
2. 2 Life Paths (Long term goals) based on their aspirations. Make sure they are distinct and NOT generic.
3. Each Life Path MUST have 3-5 sequential milestones (small steps to reach the goal).
4. 3 Habits (some linked to Life Paths, some standalone for general wellbeing).

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
};

export default questAI;
