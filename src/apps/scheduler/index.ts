import { SEQUENCE_TOPIC } from "../../constant";
import { sql } from "../../db";
import { getPendingLeads, type PendingLead } from "../../db/queries/scheduler";
import { DatabaseError, logger } from "../../utils";
import { makeIdemKey } from "../../utils/scheduler";

const NO_LEAD_FOUND_INTERVAL = 10000;
const NORMAL_INTERVAL = 3000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const handleBatch = async (leads: PendingLead[]) => {
  for (const lead of leads) {
    console.log(lead);
    const idemKey = makeIdemKey(lead.sequence_id, lead.lead_id, lead.current_step);
    await sql.begin(async (sql) => {
      const isExisting = await sql`
            SELECT Count(*) FROM "Outbox" WHERE "idemKey" = ${idemKey}
      `;

      if (isExisting[0].count > 0) {
        logger.info(
          `Lead ${lead.lead_id} for sequence ${lead.sequence_id} at step ${lead.current_step} already exists in Outbox`,
        );
        throw new DatabaseError("Lead already exists in Outbox");
      }

      const stringifiedRow = JSON.stringify(lead);
      await sql`
        INSERT INTO "Outbox" ("id", "topic", "payload", "idemKey")
        VALUES (gen_random_uuid(), ${SEQUENCE_TOPIC}, ${stringifiedRow}::jsonb, ${idemKey})
        `;

      await sql`
        UPDATE "LeadSequenceState"
        SET
            status = 'RUNNING',
            "updatedAt" = now()
        WHERE id = ${lead.lead_state_id}
        AND status IN ('PENDING','RUNNING');
        `;
    });
    logger.info(`Processing lead ${lead.lead_id} for sequence ${lead.sequence_id} at step ${lead.current_step}`);
  }
};

while (true) {
  const [leads, error] = await getPendingLeads(50);

  if (!leads || error || !leads.length) {
    logger.info("No leads found");
    await sleep(NO_LEAD_FOUND_INTERVAL);
    continue;
  }

  await handleBatch(leads);
  await sleep(NORMAL_INTERVAL);
}
