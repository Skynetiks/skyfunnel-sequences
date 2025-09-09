import { env } from "../src/config/env.js";

console.log("✅ Environment variables validated successfully!");
console.log("📋 Current environment configuration:");
console.log(`   NODE_ENV: ${env.NODE_ENV}`);
console.log(`   LOG_LEVEL: ${env.LOG_LEVEL}`);
console.log(`   ENABLE_METRICS: ${env.ENABLE_METRICS}`);
console.log(`   ENABLE_DEBUG: ${env.ENABLE_DEBUG}`);

// Don't log sensitive information in production
if (env.NODE_ENV !== "production") {
  const ignoreKeys = ["NODE_ENV", "LOG_LEVEL", "ENABLE_METRICS", "ENABLE_DEBUG"];
  Object.keys(env).forEach((key) => {
    if (ignoreKeys.includes(key)) {
      return;
    }
    const value = env[key as keyof typeof env];
    console.log(`   ${key}: ${value !== undefined && value !== null && value !== "" ? "✅ Set" : "❌ Missing"}`);
  });
}
