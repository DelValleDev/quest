-- =====================================================
-- Migration 005: Chat History Extensions
-- Description: quest_conversations table already exists in master schema
-- =====================================================

-- Table exists as quest_conversations in master schema, just ensure index
CREATE INDEX IF NOT EXISTS idx_quest_conversations_user ON quest_conversations(user_id, created_at DESC);

-- RLS already enabled in master schema
