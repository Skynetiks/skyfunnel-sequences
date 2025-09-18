import { AppError, ErrorCategory, errorHandler, ErrorSeverity } from "./error-handler.js";

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    context?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, backoffFactor = 2, context = {} } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        errorHandler.handle(lastError, context);
        throw lastError;
      }

      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);

      errorHandler.handle(lastError, {
        ...context,
        attempt: attempt + 1,
        maxRetries,
        retryInMs: delay,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Timeout wrapper for async operations
 */
// helper: wrap any promise with a timeout
export async function withTimeout<T>(promise: Promise<T>, ms: number, name = "Operation"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms)),
  ]);
}

/**
 * Process unhandled promise rejections
 */
export function setupGlobalErrorHandlers(): void {
  process.on("unhandledRejection", (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    errorHandler.handle(error, {
      type: "unhandledRejection",
      promise: promise.toString(),
    });
  });

  process.on("uncaughtException", (error) => {
    errorHandler.handle(error, {
      type: "uncaughtException",
    });

    // For uncaught exceptions, we should exit the process
    process.exit(1);
  });
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(signals: string[] = ["SIGTERM", "SIGINT"]): void {
  signals.forEach((signal) => {
    process.on(signal, () => {
      errorHandler.handle(
        new AppError(
          `Received ${signal}, initiating graceful shutdown`,
          "GRACEFUL_SHUTDOWN",
          ErrorCategory.SYSTEM,
          ErrorSeverity.LOW,
          { signal },
        ),
      );

      // Give time for cleanup
      setTimeout(() => {
        process.exit(0);
      }, 5000);
    });
  });
}
