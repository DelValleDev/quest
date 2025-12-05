import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeStore, useAuthStore } from "../../store";
import { getTheme } from "../../theme/colors";
import { CalendarService, type CalendarIntegration } from "../../lib/calendar";
import type { RootStackParamList } from "../../../App";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingItem {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  type: "toggle" | "button" | "link" | "status";
  value?: boolean;
  status?: "connected" | "disconnected" | "syncing";
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { mode, toggleTheme } = useThemeStore();
  const { user, signOut } = useAuthStore();
  const theme = getTheme(mode);

  const [loading, setLoading] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<CalendarIntegration | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Notifications state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [questReminders, setQuestReminders] = useState(true);
  const [duelNotifications, setDuelNotifications] = useState(true);
  const [friendActivity, setFriendActivity] = useState(false);

  useEffect(() => {
    loadCalendarStatus();
  }, []);

  const loadCalendarStatus = async () => {
    if (!user) return;
    const status = await CalendarService.getCalendarStatus(user.id);
    setCalendarStatus(status);
  };

  const handleConnectGoogleCalendar = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const success = await CalendarService.connectGoogleCalendar(user.id);
      
      if (success) {
        Alert.alert(
          "¡Conectado! 📅",
          "Tu Google Calendar se ha conectado correctamente.",
          [{ text: "OK" }]
        );
        await loadCalendarStatus();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo conectar el calendario");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!user) return;

    Alert.alert(
      "Desconectar Calendario",
      "¿Seguro que quieres desconectar tu calendario? Tus eventos importados se mantendrán.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desconectar",
          style: "destructive",
          onPress: async () => {
            await CalendarService.disconnectCalendar(user.id);
            setCalendarStatus(null);
          },
        },
      ]
    );
  };

  const handleSyncCalendar = async () => {
    if (!user || !calendarStatus?.connected) return;

    try {
      setSyncing(true);
      await CalendarService.syncGoogleCalendar(user.id);
      Alert.alert("¡Sincronizado!", "Tus eventos se han actualizado");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro que quieres cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Sesión",
          style: "destructive",
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const sections: SettingSection[] = [
    {
      title: "Integraciones",
      items: [
        {
          id: "google_calendar",
          icon: "📅",
          title: "Google Calendar",
          subtitle: calendarStatus?.connected
            ? `Última sincronización: ${calendarStatus.last_sync ? new Date(calendarStatus.last_sync).toLocaleDateString() : "Nunca"}`
            : "Sincroniza tus eventos automáticamente",
          type: "status",
          status: syncing
            ? "syncing"
            : calendarStatus?.connected
              ? "connected"
              : "disconnected",
          onPress: calendarStatus?.connected
            ? handleSyncCalendar
            : handleConnectGoogleCalendar,
        },
        {
          id: "apple_calendar",
          icon: "🍎",
          title: "Apple Calendar",
          subtitle: "Próximamente",
          type: "button",
          onPress: () =>
            Alert.alert("Próximamente", "Esta función estará disponible pronto"),
        },
        {
          id: "notion",
          icon: "📝",
          title: "Notion",
          subtitle: "Próximamente",
          type: "button",
          onPress: () =>
            Alert.alert("Próximamente", "Esta función estará disponible pronto"),
        },
      ],
    },
    {
      title: "Notificaciones",
      items: [
        {
          id: "push_enabled",
          icon: "🔔",
          title: "Notificaciones Push",
          subtitle: "Recibe alertas importantes",
          type: "toggle",
          value: pushEnabled,
          onToggle: setPushEnabled,
        },
        {
          id: "quest_reminders",
          icon: "⏰",
          title: "Recordatorios de Quests",
          subtitle: "Recordatorios diarios para completar quests",
          type: "toggle",
          value: questReminders,
          onToggle: setQuestReminders,
        },
        {
          id: "duel_notifications",
          icon: "⚔️",
          title: "Notificaciones de Duelos",
          subtitle: "Cuando alguien te reta o ganas",
          type: "toggle",
          value: duelNotifications,
          onToggle: setDuelNotifications,
        },
        {
          id: "friend_activity",
          icon: "👥",
          title: "Actividad de Amigos",
          subtitle: "Ver logros de tus amigos",
          type: "toggle",
          value: friendActivity,
          onToggle: setFriendActivity,
        },
      ],
    },
    {
      title: "Apariencia",
      items: [
        {
          id: "dark_mode",
          icon: "🌙",
          title: "Modo Oscuro",
          subtitle: mode === "dark" ? "Activado" : "Desactivado",
          type: "toggle",
          value: mode === "dark",
          onToggle: toggleTheme,
        },
      ],
    },
    {
      title: "Cuenta",
      items: [
        {
          id: "my_plan",
          icon: "👑",
          title: "Mi Plan",
          subtitle: "Ver suscripción y beneficios",
          type: "link",
          onPress: () => navigation.navigate("MyPlan"),
        },
        {
          id: "buy_coins",
          icon: "🪙",
          title: "Comprar Quest Coins",
          subtitle: "Obtén más QC para desbloquear funciones",
          type: "link",
          onPress: () => navigation.navigate("BuyCoins"),
        },
        {
          id: "referrals",
          icon: "🎁",
          title: "Invitar Amigos",
          subtitle: "Gana 250 QC por cada amigo",
          type: "link",
          onPress: () => Alert.alert("Próximamente", "Sistema de referidos en desarrollo"),
        },
      ],
    },
    {
      title: "Soporte",
      items: [
        {
          id: "help",
          icon: "❓",
          title: "Ayuda y FAQ",
          type: "link",
          onPress: () => Alert.alert("Ayuda", "Centro de ayuda próximamente"),
        },
        {
          id: "feedback",
          icon: "💬",
          title: "Enviar Feedback",
          type: "link",
          onPress: () => Alert.alert("Feedback", "Gracias por tu interés. Próximamente."),
        },
        {
          id: "privacy",
          icon: "🔒",
          title: "Política de Privacidad",
          type: "link",
          onPress: () => {},
        },
        {
          id: "terms",
          icon: "📄",
          title: "Términos de Servicio",
          type: "link",
          onPress: () => {},
        },
      ],
    },
    {
      title: "Sesión",
      items: [
        {
          id: "signout",
          icon: "🚪",
          title: "Cerrar Sesión",
          type: "button",
          onPress: handleSignOut,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.settingItem, { backgroundColor: theme.surface }]}
        onPress={item.onPress}
        disabled={item.type === "toggle" || loading}
      >
        <View style={styles.settingIcon}>
          <Text style={styles.iconText}>{item.icon}</Text>
        </View>

        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
              {item.subtitle}
            </Text>
          )}
        </View>

        <View style={styles.settingAction}>
          {item.type === "toggle" && (
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: theme.border, true: "#22C55E" }}
              thumbColor="#FFFFFF"
            />
          )}

          {item.type === "status" && (
            <View style={styles.statusContainer}>
              {item.status === "syncing" ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : item.status === "connected" ? (
                <>
                  <View style={[styles.statusDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={[styles.statusText, { color: "#22C55E" }]}>
                    Conectado
                  </Text>
                </>
              ) : (
                <Text style={[styles.connectText, { color: "#8B5CF6" }]}>
                  Conectar
                </Text>
              )}
            </View>
          )}

          {item.type === "link" && (
            <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
          )}

          {item.type === "button" && item.id === "signout" && (
            <Text style={[styles.chevron, { color: "#EF4444" }]}>›</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Add disconnect button if calendar is connected
  const renderCalendarActions = () => {
    if (!calendarStatus?.connected) return null;

    return (
      <TouchableOpacity
        style={[styles.disconnectButton, { borderColor: "#EF4444" }]}
        onPress={handleDisconnectCalendar}
      >
        <Text style={[styles.disconnectText, { color: "#EF4444" }]}>
          Desconectar Google Calendar
        </Text>
      </TouchableOpacity>
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
        <Text style={[styles.title, { color: theme.text }]}>Configuración</Text>
        <View style={styles.placeholder} />
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Conectando...
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {section.title}
            </Text>
            <View
              style={[
                styles.sectionContent,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={item.id}>
                  {renderSettingItem(item)}
                  {itemIndex < section.items.length - 1 && (
                    <View
                      style={[styles.separator, { backgroundColor: theme.border }]}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>

            {/* Calendar disconnect button */}
            {section.title === "Integraciones" && renderCalendarActions()}
          </View>
        ))}

        {/* App Version */}
        <Text style={[styles.version, { color: theme.textSecondary }]}>
          Quest v1.0.0 (Build 1)
        </Text>
      </ScrollView>
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
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  settingAction: {
    marginLeft: 12,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  connectText: {
    fontSize: 14,
    fontWeight: "600",
  },
  chevron: {
    fontSize: 24,
    fontWeight: "300",
  },
  separator: {
    height: 1,
    marginLeft: 64,
  },
  disconnectButton: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: "500",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 20,
    marginBottom: 20,
  },
});
