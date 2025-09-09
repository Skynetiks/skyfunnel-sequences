import { Logger } from "./logger.js";

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  VALIDATION = "validation",
  DATABASE = "database",
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  BUSINESS_LOGIC = "business_logic",
  EXTERNAL_SERVICE = "external_service",
  CONFIGURATION = "configuration",
  SYSTEM = "system",
  UNKNOWN = "unknown",
}

/**
 * Base error class with enhanced properties
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>,
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to a plain object for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      isOperational: this.isOperational,
      stack: this.stack,
    };
  }
}

/**
 * Specific error types for common scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", ErrorCategory.VALIDATION, ErrorSeverity.LOW, context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "DATABASE_ERROR", ErrorCategory.DATABASE, ErrorSeverity.HIGH, context);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NETWORK_ERROR", ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "AUTHENTICATION_ERROR", ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "AUTHORIZATION_ERROR", ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH, context);
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "BUSINESS_LOGIC_ERROR", ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.MEDIUM, context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "EXTERNAL_SERVICE_ERROR", ErrorCategory.EXTERNAL_SERVICE, ErrorSeverity.MEDIUM, context);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "CONFIGURATION_ERROR", ErrorCategory.CONFIGURATION, ErrorSeverity.CRITICAL, context);
  }
}

export class SystemError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "SYSTEM_ERROR", ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, context, false);
  }
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  logger: Logger;
  serviceName?: string;
  enableStackTrace?: boolean;
  enableMetrics?: boolean;
}

/**
 * Main error handler class
 */
export class ErrorHandler {
  private logger: Logger;
  private serviceName?: string;
  private enableStackTrace: boolean;
  private enableMetrics: boolean;
  private errorCounts: Map<string, number> = new Map();

  constructor(config: ErrorHandlerConfig) {
    this.logger = config.logger;
    this.serviceName = config.serviceName;
    this.enableStackTrace = config.enableStackTrace ?? true;
    this.enableMetrics = config.enableMetrics ?? false;
  }

  /**
   * Handle and log an error
   */
  handle(error: Error | AppError, context?: Record<string, unknown>): void {
    const errorContext = {
      service: this.serviceName,
      ...context,
    };

    if (error instanceof AppError) {
      this.handleAppError(error, errorContext);
    } else {
      this.handleGenericError(error, errorContext);
    }

    if (this.enableMetrics) {
      this.updateErrorMetrics(error);
    }
  }

  /**
   * Handle AppError instances
   */
  private handleAppError(error: AppError, context: Record<string, unknown>): void {
    const logContext = {
      ...context,
      error: error.toJSON(),
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.fatal(`Critical error: ${error.message}`, logContext);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(`High severity error: ${error.message}`, logContext, error);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.error(`Medium severity error: ${error.message}`, logContext, error);
        break;
      case ErrorSeverity.LOW:
        this.logger.warn(`Low severity error: ${error.message}`, logContext);
        break;
    }
  }

  /**
   * Handle generic Error instances
   */
  private handleGenericError(error: Error, context: Record<string, unknown>): void {
    const logContext = {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: this.enableStackTrace ? error.stack : undefined,
      },
    };

    this.logger.error(`Unhandled error: ${error.message}`, logContext, error);
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(error: Error | AppError): void {
    const errorKey = error instanceof AppError ? error.code : error.name;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Reset error metrics
   */
  resetErrorMetrics(): void {
    this.errorCounts.clear();
  }

  /**
   * Create a new error handler with additional context
   */
  withContext(context: Record<string, unknown>): ErrorHandler {
    const childLogger = this.logger.child(context);
    return new ErrorHandler({
      logger: childLogger,
      serviceName: this.serviceName,
      enableStackTrace: this.enableStackTrace,
      enableMetrics: this.enableMetrics,
    });
  }
}

/**
 * Utility function to create an error handler for a service
 */
export function createErrorHandler(logger: Logger, serviceName?: string): ErrorHandler {
  return new ErrorHandler({
    logger,
    serviceName,
    enableStackTrace: true,
    enableMetrics: true,
  });
}

/**
 * Async error wrapper that catches and handles errors
 */
export async function withErrorHandling<T>(
  errorHandler: ErrorHandler,
  operation: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    errorHandler.handle(error as Error, context);
    return null;
  }
}

/**
 * Sync error wrapper that catches and handles errors
 */
export function withErrorHandlingSync<T>(
  errorHandler: ErrorHandler,
  operation: () => T,
  context?: Record<string, unknown>,
): T | null {
  try {
    return operation();
  } catch (error) {
    errorHandler.handle(error as Error, context);
    return null;
  }
}

/**
 * Decorator for async methods to automatically handle errors
 */
export function handleErrors(errorHandler: ErrorHandler, context?: Record<string, unknown>) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        errorHandler.handle(error as Error, {
          ...context,
          method: propertyName,
          className: (target as { constructor: { name: string } }).constructor.name,
        });
        throw error; // Re-throw to maintain original behavior
      }
    };
  };
}

/**
 * Utility to convert unknown errors to AppError
 */
export function toAppError(error: unknown, defaultMessage: string = "An unexpected error occurred"): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new SystemError(error.message, { originalError: error.name });
  }

  return new SystemError(defaultMessage, { originalError: String(error) });
}

/**
 * Utility to check if an error is operational (recoverable)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Utility to get error severity
 */
export function getErrorSeverity(error: Error): ErrorSeverity {
  if (error instanceof AppError) {
    return error.severity;
  }
  return ErrorSeverity.MEDIUM;
}

/**
 * Utility to get error category
 */
export function getErrorCategory(error: Error): ErrorCategory {
  if (error instanceof AppError) {
    return error.category;
  }
  return ErrorCategory.UNKNOWN;
}
