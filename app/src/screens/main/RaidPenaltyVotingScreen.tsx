import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  RaidPenaltyVoting: { raidId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RaidPenaltyVoting'>;
type RouteProps = RouteProp<RootStackParamList, 'RaidPenaltyVoting'>;

const { width } = Dimensions.get('window');

interface Proposal {
  id: string;
  proposer_id: string;
  penalty_text: string;
  description: string | null;
  vote_count: number;
  created_at: string;
  proposer_name?: string;
  has_voted?: boolean; // Si el usuario actual ya votó por esta propuesta
}

/**
 * RaidPenaltyVotingScreen
 * 
 * FASE 2: VOTACIÓN (12 horas)
 * - Los miembros del raid votan por su castigo favorito
 * - Cada miembro puede votar por UNA propuesta
 * - El castigo con más votos gana
 * - En caso de empate, gana el propuesto primero
 * 
 * DESPUÉS DE LA VOTACIÓN:
 * - El perdedor recibe el castigo ganador
 * - Tiene 48h para completarlo
 * - Debe subir foto/video como evidencia
 * - Los miembros verifican que se cumplió
 */

export function RaidPenaltyVotingScreen() {
  const { mode } = useThemeStore();
  const { user } = useAuthStore();
  const theme = getTheme(mode);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const { raidId } = route.params;

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  // Check if user already voted
  const [hasVoted, setHasVoted] = useState(false);
  const [votedProposalId, setVotedProposalId] = useState<string | null>(null);

  // Phase info
  const [phase, setPhase] = useState<'proposal' | 'voting' | 'decided'>('voting');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [totalVotes, setTotalVotes] = useState(0);

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
          phase,
          voting_ends_at
        `)
        .eq('raid_id', raidId)
        .order('vote_count', { ascending: false });

      if (proposalsError) throw proposalsError;

      // Get user's votes
      const { data: votesData } = await supabase
        .from('raid_penalty_votes')
        .select('proposal_id')
        .eq('voter_id', user?.id)
        .in('proposal_id', proposalsData?.map((p) => p.id) || []);

      const userVotedIds = new Set(votesData?.map((v) => v.proposal_id) || []);
      setHasVoted(userVotedIds.size > 0);
      if (userVotedIds.size > 0) {
        setVotedProposalId(Array.from(userVotedIds)[0]);
      }

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
            has_voted: userVotedIds.has(proposal.id),
          };
        })
      );

      setProposals(proposalsWithNames);

      // Calculate total votes
      const total = proposalsWithNames.reduce((sum, p) => sum + p.vote_count, 0);
      setTotalVotes(total);

      // Set phase
      if (proposalsData && proposalsData.length > 0) {
        setPhase(proposalsData[0].phase as any);

        // Calculate time remaining for voting
        if (proposalsData[0].voting_ends_at) {
          const endsAt = new Date(proposalsData[0].voting_ends_at).getTime();
          const now = Date.now();
          const remaining = endsAt - now;

          if (remaining > 0) {
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            setTimeRemaining(`${hours}h ${minutes}m restantes para votar`);
          } else {
            setTimeRemaining('Votación finalizada');
          }
        }
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
      Alert.alert('Error', 'No se pudieron cargar las propuestas');
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (proposalId: string) => {
    if (hasVoted) {
      Alert.alert('Ya votaste', 'Solo puedes votar una vez');
      return;
    }

    try {
      setVoting(true);

      // Call RPC function to cast vote
      const { data, error } = await supabase.rpc('cast_penalty_vote', {
        p_proposal_id: proposalId,
        p_voter_id: user?.id,
      });

      if (error) throw error;

      if (data && !data.success) {
        Alert.alert('Error', data.message);
        return;
      }

      Alert.alert('¡Voto registrado! 🗳️', 'Tu voto ha sido contado');
      loadProposals();
    } catch (error) {
      console.error('Error casting vote:', error);
      Alert.alert('Error', 'No se pudo registrar tu voto');
    } finally {
      setVoting(false);
    }
  };

  const getVotePercentage = (voteCount: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((voteCount / totalVotes) * 100);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  // Get winning proposal
  const winningProposal = proposals.length > 0 ? proposals[0] : null;
  const isDecided = phase === 'decided';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {isDecided ? 'Castigo Decidido 🏆' : 'Votar Castigos 🗳️'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Phase Banner */}
        <View style={[styles.phaseBanner, { backgroundColor: isDecided ? theme.cardHighlight : theme.card }]}>
          <Text style={[styles.phaseTitle, { color: isDecided ? theme.success : theme.primary }]}>
            {isDecided ? '✅ VOTACIÓN FINALIZADA' : '🗳️ FASE 2: VOTACIÓN'}
          </Text>
          {!isDecided && (
            <>
              <Text style={[styles.phaseSubtitle, { color: theme.textSecondary }]}>
                {timeRemaining}
              </Text>
              <Text style={[styles.phaseDescription, { color: theme.textSecondary }]}>
                Vota por el castigo que más te guste. El castigo con más votos será asignado al perdedor.
              </Text>
            </>
          )}
          {isDecided && winningProposal && (
            <>
              <Text style={[styles.winningPenalty, { color: theme.text }]}>
                {winningProposal.penalty_text}
              </Text>
              <Text style={[styles.winningVotes, { color: theme.textSecondary }]}>
                {winningProposal.vote_count} votos ({getVotePercentage(winningProposal.vote_count)}%)
              </Text>
            </>
          )}
        </View>

        {/* Voted Message */}
        {hasVoted && !isDecided && (
          <View style={[styles.infoCard, { backgroundColor: theme.cardHighlight, borderColor: theme.primary }]}>
            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              Ya votaste. Los resultados se revelarán cuando termine la votación.
            </Text>
          </View>
        )}

        {/* Proposals List */}
        <View style={styles.proposalsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {isDecided ? 'Resultados Finales' : 'Castigos Propuestos'} ({proposals.length})
          </Text>

          {proposals.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No hay propuestas de castigos para este raid.
              </Text>
            </View>
          ) : (
            proposals.map((proposal, index) => (
              <View 
                key={proposal.id} 
                style={[
                  styles.proposalCard, 
                  { 
                    backgroundColor: proposal.has_voted ? theme.cardHighlight : theme.card,
                    borderWidth: isDecided && index === 0 ? 2 : 0,
                    borderColor: isDecided && index === 0 ? theme.success : 'transparent',
                  }
                ]}
              >
                {/* Winner Badge */}
                {isDecided && index === 0 && (
                  <View style={[styles.winnerBadge, { backgroundColor: theme.success }]}>
                    <Ionicons name="trophy" size={16} color="#FFFFFF" />
                    <Text style={styles.winnerBadgeText}>GANADOR</Text>
                  </View>
                )}

                <View style={styles.proposalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.proposerName, { color: theme.textSecondary }]}>
                      Propuesto por {proposal.proposer_name}
                    </Text>
                  </View>
                  {/* Vote Count */}
                  <View style={[styles.voteBadge, { backgroundColor: theme.background }]}>
                    <Ionicons name="heart" size={16} color={theme.error} />
                    <Text style={[styles.voteCount, { color: theme.text }]}>
                      {proposal.vote_count}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.penaltyText, { color: theme.text }]}>
                  {proposal.penalty_text}
                </Text>

                {proposal.description && (
                  <Text style={[styles.proposalDescription, { color: theme.textSecondary }]}>
                    {proposal.description}
                  </Text>
                )}

                {/* Vote Progress Bar */}
                {totalVotes > 0 && (
                  <View style={styles.progressContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          backgroundColor: theme.background,
                        }
                      ]}
                    >
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${getVotePercentage(proposal.vote_count)}%`,
                            backgroundColor: theme.primary,
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                      {getVotePercentage(proposal.vote_count)}%
                    </Text>
                  </View>
                )}

                {/* Vote Button */}
                {!isDecided && !hasVoted && (
                  <TouchableOpacity
                    style={[styles.voteButton, { backgroundColor: theme.primary }]}
                    onPress={() => castVote(proposal.id)}
                    disabled={voting}
                  >
                    {voting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="heart" size={18} color="#FFFFFF" />
                        <Text style={styles.voteButtonText}>Votar por este castigo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Voted Indicator */}
                {proposal.has_voted && (
                  <View style={[styles.votedIndicator, { backgroundColor: theme.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.votedText}>Tu voto</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Info Box */}
        {!isDecided && (
          <View style={[styles.infoBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.infoBoxTitle, { color: theme.text }]}>
              ℹ️ Información
            </Text>
            <Text style={[styles.infoBoxText, { color: theme.textSecondary }]}>
              • Solo puedes votar por UN castigo{'\n'}
              • No puedes cambiar tu voto{'\n'}
              • El castigo con más votos gana{'\n'}
              • En empate, gana el propuesto primero{'\n'}
              • El perdedor tiene 48h para cumplirlo
            </Text>
          </View>
        )}

        {/* Next Steps (if decided) */}
        {isDecided && (
          <View style={[styles.infoBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.infoBoxTitle, { color: theme.text }]}>
              📋 Próximos Pasos
            </Text>
            <Text style={[styles.infoBoxText, { color: theme.textSecondary }]}>
              1. El perdedor será notificado del castigo{'\n'}
              2. Tiene 48 horas para completarlo{'\n'}
              3. Debe subir foto/video como evidencia{'\n'}
              4. Los miembros verifican que se cumplió{'\n'}
              5. Si no cumple, se aplica penalización extra
            </Text>
          </View>
        )}
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
  winningPenalty: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  winningVotes: {
    fontSize: 14,
    marginTop: 8,
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
    position: 'relative',
  },
  winnerBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  winnerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  proposalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  proposerName: {
    fontSize: 12,
    fontWeight: '600',
  },
  voteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: 'bold',
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
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  votedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  votedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
