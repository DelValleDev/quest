-- Migration 057: Support System - Tickets, FAQ, Chat Support
-- Description: Sistema completo de soporte con tickets, FAQ y chat

-- ===============================================
-- SUPPORT TICKETS
-- ===============================================

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT CHECK (category IN ('bug', 'feature_request', 'payment', 'account', 'general', 'report_abuse')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')) DEFAULT 'open',
  description TEXT NOT NULL,
  attachments JSONB, -- URLs a screenshots
  assigned_to UUID, -- ID del admin que atiende
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5)
);

CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- FAQ
-- ===============================================

CREATE TABLE faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT, -- emoji
  display_order INTEGER DEFAULT 0
);

CREATE TABLE faq_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES faq_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[], -- Para búsqueda
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- REPORTING ABUSE
-- ===============================================

CREATE TABLE abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_item_type TEXT, -- 'message', 'post', 'profile', 'guild'
  reported_item_id UUID,
  reason TEXT CHECK (reason IN ('spam', 'harassment', 'inappropriate_content', 'impersonation', 'other')),
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'under_review', 'action_taken', 'dismissed')) DEFAULT 'pending',
  reviewed_by UUID, -- Admin que revisó
  action_taken TEXT, -- 'warning', 'temp_ban', 'permanent_ban', 'content_removed', 'no_action'
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- ===============================================
-- RAID PENALTIES (si no existe)
-- ===============================================

CREATE TABLE IF NOT EXISTS raid_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  raid_id UUID REFERENCES raids(id) ON DELETE CASCADE,
  penalty_type TEXT CHECK (penalty_type IN ('warning', 'temp_ban', 'permanent_ban')),
  duration_hours INTEGER,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- ===============================================
-- RAID PENALTY APPEALS
-- ===============================================

CREATE TABLE raid_penalty_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  raid_penalty_id UUID REFERENCES raid_penalties(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, -- Por qué considera injusto el castigo
  evidence TEXT, -- Pruebas
  status TEXT CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')) DEFAULT 'pending',
  admin_response TEXT,
  reviewed_by UUID, -- Admin que revisó
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- ===============================================
-- FUNCIONES
-- ===============================================

-- Función para crear ticket y notificar admins
CREATE OR REPLACE FUNCTION create_support_ticket(
  p_user_id UUID,
  p_subject TEXT,
  p_category TEXT,
  p_description TEXT,
  p_priority TEXT DEFAULT 'medium'
) RETURNS UUID AS $$
DECLARE
  v_ticket_id UUID;
BEGIN
  INSERT INTO support_tickets (user_id, subject, category, priority, description)
  VALUES (p_user_id, p_subject, p_category, p_priority, p_description)
  RETURNING id INTO v_ticket_id;
  
  -- TODO: Trigger notificación a admins
  
  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para aprobar appeal
CREATE OR REPLACE FUNCTION approve_raid_appeal(
  p_appeal_id UUID,
  p_admin_id UUID,
  p_admin_response TEXT
) RETURNS VOID AS $$
DECLARE
  v_penalty_id UUID;
BEGIN
  -- Obtener penalty ID
  SELECT raid_penalty_id INTO v_penalty_id
  FROM raid_penalty_appeals
  WHERE id = p_appeal_id;
  
  -- Actualizar appeal
  UPDATE raid_penalty_appeals
  SET 
    status = 'approved',
    admin_response = p_admin_response,
    reviewed_by = p_admin_id,
    reviewed_at = NOW()
  WHERE id = p_appeal_id;
  
  -- Eliminar penalty
  DELETE FROM raid_penalties WHERE id = v_penalty_id;
  
  -- Restaurar privilegios del usuario si corresponde
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- DATOS INICIALES FAQ
-- ===============================================

-- Categorías FAQ
INSERT INTO faq_categories (name, icon, display_order) VALUES
('Empezando', '🚀', 1),
('Premium', '💎', 2),
('Quest AI', '🤖', 3),
('Guilds', '🏰', 4),
('Problemas Técnicos', '🔧', 5);

-- Artículos FAQ
INSERT INTO faq_articles (category_id, question, answer, keywords) VALUES
(
  (SELECT id FROM faq_categories WHERE name = 'Empezando'),
  '¿Cómo funciona el sistema de XP?',
  'Ganas XP completando tareas, manteniendo rachas y participando en guilds. Cada 1000 XP subes de nivel.',
  ARRAY['xp', 'nivel', 'experiencia', 'subir']
),
(
  (SELECT id FROM faq_categories WHERE name = 'Premium'),
  '¿Qué incluye Quest Premium?',
  'Premium incluye: Quest AI ilimitado, Quest Finanzas, análisis avanzado, Guild Wars, sistema de clases, 500 QC al mes y mucho más.',
  ARRAY['premium', 'precio', 'características', 'features']
),
(
  (SELECT id FROM faq_categories WHERE name = 'Quest AI'),
  '¿Quest AI puede ver mis mensajes privados?',
  'No. Quest AI solo analiza mensajes en guilds donde está activado. Tus mensajes privados y datos sensibles están protegidos con end-to-end encryption.',
  ARRAY['privacidad', 'seguridad', 'quest ai', 'mensajes']
),
(
  (SELECT id FROM faq_categories WHERE name = 'Guilds'),
  '¿Qué pasa si me expulsan de una raid?',
  'Recibes un raid penalty que te impide unirte a raids por un tiempo. Si crees que es injusto, puedes apelar en la sección de Soporte.',
  ARRAY['raid', 'expulsar', 'penalty', 'castigo']
);

-- Indexes
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id, status);
CREATE INDEX idx_support_tickets_status ON support_tickets(status) WHERE status IN ('open', 'in_progress');
CREATE INDEX idx_abuse_reports_status ON abuse_reports(status) WHERE status = 'pending';
CREATE INDEX idx_raid_appeals_status ON raid_penalty_appeals(status) WHERE status = 'pending';
CREATE INDEX idx_faq_articles_category ON faq_articles(category_id, display_order);

COMMENT ON TABLE support_tickets IS 'Sistema de tickets de soporte con categorías y prioridades';
COMMENT ON TABLE raid_penalty_appeals IS 'Sistema de apelación para castigos de raids injustos';
