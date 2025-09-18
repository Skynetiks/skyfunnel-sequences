import { logger } from "../../utils";
import { RabbitMQService } from "../../utils/rabbitmq";
import { sql } from "../../db";
import { z } from "zod";
import type { PendingLead } from "../../db/queries/scheduler";
import { processLead } from "../../utils/leadProcessor";
import { SEQUENCE_TOPIC } from "../../constant";

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

export const PendingLeadSchema = z.object({
  lead_state_id: z.string(),
  lead_id: z.string(),
  sequence_id: z.string(),
  current_step: z.number().int().min(0, "Current step must be non-negative"),
  step_id: z.string(),
  step_number: z.number().int().min(1, "Step number must be positive"),
  min_interval_min: z.number().int().min(0, "Min interval must be non-negative"),
});

type WorkerMessage = z.infer<typeof PendingLeadSchema>;

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Updates the lead sequence state after successful processing
 * @param leadStateId - The ID of the lead sequence state to update
 * @throws {Error} If the database update fails
 */
const updateLeadSequenceState = async (leadStateId: string): Promise<void> => {
  try {
    const result = await sql`
      UPDATE "LeadSequenceState" l
      SET
          "currentStep" = l."currentStep" + 1,
          status = CASE
                     WHEN (l."currentStep" + 1) >= (
                         SELECT MAX("stepNumber")
                         FROM "SequenceStep" s
                         WHERE s."sequenceId" = l."sequenceId"
                     )
                       THEN 'COMPLETED'
                     ELSE 'RUNNING'
                   END,
          "lastSentAt" = now(),
          "failureCount" = 0,
          "updatedAt" = now()
      WHERE l.id = ${leadStateId}
        AND l.status IN ('PENDING','RUNNING')
      RETURNING id, status, "currentStep"
    `;

    if (result.length === 0) {
      throw new Error(`No lead sequence state found with id: ${leadStateId} or status not in PENDING/RUNNING`);
    }

    const updatedState = result[0];
    logger.info("Lead sequence state updated successfully", {
      leadStateId,
      newStatus: updatedState.status,
      newStep: updatedState.currentStep,
    });
  } catch (error) {
    logger.error("Failed to update lead sequence state", {
      leadStateId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Database update failed for lead state ${leadStateId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

const onSuccessfulMessage = async (lead: PendingLead) => {
  await updateLeadSequenceState(lead.lead_state_id);
};

/**
 * Handles a worker message by validating and processing it
 * @param message - The validated worker message
 * @throws {Error} If message processing fails
 */
const handleMessage = async (lead: WorkerMessage): Promise<void> => {
  logger.info("Handling worker message", {
    lead,
  });

  try {
    await processLead(lead);
    await onSuccessfulMessage(lead);
  } catch (error) {
    logger.error("Message handling failed", {
      leadId: lead.lead_id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Parses and validates a raw message from RabbitMQ
 * @param rawMessage - The raw message content
 * @returns Validated worker message or null if invalid
 */
const parseAndValidateMessage = (rawMessage: string): WorkerMessage | null => {
  try {
    const parsed = JSON.parse(rawMessage);
    return PendingLeadSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Message validation failed", {
        errors: error.errors,
        rawMessage: rawMessage.substring(0, 500), // Limit log size
      });
    } else {
      logger.error("Message parsing failed", {
        error: error instanceof Error ? error.message : String(error),
        rawMessage: rawMessage.substring(0, 500),
      });
    }
    return null;
  }
};

// ============================================================================
// WORKER LIFECYCLE
// ============================================================================

/**
 * Handles graceful shutdown of the worker
 * @param signal - The shutdown signal received
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    logger.info("Worker shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

/**
 * Sets up error handlers for the worker process
 */
const setupErrorHandlers = (): void => {
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      promise: promise.toString(),
    });
    process.exit(1);
  });
};

/**
 * Starts the worker and begins consuming messages
 */
const startWorker = async (): Promise<void> => {
  try {
    logger.info("Starting worker...");
    setupErrorHandlers();

    const rabbitMq = await RabbitMQService.getInstance();

    logger.info(`Setting up consumer for queue: ${SEQUENCE_TOPIC}`);

    await rabbitMq.consume(SEQUENCE_TOPIC, async (msg) => {
      if (!msg) {
        logger.warn("Received null message, skipping");
        return;
      }

      try {
        const rawMessage = msg.content.toString();
        const message = parseAndValidateMessage(rawMessage);

        if (!message) {
          logger.warn("Invalid message format, skipping", {
            queue: SEQUENCE_TOPIC,
            messageSize: rawMessage.length,
          });
          return;
        }

        await handleMessage(message);
      } catch (error) {
        logger.error("Failed to process message", {
          queue: SEQUENCE_TOPIC,
          error: error instanceof Error ? error.message : String(error),
          messageSize: msg.content.length,
        });

        throw error;
      }
    });

    logger.info("Worker started successfully, consuming messages...");
  } catch (error) {
    logger.error("Failed to start worker", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

logger.info("✅ Info Message");
logger.debug("✅ Debug Message");
logger.warn("✅ Warn Message");
logger.error("✅ Error Message");

// Start the worker
startWorker().catch((error) => {
  logger.error("Worker startup failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
