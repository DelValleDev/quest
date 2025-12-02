-- =====================================================
-- QUEST APP - DAILY QUESTS & ACHIEVEMENTS
-- Run this in Supabase SQL Editor AFTER schema.sql
-- =====================================================



INSERT INTO public.challenges (title, description, pillar_id, difficulty, xp_reward, coin_reward, duration_minutes, is_daily, icon) VALUES
  ('Morning Warrior', 'Do 20 push-ups when you wake up', 'physical', 'medium', 25, 6, 5, true, '💪'),
  ('Stairway to Health', 'Take the stairs instead of elevator all day', 'physical', 'easy', 15, 3, null, true, '🏃'),
  ('Posture Check', 'Correct your posture every hour for a day', 'physical', 'easy', 15, 3, null, true, '🧍'),
  ('Cold Shower Challenge', 'End your shower with 30 seconds of cold water', 'physical', 'hard', 40, 12, 1, true, '🚿'),
  ('7-Minute Workout', 'Complete a quick high-intensity workout', 'physical', 'medium', 30, 8, 7, true, '⚡'),
  ('Yoga Flow', 'Complete a 15-minute yoga session', 'physical', 'medium', 25, 6, 15, true, '🧘‍♀️'),
  ('Step Master', 'Walk 10,000 steps today', 'physical', 'hard', 50, 15, null, true, '👟'),
  ('Early Bird', 'Wake up before 7 AM', 'physical', 'medium', 25, 6, null, true, '🌅'),
  ('Sleep Champion', 'Get 8 hours of sleep tonight', 'physical', 'medium', 25, 6, null, true, '😴'),
  ('Plank Challenge', 'Hold a plank for 1 minute', 'physical', 'medium', 20, 5, 1, true, '🏋️'),
  ('Stretching Routine', 'Complete morning and evening stretches', 'physical', 'easy', 20, 5, 20, true, '🤸'),
  ('Healthy Meal', 'Prepare and eat a nutritious homemade meal', 'physical', 'medium', 25, 6, 30, true, '🥗'),
  ('No Caffeine After Noon', 'Avoid caffeine after 12 PM', 'physical', 'hard', 35, 10, null, true, '☕'),
  ('Dance Break', 'Dance for 10 minutes to your favorite music', 'physical', 'easy', 20, 5, 10, true, '💃'),
  ('Eye Rest Protocol', 'Take a screen break every 20 minutes', 'physical', 'medium', 25, 6, null, true, '👀');

INSERT INTO public.challenges (title, description, pillar_id, difficulty, xp_reward, coin_reward, duration_minutes, is_daily, icon) VALUES
  ('Morning Pages', 'Write 3 pages of stream-of-consciousness', 'mental', 'medium', 30, 8, 20, true, '📝'),
  ('Puzzle Master', 'Solve a puzzle, crossword, or brain teaser', 'mental', 'easy', 20, 5, 15, true, '🧩'),
  ('Language Learner', 'Practice a new language for 10 minutes', 'mental', 'medium', 25, 6, 10, true, '🗣️'),
  ('Memory Palace', 'Memorize 5 new facts or vocabulary words', 'mental', 'medium', 25, 6, 15, true, '🧠'),
  ('Breathwork Session', 'Practice deep breathing for 5 minutes', 'mental', 'easy', 15, 3, 5, true, '🌬️'),
  ('Podcast Wisdom', 'Listen to an educational podcast', 'mental', 'easy', 20, 5, 30, true, '🎧'),
  ('Zero Complaints', 'Go the entire day without complaining', 'mental', 'hard', 45, 12, null, true, '😌'),
  ('Focus Block', 'Work with full focus for 45 minutes', 'mental', 'medium', 30, 8, 45, true, '🎯'),
  ('News Fasting', 'Avoid negative news for the entire day', 'mental', 'medium', 25, 6, null, true, '📰'),
  ('Affirmation Practice', 'Recite 5 positive affirmations', 'mental', 'easy', 15, 3, 5, true, '💭'),
  ('Visualization', 'Spend 10 minutes visualizing your goals', 'mental', 'medium', 25, 6, 10, true, '🌟'),
  ('Journaling Session', 'Write in your journal for 15 minutes', 'mental', 'easy', 20, 5, 15, true, '📓'),
  ('TED Talk Time', 'Watch a TED Talk or educational video', 'mental', 'easy', 20, 5, 20, true, '🎬'),
  ('Chess Game', 'Play a game of chess or strategy game', 'mental', 'medium', 25, 6, 15, true, '♟️'),
  ('Mindful Eating', 'Eat one meal mindfully without distractions', 'mental', 'medium', 25, 6, 20, true, '🍽️');

INSERT INTO public.challenges (title, description, pillar_id, difficulty, xp_reward, coin_reward, duration_minutes, is_daily, icon) VALUES
  ('Video Call Friend', 'Have a video call with a friend or family', 'social', 'medium', 30, 8, 15, true, '📱'),
  ('Thank You Note', 'Send a thank you message to someone', 'social', 'easy', 15, 3, 5, true, '💌'),
  ('Active Listening', 'Have a conversation where you only listen', 'social', 'medium', 25, 6, 15, true, '👂'),
  ('New Connection', 'Introduce yourself to someone new', 'social', 'hard', 40, 12, 10, true, '🤗'),
  ('Family Time', 'Spend quality time with family (no phones)', 'social', 'medium', 30, 8, 30, true, '👨‍👩‍👧'),
  ('Share Knowledge', 'Teach someone something you know', 'social', 'medium', 30, 8, 15, true, '📖'),
  ('Apologize', 'Sincerely apologize for something', 'social', 'hard', 35, 10, 5, true, '🕊️'),
  ('Deep Conversation', 'Have a meaningful conversation (no small talk)', 'social', 'medium', 30, 8, 20, true, '💬'),
  ('Check-In', 'Ask someone how they are really doing', 'social', 'easy', 20, 5, 10, true, '❤️'),
  ('Social Media Cleanse', 'No social media for the entire day', 'social', 'hard', 50, 15, null, true, '🚫');

INSERT INTO public.challenges (title, description, pillar_id, difficulty, xp_reward, coin_reward, duration_minutes, is_daily, icon) VALUES
  ('Inbox Zero', 'Clear your email inbox completely', 'professional', 'medium', 30, 8, 30, true, '📧'),
  ('Weekly Review', 'Review and plan your week ahead', 'professional', 'medium', 30, 8, 30, true, '📅'),
  ('Skill Building', 'Take an online course lesson', 'professional', 'medium', 30, 8, 30, true, '🎓'),
  ('Network Growth', 'Connect with someone in your industry', 'professional', 'medium', 25, 6, 15, true, '🔗'),
  ('Side Project', 'Work on a personal project for 30 minutes', 'professional', 'medium', 30, 8, 30, true, '🚀'),
  ('Clean Workspace', 'Organize and clean your work area', 'professional', 'easy', 20, 5, 15, true, '🧹'),
  ('Portfolio Update', 'Update your portfolio or resume', 'professional', 'medium', 30, 8, 30, true, '💼'),
  ('Read Industry News', 'Stay updated on your field', 'professional', 'easy', 20, 5, 15, true, '📰'),
  ('Two-Minute Tasks', 'Complete all tasks that take under 2 minutes', 'professional', 'easy', 20, 5, 15, true, '⏱️'),
  ('Pomodoro Session', 'Complete 4 pomodoro work sessions', 'professional', 'hard', 50, 15, 120, true, '🍅');

INSERT INTO public.challenges (title, description, pillar_id, difficulty, xp_reward, coin_reward, duration_minutes, is_daily, icon) VALUES
  ('Sunrise Watch', 'Watch the sunrise mindfully', 'spiritual', 'medium', 30, 8, 15, true, '🌅'),
  ('Sunset Reflection', 'Watch the sunset and reflect on your day', 'spiritual', 'medium', 25, 6, 15, true, '🌇'),
  ('Acts of Kindness', 'Perform 3 random acts of kindness', 'spiritual', 'medium', 35, 10, null, true, '💫'),
  ('Gratitude List', 'Write 10 things you are grateful for', 'spiritual', 'easy', 20, 5, 10, true, '📝'),
  ('Forgiveness Practice', 'Forgive someone (even if just in your heart)', 'spiritual', 'hard', 40, 12, 10, true, '🕊️'),
  ('Silent Hour', 'Spend 1 hour in complete silence', 'spiritual', 'hard', 40, 12, 60, true, '🤫'),
  ('Value Alignment', 'Check if today aligned with your core values', 'spiritual', 'medium', 25, 6, 10, true, '⚖️'),
  ('Prayer/Intention', 'Set intentions or pray for 10 minutes', 'spiritual', 'easy', 20, 5, 10, true, '🙏'),
  ('Declutter Mind', 'Do a brain dump - write all your thoughts', 'spiritual', 'easy', 20, 5, 15, true, '🧘'),
  ('Star Gazing', 'Spend time looking at the stars or sky', 'spiritual', 'easy', 25, 6, 15, true, '⭐');

INSERT INTO public.challenges (title, description, pillar_id, difficulty, xp_reward, coin_reward, duration_minutes, is_daily, icon) VALUES
  ('Photo of the Day', 'Take an artistic photo', 'creative', 'easy', 15, 3, 5, true, '📸'),
  ('Doodle Challenge', 'Fill a page with doodles', 'creative', 'easy', 20, 5, 15, true, '✏️'),
  ('Music Creation', 'Create a melody or beat', 'creative', 'medium', 30, 8, 20, true, '🎵'),
  ('Poetry Writing', 'Write a short poem or haiku', 'creative', 'medium', 25, 6, 15, true, '📜'),
  ('Cook Something New', 'Try a new recipe or create your own', 'creative', 'medium', 30, 8, 45, true, '👨‍🍳'),
  ('Crafting Time', 'Make something with your hands', 'creative', 'medium', 30, 8, 30, true, '🎨'),
  ('Creative Writing', 'Write a short story or scene', 'creative', 'medium', 30, 8, 30, true, '✍️'),
  ('Music Discovery', 'Listen to a new music genre or artist', 'creative', 'easy', 15, 3, 20, true, '🎶'),
  ('Color Your World', 'Color in an adult coloring book', 'creative', 'easy', 20, 5, 20, true, '🖍️'),
  ('Idea Generation', 'Brainstorm 10 ideas for anything', 'creative', 'easy', 20, 5, 15, true, '💡');

-- Ensure we have the correct achievements schema.
-- WARNING: The following DROP statements will remove existing achievements data if present.
-- If you need to preserve existing data, create a backup first or skip the DROP steps.
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Category
  category TEXT NOT NULL, -- streak, challenges, pillar, special, milestone
  pillar_id TEXT REFERENCES public.pillars(id), -- null for general achievements
  
  -- Rewards
  xp_reward INTEGER DEFAULT 50,
  coin_reward INTEGER DEFAULT 10,
  
  -- Requirements
  requirement_type TEXT NOT NULL, -- challenges_completed, streak_days, pillar_level, total_xp, coins_earned, etc.
  requirement_value INTEGER NOT NULL,
  
  -- Display
  icon TEXT NOT NULL,
  rarity TEXT DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  is_hidden BOOLEAN DEFAULT false, -- secret achievements
  
  -- Order for display
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

-- =====================================================
-- STREAK ACHIEVEMENTS (15)
-- =====================================================
INSERT INTO public.achievements (name, description, category, requirement_type, requirement_value, icon, rarity, order_index) VALUES
  ('First Flame', 'Complete your first day', 'streak', 'streak_days', 1, '🔥', 'common', 1),
  ('Warm Up', 'Maintain a 3-day streak', 'streak', 'streak_days', 3, '🔥', 'common', 2),
  ('Getting Hot', 'Maintain a 7-day streak', 'streak', 'streak_days', 7, '🔥', 'uncommon', 3),
  ('On Fire', 'Maintain a 14-day streak', 'streak', 'streak_days', 14, '🔥', 'uncommon', 4),
  ('Blazing', 'Maintain a 21-day streak', 'streak', 'streak_days', 21, '🔥', 'rare', 5),
  ('Month Warrior', 'Maintain a 30-day streak', 'streak', 'streak_days', 30, '⚔️', 'rare', 6),
  ('Habit Former', 'Maintain a 60-day streak', 'streak', 'streak_days', 60, '💪', 'epic', 7),
  ('Century Club', 'Maintain a 100-day streak', 'streak', 'streak_days', 100, '💯', 'epic', 8),
  ('Half Year Hero', 'Maintain a 180-day streak', 'streak', 'streak_days', 180, '🏆', 'legendary', 9),
  ('Year Master', 'Maintain a 365-day streak', 'streak', 'streak_days', 365, '👑', 'legendary', 10),
  ('Weekend Warrior', 'Complete quests on 4 consecutive weekends', 'streak', 'weekend_streak', 4, '📅', 'uncommon', 11),
  ('Early Riser', 'Complete morning quests 7 days in a row', 'streak', 'morning_streak', 7, '🌅', 'uncommon', 12),
  ('Night Owl Pro', 'Complete evening quests 7 days in a row', 'streak', 'evening_streak', 7, '🌙', 'uncommon', 13),
  ('Consistent', 'No missed days in a month', 'streak', 'perfect_month', 1, '✅', 'rare', 14),
  ('Unstoppable', 'Maintain a 500-day streak', 'streak', 'streak_days', 500, '🚀', 'legendary', 15);

-- =====================================================
-- CHALLENGE COUNT ACHIEVEMENTS (15)
-- =====================================================
INSERT INTO public.achievements (name, description, category, requirement_type, requirement_value, icon, rarity, order_index) VALUES
  ('First Quest', 'Complete your first challenge', 'challenges', 'challenges_completed', 1, '⭐', 'common', 16),
  ('Getting Started', 'Complete 5 challenges', 'challenges', 'challenges_completed', 5, '⭐', 'common', 17),
  ('Adventurer', 'Complete 10 challenges', 'challenges', 'challenges_completed', 10, '🗡️', 'common', 18),
  ('Quest Seeker', 'Complete 25 challenges', 'challenges', 'challenges_completed', 25, '🗡️', 'uncommon', 19),
  ('Challenger', 'Complete 50 challenges', 'challenges', 'challenges_completed', 50, '⚔️', 'uncommon', 20),
  ('Quest Master', 'Complete 100 challenges', 'challenges', 'challenges_completed', 100, '⚔️', 'rare', 21),
  ('Veteran', 'Complete 200 challenges', 'challenges', 'challenges_completed', 200, '🛡️', 'rare', 22),
  ('Elite', 'Complete 500 challenges', 'challenges', 'challenges_completed', 500, '🏅', 'epic', 23),
  ('Champion', 'Complete 1000 challenges', 'challenges', 'challenges_completed', 1000, '🏆', 'epic', 24),
  ('Legendary Hero', 'Complete 2500 challenges', 'challenges', 'challenges_completed', 2500, '👑', 'legendary', 25),
  ('Daily Devotee', 'Complete 50 daily quests', 'challenges', 'daily_completed', 50, '📅', 'uncommon', 26),
  ('Daily Master', 'Complete 200 daily quests', 'challenges', 'daily_completed', 200, '📅', 'rare', 27),
  ('Hard Mode', 'Complete 10 hard challenges', 'challenges', 'hard_completed', 10, '💀', 'rare', 28),
  ('Epic Hunter', 'Complete 5 epic challenges', 'challenges', 'epic_completed', 5, '🔮', 'epic', 29),
  ('All-Rounder', 'Complete a challenge from each pillar in one day', 'challenges', 'all_pillars_day', 1, '🌈', 'rare', 30);

-- PILLAR MASTERY - PHYSICAL (10)
INSERT INTO public.achievements (name, description, category, pillar_id, requirement_type, requirement_value, icon, rarity, order_index) VALUES
  ('Body Beginner', 'Reach Physical level 5', 'pillar', 'physical', 'pillar_level', 5, '💪', 'common', 31),
  ('Fitness Fanatic', 'Reach Physical level 10', 'pillar', 'physical', 'pillar_level', 10, '🏋️', 'uncommon', 32),
  ('Iron Body', 'Reach Physical level 25', 'pillar', 'physical', 'pillar_level', 25, '🦾', 'rare', 33),
  ('Physical Peak', 'Reach Physical level 50', 'pillar', 'physical', 'pillar_level', 50, '⚡', 'epic', 34),
  ('Physical Titan', 'Reach Physical level 100', 'pillar', 'physical', 'pillar_level', 100, '🏆', 'legendary', 35),
  ('Hydration Master', 'Complete water challenges 30 times', 'pillar', 'physical', 'challenge_type', 30, '💧', 'uncommon', 36),
  ('Sleep Expert', 'Maintain good sleep for 30 days', 'pillar', 'physical', 'sleep_streak', 30, '😴', 'rare', 37),
  ('Marathon Runner', 'Walk/run 100km total', 'pillar', 'physical', 'distance_km', 100, '🏃', 'rare', 38),
  ('Yoga Master', 'Complete 50 yoga sessions', 'pillar', 'physical', 'yoga_completed', 50, '🧘', 'rare', 39),
  ('Physical Legend', 'Complete 500 physical challenges', 'pillar', 'physical', 'pillar_challenges', 500, '💪', 'legendary', 40);

-- PILLAR MASTERY - MENTAL (10)
INSERT INTO public.achievements (name, description, category, pillar_id, requirement_type, requirement_value, icon, rarity, order_index) VALUES
  ('Mind Opener', 'Reach Mental level 5', 'pillar', 'mental', 'pillar_level', 5, '🧠', 'common', 41),
  ('Deep Thinker', 'Reach Mental level 10', 'pillar', 'mental', 'pillar_level', 10, '💭', 'uncommon', 42),
  ('Wise One', 'Reach Mental level 25', 'pillar', 'mental', 'pillar_level', 25, '📚', 'rare', 43),
  ('Sage', 'Reach Mental level 50', 'pillar', 'mental', 'pillar_level', 50, '🔮', 'epic', 44),
  ('Mental Master', 'Reach Mental level 100', 'pillar', 'mental', 'pillar_level', 100, '👑', 'legendary', 45),
  ('Bookworm', 'Complete 50 reading challenges', 'pillar', 'mental', 'reading_completed', 50, '📖', 'rare', 46),
  ('Zen Master', 'Complete 100 meditation sessions', 'pillar', 'mental', 'meditation_completed', 100, '🧘‍♂️', 'epic', 47),
  ('Focus Champion', 'Complete 50 focus sessions', 'pillar', 'mental', 'focus_completed', 50, '🎯', 'rare', 48),
  ('Learner', 'Complete 100 learning challenges', 'pillar', 'mental', 'learning_completed', 100, '🎓', 'epic', 49),
  ('Mental Legend', 'Complete 500 mental challenges', 'pillar', 'mental', 'pillar_challenges', 500, '🧠', 'legendary', 50);

-- PILLAR MASTERY - SOCIAL (10)
INSERT INTO public.achievements (name, description, category, pillar_id, requirement_type, requirement_value, icon, rarity, order_index) VALUES
  ('Social Butterfly', 'Reach Social level 5', 'pillar', 'social', 'pillar_level', 5, '🦋', 'common', 51),
  ('Connector', 'Reach Social level 10', 'pillar', 'social', 'pillar_level', 10, '🤝', 'uncommon', 52),
  ('Networker', 'Reach Social level 25', 'pillar', 'social', 'pillar_level', 25, '🔗', 'rare', 53),
  ('Community Builder', 'Reach Social level 50', 'pillar', 'social', 'pillar_level', 50, '🏘️', 'epic', 54),
  ('Social Master', 'Reach Social level 100', 'pillar', 'social', 'pillar_level', 100, '👑', 'legendary', 55),
  ('Kindness King', 'Complete 50 kindness challenges', 'pillar', 'social', 'kindness_completed', 50, '❤️', 'rare', 56),
  ('Good Listener', 'Complete 25 listening challenges', 'pillar', 'social', 'listening_completed', 25, '👂', 'uncommon', 57),
  ('Family First', 'Complete 50 family challenges', 'pillar', 'social', 'family_completed', 50, '👨‍👩‍👧', 'rare', 58),
  ('Friend Forever', 'Reach out to friends 100 times', 'pillar', 'social', 'friend_contact', 100, '💬', 'epic', 59),
  ('Social Legend', 'Complete 500 social challenges', 'pillar', 'social', 'pillar_challenges', 500, '👥', 'legendary', 60);

-- PILLAR MASTERY - PROFESSIONAL (10)
INSERT INTO public.achievements (name, description, category, pillar_id, requirement_type, requirement_value, icon, rarity, order_index) VALUES
  ('Go-Getter', 'Reach Professional level 5', 'pillar', 'professional', 'pillar_level', 5, '💼', 'common', 61),
  ('Productive', 'Reach Professional level 10', 'pillar', 'professional', 'pillar_level', 10, '📈', 'uncommon', 62),
  ('High Achiever', 'Reach Professional level 25', 'pillar', 'professional', 'pillar_level', 25, '🎯', 'rare', 63),
  ('Executive', 'Reach Professional level 50', 'pillar', 'professional', 'pillar_level', 50, '👔', 'epic', 64),
  ('Professional Master', 'Reach Professional level 100', 'pillar', 'professional', 'pillar_level', 100, '👑', 'legendary', 65),
  ('Inbox Hero', 'Reach inbox zero 30 times', 'pillar', 'professional', 'inbox_zero', 30, '📧', 'rare', 66),
  ('Skill Builder', 'Complete 50 skill challenges', 'pillar', 'professional', 'skill_completed', 50, '🛠️', 'rare', 67),
  ('Deep Worker', 'Complete 100 deep work sessions', 'pillar', 'professional', 'deepwork_completed', 100, '💻', 'epic', 68),
  ('Planner Pro', 'Complete 100 planning challenges', 'pillar', 'professional', 'planning_completed', 100, '📅', 'epic', 69),
  ('Professional Legend', 'Complete 500 professional challenges', 'pillar', 'professional', 'pillar_challenges', 500, '💼', 'legendary', 70);

-- PILLAR MASTERY - SPIRITUAL (10)
INSERT INTO public.achievements (name, description, category, pillar_id, requirement_type, requirement_value, icon, rarity, order_index) VALUES
  ('Soul Seeker', 'Reach Spiritual level 5', 'pillar', 'spiritual', 'pillar_level', 5, '✨', 'common', 71),
  ('Mindful One', 'Reach Spiritual level 10', 'pillar', 'spiritual', 'pillar_level', 10, '🙏', 'uncommon', 72),
  ('Enlightened', 'Reach Spiritual level 25', 'pillar', 'spiritual', 'pillar_level', 25, '🌟', 'rare', 73),
  ('Spiritual Guide', 'Reach Spiritual level 50', 'pillar', 'spiritual', 'pillar_level', 50, '🔮', 'epic', 74),
  ('Spiritual Master', 'Reach Spiritual level 100', 'pillar', 'spiritual', 'pillar_level', 100, '👑', 'legendary', 75),
  ('Grateful Heart', 'Complete 100 gratitude entries', 'pillar', 'spiritual', 'gratitude_completed', 100, '💖', 'epic', 76),
  ('Reflector', 'Complete 50 reflection challenges', 'pillar', 'spiritual', 'reflection_completed', 50, '🪞', 'rare', 77),
  ('Nature Lover', 'Spend 50 sessions in nature', 'pillar', 'spiritual', 'nature_completed', 50, '🌿', 'rare', 78),
  ('Inner Peace', 'Complete 100 spiritual challenges', 'pillar', 'spiritual', 'pillar_challenges', 100, '☮️', 'epic', 79),
  ('Spiritual Legend', 'Complete 500 spiritual challenges', 'pillar', 'spiritual', 'pillar_challenges', 500, '✨', 'legendary', 80);

-- PILLAR MASTERY - CREATIVE (10)
INSERT INTO public.achievements (name, description, category, pillar_id, requirement_type, requirement_value, icon, rarity, order_index) VALUES
  ('Creative Spark', 'Reach Creative level 5', 'pillar', 'creative', 'pillar_level', 5, '💡', 'common', 81),
  ('Artist', 'Reach Creative level 10', 'pillar', 'creative', 'pillar_level', 10, '🎨', 'uncommon', 82),
  ('Innovator', 'Reach Creative level 25', 'pillar', 'creative', 'pillar_level', 25, '🚀', 'rare', 83),
  ('Visionary', 'Reach Creative level 50', 'pillar', 'creative', 'pillar_level', 50, '🔮', 'epic', 84),
  ('Creative Master', 'Reach Creative level 100', 'pillar', 'creative', 'pillar_level', 100, '👑', 'legendary', 85),
  ('Wordsmith', 'Complete 50 writing challenges', 'pillar', 'creative', 'writing_completed', 50, '✍️', 'rare', 86),
  ('Photographer', 'Take 100 photos', 'pillar', 'creative', 'photos_taken', 100, '📸', 'rare', 87),
  ('Musician', 'Complete 50 music challenges', 'pillar', 'creative', 'music_completed', 50, '🎵', 'rare', 88),
  ('Doodler', 'Complete 100 drawing challenges', 'pillar', 'creative', 'drawing_completed', 100, '✏️', 'epic', 89),
  ('Creative Legend', 'Complete 500 creative challenges', 'pillar', 'creative', 'pillar_challenges', 500, '🎨', 'legendary', 90);

-- SPECIAL ACHIEVEMENTS (15)
INSERT INTO public.achievements (name, description, category, requirement_type, requirement_value, icon, rarity, is_hidden, order_index) VALUES
  ('Night Owl', 'Complete a challenge after midnight', 'special', 'late_night', 1, '🦉', 'uncommon', false, 91),
  ('Early Bird', 'Complete a challenge before 6 AM', 'special', 'early_morning', 1, '🐦', 'uncommon', false, 92),
  ('Speed Runner', 'Complete 5 challenges in one day', 'special', 'daily_challenges', 5, '⚡', 'rare', false, 93),
  ('Perfect Day', 'Complete challenges from all 6 pillars in one day', 'special', 'all_pillars_day', 1, '🌈', 'rare', false, 94),
  ('Comeback Kid', 'Return after 7+ days and complete a challenge', 'special', 'comeback', 1, '🔙', 'uncommon', true, 95),
  ('New Year New You', 'Complete a challenge on January 1st', 'special', 'new_year', 1, '🎆', 'uncommon', true, 96),
  ('Birthday Quest', 'Complete a challenge on your birthday', 'special', 'birthday', 1, '🎂', 'rare', true, 97),
  ('Midnight Warrior', 'Complete a challenge at exactly midnight', 'special', 'midnight', 1, '🌙', 'epic', true, 98),
  ('Balance Master', 'Have all pillars at the same level (10+)', 'special', 'balanced_pillars', 10, '⚖️', 'epic', false, 99),
  ('First of Many', 'Complete a challenge on the 1st of the month', 'special', 'first_of_month', 1, '📆', 'common', false, 100),
  ('Weekend Warrior Plus', 'Complete 10 challenges on weekends', 'special', 'weekend_challenges', 10, '📅', 'uncommon', false, 101),
  ('Dedication', 'Use the app for 30 days total', 'special', 'days_active', 30, '📱', 'rare', false, 102),
  ('Veteran User', 'Use the app for 100 days total', 'special', 'days_active', 100, '🎖️', 'epic', false, 103),
  ('One Year Anniversary', 'Use the app for 365 days', 'special', 'days_active', 365, '🎉', 'legendary', false, 104),
  ('Secret Master', 'Unlock all hidden achievements', 'special', 'hidden_unlocked', 5, '🔓', 'legendary', true, 105);

-- XP & LEVEL ACHIEVEMENTS (10)
INSERT INTO public.achievements (name, description, category, requirement_type, requirement_value, icon, rarity, order_index) VALUES
  ('XP Hunter', 'Earn 1,000 total XP', 'milestone', 'total_xp', 1000, '✨', 'common', 106),
  ('XP Collector', 'Earn 5,000 total XP', 'milestone', 'total_xp', 5000, '⭐', 'uncommon', 107),
  ('XP Master', 'Earn 25,000 total XP', 'milestone', 'total_xp', 25000, '🌟', 'rare', 108),
  ('XP Legend', 'Earn 100,000 total XP', 'milestone', 'total_xp', 100000, '💫', 'epic', 109),
  ('XP God', 'Earn 500,000 total XP', 'milestone', 'total_xp', 500000, '👑', 'legendary', 110),
  ('Level 5', 'Reach overall level 5', 'milestone', 'user_level', 5, '📊', 'common', 111),
  ('Level 10', 'Reach overall level 10', 'milestone', 'user_level', 10, '📊', 'uncommon', 112),
  ('Level 25', 'Reach overall level 25', 'milestone', 'user_level', 25, '📊', 'rare', 113),
  ('Level 50', 'Reach overall level 50', 'milestone', 'user_level', 50, '📊', 'epic', 114),
  ('Level 100', 'Reach overall level 100', 'milestone', 'user_level', 100, '👑', 'legendary', 115);

-- COIN ACHIEVEMENTS (10)
INSERT INTO public.achievements (name, description, category, requirement_type, requirement_value, icon, rarity, order_index) VALUES
  ('Coin Collector', 'Earn 500 Quest Coins', 'milestone', 'coins_earned', 500, '🪙', 'common', 116),
  ('Treasure Hunter', 'Earn 2,500 Quest Coins', 'milestone', 'coins_earned', 2500, '💰', 'uncommon', 117),
  ('Wealthy', 'Earn 10,000 Quest Coins', 'milestone', 'coins_earned', 10000, '💎', 'rare', 118),
  ('Rich', 'Earn 50,000 Quest Coins', 'milestone', 'coins_earned', 50000, '🏦', 'epic', 119),
  ('Millionaire', 'Earn 100,000 Quest Coins', 'milestone', 'coins_earned', 100000, '👑', 'legendary', 120),
  ('First Purchase', 'Buy something from the shop', 'milestone', 'shop_purchases', 1, '🛒', 'common', 121),
  ('Shopper', 'Make 10 shop purchases', 'milestone', 'shop_purchases', 10, '🛍️', 'uncommon', 122),
  ('Big Spender', 'Spend 10,000 Quest Coins', 'milestone', 'coins_spent', 10000, '💸', 'rare', 123),
  ('Saver', 'Have 5,000 Quest Coins at once', 'milestone', 'coins_balance', 5000, '🏧', 'uncommon', 124),
  ('Hoarder', 'Have 25,000 Quest Coins at once', 'milestone', 'coins_balance', 25000, '🏰', 'epic', 125);

-- =====================================================
-- DAILY QUEST ROTATION TABLE
-- Tracks which daily quests are available each day
-- =====================================================
CREATE TABLE IF NOT EXISTS public.daily_quest_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN DEFAULT false,
  
  UNIQUE(user_id, challenge_id, date)
);

-- RLS Policies
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quest_pool ENABLE ROW LEVEL SECURITY;

-- Anyone can read achievements
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

-- Users can manage their own user_achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can manage their own daily_quest_pool
CREATE POLICY "Users can view own daily quests" ON public.daily_quest_pool
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily quests" ON public.daily_quest_pool
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily quests" ON public.daily_quest_pool
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTION: Generate daily quests for user
-- Gives 6 random daily quests (1 per pillar)
-- =====================================================
CREATE OR REPLACE FUNCTION generate_daily_quests(p_user_id UUID)
RETURNS SETOF public.daily_quest_pool
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pillar TEXT;
  v_challenge_id UUID;
  v_date DATE := CURRENT_DATE;
BEGIN
  -- Check if already generated today
  IF EXISTS (SELECT 1 FROM public.daily_quest_pool WHERE user_id = p_user_id AND date = v_date) THEN
    RETURN QUERY SELECT * FROM public.daily_quest_pool WHERE user_id = p_user_id AND date = v_date;
    RETURN;
  END IF;

  -- Generate one quest per pillar
  FOR v_pillar IN SELECT id FROM public.pillars LOOP
    -- Get random daily challenge for this pillar
    SELECT id INTO v_challenge_id
    FROM public.challenges
    WHERE pillar_id = v_pillar AND is_daily = true
    ORDER BY RANDOM()
    LIMIT 1;

    IF v_challenge_id IS NOT NULL THEN
      INSERT INTO public.daily_quest_pool (user_id, challenge_id, date)
      VALUES (p_user_id, v_challenge_id, v_date);
    END IF;
  END LOOP;

  RETURN QUERY SELECT * FROM public.daily_quest_pool WHERE user_id = p_user_id AND date = v_date;
END;
$$;
