import { createServiceLogger, logExecutionTime } from "../../utils/index.js";

// Create a logger with context for the worker
const workerLogger = createServiceLogger("worker");

workerLogger.info("Worker service starting up");

// Example of logging execution time
async function processJob(jobId: string) {
  workerLogger.info("Processing job", { jobId });

  // Simulate some work
  await new Promise((resolve) => setTimeout(resolve, 100));

  workerLogger.info("Job completed", { jobId });
}

// Example usage with execution time logging
await logExecutionTime(workerLogger, "Job processing", () => processJob("job-123"), { jobId: "job-123" });

// Example of different log levels
workerLogger.trace("Detailed trace information", { step: "initialization" });
workerLogger.debug("Debug information", { workerId: "worker-001" });
workerLogger.warn("Worker queue is getting full", { queueSize: 95, maxSize: 100 });

workerLogger.info("Worker service ready");
