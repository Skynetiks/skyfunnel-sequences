import { z } from "zod";

// Define your environment variable schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Redis (if you're using it)
  REDIS_URL: z.string().url().optional(),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  // Feature Flags
  ENABLE_METRICS: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  ENABLE_DEBUG: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
});

// Parse and validate environment variables
function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${errorMessages.join("\n")}`);
    }
    throw error;
  }
}

// Export the validated environment variables
export const env = parseEnv();

// Export the schema for type inference
export type Env = z.infer<typeof envSchema>;

// Helper function to check if we're in development
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
