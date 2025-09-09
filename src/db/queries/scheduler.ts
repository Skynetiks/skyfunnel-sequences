import { sql } from "..";
import { dbErrorParser, withErrorHandlingFn } from "../../utils/error-handler";

export type PendingLead = {
  lead_state_id: number;
  lead_id: number;
  sequence_id: number;
  current_step: number;
  step_id: number;
  step_number: number;
  min_interval_min: number;
};

export const getPendingLeads = withErrorHandlingFn(
  (max: number = 50) => {
    return sql<PendingLead[]>`
    SELECT
        leadState.id as lead_state_id,
        leadState.lead_id,
        leadState.sequence_id,
        leadState.current_step,
        seqStep.id as step_id,
        seqStep.step_number,
        seqStep.min_interval_min
    FROM lead_sequence_state leadState
    JOIN sequence_step seqStep
    ON  seqStep.sequence_id = leadState.sequence_id
    AND seqStep.step_number = leadState.current_step + 1
    WHERE leadState.status IN ('PENDING','RUNNING')
    AND (leadState.last_sent_at IS NULL OR now() - leadState.last_sent_at > (seqStep.min_interval_min * interval '1 minute'))
    LIMIT ${max}`;
  },

  { parser: dbErrorParser },
);
