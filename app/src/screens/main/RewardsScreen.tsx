import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeStore, useAuthStore, useLanguageStore } from "../../store";
import { getTheme } from "../../theme/colors";
import { AdsService, AD_REWARDS, type AdReward, type AdRewardStatus } from "../../lib/ads";
import { LimitsService, FEATURE_IDS, type DailyLimits } from "../../lib/limits";
import type { RootStackParamList } from "../../../App";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RewardCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  reward: string;
  rewardType: "qc" | "duel" | "ai" | "streak" | "xp";
  status: AdRewardStatus | null;
  loading: boolean;
}

export const RewardsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const theme = getTheme(mode);
  
  // Translation helper
  const t = (en: string, es: string) => language === 'es' ? es : en;

  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<RewardCard[]>([]);
  const [dailyLimits, setDailyLimits] = useState<DailyLimits | null>(null);
  const [todayStats, setTodayStats] = useState({
    totalAdsWatched: 0,
    qcEarned: 0,
  });
  const [watchingAd, setWatchingAd] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Initialize Ads
      await AdsService.initialize();

      // Get rewards
      const availableRewards = await AdsService.getAvailableRewards();

      // Get status for each reward
      const rewardCards: RewardCard[] = await Promise.all(
        availableRewards.map(async (reward) => {
          const status = await AdsService.checkRewardAvailability(
            user.id,
            reward.id
          );

          return {
            id: reward.id,
            icon: getRewardIcon(reward.rewardType),
            title: reward.nameEs,
            subtitle: getRewardSubtitle(reward),
            reward: getRewardText(reward),
            rewardType: getRewardCardType(reward.rewardType),
            status,
            loading: false,
          };
        })
      );

      setRewards(rewardCards);

      // Get daily limits
      const limits = await LimitsService.getDailyLimits(user.id);
      setDailyLimits(limits);

      // Get today's stats
      const stats = await AdsService.getTodayStats(user.id);
      setTodayStats(stats);
    } catch (error) {
      console.error("Error loading rewards:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRewardIcon = (type: string): string => {
    switch (type) {
      case "quest_coins":
        return "🪙";
      case "extra_duel":
        return "⚔️";
      case "extra_ai_message":
        return "🤖";
      case "streak_revive":
        return "🔥";
      case "xp_boost":
        return "⚡";
      default:
        return "🎁";
    }
  };

  const getRewardSubtitle = (reward: AdReward): string => {
    switch (reward.rewardType) {
      case "quest_coins":
        return t("Earn coins by watching an ad", "Gana monedas viendo un anuncio");
      case "extra_duel":
        return t("An extra duel for today", "Un duelo extra para hoy");
      case "extra_ai_message":
        return t("Extra messages with AI", "Mensajes extra con la IA");
      case "streak_revive":
        return t("Recover your lost streak", "Recupera tu racha perdida");
      case "xp_boost":
        return t("Double your XP for 1 hour", "Duplica tu XP por 1 hora");
      default:
        return "";
    }
  };

  const getRewardText = (reward: AdReward): string => {
    switch (reward.rewardType) {
      case "quest_coins":
        return `+${reward.rewardAmount} QC`;
      case "extra_duel":
        return `+${reward.rewardAmount} ${t('Duel', 'Duelo')}`;
      case "extra_ai_message":
        return `+${reward.rewardAmount} ${t('Messages', 'Mensajes')}`;
      case "streak_revive":
        return t("Revive Streak", "Revivir Racha");
      case "xp_boost":
        return `${reward.rewardAmount}min 2x XP`;
      default:
        return "";
    }
  };

  const getRewardCardType = (
    type: string
  ): "qc" | "duel" | "ai" | "streak" | "xp" => {
    switch (type) {
      case "quest_coins":
        return "qc";
      case "extra_duel":
        return "duel";
      case "extra_ai_message":
        return "ai";
      case "streak_revive":
        return "streak";
      case "xp_boost":
        return "xp";
      default:
        return "qc";
    }
  };

  const getCardColor = (type: string): string => {
    switch (type) {
      case "qc":
        return "#F59E0B";
      case "duel":
        return "#EF4444";
      case "ai":
        return "#8B5CF6";
      case "streak":
        return "#F97316";
      case "xp":
        return "#22C55E";
      default:
        return "#6B7280";
    }
  };

  const handleWatchAd = async (rewardId: string) => {
    if (!user) return;

    setWatchingAd(rewardId);

    try {
      const result = await AdsService.showRewardedAd(user.id, rewardId);

      if (result.success) {
        Alert.alert(
          t("Reward Obtained! 🎉", "¡Recompensa Obtenida! 🎉"),
          t("You've earned your reward.", "Has ganado tu recompensa."),
          [{ text: t("Great!", "¡Genial!") }]
        );
        // Reload data
        await loadData();
      } else {
        Alert.alert(t("Error", "Error"), result.error || t("Could not get the reward", "No se pudo obtener la recompensa"));
      }
    } catch (error: any) {
      Alert.alert(t("Error", "Error"), error.message);
    } finally {
      setWatchingAd(null);
    }
  };

  const formatCooldown = (minutes?: number): string => {
    if (!minutes) return "";
    if (minutes < 60) return `${Math.ceil(minutes)} min`;
    return `${Math.floor(minutes / 60)}h ${Math.ceil(minutes % 60)}min`;
  };

  const renderRewardCard = (reward: RewardCard) => {
    const color = getCardColor(reward.rewardType);
    const isAvailable = reward.status?.available ?? false;
    const isWatching = watchingAd === reward.id;
    const cooldown = reward.status?.cooldownRemaining;
    const usedToday = reward.status?.timesToday ?? 0;
    const maxDaily = reward.status?.maxDaily ?? 0;

    return (
      <View
        key={reward.id}
        style={[
          styles.rewardCard,
          {
            backgroundColor: theme.surface,
            borderColor: isAvailable ? color : theme.border,
            opacity: isAvailable ? 1 : 0.6,
          },
        ]}
      >
        {/* Left Icon */}
        <View style={[styles.rewardIcon, { backgroundColor: `${color}20` }]}>
          <Text style={styles.iconEmoji}>{reward.icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.rewardContent}>
          <Text style={[styles.rewardTitle, { color: theme.text }]}>
            {reward.title}
          </Text>
          <Text style={[styles.rewardSubtitle, { color: theme.textSecondary }]}>
            {reward.subtitle}
          </Text>
          <Text style={[styles.usageText, { color: theme.textSecondary }]}>
            {usedToday}/{maxDaily} {t('used today', 'usados hoy')}
          </Text>
        </View>

        {/* Action */}
        <View style={styles.rewardAction}>
          <Text style={[styles.rewardAmount, { color }]}>{reward.reward}</Text>

          <TouchableOpacity
            style={[
              styles.watchButton,
              {
                backgroundColor: isAvailable ? color : theme.border,
              },
            ]}
            onPress={() => handleWatchAd(reward.id)}
            disabled={!isAvailable || isWatching}
          >
            {isWatching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : cooldown ? (
              <Text style={styles.cooldownText}>{formatCooldown(cooldown)}</Text>
            ) : (
              <Text style={styles.watchText}>
                {isAvailable ? t("Watch Ad", "Ver Ad") : t("Exhausted", "Agotado")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backIcon, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('Free Rewards', 'Recompensas Gratis')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Today's Stats */}
          <View
            style={[
              styles.statsCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statsTitle, { color: theme.text }]}>
              {t("Today you've earned", "Hoy has ganado")}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{todayStats.qcEarned}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Quest Coins
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{todayStats.totalAdsWatched}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t('Ads', 'Anuncios')}
                </Text>
              </View>
            </View>
          </View>

          {/* Daily Limits Info */}
          {dailyLimits && dailyLimits.duelsMax !== -1 && (
            <View
              style={[
                styles.limitsCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.limitsTitle, { color: theme.text }]}>
                {t("Your limits for today", "Tus límites de hoy")}
              </Text>
              <View style={styles.limitsRow}>
                <View style={styles.limitItem}>
                  <Text style={styles.limitIcon}>⚔️</Text>
                  <Text style={[styles.limitValue, { color: theme.text }]}>
                    {dailyLimits.duelsRemaining}/{dailyLimits.duelsMax + dailyLimits.duelsBonus}
                  </Text>
                  <Text style={[styles.limitLabel, { color: theme.textSecondary }]}>
                    {t('Duels', 'Duelos')}
                  </Text>
                </View>
                <View style={styles.limitItem}>
                  <Text style={styles.limitIcon}>🤖</Text>
                  <Text style={[styles.limitValue, { color: theme.text }]}>
                    {dailyLimits.aiMessagesRemaining}/{dailyLimits.aiMessagesMax + dailyLimits.aiMessagesBonus}
                  </Text>
                  <Text style={[styles.limitLabel, { color: theme.textSecondary }]}>
                    {t('AI', 'IA')}
                  </Text>
                </View>
                <View style={styles.limitItem}>
                  <Text style={styles.limitIcon}>🏰</Text>
                  <Text style={[styles.limitValue, { color: theme.text }]}>
                    {dailyLimits.raidsRemaining}/{dailyLimits.raidsMax + dailyLimits.raidsBonus}
                  </Text>
                  <Text style={[styles.limitLabel, { color: theme.textSecondary }]}>
                    Raids
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: "#8B5CF620" }]}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              {t("Ads are 100% voluntary. You'll never see ads without your consent.", "Los anuncios son 100% voluntarios. Nunca verás anuncios sin tu consentimiento.")}
            </Text>
          </View>

          {/* Rewards List */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('AVAILABLE REWARDS', 'RECOMPENSAS DISPONIBLES')}
          </Text>

          {rewards.map(renderRewardCard)}

          {/* Buy with QC Section */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('OR BUY WITH QUEST COINS', 'O COMPRA CON QUEST COINS')}
          </Text>

          <TouchableOpacity
            style={[
              styles.qcOption,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={() => navigation.navigate("Shop" as never)}
          >
            <View style={styles.qcOptionContent}>
              <Text style={styles.qcIcon}>🛒</Text>
              <View>
                <Text style={[styles.qcTitle, { color: theme.text }]}>
                  {t('Quest Coins Store', 'Tienda de Quest Coins')}
                </Text>
                <Text style={[styles.qcSubtitle, { color: theme.textSecondary }]}>
                  {t('Buy life paths, duels, and more with QC', 'Compra life paths, duelos, y más con QC')}
                </Text>
              </View>
            </View>
            <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 30,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#F59E0B",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#374151",
  },
  limitsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  limitsTitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 12,
  },
  limitsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  limitItem: {
    alignItems: "center",
  },
  limitIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  limitValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  limitLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 24,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  rewardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  usageText: {
    fontSize: 11,
    marginTop: 4,
  },
  rewardAction: {
    alignItems: "flex-end",
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  watchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  watchText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  cooldownText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "500",
  },
  qcOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  qcOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  qcIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  qcTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  qcSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
  },
});
