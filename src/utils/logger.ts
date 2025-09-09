import pino from "pino";
import { env } from "../config/env.js";

/**
 * Pino log levels
 */
export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: LogLevel;
  prettyPrint?: boolean;
  base?: Record<string, unknown>;
}

/**
 * Convert environment log level to Pino log level
 */
function getPinoLevel(level: string): LogLevel {
  switch (level.toLowerCase()) {
    case "error":
      return "error";
    case "warn":
      return "warn";
    case "info":
      return "info";
    case "debug":
      return "debug";
    default:
      return "info";
  }
}

/**
 * Create Pino logger configuration
 */
function createPinoConfig(): pino.LoggerOptions {
  const isDevelopment = env.NODE_ENV === "development";
  const isProduction = env.NODE_ENV === "production";

  const config: pino.LoggerOptions = {
    level: getPinoLevel(env.LOG_LEVEL),
    base: {
      env: env.NODE_ENV,
    },
  };

  // Pretty print in development
  if (isDevelopment) {
    config.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
        singleLine: false,
      },
    };
  }

  // Production optimizations
  if (isProduction) {
    config.formatters = {
      level: (label) => {
        return { level: label };
      },
    };
  }

  return config;
}

/**
 * Main Logger class using Pino
 */
export class Logger {
  private pino: pino.Logger;

  constructor(config?: Partial<LoggerConfig>) {
    const pinoConfig = createPinoConfig();

    if (config) {
      if (config.level) {
        pinoConfig.level = config.level;
      }
      if (config.base) {
        pinoConfig.base = { ...pinoConfig.base, ...config.base };
      }
    }

    this.pino = pino(pinoConfig);
  }

  /**
   * Log a fatal message
   */
  fatal(message: string, context?: Record<string, unknown>): void {
    this.pino.fatal(context, message);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, unknown>, error?: Error): void {
    const logContext = { ...context };
    if (error) {
      logContext.err = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }
    this.pino.error(logContext, message);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.pino.warn(context, message);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.pino.info(context, message);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.pino.debug(context, message);
  }

  /**
   * Log a trace message
   */
  trace(message: string, context?: Record<string, unknown>): void {
    this.pino.trace(context, message);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger();
    childLogger.pino = this.pino.child(context);
    return childLogger;
  }

  /**
   * Get the underlying Pino logger instance
   */
  getPino(): pino.Logger {
    return this.pino;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.pino.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.pino.level;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Utility function to log function execution time
 */
export async function logExecutionTime<T>(
  logger: Logger,
  message: string,
  fn: () => T | Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  const start = Date.now();
  logger.debug(`${message} - Starting`, context);

  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.debug(`${message} - Completed in ${duration}ms`, { ...context, duration });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`${message} - Failed after ${duration}ms`, { ...context, duration }, error as Error);
    throw error;
  }
}

/**
 * Utility function to create a logger with a specific context
 */
export function withContext(context: Record<string, unknown>): Logger {
  return logger.child(context);
}
