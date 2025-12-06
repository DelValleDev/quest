-- Migration 059: Quest Finanzas - Sistema completo de finanzas personales (PREMIUM CRÍTICO)
-- Description: Control de gastos, presupuestos, metas de ahorro, asesor financiero con IA

-- ===============================================
-- FINANCIAL TRACKING
-- ===============================================

CREATE TABLE IF NOT EXISTS financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Cuenta Corriente", "Efectivo", "Ahorros"
  type TEXT CHECK (type IN ('checking', 'savings', 'cash', 'credit_card', 'investment')),
  balance DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES financial_accounts(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('income', 'expense', 'transfer')) NOT NULL,
  category TEXT NOT NULL, -- "Comida", "Transporte", "Entretenimiento", "Salario"
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT FALSE, -- ¿Es recurrente?
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- BUDGETS
-- ===============================================

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- Misma categoría que transactions
  limit_amount DECIMAL(10, 2) NOT NULL,
  period TEXT CHECK (period IN ('weekly', 'monthly', 'yearly')) DEFAULT 'monthly',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  alert_threshold FLOAT DEFAULT 0.8, -- Alerta al 80%
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- SAVINGS GOALS
-- ===============================================

CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Vacaciones", "Auto nuevo", "Fondo emergencia"
  target_amount DECIMAL(10, 2) NOT NULL,
  current_amount DECIMAL(10, 2) DEFAULT 0,
  target_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  emoji TEXT, -- 🏖️, 🚗, 💰
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  contributed_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- AI FINANCIAL ADVISOR
-- ===============================================

CREATE TABLE IF NOT EXISTS financial_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type TEXT CHECK (insight_type IN ('spending_pattern', 'budget_alert', 'saving_tip', 'unusual_expense', 'goal_progress')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
  action_recommended TEXT,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- EXPENSE CATEGORIES PREDEFINIDAS
-- ===============================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  emoji TEXT,
  is_income BOOLEAN DEFAULT FALSE, -- TRUE para categorías de ingresos
  display_order INTEGER DEFAULT 0
);

-- Add columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_categories' AND column_name = 'emoji') THEN
    ALTER TABLE expense_categories ADD COLUMN emoji TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_categories' AND column_name = 'is_income') THEN
    ALTER TABLE expense_categories ADD COLUMN is_income BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_categories' AND column_name = 'display_order') THEN
    ALTER TABLE expense_categories ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- ===============================================
-- FUNCIONES FINANCIERAS
-- ===============================================

-- Función para agregar transacción y actualizar balance
CREATE OR REPLACE FUNCTION add_transaction(
  p_user_id UUID,
  p_account_id UUID,
  p_type TEXT,
  p_category TEXT,
  p_amount DECIMAL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Insertar transacción
  INSERT INTO financial_transactions (user_id, account_id, type, category, amount, description)
  VALUES (p_user_id, p_account_id, p_type, p_category, p_amount, p_description)
  RETURNING id INTO v_transaction_id;
  
  -- Actualizar balance de la cuenta
  IF p_type = 'income' THEN
    UPDATE financial_accounts
    SET balance = balance + p_amount
    WHERE id = p_account_id;
  ELSIF p_type = 'expense' THEN
    UPDATE financial_accounts
    SET balance = balance - p_amount
    WHERE id = p_account_id;
  END IF;
  
  -- Verificar alertas de presupuesto
  PERFORM check_budget_alerts(p_user_id, p_category);
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar alertas de presupuesto
CREATE OR REPLACE FUNCTION check_budget_alerts(
  p_user_id UUID,
  p_category TEXT
) RETURNS VOID AS $$
DECLARE
  v_budget RECORD;
  v_spent DECIMAL;
  v_percentage FLOAT;
BEGIN
  FOR v_budget IN
    SELECT * FROM budgets
    WHERE user_id = p_user_id
    AND category = p_category
    AND is_active = TRUE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    -- Calcular gasto en el periodo actual
    SELECT COALESCE(SUM(amount), 0)
    INTO v_spent
    FROM financial_transactions
    WHERE user_id = p_user_id
    AND category = p_category
    AND type = 'expense'
    AND date >= v_budget.start_date
    AND (v_budget.end_date IS NULL OR date <= v_budget.end_date);
    
    v_percentage := v_spent / v_budget.limit_amount;
    
    -- Crear insight si excede threshold
    IF v_percentage >= v_budget.alert_threshold THEN
      INSERT INTO financial_insights (
        user_id,
        insight_type,
        title,
        description,
        severity
      ) VALUES (
        p_user_id,
        'budget_alert',
        '⚠️ Alerta de presupuesto: ' || v_budget.name,
        'Has gastado $' || v_spent || ' de $' || v_budget.limit_amount || ' (' || ROUND(v_percentage * 100) || '%) en ' || p_category || ' este mes.',
        CASE
          WHEN v_percentage >= 1.0 THEN 'critical'
          WHEN v_percentage >= 0.9 THEN 'warning'
          ELSE 'info'
        END
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para contribuir a meta de ahorro
CREATE OR REPLACE FUNCTION contribute_to_goal(
  p_goal_id UUID,
  p_amount DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_goal RECORD;
BEGIN
  SELECT * INTO v_goal FROM savings_goals WHERE id = p_goal_id;
  
  -- Insertar contribución
  INSERT INTO savings_contributions (goal_id, amount)
  VALUES (p_goal_id, p_amount);
  
  -- Actualizar meta
  UPDATE savings_goals
  SET 
    current_amount = current_amount + p_amount,
    is_completed = (current_amount + p_amount >= target_amount),
    completed_at = CASE WHEN (current_amount + p_amount >= target_amount) THEN NOW() ELSE NULL END
  WHERE id = p_goal_id;
  
  -- Crear insight si alcanzó meta
  IF (v_goal.current_amount + p_amount) >= v_goal.target_amount THEN
    INSERT INTO financial_insights (
      user_id,
      insight_type,
      title,
      description,
      severity
    ) VALUES (
      v_goal.user_id,
      'goal_progress',
      '🎉 ¡Meta alcanzada!',
      '¡Felicitaciones! Alcanzaste tu meta de ahorro: ' || v_goal.name,
      'info'
    );
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- CATEGORÍAS PREDEFINIDAS
-- ===============================================
-- (Categories are user-specific - defined in migration 011 with user_id constraint)

-- Indexes (user_date already exists in migration 012)
CREATE INDEX IF NOT EXISTS idx_budgets_user_active ON budgets(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_active ON savings_goals(user_id, is_completed) WHERE is_completed = FALSE;
CREATE INDEX IF NOT EXISTS idx_financial_insights_user ON financial_insights(user_id, dismissed) WHERE dismissed = FALSE;
