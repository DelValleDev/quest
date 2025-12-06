-- =====================================================
-- Migration 009: Subscription History Extensions
-- Description: payment_history table already exists in master schema
-- =====================================================

-- Table exists as payment_history in master schema, just ensure index
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id, created_at DESC);

-- RLS already enabled in master schema
