import postgres from "postgres";
import { env } from "../config/env.js";

// Create postgres connection with configuration
const sql = postgres(env.DATABASE_URL, {
  // Connection pool settings
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 30, // Close idle connections after 30 seconds
  connect_timeout: 10, // Connection timeout in seconds

  // Enable debug mode in development
  debug: env.NODE_ENV === "development",
});

export { sql };

// Graceful shutdown
process.on("SIGINT", async () => {
  await sql.end({ timeout: 5 });
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await sql.end({ timeout: 5 });
  process.exit(0);
});
