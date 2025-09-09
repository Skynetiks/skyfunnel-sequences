import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
    rules: {
      // Basic JS rules
      "no-console": "warn", // allow console but warn
      "no-debugger": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "no-duplicate-imports": "error",
      "consistent-return": "error",
    },
  },
  tseslint.configs.recommended,
  {
    files: ["src/**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
]);
