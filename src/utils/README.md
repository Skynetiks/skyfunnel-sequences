# Logging Service

A comprehensive logging service for the Sequences project built on top of [Pino](https://getpino.io/) - the fastest JSON logger for Node.js. Features structured logging, configurable log levels, and optimized performance.

## Features

- ✅ **Pino-Powered**: Built on the fastest JSON logger for Node.js
- ✅ **Multiple Log Levels**: FATAL, ERROR, WARN, INFO, DEBUG, TRACE
- ✅ **Environment Integration**: Uses `LOG_LEVEL` from environment config
- ✅ **Structured Logging**: JSON output with context objects and error objects
- ✅ **Pretty Printing**: Human-readable output in development with pino-pretty
- ✅ **Child Loggers**: Create loggers with persistent context
- ✅ **Execution Time Logging**: Built-in performance monitoring
- ✅ **TypeScript Support**: Full type safety and IntelliSense
- ✅ **Production Optimized**: Efficient JSON logging for production environments

## Quick Start

### Basic Usage

```typescript
import { logger } from "../utils/index.js";

// Simple logging
logger.info("Application started");
logger.warn("This is a warning");
logger.error("Something went wrong");
logger.fatal("Critical system failure");

// Logging with context
logger.info("User logged in", { userId: "123", email: "user@example.com" });

// Logging with error objects
try {
  throw new Error("Database connection failed");
} catch (error) {
  logger.error("Database error", { operation: "connect" }, error as Error);
}
```

### Service-Specific Loggers

```typescript
import { createServiceLogger } from "../utils/index.js";

// Create a logger with persistent context
const serviceLogger = createServiceLogger("user-service");

serviceLogger.info("Processing user request"); // Automatically includes service context
serviceLogger.debug("User data retrieved", { userId: "123" });

// Or use withContext for additional context
import { withContext } from "../utils/index.js";
const requestLogger = withContext({ requestId: "req-123", userId: "456" });
```

### Performance Monitoring

```typescript
import { logExecutionTime } from "../utils/index.js";

// Log execution time for functions
await logExecutionTime(logger, "Database query", () => database.query("SELECT * FROM users"), { table: "users" });
```

## Configuration

### Environment Variables

The logger respects the `LOG_LEVEL` environment variable defined in your `.env` file:

```env
LOG_LEVEL=info  # error, warn, info, debug
```

### Log Levels

- **FATAL**: System is unusable, application will terminate
- **ERROR**: Error events that might still allow the application to continue
- **WARN**: Warning messages for potential issues
- **INFO**: General information about application flow
- **DEBUG**: Detailed debugging information
- **TRACE**: Very detailed information for debugging

### Custom Configuration

```typescript
import { createLogger } from "../utils/index.js";

const customLogger = createLogger({
  level: "debug",
  base: {
    component: "custom-service",
    version: "1.0.0",
  },
});
```

## Advanced Usage

### Child Loggers

```typescript
import { logger } from "../utils/index.js";

// Create a child logger with additional context
const requestLogger = logger.child({ requestId: "req-123" });

requestLogger.info("Processing request"); // Includes requestId in all logs
requestLogger.debug("Step 1 completed", { step: 1 });

// Or use the createServiceLogger helper
import { createServiceLogger } from "../utils/index.js";
const serviceLogger = createServiceLogger("payment-service", { version: "2.0" });
```

### Dynamic Log Level Changes

```typescript
import { logger } from "../utils/index.js";

// Change log level at runtime
logger.setLevel("debug");

// Get current log level
const currentLevel = logger.getLevel();
console.log(`Current log level: ${currentLevel}`);
```

### Structured Context

```typescript
import { logger } from "../utils/index.js";

// Rich context objects
logger.info("User action", {
  userId: "123",
  action: "login",
  timestamp: new Date().toISOString(),
  metadata: {
    ip: "192.168.1.1",
    userAgent: "Mozilla/5.0...",
  },
});
```

## Output Format

### Development Mode (with colors)

```
[INFO ] 2024-01-15T10:30:45.123Z User logged in {"userId":"123","email":"user@example.com"}
[WARN ] 2024-01-15T10:30:45.124Z Rate limit approaching {"current":95,"limit":100}
[ERROR] 2024-01-15T10:30:45.125Z Database connection failed {"operation":"connect"}
Error: Connection timeout
Stack: Error: Connection timeout
    at Database.connect (database.js:45:12)
    ...
```

### Production Mode (no colors)

```
[INFO ] 2024-01-15T10:30:45.123Z User logged in {"userId":"123","email":"user@example.com"}
[WARN ] 2024-01-15T10:30:45.124Z Rate limit approaching {"current":95,"limit":100}
[ERROR] 2024-01-15T10:30:45.125Z Database connection failed {"operation":"connect"}
Error: Connection timeout
Stack: Error: Connection timeout
    at Database.connect (database.js:45:12)
    ...
```

## Best Practices

1. **Use appropriate log levels**:
   - FATAL: System is unusable, application will terminate
   - ERROR: System errors, exceptions, failures
   - WARN: Recoverable issues, deprecated usage
   - INFO: Important business events, state changes
   - DEBUG: Detailed flow information, variable values
   - TRACE: Very detailed debugging information

2. **Include relevant context**:

   ```typescript
   // Good
   logger.info("User created", { userId: user.id, email: user.email });

   // Avoid
   logger.info("User created");
   ```

3. **Use child loggers for services**:

   ```typescript
   const serviceLogger = createServiceLogger("payment");
   ```

4. **Log errors with full context**:

   ```typescript
   try {
     await processPayment();
   } catch (error) {
     logger.error(
       "Payment failed",
       {
         userId,
         amount,
         paymentMethod,
       },
       error as Error,
     );
   }
   ```

5. **Use execution time logging for performance monitoring**:
   ```typescript
   await logExecutionTime(logger, "Database query", () => query());
   ```

## Integration with Apps

The logging service is already integrated into the app services:

- **Scheduler**: `src/apps/scheduler/index.ts`
- **Worker**: `src/apps/worker/index.ts`
- **Pump**: `src/apps/pump/index.ts`

Each service creates its own logger with appropriate context for easy identification in logs.
