import { createServiceLogger, logExecutionTime } from "../../utils/index.js";

// Create a logger with context for the scheduler
const schedulerLogger = createServiceLogger("scheduler");

schedulerLogger.info("Scheduler service starting up");

// Example usage of different log levels
schedulerLogger.debug("Debug information", { config: "example" });
schedulerLogger.info("Scheduler initialized successfully");
schedulerLogger.warn("This is a warning message");
schedulerLogger.error("This is an error message", { errorCode: 500 });

// Example of logging with error object
try {
  throw new Error("Example error for demonstration");
} catch (error) {
  schedulerLogger.error("Caught an error", { operation: "startup" }, error as Error);
}

// Example of execution time logging
await logExecutionTime(
  schedulerLogger,
  "Scheduler initialization",
  async () => {
    // Simulate some initialization work
    await new Promise((resolve) => setTimeout(resolve, 100));
    schedulerLogger.info("Scheduler components loaded");
  },
  { component: "scheduler" },
);

schedulerLogger.info("Scheduler service ready");
