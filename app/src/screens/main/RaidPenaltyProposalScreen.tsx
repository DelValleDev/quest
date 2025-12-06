import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  RaidPenaltyProposal: { raidId: string; loserId: string };
  RaidPenaltyVoting: { raidId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RaidPenaltyProposal'>;
type RouteProps = RouteProp<RootStackParamList, 'RaidPenaltyProposal'>;

const { width } = Dimensions.get('window');

interface Proposal {
  id: string;
  proposer_id: string;
  penalty_text: string;
  description: string | null;
  vote_count: number;
  created_at: string;
  proposer_name?: string;
}

/**
 * RaidPenaltyProposalScreen
 * 
 * FASE 1: PROPOSICIÓN (12 horas)
 * - Los miembros del raid proponen castigos creativos para el perdedor
 * - Cada miembro puede hacer UNA propuesta
 * - Después de 12h, avanza automáticamente a fase de votación
 * 
 * REGLAS:
 * - Castigo debe ser divertido pero realizable
 * - No propuestas ofensivas o peligrosas
 * - Límite: 200 caracteres para penalty_text
 * 
 * EJEMPLOS:
 * - "Hacer 100 burpees en el parque más cercano"
 * - "Cantar karaoke en un lugar público durante 5 minutos"
 * - "Usar un disfraz ridículo durante todo un día de trabajo"
 * - "Preparar el desayuno para todos los miembros del raid"
 */

export function RaidPenaltyProposalScreen() {
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const { raidId, loserId } = route.params;

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New proposal form
  const [penaltyText, setPenaltyText] = useState('');
  const [description, setDescription] = useState('');

  // Check if user already proposed
  const [hasProposed, setHasProposed] = useState(false);

  // Phase info
  const [phase, setPhase] = useState<'proposal' | 'voting' | 'decided'>('proposal');
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    loadProposals();
    const interval = setInterval(loadProposals, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [raidId]);

  const loadProposals = async () => {
    try {
      setLoading(true);

      // Get proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('raid_penalty_proposals')
        .select(`
          id,
          proposer_id,
          penalty_text,
          description,
          vote_count,
          created_at,
          phase
        `)
        .eq('raid_id', raidId)
        .order('created_at', { ascending: true });

      if (proposalsError) throw proposalsError;

      // Get proposer names
      const proposalsWithNames = await Promise.all(
        (proposalsData || []).map(async (proposal) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', proposal.proposer_id)
            .single();
          
          return {
            ...proposal,
            proposer_name: profile?.username || 'Anonymous',
          };
        })
      );

      setProposals(proposalsWithNames);

      // Check if current user already proposed
      const userProposal = proposalsData?.find((p) => p.proposer_id === user?.id);
      setHasProposed(!!userProposal);

      // Set phase
      if (proposalsData && proposalsData.length > 0) {
        setPhase(proposalsData[0].phase as any);
      }

      // Calculate time remaining
      if (proposalsData && proposalsData.length > 0) {
        const firstProposal = proposalsData[0];
        const createdAt = new Date(firstProposal.created_at).getTime();
        const now = Date.now();
        const elapsed = now - createdAt;
        const remaining = 12 * 60 * 60 * 1000 - elapsed; // 12h in ms

        if (remaining > 0) {
          const hours = Math.floor(remaining / (60 * 60 * 1000));
          const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
          setTimeRemaining(`${hours}h ${minutes}m restantes para proponer`);
        } else {
          setTimeRemaining('Fase de proposición finalizada');
        }
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
      Alert.alert('Error', 'No se pudieron cargar las propuestas');
    } finally {
      setLoading(false);
    }
  };

  const submitProposal = async () => {
    if (!penaltyText.trim()) {
      Alert.alert('Error', 'Escribe un castigo');
      return;
    }

    if (penaltyText.length > 200) {
      Alert.alert('Error', 'El castigo no puede tener más de 200 caracteres');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('raid_penalty_proposals')
        .insert({
          raid_id: raidId,
          proposer_id: user?.id,
          loser_id: loserId,
          penalty_text: penaltyText.trim(),
          description: description.trim() || null,
          phase: 'proposal',
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          Alert.alert('Error', 'Ya propusiste un castigo para este raid');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('¡Propuesta enviada! 🎯', 'Tu castigo ha sido añadido a la votación');
      setPenaltyText('');
      setDescription('');
      loadProposals();
    } catch (error) {
      console.error('Error submitting proposal:', error);
      Alert.alert('Error', 'No se pudo enviar la propuesta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Proponer Castigos 😈
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Phase Banner */}
        <View style={[styles.phaseBanner, { backgroundColor: theme.card }]}>
          <Text style={[styles.phaseTitle, { color: theme.primary }]}>
            📝 FASE 1: PROPOSICIÓN
          </Text>
          <Text style={[styles.phaseSubtitle, { color: theme.textSecondary }]}>
            {timeRemaining}
          </Text>
          <Text style={[styles.phaseDescription, { color: theme.textSecondary }]}>
            Propón un castigo creativo para el perdedor. La votación comenzará en 12 horas.
          </Text>
        </View>

        {/* Proposal Form (si no ha propuesto) */}
        {!hasProposed && phase === 'proposal' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.formTitle, { color: theme.text }]}>
              Tu Propuesta 💡
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Ej: Hacer 100 burpees en el parque"
              placeholderTextColor={theme.textSecondary}
              value={penaltyText}
              onChangeText={setPenaltyText}
              maxLength={200}
              multiline
            />
            <Text style={[styles.charCount, { color: theme.textSecondary }]}>
              {penaltyText.length}/200 caracteres
            </Text>

            <TextInput
              style={[styles.input, styles.descriptionInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Descripción adicional (opcional)"
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={submitProposal}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar Propuesta</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Already Proposed Message */}
        {hasProposed && (
          <View style={[styles.infoCard, { backgroundColor: theme.cardHighlight, borderColor: theme.primary }]}>
            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              Ya propusiste un castigo. La votación comenzará cuando termine la fase de proposición.
            </Text>
          </View>
        )}

        {/* Proposals List */}
        <View style={styles.proposalsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Propuestas Actuales ({proposals.length})
          </Text>

          {proposals.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Aún no hay propuestas. ¡Sé el primero en proponer un castigo! 😈
              </Text>
            </View>
          ) : (
            proposals.map((proposal) => (
              <View key={proposal.id} style={[styles.proposalCard, { backgroundColor: theme.card }]}>
                <View style={styles.proposalHeader}>
                  <Text style={[styles.proposerName, { color: theme.textSecondary }]}>
                    Propuesto por {proposal.proposer_name}
                  </Text>
                </View>
                <Text style={[styles.penaltyText, { color: theme.text }]}>
                  {proposal.penalty_text}
                </Text>
                {proposal.description && (
                  <Text style={[styles.proposalDescription, { color: theme.textSecondary }]}>
                    {proposal.description}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: theme.card }]}>
          <Text style={[styles.infoBoxTitle, { color: theme.text }]}>
            💡 Consejos para buenos castigos
          </Text>
          <Text style={[styles.infoBoxText, { color: theme.textSecondary }]}>
            • Que sea divertido y creativo{'\n'}
            • Realizable en 48 horas{'\n'}
            • No ofensivo ni peligroso{'\n'}
            • Preferiblemente con foto/video de evidencia{'\n'}
            • Ejemplos: ejercicio, cantar, cocinar, disfraz, etc.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  phaseBanner: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  phaseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  phaseSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  phaseDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  formCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  descriptionInput: {
    marginTop: 12,
    minHeight: 80,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  proposalsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  proposalCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  proposalHeader: {
    marginBottom: 8,
  },
  proposerName: {
    fontSize: 12,
    fontWeight: '600',
  },
  penaltyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  proposalDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
