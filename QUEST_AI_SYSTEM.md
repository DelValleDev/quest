# 🤖 Quest AI System - Complete Documentation

**Date:** December 2025  
**Status:** Implemented ✅

---

## 📋 Overview

Quest AI is the intelligent coach system that makes the app truly personalized. It consists of two main components:

1. **Conversational AI** - Deep chat system that learns about users through questions
2. **Proactive AI Messages** - Contextual, occasional messages celebrating achievements

---

## 🧠 1. Conversational AI System

### Database Schema (Migration 033)

**Table: `user_context_learnings`**
```sql
CREATE TABLE user_context_learnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- motivation, obstacle, dream, fear, habit, pattern, preference
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.80,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, key)
);
```

**Functions:**
- `save_user_learning()` - Upserts learned information (updates if exists, increments confidence)
- `get_user_learnings()` - Gets learnings by category
- `get_user_context_for_ai()` - Returns all learnings in JSON format for AI prompts

### Learning Categories

1. **motivation** - What drives the user ("quiero ser más disciplinado", "mi meta es ser CEO")
2. **obstacle** - Challenges they face ("me cuesta despertarme temprano", "no tengo tiempo")
3. **dream** - Aspirations ("sueño con viajar por el mundo", "quiero tener mi negocio")
4. **fear** - Worries and fears ("me da miedo fracasar", "temo decepcionar a mi familia")
5. **habit** - Habit patterns ("siempre hago ejercicio por la mañana")
6. **pattern** - Behavioral patterns detected over time
7. **preference** - Personal preferences ("prefiero entrenar solo", "odio correr")

### How It Works

**Step 1: Enhanced System Prompt**
- AI is instructed to ask 2-3 deep questions in first conversation
- Always include follow-up questions in responses
- Reference what it has learned in previous conversations

**Step 2: Context Building (`getCompleteUserContext`)**
```typescript
// Fetches user_context_learnings from database
const { data: userLearningsData } = await supabase.rpc(
  "get_user_context_for_ai",
  { p_user_id: userId }
);

// Includes section in AI prompt:
=== WHAT I'VE LEARNED ABOUT YOU ===
motivation:
  • goal: become a software engineer
  • why: want to create impactful products
obstacle:
  • time_constraint: work full-time, only have 2 hours daily
dream:
  • long_term: travel the world while working remotely
```

**Step 3: Automatic Learning Extraction (`extractAndSaveLearnings`)**
```typescript
// Runs after each conversation (non-blocking)
// Uses regex patterns to detect key information
const patterns = {
  motivation: [
    /(?:me motiva|me inspira|mi objetivo es)\s+(.+)/gi,
    // ... more patterns
  ],
  obstacle: [
    /(?:mi problema es|tengo dificultad|me cuesta)\s+(.+)/gi,
  ],
  // ... more categories
};

// Also detects explicit statements:
- "trabajo como X" → preference/occupation
- "tengo X años" → preference/age
- "vivo en X" → preference/location
```

**Step 4: Continuous Improvement**
- Each conversation adds to knowledge base
- Confidence scores increase with repeated information
- AI references learnings: "I remember you mentioned..."

### Key Implementation Files

**`app/src/lib/openai.ts`:**
- `chatWithQuest()` - Main chat function
- `getCompleteUserContext()` - Builds full context including learnings
- `extractAndSaveLearnings()` - Extracts and saves new information
- Enhanced `QUEST_COACH_SYSTEM_PROMPT` with learning instructions

**Example Conversation Flow:**
```
User: "Quiero mejorar mi vida profesional"
AI: "¡Genial! Vamos a trabajar en eso. 🚀 
     ¿Qué significa para ti 'mejorar tu vida profesional'? 
     ¿Buscas un ascenso, cambiar de trabajo, o desarrollar nuevas habilidades?"

→ AI learns: motivation/career_goal = "improve professional life"

User: "Quiero cambiar de trabajo pero me da miedo"
AI: "Entiendo. El miedo al cambio es normal. 
     ¿Qué específicamente te preocupa del cambio? 
     ¿Es la estabilidad económica, el proceso de búsqueda, o algo más?"

→ AI learns: 
   - dream/career_change = true
   - fear/career_change = "miedo al cambio"
```

---

## 💬 2. Proactive AI Messages System

### Database Schema (Migration 032)

**Table: `ai_message_log`**
```sql
CREATE TABLE ai_message_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message_type TEXT NOT NULL,
  message_content TEXT NOT NULL,
  shown_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: `ai_message_preferences`**
```sql
CREATE TABLE ai_message_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  proactive_messages_enabled BOOLEAN DEFAULT true,
  max_messages_per_day INTEGER DEFAULT 5,
  message_types_enabled JSONB DEFAULT '[...]'::jsonb,
  cooldown_minutes INTEGER DEFAULT 30
);
```

**Functions:**
- `should_show_ai_message()` - Checks cooldown and daily limits
- `log_ai_message()` - Records each message shown

### Message Types & Priorities

**Priority Order (highest to lowest):**
1. **all_quests_complete** 🎊 - Completed ALL daily quests
2. **level_up** 🎉 - New level achieved
3. **streak** 🔥 - Streak milestone (7, 14, 30, 60, 100, 365 days)
4. **quest_complete** ✅ - Single quest completed
5. **habit_complete** 💪 - Habit completed
6. **achievement** 🏆 - Achievement unlocked
7. **badge** 🎖️ - Badge earned
8. **duel_win** ⚔️ - Duel victory (to be integrated)
9. **stake_win** 💰 - Stake completed (to be integrated)

### Cooldown System

- **Minimum time between messages:** 30 minutes (configurable)
- **Daily limit:** 5 messages per day (configurable)
- **Priority-based:** Higher priority messages can interrupt cooldown
- **User control:** Can disable or adjust frequency in settings

### How It Works

**Step 1: Event Detection**
```typescript
// In DailyQuestsScreen.tsx
const result = await completeQuest(questId);

// Priority detection:
if (result.all_completed_bonus) {
  messageType = "all_quests_complete";
} else if (result.new_level) {
  messageType = "level_up";
} else if (isStreakMilestone(result.new_streak)) {
  messageType = "streak";
} else {
  messageType = "quest_complete";
}
```

**Step 2: Should Show Check**
```typescript
const shouldShow = await shouldShowMessage(userId, messageType);
// Checks:
// - Is proactive_messages_enabled?
// - Has cooldown period passed?
// - Under daily message limit?
// - Is this message type enabled?
```

**Step 3: Message Generation**
```typescript
const message = await generateProactiveMessage({
  type: messageType,
  userId,
  data: { questTitle, xpEarned, newLevel, etc. }
});

// Two modes:
// 1. AI-generated (personalized, uses OpenAI GPT-4o-mini)
// 2. Template fallback (if AI fails or for speed)
```

**Step 4: Display**
```tsx
<QuestAIToast
  visible={!!aiMessage}
  message={aiMessage}
  onDismiss={() => setAiMessage(null)}
/>
```

### Key Implementation Files

**`app/src/lib/proactiveAI.ts`:**
- `generateProactiveMessage()` - Main entry point
- `shouldShowMessage()` - Cooldown/limit checks
- `generateAIMessage()` - OpenAI integration
- `MESSAGE_TEMPLATES` - Spanish fallback templates
- `buildPromptForContext()` - Personalized prompts per message type

**`app/src/components/QuestAIToast.tsx`:**
- Animated toast component (slide from top)
- Quest AI avatar 🤖 + contextual emoji
- Auto-dismiss after 4 seconds
- Manual dismiss button

**`app/src/hooks/useEventMonitor.ts`:**
- `useAchievementMonitor()` - Real-time achievement unlocks
- `useBadgeMonitor()` - Real-time badge awards
- Uses Supabase Realtime subscriptions

### Integration Points

1. **DailyQuestsScreen.tsx** - quest_complete, level_up, streak, all_quests_complete
2. **HabitsScreen.tsx** - habit_complete
3. **HomeScreen.tsx** - achievement, badge (global monitoring)
4. **DuelsScreen.tsx** - duel_win, stake_win (pending integration)

### Template Examples

**Quest Complete:**
```
"¡Quest completado! 🎯 Cada pequeño paso cuenta."
"¡Bien hecho! 💪 Sigue así y alcanzarás tus metas."
```

**All Quests Complete:**
```
"🎊 ¡INCREÍBLE! ¡Completaste TODOS los quests de hoy! Eres una máquina imparable. 💪✨"
"🌟 ¡DÍA PERFECTO! Cada quest completado. Esto es disciplina de verdad. ¡Sigue así campeón! 🏆"
```

**Level Up:**
```
"🎉 ¡NIVEL {level} ALCANZADO! Tu esfuerzo está dando frutos. ¡Sigamos creciendo!"
"🌟 ¡SUBISTE DE NIVEL! Nivel {level} desbloqueado. Cada nivel es una mejor versión de ti."
```

---

## 🎯 Usage Examples

### Example 1: User Completes All Daily Quests

```typescript
// DailyQuestsScreen.tsx - completeQuest function
const result = await completeQuest(lastQuestId);

if (result.all_completed_bonus) {
  const message = await generateProactiveMessage({
    type: "all_quests_complete",
    userId,
    data: {
      totalQuests: 5,
      totalXP: 150,
      bonusXP: result.all_completed_bonus
    }
  });
  
  setAiMessage(message);
  // Toast appears: "🎊 ¡INCREÍBLE! ¡Completaste TODOS los quests de hoy!..."
}
```

### Example 2: User Chats with Quest AI

```typescript
// User: "Quiero mejorar mi salud pero no tengo tiempo"

// System processes:
1. Fetches complete user context including learnings
2. AI receives context:
   - Life Paths: "Bajar 10kg en 6 meses"
   - Habits: "Caminar 10k pasos" (current_streak: 0)
   - Learnings: obstacle/time_constraint = "no tengo tiempo"

3. AI responds:
   "Entiendo que el tiempo es tu mayor obstáculo. 🤔
    Basándome en tu Life Path de bajar 10kg, ¿qué tal si 
    empezamos con algo muy pequeño? 
    
    ¿Tienes 10 minutos al día? ¿Podrías caminar durante tu 
    almuerzo o mientras hablas por teléfono? 
    
    La clave no es TENER tiempo, es CREAR tiempo. 
    ¿Qué actividad actual podrías reemplazar?"

4. System extracts:
   - obstacle/time_constraint = "no tengo tiempo" (confidence: 0.9)
   - preference/exercise_type = "caminar" (confidence: 0.7)

5. Future conversations will reference this:
   "I remember you struggle with time. Let's keep it to 10 minutes..."
```

---

## 📊 Configuration & Settings

### Default Values

```typescript
const DEFAULT_PREFERENCES = {
  proactive_messages_enabled: true,
  max_messages_per_day: 5,
  cooldown_minutes: 30,
  message_types_enabled: [
    "quest_complete",
    "habit_complete", 
    "level_up",
    "streak",
    "achievement",
    "badge",
    "all_quests_complete",
    "duel_win",
    "stake_win"
  ]
};
```

### User Controls (Future)

In Settings/Profile screen:
- Toggle: "Receive Quest AI messages"
- Slider: "Max messages per day" (1-10)
- Checkboxes: Enable/disable specific message types
- Button: "Clear all learnings" (reset what AI knows)

---

## 🧪 Testing Checklist

- [x] Migration 032 applied successfully
- [x] Migration 033 applied successfully
- [x] Quest completion shows AI message
- [x] Habit completion shows AI message
- [x] Level up detection works
- [x] Streak milestones detected
- [x] All quests complete message has highest priority
- [x] Achievement unlock shows message (real-time)
- [x] Badge unlock shows message (real-time)
- [x] Cooldown prevents spam
- [x] Daily limit respected
- [x] AI learns from conversations
- [x] Learnings appear in subsequent chats
- [ ] Duel win integration (pending DuelsScreen updates)
- [ ] Stake win integration (pending Stakes implementation)
- [ ] User settings panel for preferences

---

## 🚀 Future Enhancements

### Phase 2: Advanced Learning
- Sentiment analysis of user messages
- Pattern recognition (e.g., "user struggles on Mondays")
- Predictive assistance (proactively suggest help before user asks)
- Learning admin panel for users

### Phase 3: ML-Powered Insights
- Behavior prediction models
- Optimal quest timing suggestions
- Personalized difficulty adjustments
- Churn prediction and intervention

### Phase 4: Voice & Multimodal
- Voice chat with Quest AI
- Image recognition for habit verification
- Video coaching sessions
- AR/VR integration

---

## 📝 Notes

- **Privacy:** All learnings stored securely, user can delete anytime
- **Performance:** Learning extraction is non-blocking (async)
- **Scalability:** Learnings table has user_id index
- **Cost:** Using GPT-4o-mini for cost-effectiveness (~$0.15 per 1M tokens)
- **Fallback:** Template messages ensure system works even if OpenAI fails

---

## 🎓 Key Learnings from Implementation

1. **Priority system is crucial** - Users expect celebration for big wins first
2. **Cooldowns prevent annoyance** - Even good messages can be spam if too frequent
3. **Learning extraction is hard** - Regex patterns capture ~60-70%, need improvement
4. **Context is king** - The more AI knows, the better it helps
5. **Real-time monitoring is powerful** - Supabase Realtime makes instant reactions possible

---

**Last Updated:** December 2025  
**Maintained by:** Quest Development Team
