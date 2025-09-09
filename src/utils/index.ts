/**
 * Utility exports
 */

// Logger
export { Logger, logger, logExecutionTime, withContext, type LogLevel, type LoggerConfig } from "./logger.js";

// Error Handling
export {
  // Error classes
  AppError,
  ValidationError,
  DatabaseError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  BusinessLogicError,
  ExternalServiceError,
  ConfigurationError,
  SystemError,

  // Error handler
  ErrorHandler,
  withErrorHandlingSync,
  handleErrors,

  // Utilities
  toAppError,
  isOperationalError,
  getErrorSeverity,
  getErrorCategory,

  // Enums
  ErrorSeverity,
  ErrorCategory,

  // Types
  type ErrorHandlerConfig,
} from "./error-handler.js";

// Error utilities
export { withRetry, withTimeout, setupGlobalErrorHandlers, setupGracefulShutdown } from "./error-utils.js";
