import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price_qc: number;
  item_type: 'cosmetic' | 'power_up' | 'boost';
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export default function ShopScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [userCoins, setUserCoins] = useState(0);
  const [filter, setFilter] = useState<'all' | 'cosmetic' | 'power_up' | 'boost'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadShopItems(), loadUserCoins()]);
    setLoading(false);
    setRefreshing(false);
  };

  const loadShopItems = async () => {
    let query = supabase.from('shop_items').select('*').eq('is_available', true);

    if (filter !== 'all') {
      query = query.eq('item_type', filter);
    }

    const { data, error } = await query.order('price_qc', { ascending: true });

    if (!error && data) {
      setItems(data);
    }
  };

  const loadUserCoins = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('quest_coins')
      .eq('id', user?.id)
      .single();

    if (data) {
      setUserCoins(data.quest_coins);
    }
  };

  const buyItem = async (item: ShopItem) => {
    if (userCoins < item.price_qc) {
      Alert.alert('Fondos Insuficientes', 'No tienes suficientes Quest Coins para comprar este item.');
      return;
    }

    Alert.alert(
      'Confirmar Compra',
      `¿Quieres comprar ${item.name} por ${item.price_qc} QC?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comprar',
          onPress: async () => {
            // Deduct coins
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ quest_coins: userCoins - item.price_qc })
              .eq('id', user?.id);

            if (!updateError) {
              // Add to inventory
              await supabase.from('user_inventory').insert({
                user_id: user?.id,
                item_id: item.id,
              });

              Alert.alert('¡Compra Exitosa!', `Has adquirido ${item.name}`);
              loadData();
            }
          },
        },
      ]
    );
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: '#94A3B8',
      rare: '#3B82F6',
      epic: '#A855F7',
      legendary: '#F59E0B',
    };
    return colors[rarity as keyof typeof colors] || '#94A3B8';
  };

  const getRarityLabel = (rarity: string) => {
    const labels = {
      common: 'Común',
      rare: 'Raro',
      epic: 'Épico',
      legendary: 'Legendario',
    };
    return labels[rarity as keyof typeof labels] || 'Común';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tienda</Text>
        <View style={styles.coinsDisplay}>
          <Text style={styles.coinsIcon}>🪙</Text>
          <Text style={styles.coinsText}>{userCoins} QC</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'cosmetic' && styles.filterButtonActive]}
            onPress={() => setFilter('cosmetic')}
          >
            <Text style={[styles.filterText, filter === 'cosmetic' && styles.filterTextActive]}>
              Cosméticos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'power_up' && styles.filterButtonActive]}
            onPress={() => setFilter('power_up')}
          >
            <Text style={[styles.filterText, filter === 'power_up' && styles.filterTextActive]}>
              Power-Ups
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'boost' && styles.filterButtonActive]}
            onPress={() => setFilter('boost')}
          >
            <Text style={[styles.filterText, filter === 'boost' && styles.filterTextActive]}>
              Boosts
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Shop Items */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        <View style={styles.grid}>
          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={[styles.itemHeader, { borderColor: getRarityColor(item.rarity) }]}>
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <View
                  style={[
                    styles.rarityBadge,
                    { backgroundColor: getRarityColor(item.rarity) + '20' },
                  ]}
                >
                  <Text style={[styles.rarityText, { color: getRarityColor(item.rarity) }]}>
                    {getRarityLabel(item.rarity)}
                  </Text>
                </View>
              </View>

              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>

              <View style={styles.itemFooter}>
                <View style={styles.priceTag}>
                  <Text style={styles.priceIcon}>🪙</Text>
                  <Text style={styles.priceText}>{item.price_qc} QC</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.buyButton,
                    userCoins < item.price_qc && styles.buyButtonDisabled,
                  ]}
                  onPress={() => buyItem(item)}
                  disabled={userCoins < item.price_qc}
                >
                  <Text style={styles.buyButtonText}>
                    {userCoins < item.price_qc ? '🔒' : 'Comprar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>No hay items disponibles</Text>
            <Text style={styles.emptySubtext}>Vuelve más tarde</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  coinsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinsIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  coinsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  filters: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  itemCard: {
    width: '47%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  itemIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  itemDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
    textAlign: 'center',
    minHeight: 36,
  },
  itemFooter: {
    flexDirection: 'column',
    gap: 8,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  buyButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyButtonDisabled: {
    backgroundColor: '#334155',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
  },
});
