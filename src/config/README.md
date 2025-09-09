# Environment Configuration

This directory contains type-safe environment variable configuration for the Sequences project.

## Features

- ✅ **Type Safety**: All environment variables are validated and typed using Zod
- ✅ **Runtime Validation**: Environment variables are validated at startup
- ✅ **Default Values**: Sensible defaults for optional variables
- ✅ **Error Messages**: Clear error messages for missing or invalid variables
- ✅ **Development Helpers**: Helper functions for environment checks

## Usage

### Basic Usage

```typescript
import { env } from "../config/env.js";

// All environment variables are now type-safe
console.log(env.DATABASE_URL); // string
console.log(env.PORT); // number
console.log(env.NODE_ENV); // 'development' | 'production' | 'test'
```

### Environment Helpers

```typescript
import { isDevelopment, isProduction, isTest } from "../config/env.js";

if (isDevelopment) {
  console.log("Running in development mode");
}

if (isProduction) {
  console.log("Running in production mode");
}
```

### Validation

Run the validation script to check your environment variables:

```bash
bun run env:validate
```

## Environment Variables

### Required Variables

- `DATABASE_URL`: PostgreSQL database connection string
- `API_KEY`: Secret API key for authentication
- `JWT_SECRET`: Secret key for JWT tokens (minimum 32 characters)

### Optional Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (default: development)
- `REDIS_URL`: Redis connection string
- `EXTERNAL_API_URL`: External API endpoint
- `EXTERNAL_API_KEY`: External API key
- `LOG_LEVEL`: Logging level (default: info)
- `ENABLE_METRICS`: Enable metrics collection (default: false)
- `ENABLE_DEBUG`: Enable debug mode (default: false)

## Setup

1. Copy the example environment file:

   ```bash
   cp env.example .env
   ```

2. Fill in your environment variables in `.env`

3. Validate your configuration:
   ```bash
   bun run env:validate
   ```

## Adding New Environment Variables

1. Add the variable to the `envSchema` in `src/config/env.ts`
2. Add it to `env.example`
3. Update this README if needed

Example:

```typescript
const envSchema = z.object({
  // ... existing variables
  NEW_VARIABLE: z.string().min(1, "NEW_VARIABLE is required"),
});
```

## Error Handling

If environment validation fails, you'll get a clear error message:

```
Environment validation failed:
DATABASE_URL: Required
JWT_SECRET: String must contain at least 32 character(s)
```

This helps you quickly identify and fix configuration issues.
