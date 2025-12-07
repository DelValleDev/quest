-- Migration 063: Raid Penalty Voting System
-- Description: Sistema de votación de castigos creativos para perdedores de raids
-- Author: Quest Team
-- Date: December 2025

-- ===============================================
-- DROP EXISTING TABLES (in case of partial migration)
-- ===============================================
DROP TABLE IF EXISTS raid_penalty_votes CASCADE;
DROP TABLE IF EXISTS raid_penalty_proposals CASCADE;
DROP TABLE IF EXISTS raid_winning_penalties CASCADE;

-- ===============================================
-- RAID PENALTY PROPOSALS
-- ===============================================
-- Propuestas de castigos creativos para el perdedor del raid
CREATE TABLE IF NOT EXISTS raid_penalty_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_id UUID REFERENCES raids(id) ON DELETE CASCADE,
  proposer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  loser_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  penalty_text TEXT NOT NULL, -- "Hacer 100 burpees", "Cantar en público", etc.
  description TEXT,
  is_appropriate BOOLEAN DEFAULT true, -- Moderación
  vote_count INTEGER DEFAULT 0,
  phase TEXT CHECK (phase IN ('proposal', 'voting', 'decided', 'completed')) DEFAULT 'proposal',
  created_at TIMESTAMP DEFAULT NOW(),
  voting_starts_at TIMESTAMP,
  voting_ends_at TIMESTAMP,
  UNIQUE(raid_id, proposer_id) -- Una propuesta por persona por raid
);

-- ===============================================
-- PENALTY VOTES
-- ===============================================
-- Votos de los miembros del raid sobre qué castigo aplicar
CREATE TABLE IF NOT EXISTS raid_penalty_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES raid_penalty_proposals(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(proposal_id, voter_id) -- Un voto por propuesta por persona
);

-- ===============================================
-- WINNING PENALTIES
-- ===============================================
-- Castigo ganador que debe cumplir el perdedor
CREATE TABLE IF NOT EXISTS raid_winning_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_id UUID REFERENCES raids(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES raid_penalty_proposals(id) ON DELETE CASCADE,
  loser_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  penalty_text TEXT NOT NULL,
  description TEXT,
  vote_count INTEGER,
  status TEXT CHECK (status IN ('assigned', 'in_progress', 'completed', 'verified', 'failed')) DEFAULT 'assigned',
  assigned_at TIMESTAMP DEFAULT NOW(),
  deadline TIMESTAMP, -- 48h para completar
  completed_at TIMESTAMP,
  verification_photo TEXT, -- URL Supabase Storage
  verified_by UUID[], -- Miembros que confirmaron
  verification_notes TEXT
);

-- ===============================================
-- INDEXES
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_penalty_proposals_raid ON raid_penalty_proposals(raid_id);
CREATE INDEX IF NOT EXISTS idx_penalty_proposals_loser ON raid_penalty_proposals(loser_id);
CREATE INDEX IF NOT EXISTS idx_penalty_proposals_phase ON raid_penalty_proposals(phase);
CREATE INDEX IF NOT EXISTS idx_penalty_votes_proposal ON raid_penalty_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_winning_penalties_raid ON raid_winning_penalties(raid_id);
CREATE INDEX IF NOT EXISTS idx_winning_penalties_loser ON raid_winning_penalties(loser_id);

-- ===============================================
-- ROW LEVEL SECURITY
-- ===============================================
ALTER TABLE raid_penalty_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_penalty_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_winning_penalties ENABLE ROW LEVEL SECURITY;

-- Proposals: raid members can view and create
CREATE POLICY "Raid members can view penalty proposals" ON raid_penalty_proposals
  FOR SELECT USING (
    raid_id IN (
      SELECT raid_id FROM raid_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Raid members can create penalty proposals during proposal phase" ON raid_penalty_proposals
  FOR INSERT WITH CHECK (
    auth.uid() = proposer_id AND
    raid_id IN (
      SELECT raid_id FROM raid_participants WHERE user_id = auth.uid()
    ) AND
    phase = 'proposal'
  );

-- Votes: raid members can view and vote
CREATE POLICY "Raid members can view votes" ON raid_penalty_votes
  FOR SELECT USING (
    proposal_id IN (
      SELECT id FROM raid_penalty_proposals WHERE raid_id IN (
        SELECT raid_id FROM raid_participants WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Raid members can vote during voting phase" ON raid_penalty_votes
  FOR INSERT WITH CHECK (
    auth.uid() = voter_id AND
    proposal_id IN (
      SELECT id FROM raid_penalty_proposals 
      WHERE phase = 'voting' AND raid_id IN (
        SELECT raid_id FROM raid_participants WHERE user_id = auth.uid()
      )
    )
  );

-- Winning penalties: raid members can view and verify
CREATE POLICY "Raid members can view winning penalties" ON raid_winning_penalties
  FOR SELECT USING (
    raid_id IN (
      SELECT raid_id FROM raid_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Loser can update penalty status" ON raid_winning_penalties
  FOR UPDATE USING (auth.uid() = loser_id);

-- ===============================================
-- FUNCTIONS
-- ===============================================

-- Function: Cast vote for a penalty proposal
CREATE OR REPLACE FUNCTION cast_penalty_vote(
  p_proposal_id UUID,
  p_voter_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_existing_vote UUID;
BEGIN
  -- Check if already voted
  SELECT id INTO v_existing_vote
  FROM raid_penalty_votes
  WHERE proposal_id = p_proposal_id AND voter_id = p_voter_id;

  IF v_existing_vote IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already voted for this proposal'
    );
  END IF;

  -- Insert vote
  INSERT INTO raid_penalty_votes (proposal_id, voter_id)
  VALUES (p_proposal_id, p_voter_id);

  -- Update vote count
  UPDATE raid_penalty_proposals
  SET vote_count = vote_count + 1
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Vote cast successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Determine winning penalty after voting ends
CREATE OR REPLACE FUNCTION finalize_raid_penalty_voting(
  p_raid_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_winning_proposal RECORD;
  v_loser_id UUID;
  v_result JSONB;
BEGIN
  -- Get loser_id (user with lowest score in raid)
  SELECT user_id INTO v_loser_id
  FROM raid_participants
  WHERE raid_id = p_raid_id
  ORDER BY points ASC
  LIMIT 1;

  -- Get proposal with most votes
  SELECT * INTO v_winning_proposal
  FROM raid_penalty_proposals
  WHERE raid_id = p_raid_id AND phase = 'voting'
  ORDER BY vote_count DESC, created_at ASC
  LIMIT 1;

  IF v_winning_proposal IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No proposals found for this raid'
    );
  END IF;

  -- Update proposal phase
  UPDATE raid_penalty_proposals
  SET phase = 'decided'
  WHERE raid_id = p_raid_id;

  -- Create winning penalty
  INSERT INTO raid_winning_penalties (
    raid_id,
    proposal_id,
    loser_id,
    penalty_text,
    description,
    vote_count,
    deadline
  )
  VALUES (
    p_raid_id,
    v_winning_proposal.id,
    v_loser_id,
    v_winning_proposal.penalty_text,
    v_winning_proposal.description,
    v_winning_proposal.vote_count,
    NOW() + INTERVAL '48 hours'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Penalty finalized',
    'winner', jsonb_build_object(
      'penalty_text', v_winning_proposal.penalty_text,
      'vote_count', v_winning_proposal.vote_count,
      'loser_id', v_loser_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Advance penalty phase (called by cron job every 12h)
CREATE OR REPLACE FUNCTION advance_penalty_phases()
RETURNS void AS $$
BEGIN
  -- Move from proposal to voting (after 12h)
  UPDATE raid_penalty_proposals
  SET 
    phase = 'voting',
    voting_starts_at = NOW(),
    voting_ends_at = NOW() + INTERVAL '12 hours'
  WHERE phase = 'proposal' AND created_at < NOW() - INTERVAL '12 hours';

  -- Finalize voting (after 24h total)
  PERFORM finalize_raid_penalty_voting(raid_id)
  FROM raid_penalty_proposals
  WHERE phase = 'voting' AND voting_ends_at < NOW();

END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- INITIAL DATA
-- ===============================================
-- No initial data needed

COMMENT ON TABLE raid_penalty_proposals IS 'Propuestas de castigos creativos para perdedores de raids';
COMMENT ON TABLE raid_penalty_votes IS 'Votos de los miembros sobre qué castigo aplicar';
COMMENT ON TABLE raid_winning_penalties IS 'Castigo ganador asignado al perdedor';
COMMENT ON FUNCTION cast_penalty_vote IS 'Emitir voto para una propuesta de castigo';
COMMENT ON FUNCTION finalize_raid_penalty_voting IS 'Determinar castigo ganador después de la votación';
COMMENT ON FUNCTION advance_penalty_phases IS 'Avanzar fases automáticamente (cron job cada 12h)';
