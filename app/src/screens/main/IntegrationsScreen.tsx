import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../theme/colors';
import {
  getAvailableIntegrations,
  connectIntegration,
  disconnectIntegration,
  syncAllIntegrations,
  Integration,
} from '../../lib/integrations';

/**
 * Integrations Screen
 * 
 * Manage connections to external apps:
 * - Strava (workouts)
 * - Apple Health / Google Fit
 * - Spotify (music tracking)
 * - GitHub (commits)
 * - Todoist, Calendar, Notion
 */
export default function IntegrationsScreen() {
  const { user } = useAuthStore();
  const { mode } = useThemeStore();
  const theme = getTheme(mode);

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getAvailableIntegrations(user.id);
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to load integrations:', error);
      Alert.alert('Error', 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (integration: Integration) => {
    if (!user?.id) return;

    if (integration.premium_only) {
      Alert.alert(
        '🌟 Premium Feature',
        `${integration.name} integration is only available for premium members. Upgrade to unlock!`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await connectIntegration(user.id, integration.type);

      if (result.authUrl) {
        // OAuth flow - open browser
        const supported = await Linking.canOpenURL(result.authUrl);
        if (supported) {
          await Linking.openURL(result.authUrl);
          Alert.alert(
            'Authorization',
            'Complete the authorization in your browser, then come back to this app.',
            [{ text: 'OK' }]
          );
        }
      } else if (result.success) {
        Alert.alert('Success', result.message);
        await loadIntegrations();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Failed to connect integration:', error);
      Alert.alert('Error', 'Failed to connect. Please try again.');
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!user?.id) return;

    Alert.alert(
      'Disconnect Integration',
      `Are you sure you want to disconnect ${integration.name}? Your data will not be deleted, but auto-sync will stop.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectIntegration(user.id, integration.type);
              Alert.alert('Disconnected', `${integration.name} has been disconnected`);
              await loadIntegrations();
            } catch (error) {
              console.error('Failed to disconnect:', error);
              Alert.alert('Error', 'Failed to disconnect');
            }
          },
        },
      ]
    );
  };

  const handleSyncAll = async () => {
    if (!user?.id) return;

    setSyncing(true);
    try {
      const result = await syncAllIntegrations(user.id);

      if (result.errors.length > 0) {
        Alert.alert(
          'Sync Completed with Errors',
          `Synced ${result.synced} integrations.\n\nErrors:\n${result.errors.join('\n')}`
        );
      } else if (result.synced > 0) {
        Alert.alert('Success', `Synced ${result.synced} integrations successfully!`);
      } else {
        Alert.alert('No Integrations', 'No active integrations to sync');
      }

      await loadIntegrations();
    } catch (error) {
      console.error('Failed to sync:', error);
      Alert.alert('Error', 'Failed to sync integrations');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  const connectedIntegrations = integrations.filter(i => i.is_connected);
  const availableIntegrations = integrations.filter(i => !i.is_connected);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Integrations</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Connect your favorite apps to automatically track habits and complete quests
          </Text>
        </View>

        {/* Sync All Button */}
        {connectedIntegrations.length > 0 && (
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: theme.primary }]}
            onPress={handleSyncAll}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.syncButtonText}>🔄 Sync All</Text>
                <Text style={styles.syncButtonSubtext}>
                  Last synced: {connectedIntegrations[0]?.last_synced || 'Never'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Connected Integrations */}
        {connectedIntegrations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Connected ({connectedIntegrations.length})
            </Text>
            {connectedIntegrations.map(integration => (
              <IntegrationCard
                key={integration.type}
                integration={integration}
                theme={theme}
                onDisconnect={() => handleDisconnect(integration)}
              />
            ))}
          </View>
        )}

        {/* Available Integrations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Available ({availableIntegrations.length})
          </Text>
          {availableIntegrations.map(integration => (
            <IntegrationCard
              key={integration.type}
              integration={integration}
              theme={theme}
              onConnect={() => handleConnect(integration)}
            />
          ))}
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            💡 Tip: Integrations sync automatically in the background. You can also manually sync
            anytime.
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            🔒 Your data is encrypted and never shared with third parties.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Integration Card Component
 */
interface IntegrationCardProps {
  integration: Integration;
  theme: any;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

function IntegrationCard({ integration, theme, onConnect, onDisconnect }: IntegrationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.icon}>{integration.icon}</Text>
          <View style={styles.cardInfo}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{integration.name}</Text>
              {integration.premium_only && (
                <View style={[styles.premiumBadge, { backgroundColor: theme.warning }]}>
                  <Text style={styles.premiumBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
              {integration.description}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          {integration.is_connected ? (
            <View style={[styles.statusBadge, { backgroundColor: theme.success }]}>
              <Text style={styles.statusBadgeText}>✓</Text>
            </View>
          ) : (
            <Text style={[styles.expandIcon, { color: theme.textSecondary }]}>
              {expanded ? '▲' : '▼'}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.cardExpanded}>
          <View style={styles.benefits}>
            <Text style={[styles.benefitsTitle, { color: theme.text }]}>Benefits:</Text>
            {integration.benefits.map((benefit: string, index: number) => (
              <Text key={index} style={[styles.benefit, { color: theme.textSecondary }]}>
                • {benefit}
              </Text>
            ))}
          </View>

          {integration.is_connected ? (
            <>
              {integration.last_synced && (
                <Text style={[styles.lastSynced, { color: theme.textSecondary }]}>
                  Last synced: {new Date(integration.last_synced).toLocaleString()}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.button, styles.disconnectButton, { borderColor: theme.error }]}
                onPress={onDisconnect}
              >
                <Text style={[styles.buttonText, { color: theme.error }]}>Disconnect</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.connectButton, { backgroundColor: theme.primary }]}
              onPress={onConnect}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                {integration.requires_oauth ? 'Connect with OAuth' : 'Connect'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  syncButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  syncButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  premiumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
  },
  cardRight: {
    marginLeft: 8,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expandIcon: {
    fontSize: 16,
  },
  cardExpanded: {
    padding: 16,
    paddingTop: 0,
  },
  benefits: {
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  benefit: {
    fontSize: 14,
    marginBottom: 4,
  },
  lastSynced: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButton: {
    // backgroundColor set dynamically
  },
  disconnectButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
});
