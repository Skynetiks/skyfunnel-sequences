import { sql } from "../../db";
import { logger } from "../../utils";
import { withErrorHandlingFn } from "../../utils/error-handler";
import { RabbitMQService } from "../../utils/rabbitmq";

export interface OutboxJob {
  id: string;
  topic: string;
  payload: unknown;
  idemKey: string;
  retries: number;
}

const getPendingOutboxJobs = withErrorHandlingFn(async (max: number) => {
  return sql<OutboxJob[]>`UPDATE "Outbox"
  SET processed = true,
  "processedAt" = now(),
  "retries" = "retries" + 1
  WHERE id IN (
    SELECT id
    FROM "Outbox"
    WHERE processed = false
      AND  retries < "maxRetries"
    ORDER BY "createdAt"
    LIMIT ${max}
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id, topic, payload, "idemKey", "retries";`;
});

const revertOutbox = withErrorHandlingFn(async (id: string) => {
  return sql`UPDATE "Outbox"
  SET processed = false,
  "processedAt" = null,
  WHERE id = ${id};`;
});

const handleOutbox = async (outbox: OutboxJob) => {
  try {
    const rabbitMq = await RabbitMQService.getInstance();
    rabbitMq.send(outbox.topic, outbox.payload);
  } catch (error) {
    logger.error("Error handling outbox jobs", { error });
    revertOutbox(outbox.id);
    return;
  }
};

while (true) {
  try {
    logger.info("Running......");
    const [outboxes, error] = await getPendingOutboxJobs(10);
    if (error || !outboxes) {
      logger.error("Error getting pending outbox jobs", { error });
      continue;
    }

    if (outboxes.length === 0) {
      logger.info("No pending outbox jobs found");
      continue;
    }

    for (const outbox of outboxes) {
      await handleOutbox(outbox);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    logger.error("Error handling outbox jobs", { error });
    continue;
  }
}
