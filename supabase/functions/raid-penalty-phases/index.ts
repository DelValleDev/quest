/**
 * Raid Penalty Phases - Edge Function
 * 
 * PURPOSE:
 * Avanza automáticamente las fases del sistema de votación de castigos en raids.
 * Se ejecuta cada 12 horas mediante un cron job.
 * 
 * FASES:
 * 1. PROPOSICIÓN (12h): Los miembros proponen castigos creativos
 * 2. VOTACIÓN (12h): Los miembros votan por el mejor castigo
 * 3. DECIDIDO: Se asigna el castigo ganador al perdedor
 * 
 * SCHEDULE:
 * Cron: Every 12 hours (0 */12 * * *)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhaseAdvanceResult {
  proposalToVoting: number;
  votingToDecided: number;
  notifications: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Raid Penalty Phases - Starting execution');

    // Call the PostgreSQL function that advances phases
    const { error: advanceError } = await supabase.rpc('advance_penalty_phases');

    if (advanceError) {
      console.error('❌ Error advancing phases:', advanceError);
      throw advanceError;
    }

    console.log('✅ Phases advanced successfully');

    // Get proposals that just moved to voting phase
    const { data: newVotingProposals, error: votingError } = await supabase
      .from('raid_penalty_proposals')
      .select(`
        raid_id,
        loser_id,
        penalty_text
      `)
      .eq('phase', 'voting')
      .gte('voting_starts_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Last 15 mins

    if (votingError) {
      console.error('❌ Error fetching new voting proposals:', votingError);
    }

    // Send notifications to raid members for new voting phase
    let notificationsSent = 0;
    if (newVotingProposals && newVotingProposals.length > 0) {
      for (const proposal of newVotingProposals) {
        // Get all raid participants
        const { data: participants, error: participantsError } = await supabase
          .from('raid_participants')
          .select('user_id')
          .eq('raid_id', proposal.raid_id);

        if (participantsError) {
          console.error('❌ Error fetching participants:', participantsError);
          continue;
        }

        // Send notification to each participant
        for (const participant of participants || []) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: participant.user_id,
              type: 'raid_penalty_voting_started',
              title: '🗳️ Votación de Castigo Iniciada',
              message: `Ha comenzado la votación para el castigo del raid. ¡Elige tu favorito!`,
              data: {
                raid_id: proposal.raid_id,
                action: 'navigate',
                screen: 'RaidPenaltyVoting',
                params: { raidId: proposal.raid_id },
              },
            });

          if (!notifError) {
            notificationsSent++;
          }
        }
      }
    }

    // Get proposals that just moved to decided phase
    const { data: decidedProposals, error: decidedError } = await supabase
      .from('raid_winning_penalties')
      .select(`
        raid_id,
        loser_id,
        penalty_text,
        vote_count,
        deadline
      `)
      .eq('status', 'assigned')
      .gte('assigned_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Last 15 mins

    if (decidedError) {
      console.error('❌ Error fetching decided proposals:', decidedError);
    }

    // Send notification to loser about their penalty
    if (decidedProposals && decidedProposals.length > 0) {
      for (const penalty of decidedProposals) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: penalty.loser_id,
            type: 'raid_penalty_assigned',
            title: '😈 Tu Castigo ha Sido Decidido',
            message: `Tu castigo: "${penalty.penalty_text}". Tienes 48h para completarlo.`,
            data: {
              raid_id: penalty.raid_id,
              penalty_text: penalty.penalty_text,
              deadline: penalty.deadline,
              action: 'navigate',
              screen: 'RaidDetail',
              params: { raidId: penalty.raid_id },
            },
          });

        if (!notifError) {
          notificationsSent++;
        }
      }
    }

    console.log(`📨 Sent ${notificationsSent} notifications`);

    const result: PhaseAdvanceResult = {
      proposalToVoting: newVotingProposals?.length || 0,
      votingToDecided: decidedProposals?.length || 0,
      notifications: notificationsSent,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Raid penalty phases advanced successfully',
        result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in raid-penalty-phases function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
