-- =====================================================
-- Migration 018: RevenueCat Purchases Table
-- Description: Track purchases from RevenueCat webhooks
-- =====================================================

CREATE TABLE IF NOT EXISTS public.revenucat_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rc_customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  expiration_date TIMESTAMPTZ,
  store TEXT,
  environment TEXT DEFAULT 'production',
  event_type TEXT NOT NULL,
  raw_event JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rc_purchases_user ON revenucat_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_rc_purchases_customer ON revenucat_purchases(rc_customer_id);

ALTER TABLE public.revenucat_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own purchases" ON public.revenucat_purchases;
CREATE POLICY "Users can view own purchases" ON public.revenucat_purchases
  FOR SELECT USING (auth.uid() = user_id);
