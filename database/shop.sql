-- =====================================================
-- QUEST APP - SHOP SYSTEM
-- Run this in Supabase SQL Editor AFTER schema.sql
-- =====================================================

-- =====================================================
-- SHOP ITEMS TABLE
-- All purchasable items in the shop
-- =====================================================
DROP TABLE IF EXISTS public.user_purchases CASCADE;
DROP TABLE IF EXISTS public.user_inventory CASCADE;
DROP TABLE IF EXISTS public.shop_items CASCADE;

CREATE TABLE public.shop_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Category: avatar, theme, badge, booster, cosmetic, title
  category TEXT NOT NULL,
  subcategory TEXT, -- e.g., 'hair', 'outfit', 'background' for avatars
  
  -- Pricing
  price INTEGER NOT NULL, -- in Quest Coins
  original_price INTEGER, -- for sales (show strikethrough)
  
  -- Item data (JSON for flexibility)
  item_data JSONB DEFAULT '{}', -- e.g., {"color": "#FF5733", "image_url": "..."}
  
  -- Display
  icon TEXT NOT NULL,
  preview_image TEXT, -- URL for preview
  rarity TEXT DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  is_limited BOOLEAN DEFAULT false, -- limited time offer
  available_until TIMESTAMPTZ, -- for limited items
  stock INTEGER, -- null = unlimited
  
  -- Requirements
  required_level INTEGER DEFAULT 1,
  required_achievement_id UUID REFERENCES public.achievements(id),
  
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USER INVENTORY TABLE
-- Items owned by users
-- =====================================================
CREATE TABLE public.user_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.shop_items(id) ON DELETE CASCADE,
  
  -- Status
  is_equipped BOOLEAN DEFAULT false, -- for wearables/themes
  equipped_slot TEXT, -- e.g., 'avatar', 'theme', 'badge_1', 'badge_2', 'badge_3'
  
  -- Consumables
  quantity INTEGER DEFAULT 1,
  
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, item_id)
);

-- =====================================================
-- USER PURCHASES TABLE (Transaction history)
-- =====================================================
CREATE TABLE public.user_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.shop_items(id) ON DELETE CASCADE,
  
  -- Transaction details
  price_paid INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view shop items" ON public.shop_items;
DROP POLICY IF EXISTS "Users can view own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can insert own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can view own purchases" ON public.user_purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.user_purchases;

-- Shop items: anyone can view available items
CREATE POLICY "Anyone can view shop items" ON public.shop_items
  FOR SELECT USING (is_available = true);

-- User inventory: users can manage their own
CREATE POLICY "Users can view own inventory" ON public.user_inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory" ON public.user_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory" ON public.user_inventory
  FOR UPDATE USING (auth.uid() = user_id);

-- User purchases: users can view/insert their own
CREATE POLICY "Users can view own purchases" ON public.user_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" ON public.user_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PURCHASE FUNCTION
-- Handles buying items with validation
-- =====================================================
CREATE OR REPLACE FUNCTION purchase_item(
  p_user_id UUID,
  p_item_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_user RECORD;
  v_total_price INTEGER;
  v_existing_quantity INTEGER;
BEGIN
  -- Get item details
  SELECT * INTO v_item FROM public.shop_items WHERE id = p_item_id AND is_available = true;
  
  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found or unavailable');
  END IF;
  
  -- Check stock
  IF v_item.stock IS NOT NULL AND v_item.stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough stock');
  END IF;
  
  -- Check limited time
  IF v_item.is_limited AND v_item.available_until < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item no longer available');
  END IF;
  
  -- Get user details
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check level requirement
  IF v_user.level < v_item.required_level THEN
    RETURN jsonb_build_object('success', false, 'error', 'Level too low', 'required_level', v_item.required_level);
  END IF;
  
  -- Calculate total price
  v_total_price := v_item.price * p_quantity;
  
  -- Check balance
  IF v_user.quest_coins < v_total_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough Quest Coins', 'needed', v_total_price, 'balance', v_user.quest_coins);
  END IF;
  
  -- Deduct coins
  UPDATE public.profiles 
  SET quest_coins = quest_coins - v_total_price
  WHERE id = p_user_id;
  
  -- Update stock if limited
  IF v_item.stock IS NOT NULL THEN
    UPDATE public.shop_items 
    SET stock = stock - p_quantity
    WHERE id = p_item_id;
  END IF;
  
  -- Check if user already owns this item
  SELECT quantity INTO v_existing_quantity 
  FROM public.user_inventory 
  WHERE user_id = p_user_id AND item_id = p_item_id;
  
  IF v_existing_quantity IS NOT NULL THEN
    -- Update quantity for consumables
    UPDATE public.user_inventory 
    SET quantity = quantity + p_quantity
    WHERE user_id = p_user_id AND item_id = p_item_id;
  ELSE
    -- Add to inventory
    INSERT INTO public.user_inventory (user_id, item_id, quantity)
    VALUES (p_user_id, p_item_id, p_quantity);
  END IF;
  
  -- Record purchase
  INSERT INTO public.user_purchases (user_id, item_id, price_paid, quantity)
  VALUES (p_user_id, p_item_id, v_total_price, p_quantity);
  
  RETURN jsonb_build_object(
    'success', true, 
    'item_name', v_item.name,
    'price_paid', v_total_price,
    'new_balance', v_user.quest_coins - v_total_price
  );
END;
$$;

-- =====================================================
-- EQUIP ITEM FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION equip_item(
  p_user_id UUID,
  p_item_id UUID,
  p_slot TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inventory RECORD;
  v_item RECORD;
  v_slot TEXT;
BEGIN
  -- Check if user owns item
  SELECT ui.*, si.category, si.name 
  INTO v_inventory
  FROM public.user_inventory ui
  JOIN public.shop_items si ON si.id = ui.item_id
  WHERE ui.user_id = p_user_id AND ui.item_id = p_item_id;
  
  IF v_inventory IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not in inventory');
  END IF;
  
  -- Determine slot based on category
  v_slot := COALESCE(p_slot, v_inventory.category);
  
  -- Unequip any item in the same slot
  UPDATE public.user_inventory 
  SET is_equipped = false, equipped_slot = NULL
  WHERE user_id = p_user_id AND equipped_slot = v_slot;
  
  -- Equip new item
  UPDATE public.user_inventory 
  SET is_equipped = true, equipped_slot = v_slot
  WHERE user_id = p_user_id AND item_id = p_item_id;
  
  RETURN jsonb_build_object('success', true, 'equipped', v_inventory.name, 'slot', v_slot);
END;
$$;

-- =====================================================
-- SHOP ITEMS DATA
-- =====================================================

-- AVATARS (20 items)
INSERT INTO public.shop_items (name, description, category, subcategory, price, icon, rarity, item_data, sort_order) VALUES
  ('Default Hero', 'The classic quest hero look', 'avatar', 'full', 0, '🦸', 'common', '{"style": "default"}', 1),
  ('Ninja Warrior', 'Silent and deadly', 'avatar', 'full', 500, '🥷', 'uncommon', '{"style": "ninja"}', 2),
  ('Wizard Master', 'Wise and powerful', 'avatar', 'full', 750, '🧙', 'uncommon', '{"style": "wizard"}', 3),
  ('Knight Champion', 'Brave and honorable', 'avatar', 'full', 1000, '🏰', 'rare', '{"style": "knight"}', 4),
  ('Dragon Rider', 'Master of dragons', 'avatar', 'full', 2000, '🐉', 'epic', '{"style": "dragon"}', 5),
  ('Cosmic Being', 'From beyond the stars', 'avatar', 'full', 5000, '🌌', 'legendary', '{"style": "cosmic"}', 6),
  ('Fitness Pro', 'Peak physical form', 'avatar', 'full', 800, '💪', 'uncommon', '{"style": "fitness"}', 7),
  ('Meditation Guru', 'Inner peace achieved', 'avatar', 'full', 800, '🧘', 'uncommon', '{"style": "meditation"}', 8),
  ('Business Executive', 'Professional excellence', 'avatar', 'full', 1200, '👔', 'rare', '{"style": "business"}', 9),
  ('Artist Soul', 'Creative genius', 'avatar', 'full', 1000, '🎨', 'rare', '{"style": "artist"}', 10);

-- THEMES (10 items)
INSERT INTO public.shop_items (name, description, category, price, icon, rarity, item_data, sort_order) VALUES
  ('Dark Mode Pro', 'Sleek dark theme with purple accents', 'theme', 300, '🌙', 'common', '{"primary": "#8B5CF6", "background": "#1a1a2e"}', 20),
  ('Ocean Breeze', 'Calming blue theme', 'theme', 500, '🌊', 'uncommon', '{"primary": "#0EA5E9", "background": "#0c4a6e"}', 21),
  ('Forest Green', 'Nature-inspired green theme', 'theme', 500, '🌲', 'uncommon', '{"primary": "#22C55E", "background": "#14532d"}', 22),
  ('Sunset Orange', 'Warm sunset colors', 'theme', 500, '🌅', 'uncommon', '{"primary": "#F97316", "background": "#7c2d12"}', 23),
  ('Cherry Blossom', 'Soft pink Japanese theme', 'theme', 750, '🌸', 'rare', '{"primary": "#EC4899", "background": "#831843"}', 24),
  ('Golden Hour', 'Luxurious gold accents', 'theme', 1500, '✨', 'epic', '{"primary": "#EAB308", "background": "#422006"}', 25),
  ('Neon Cyber', 'Cyberpunk neon vibes', 'theme', 2000, '🔮', 'epic', '{"primary": "#06B6D4", "background": "#0f172a"}', 26),
  ('Royal Purple', 'Majestic purple theme', 'theme', 1000, '👑', 'rare', '{"primary": "#A855F7", "background": "#3b0764"}', 27),
  ('Midnight Black', 'Pure OLED black theme', 'theme', 1200, '🖤', 'rare', '{"primary": "#FFFFFF", "background": "#000000"}', 28),
  ('Aurora Borealis', 'Northern lights gradient', 'theme', 3000, '🌌', 'legendary', '{"primary": "#34D399", "background": "#1e1b4b"}', 29);

-- BADGES/TITLES (15 items)
INSERT INTO public.shop_items (name, description, category, price, icon, rarity, item_data, sort_order) VALUES
  ('Early Adopter', 'Thanks for being here from the start', 'badge', 100, '🏅', 'common', '{"title": "Early Adopter"}', 40),
  ('Quest Enthusiast', 'Show your dedication', 'badge', 250, '⭐', 'common', '{"title": "Quest Enthusiast"}', 41),
  ('Discipline Master', 'Master of self-control', 'badge', 500, '🎯', 'uncommon', '{"title": "Discipline Master"}', 42),
  ('Wellness Warrior', 'Champion of health', 'badge', 500, '💚', 'uncommon', '{"title": "Wellness Warrior"}', 43),
  ('Mind Architect', 'Builder of mental strength', 'badge', 750, '🧠', 'rare', '{"title": "Mind Architect"}', 44),
  ('Social Champion', 'Master of connections', 'badge', 750, '🤝', 'rare', '{"title": "Social Champion"}', 45),
  ('Productivity King', 'Maximum efficiency', 'badge', 1000, '👑', 'rare', '{"title": "Productivity King"}', 46),
  ('Zen Master', 'Ultimate inner peace', 'badge', 1500, '☯️', 'epic', '{"title": "Zen Master"}', 47),
  ('Creative Genius', 'Boundless imagination', 'badge', 1500, '🎨', 'epic', '{"title": "Creative Genius"}', 48),
  ('Legend', 'You are a legend', 'badge', 5000, '🏆', 'legendary', '{"title": "Legend"}', 49);

-- BOOSTERS (10 items - consumables)
INSERT INTO public.shop_items (name, description, category, price, icon, rarity, item_data, sort_order) VALUES
  ('XP Boost (1hr)', 'Double XP for 1 hour', 'booster', 100, '⚡', 'common', '{"type": "xp", "multiplier": 2, "duration_minutes": 60}', 60),
  ('XP Boost (24hr)', 'Double XP for 24 hours', 'booster', 500, '⚡', 'uncommon', '{"type": "xp", "multiplier": 2, "duration_minutes": 1440}', 61),
  ('Coin Boost (1hr)', 'Double coins for 1 hour', 'booster', 150, '🪙', 'common', '{"type": "coins", "multiplier": 2, "duration_minutes": 60}', 62),
  ('Coin Boost (24hr)', 'Double coins for 24 hours', 'booster', 600, '🪙', 'uncommon', '{"type": "coins", "multiplier": 2, "duration_minutes": 1440}', 63),
  ('Streak Shield', 'Protect your streak for 1 missed day', 'booster', 300, '🛡️', 'rare', '{"type": "streak_shield", "uses": 1}', 64),
  ('Streak Shield Pack', '3 Streak Shields', 'booster', 750, '🛡️', 'rare', '{"type": "streak_shield", "uses": 3}', 65),
  ('Quest Refresh', 'Get new daily quests immediately', 'booster', 200, '🔄', 'uncommon', '{"type": "quest_refresh", "uses": 1}', 66),
  ('Super Boost (1hr)', '3x XP and Coins for 1 hour', 'booster', 400, '🚀', 'rare', '{"type": "super", "multiplier": 3, "duration_minutes": 60}', 67),
  ('Lucky Charm', 'Increased rare quest chance for 24hr', 'booster', 350, '🍀', 'rare', '{"type": "luck", "bonus": 0.5, "duration_minutes": 1440}', 68),
  ('Mega XP Boost', '5x XP for 1 hour', 'booster', 1000, '💥', 'epic', '{"type": "xp", "multiplier": 5, "duration_minutes": 60}', 69);

-- COSMETICS (10 items)
INSERT INTO public.shop_items (name, description, category, price, icon, rarity, item_data, sort_order) VALUES
  ('Flame Border', 'Fiery profile border', 'cosmetic', 400, '🔥', 'uncommon', '{"type": "border", "style": "flame"}', 80),
  ('Ice Border', 'Frozen profile border', 'cosmetic', 400, '❄️', 'uncommon', '{"type": "border", "style": "ice"}', 81),
  ('Rainbow Border', 'Colorful rainbow border', 'cosmetic', 600, '🌈', 'rare', '{"type": "border", "style": "rainbow"}', 82),
  ('Gold Border', 'Luxurious gold border', 'cosmetic', 1000, '⭐', 'rare', '{"type": "border", "style": "gold"}', 83),
  ('Animated Stars', 'Twinkling stars effect', 'cosmetic', 800, '✨', 'rare', '{"type": "effect", "style": "stars"}', 84),
  ('Particle Trail', 'Leave a trail of particles', 'cosmetic', 1200, '💫', 'epic', '{"type": "effect", "style": "particles"}', 85),
  ('Confetti Celebration', 'Confetti on achievements', 'cosmetic', 500, '🎊', 'uncommon', '{"type": "effect", "style": "confetti"}', 86),
  ('Victory Crown', 'Crown effect on level up', 'cosmetic', 1500, '👑', 'epic', '{"type": "effect", "style": "crown"}', 87),
  ('Aura Glow', 'Glowing aura around avatar', 'cosmetic', 2000, '🔮', 'epic', '{"type": "aura", "style": "glow"}', 88),
  ('Legendary Aura', 'Ultimate legendary aura', 'cosmetic', 5000, '🌟', 'legendary', '{"type": "aura", "style": "legendary"}', 89);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON public.shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_available ON public.shop_items(is_available);
CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON public.user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_equipped ON public.user_inventory(user_id, is_equipped);
CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON public.user_purchases(user_id);
