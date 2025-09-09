import { Logger } from "./logger.js";
import { ErrorHandler, createErrorHandler, AppError, ErrorCategory, ErrorSeverity } from "./error-handler.js";

/**
 * Global error handler instance
 */
let globalErrorHandler: ErrorHandler | null = null;

/**
 * Initialize the global error handler
 */
export function initializeGlobalErrorHandler(logger: Logger, serviceName?: string): void {
  globalErrorHandler = createErrorHandler(logger, serviceName);
}

/**
 * Get the global error handler
 */
export function getGlobalErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    throw new AppError(
      "Global error handler not initialized",
      "ERROR_HANDLER_NOT_INITIALIZED",
      ErrorCategory.SYSTEM,
      ErrorSeverity.CRITICAL,
    );
  }
  return globalErrorHandler;
}

/**
 * Handle an error using the global error handler
 */
export function handleError(error: Error | AppError, context?: Record<string, unknown>): void {
  const handler = getGlobalErrorHandler();
  handler.handle(error, context);
}

/**
 * Safe async execution with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: Record<string, unknown>,
  fallback?: T,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(error as Error, context);
    return fallback ?? null;
  }
}

/**
 * Safe sync execution with error handling
 */
export function safeSync<T>(operation: () => T, context?: Record<string, unknown>, fallback?: T): T | null {
  try {
    return operation();
  } catch (error) {
    handleError(error as Error, context);
    return fallback ?? null;
  }
}

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
        handleError(lastError, {
          ...context,
          maxRetries,
          finalAttempt: true,
        });
        throw lastError;
      }

      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);

      handleError(lastError, {
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
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  context?: Record<string, unknown>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const timeoutError = new AppError(
        `Operation timed out after ${timeoutMs}ms`,
        "OPERATION_TIMEOUT",
        ErrorCategory.SYSTEM,
        ErrorSeverity.MEDIUM,
        { timeoutMs, ...context },
      );
      handleError(timeoutError);
      reject(timeoutError);
    }, timeoutMs);

    operation()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        handleError(error as Error, context);
        reject(error);
      });
  });
}

/**
 * Process unhandled promise rejections
 */
export function setupGlobalErrorHandlers(): void {
  process.on("unhandledRejection", (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    handleError(error, {
      type: "unhandledRejection",
      promise: promise.toString(),
    });
  });

  process.on("uncaughtException", (error) => {
    handleError(error, {
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
      handleError(
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
