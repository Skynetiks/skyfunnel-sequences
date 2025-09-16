import type { LeadWithEnrichment, SequenceStep, TemplateData } from "../db/queries/lead";
import { generateAiOpener } from "./ai";

export type Context = {
  lead: LeadWithEnrichment;
  sequence: SequenceStep;
  template: TemplateData;
  raw: string; // raw template before replacements
};

// -----------------
// Special variable config
// -----------------
export type SpecialVariableConfig = {
  unsubscribe?: {
    baseUrl: string;
    key?: string; // default "unsubscribe"
  };
  ai?: {
    enabled: boolean;
    provider: "gemini";
    apiKey?: string;
    model?: string;
    maxTokens?: number;
  };
  formatting?: {
    dateLocale?: string;
    timeZone?: string;
  };
};

// -----------------
// Special variable function type
// -----------------
export interface SpecialVariableContext {
  key: string;
  fallback?: string;
  variables?: Record<string, string>;
  config: SpecialVariableConfig;
  context: Context;
}

export type SpecialVariableFunction = (ctx: SpecialVariableContext) => Promise<string> | string;

export const createSpecialVariables = (config: SpecialVariableConfig = {}): Record<string, SpecialVariableFunction> => {
  return {
    unsubscribe: async ({ variables, fallback, config }) => {
      const leadId = variables?.["id"] || "";
      if (!config.unsubscribe?.baseUrl || !leadId) {
        return fallback || "";
      }
      const key = config.unsubscribe.key ?? "unsubscribe";
      return `${config.unsubscribe.baseUrl}${key}/${leadId}`;
    },

    currentDate: () => {
      const now = new Date();
      return now.toLocaleDateString(config.formatting?.dateLocale ?? "en-US", {
        timeZone: config.formatting?.timeZone,
      });
    },

    currentYear: () => new Date().getFullYear().toString(),
    currentMonth: () => new Date().getMonth().toString(),
    currentDay: () => new Date().getDate().toString(),

    aiOpener: async ({ context, config }) => {
      if (!config.ai?.enabled) {
        return "";
      }

      const { lead } = context;

      if (config.ai.provider === "gemini") {
        return generateAiOpener(lead);
      }

      return "Hello there 👋";
    },
  };
};
