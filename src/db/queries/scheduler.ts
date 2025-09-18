import { sql } from "..";
import { dbErrorParser, withErrorHandlingFn } from "../../utils/error-handler";

export type PendingLead = {
  lead_state_id: string;
  lead_id: string;
  sequence_id: string;
  current_step: number;
  step_id: string;
  step_number: number;
  min_interval_min: number;
};

export const getPendingLeads = withErrorHandlingFn(
  (max: number = 50) => {
    return sql<PendingLead[]>`
    SELECT
        "leadState"."id" AS "lead_state_id",
        "leadState"."leadId" AS "lead_id",
        "leadState"."sequenceId" AS "sequence_id",
        "leadState"."currentStep" AS "current_step",
        "seqStep"."id" AS "step_id",
        "seqStep"."stepNumber" AS "step_number",
        "seqStep"."minIntervalMin" AS "min_interval_min"
    FROM "LeadSequenceState" AS "leadState"
    JOIN "SequenceStep" AS "seqStep"
        ON "seqStep"."sequenceId" = "leadState"."sequenceId"
        AND "seqStep"."stepNumber" = "leadState"."currentStep" + 1
    WHERE "leadState"."status" IN ('PENDING', 'RUNNING')
    AND (
        "leadState"."lastSentAt" IS NULL
        OR now() - "leadState"."lastSentAt" > ("seqStep"."minIntervalMin" * interval '1 minute')
    )
    AND "leadState"."updatedAt" < now() - interval '1 hour'
    LIMIT ${max};
`;
  },

  { parser: dbErrorParser },
);
