import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import {
  getUserQuestMascot,
  updateQuestMascot,
  getAvailableOutfits,
  getUserUnlockedOutfits,
  purchaseAndEquipOutfit,
  getRarityColor,
  QuestMascot,
  QuestOutfit,
  QuestPersonality,
} from '../lib/questMascot';
import QuestMascotDisplay from '../components/QuestMascotDisplay';
import { supabase } from '../lib/supabase';

const QuestCustomizationScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [mascot, setMascot] = useState<QuestMascot | null>(null);
  const [outfits, setOutfits] = useState<QuestOutfit[]>([]);
  const [unlockedOutfits, setUnlockedOutfits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'outfit' | 'hat' | 'accessory'>('outfit');
  const [userLevel, setUserLevel] = useState(1);
  const [isPremium, setIsPremium] = useState(false);
  const [qcBalance, setQcBalance] = useState(0);

  useEffect(() => {
    loadMascotData();
  }, [user]);

  const loadMascotData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user profile for level, premium status, and QC balance
      const { data: profileData } = await supabase
        .from('profiles')
        .select('level, is_premium, quest_coins')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setUserLevel(profileData.level || 1);
        setIsPremium(profileData.is_premium || false);
        setQcBalance(profileData.quest_coins || 0);
      }

      const [mascotData, outfitsData, unlockedData] = await Promise.all([
        getUserQuestMascot(user.id),
        getAvailableOutfits(profileData?.level || 1, profileData?.is_premium || false),
        getUserUnlockedOutfits(user.id),
      ]);

      setMascot(mascotData);
      setOutfits(outfitsData);
      setUnlockedOutfits(unlockedData);
      setNewName(mascotData?.name || 'Quest');
    } catch (error) {
      console.error('Error loading mascot data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || !newName.trim()) return;

    const success = await updateQuestMascot(user.id, { name: newName.trim() });
    if (success) {
      setMascot(prev => prev ? { ...prev, name: newName.trim() } : null);
      setEditingName(false);
    }
  };

  const handleChangePersonality = async (personality: QuestPersonality) => {
    if (!user) return;

    const success = await updateQuestMascot(user.id, { personality });
    if (success) {
      setMascot(prev => prev ? { ...prev, personality } : null);
    }
  };

  const handlePurchaseOutfit = async (outfit: QuestOutfit) => {
    if (!user) return;

    const isUnlocked = unlockedOutfits.includes(outfit.id);

    if (isUnlocked) {
      // Solo equipar
      const success = await updateQuestMascot(user.id, { current_outfit_id: outfit.id });
      if (success) {
        setMascot(prev => prev ? { ...prev, current_outfit_id: outfit.id } : null);
      }
    } else {
      // Comprar y equipar
      if (qcBalance < outfit.qc_price) {
        Alert.alert('Insuficiente QC', 'No tienes suficientes Quest Coins para comprar este outfit.');
        return;
      }

      const result = await purchaseAndEquipOutfit(user.id, outfit.id, outfit.qc_price);
      if (result.success) {
        Alert.alert('¡Éxito!', 'Outfit comprado y equipado.');
        loadMascotData(); // Recargar datos
      } else {
        Alert.alert('Error', result.message);
      }
    }
  };

  const personalities: { value: QuestPersonality; label: string; emoji: string }[] = [
    { value: 'balanced', label: 'Equilibrado', emoji: '⚖️' },
    { value: 'energetic', label: 'Energético', emoji: '⚡' },
    { value: 'calm', label: 'Calmado', emoji: '🧘' },
    { value: 'sarcastic', label: 'Sarcástico', emoji: '😏' },
    { value: 'motivational', label: 'Motivacional', emoji: '💪' },
    { value: 'wise', label: 'Sabio', emoji: '🦉' },
  ];

  const filteredOutfits = outfits.filter(o => o.category === selectedCategory);

  if (loading || !mascot) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header con mascota */}
      <View style={styles.header}>
        <QuestMascotDisplay mascot={mascot} size="large" animated />
        
        {/* Nombre */}
        <View style={styles.nameSection}>
          {editingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                maxLength={20}
                autoFocus
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
                <Text style={styles.saveButtonText}>✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)}>
              <Text style={styles.nameText}>{mascot.name} ✏️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* QC Balance */}
        <View style={styles.qcBalance}>
          <Text style={styles.qcText}>💰 {qcBalance} QC</Text>
        </View>
      </View>

      {/* Personalidad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personalidad</Text>
        <View style={styles.personalityGrid}>
          {personalities.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.personalityCard,
                mascot.personality === p.value && styles.personalityCardActive,
              ]}
              onPress={() => handleChangePersonality(p.value)}
            >
              <Text style={styles.personalityEmoji}>{p.emoji}</Text>
              <Text style={styles.personalityLabel}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Outfits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personalización</Text>
        
        {/* Categorías */}
        <View style={styles.categoryTabs}>
          {['outfit', 'hat', 'accessory'].map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryTab,
                selectedCategory === cat && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(cat as any)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === cat && styles.categoryTabTextActive,
                ]}
              >
                {cat === 'outfit' ? '👕 Outfit' : cat === 'hat' ? '🎩 Sombrero' : '✨ Accesorio'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grid de outfits */}
        <View style={styles.outfitsGrid}>
          {filteredOutfits.map(outfit => {
            const isUnlocked = unlockedOutfits.includes(outfit.id);
            const isEquipped = mascot.current_outfit_id === outfit.id;
            const canAfford = qcBalance >= outfit.qc_price;

            return (
              <TouchableOpacity
                key={outfit.id}
                style={[
                  styles.outfitCard,
                  { borderColor: getRarityColor(outfit.rarity) },
                  isEquipped && styles.outfitCardEquipped,
                ]}
                onPress={() => handlePurchaseOutfit(outfit)}
                disabled={!isUnlocked && !canAfford}
              >
                <Text style={styles.outfitIcon}>
                  {outfit.category === 'outfit' ? '👕' : outfit.category === 'hat' ? '🎩' : '✨'}
                </Text>
                <Text style={styles.outfitName} numberOfLines={2}>
                  {outfit.name_es}
                </Text>
                
                {isEquipped ? (
                  <View style={styles.equippedBadge}>
                    <Text style={styles.equippedText}>Equipado</Text>
                  </View>
                ) : isUnlocked ? (
                  <View style={styles.unlockedBadge}>
                    <Text style={styles.unlockedText}>Desbloqueado</Text>
                  </View>
                ) : (
                  <View style={[styles.priceBadge, !canAfford && styles.priceBadgeDisabled]}>
                    <Text style={[styles.priceText, !canAfford && styles.priceTextDisabled]}>
                      💰 {outfit.qc_price} QC
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  nameSection: {
    marginTop: 16,
  },
  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 120,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  qcBalance: {
    marginTop: 12,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  qcText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  personalityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  personalityCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  personalityCardActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#8B5CF6',
  },
  personalityEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  personalityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#8B5CF6',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  outfitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  outfitCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outfitCardEquipped: {
    backgroundColor: '#EDE9FE',
  },
  outfitIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  outfitName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  equippedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  equippedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unlockedBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unlockedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  priceBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceBadgeDisabled: {
    backgroundColor: '#E5E7EB',
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  priceTextDisabled: {
    color: '#9CA3AF',
  },
});

export default QuestCustomizationScreen;
