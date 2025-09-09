import { getPendingLeads, type PendingLead } from "../../db/queries/scheduler";
import { logger } from "../../utils";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const handleBatch = async (leads: PendingLead[]) => {
  for (const lead of leads) {
    // const leadState = await getLeadState(lead.lead_state_id);
    logger.info(`Processing lead ${lead.lead_id} for sequence ${lead.sequence_id} at step ${lead.current_step}`);
  }
};

while (true) {
  const [leads, error] = await getPendingLeads(50);

  if (!leads || error) {
    continue;
  }

  await handleBatch(leads);
  await sleep(1000);
}
