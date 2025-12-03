import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useAuthStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  original_price?: number;
  icon: string;
  rarity: string;
  item_data: any;
  required_level: number;
  is_limited: boolean;
  stock?: number;
}

interface UserInventory {
  item_id: string;
  is_equipped: boolean;
  quantity: number;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🛒' },
  { id: 'avatar', label: 'Avatars', icon: '🦸' },
  { id: 'theme', label: 'Themes', icon: '🎨' },
  { id: 'badge', label: 'Badges', icon: '🏅' },
  { id: 'booster', label: 'Boosters', icon: '⚡' },
  { id: 'cosmetic', label: 'Cosmetics', icon: '✨' },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

export const ShopScreen: React.FC = () => {
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);

  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<UserInventory[]>([]);
  const [userCoins, setUserCoins] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch shop items
      const { data: shopItems, error: shopError } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_available', true)
        .order('sort_order');

      if (shopError) throw shopError;
      setItems(shopItems || []);

      // Fetch user inventory
      const { data: userInventory, error: invError } = await supabase
        .from('user_inventory')
        .select('item_id, is_equipped, quantity')
        .eq('user_id', user.id);

      if (!invError) {
        setInventory(userInventory || []);
      }

      // Fetch user profile for coins and level
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('quest_coins, level')
        .eq('id', user.id)
        .single();

      if (!profileError && profile) {
        setUserCoins(profile.quest_coins || 0);
        setUserLevel(profile.level || 1);
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const isOwned = (itemId: string) => {
    return inventory.some((inv) => inv.item_id === itemId);
  };

  const getOwnedQuantity = (itemId: string) => {
    const inv = inventory.find((i) => i.item_id === itemId);
    return inv?.quantity || 0;
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!user) return;

    if (userCoins < item.price) {
      Alert.alert('Not Enough Coins', `You need ${item.price - userCoins} more Quest Coins.`);
      return;
    }

    if (userLevel < item.required_level) {
      Alert.alert('Level Required', `You need to be level ${item.required_level} to buy this item.`);
      return;
    }

    // For non-consumables, check if already owned
    if (item.category !== 'booster' && isOwned(item.id)) {
      Alert.alert('Already Owned', 'You already own this item!');
      return;
    }

    setPurchasing(true);

    try {
      const { data, error } = await supabase.rpc('purchase_item', {
        p_user_id: user.id,
        p_item_id: item.id,
        p_quantity: 1,
      });

      if (error) throw error;

      if (data?.success) {
        Alert.alert('Purchase Successful! 🎉', `You bought ${item.name}!`);
        setUserCoins(data.new_balance);
        setSelectedItem(null);
        fetchData(); // Refresh inventory
      } else {
        Alert.alert('Purchase Failed', data?.error || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to purchase item');
    } finally {
      setPurchasing(false);
    }
  };

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((item) => item.category === selectedCategory);

  const renderItem = (item: ShopItem) => {
    const owned = isOwned(item.id);
    const quantity = getOwnedQuantity(item.id);
    const canAfford = userCoins >= item.price;
    const meetsLevel = userLevel >= item.required_level;
    const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.itemCard,
          { backgroundColor: theme.surface, borderColor: rarityColor },
        ]}
        onPress={() => setSelectedItem(item)}
        activeOpacity={0.7}
      >
        {/* Rarity indicator */}
        <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
          <Text style={styles.rarityText}>{item.rarity.toUpperCase()}</Text>
        </View>

        {/* Icon */}
        <Text style={styles.itemIcon}>{item.icon}</Text>

        {/* Name */}
        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Price or Owned */}
        {owned && item.category !== 'booster' ? (
          <View style={[styles.ownedBadge, { backgroundColor: theme.success + '30' }]}>
            <Text style={[styles.ownedText, { color: theme.success }]}>✓ Owned</Text>
          </View>
        ) : (
          <View style={styles.priceRow}>
            {item.original_price && (
              <Text style={[styles.originalPrice, { color: theme.textMuted }]}>
                {item.original_price}
              </Text>
            )}
            <Text
              style={[
                styles.price,
                { color: canAfford ? theme.warning : theme.error },
              ]}
            >
              🪙 {item.price}
            </Text>
          </View>
        )}

        {/* Quantity for boosters */}
        {item.category === 'booster' && quantity > 0 && (
          <Text style={[styles.quantityBadge, { color: theme.primary }]}>
            x{quantity}
          </Text>
        )}

        {/* Level requirement */}
        {!meetsLevel && (
          <Text style={[styles.levelReq, { color: theme.error }]}>
            Lvl {item.required_level}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderItemModal = () => {
    if (!selectedItem) return null;

    const owned = isOwned(selectedItem.id);
    const canAfford = userCoins >= selectedItem.price;
    const meetsLevel = userLevel >= selectedItem.required_level;
    const rarityColor = RARITY_COLORS[selectedItem.rarity] || RARITY_COLORS.common;

    return (
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedItem(null)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Item details */}
            <View style={[styles.modalHeader, { borderColor: rarityColor }]}>
              <Text style={styles.modalIcon}>{selectedItem.icon}</Text>
              <Text style={[styles.modalName, { color: theme.text }]}>
                {selectedItem.name}
              </Text>
              <Text style={[styles.modalRarity, { color: rarityColor }]}>
                {selectedItem.rarity.toUpperCase()}
              </Text>
            </View>

            <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
              {selectedItem.description}
            </Text>

            <View style={styles.modalInfo}>
              <Text style={[styles.modalCategory, { color: theme.textMuted }]}>
                Category: {selectedItem.category}
              </Text>
              {selectedItem.required_level > 1 && (
                <Text
                  style={[
                    styles.modalLevel,
                    { color: meetsLevel ? theme.textMuted : theme.error },
                  ]}
                >
                  Required Level: {selectedItem.required_level}
                </Text>
              )}
              {selectedItem.is_limited && (
                <Text style={[styles.limitedBadge, { color: theme.error }]}>
                  ⏰ Limited Time!
                </Text>
              )}
              {selectedItem.stock !== null && selectedItem.stock !== undefined && (
                <Text style={[styles.stockText, { color: theme.warning }]}>
                  Stock: {selectedItem.stock} left
                </Text>
              )}
            </View>

            {/* Price and Buy button */}
            <View style={styles.modalFooter}>
              <View>
                {selectedItem.original_price && (
                  <Text style={[styles.modalOriginalPrice, { color: theme.textMuted }]}>
                    🪙 {selectedItem.original_price}
                  </Text>
                )}
                <Text style={[styles.modalPrice, { color: theme.warning }]}>
                  🪙 {selectedItem.price}
                </Text>
              </View>

              {owned && selectedItem.category !== 'booster' ? (
                <View style={[styles.ownedButton, { backgroundColor: theme.success + '30' }]}>
                  <Text style={[styles.ownedButtonText, { color: theme.success }]}>
                    ✓ Owned
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.buyButton,
                    {
                      backgroundColor:
                        canAfford && meetsLevel ? theme.primary : theme.textMuted,
                    },
                  ]}
                  onPress={() => handlePurchase(selectedItem)}
                  disabled={!canAfford || !meetsLevel || purchasing}
                >
                  {purchasing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buyButtonText}>
                      {!meetsLevel
                        ? `Lvl ${selectedItem.required_level} Required`
                        : !canAfford
                        ? 'Not Enough Coins'
                        : 'Buy Now'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>🛒 Shop</Text>
        <View style={[styles.coinDisplay, { backgroundColor: theme.surface }]}>
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={[styles.coinAmount, { color: theme.warning }]}>{userCoins}</Text>
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryButton,
              {
                backgroundColor:
                  selectedCategory === cat.id ? theme.primary : theme.surface,
              },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryLabel,
                { color: selectedCategory === cat.id ? '#fff' : theme.text },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items Grid */}
      <ScrollView
        style={styles.itemsContainer}
        contentContainerStyle={styles.itemsGrid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No items in this category
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredItems.map(renderItem)}
          </View>
        )}
      </ScrollView>

      {/* Item Detail Modal */}
      {renderItemModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  coinAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    maxHeight: 60,
  },
  categoriesContent: {
    paddingHorizontal: 15,
    gap: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemsContainer: {
    flex: 1,
    marginTop: 10,
  },
  itemsGrid: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    width: '48%',
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
  },
  itemIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  ownedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  levelReq: {
    fontSize: 10,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  modalHeader: {
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 2,
    marginBottom: 15,
  },
  modalIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  modalName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalRarity: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  modalInfo: {
    alignItems: 'center',
    gap: 5,
    marginBottom: 20,
  },
  modalCategory: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  modalLevel: {
    fontSize: 12,
  },
  limitedBadge: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stockText: {
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOriginalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  buyButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 140,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownedButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  ownedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
