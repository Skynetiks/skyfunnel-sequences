import { logger } from "./logger";
import type { LeadData, LeadWithEnrichment, SequenceStep, TemplateData } from "../db/queries/lead";
import { createSpecialVariables, type Context, type SpecialVariableFunction } from "./specialVariables";

// ============================================================================
// TYPES
// ============================================================================
export interface TemplateVariable {
  key: string;
  value: string;
  description?: string;
}

export interface TemplateProcessorConfig {
  caseSensitive?: boolean;
  allowUndefinedVariables?: boolean;
  undefinedVariableReplacement?: string;
  customVariables?: Record<string, string>;
  enableSpecialVariables?: boolean;
  unsubscribeBaseUrl?: string;
  unsubscribeKey?: string;
}

// ============================================================================
// TEMPLATE PROCESSOR CLASS
// ============================================================================
export class TemplateProcessor {
  private config: Required<TemplateProcessorConfig>;
  private specialVariables: Record<string, SpecialVariableFunction>;

  constructor(config: TemplateProcessorConfig = {}) {
    this.config = {
      caseSensitive: config.caseSensitive ?? false,
      allowUndefinedVariables: config.allowUndefinedVariables ?? true,
      undefinedVariableReplacement: config.undefinedVariableReplacement ?? "",
      customVariables: config.customVariables ?? {},
      enableSpecialVariables: config.enableSpecialVariables ?? true,
      unsubscribeBaseUrl: config.unsubscribeBaseUrl ?? "",
      unsubscribeKey: config.unsubscribeKey ?? "unsubscribe",
    };

    this.specialVariables = createSpecialVariables({
      unsubscribe: {
        baseUrl: this.config.unsubscribeBaseUrl,
        key: this.config.unsubscribeKey,
      },
    });
  }

  /**
   * Processes a template string with lead data
   */
  async processTemplate(
    template: string,
    leadData: LeadWithEnrichment,
    sequence?: SequenceStep,
    templateData?: TemplateData,
  ): Promise<string> {
    if (!template) {
      return "";
    }

    try {
      const variables = this.getLeadVariables(leadData);

      const context: Context = {
        lead: leadData,
        sequence: sequence ?? {
          id: "",
          stepNumber: 0,
          minIntervalMin: 0,
          sequenceId: "",
          templateId: "",
          requireNoReply: false,
          stopOnBounce: false,
        },
        template: templateData ?? {
          sequenceTemplate: { id: "", templateId: "", subject: "" },
          emailTemplate: { id: "", name: "", subject: "", bodyHTML: "" },
        },
        raw: template,
      };

      const processed = await this.replaceVariables(template, variables, context);

      logger.debug("Template processed successfully", {
        originalLength: template.length,
        processedLength: processed.length,
      });

      return processed;
    } catch (error) {
      logger.error("Failed to process template", {
        error: error instanceof Error ? error.message : String(error),
        templateLength: template.length,
      });
      throw new Error(`Template processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Collect all variables for a lead
   */
  private getLeadVariables(leadData: LeadData): Record<string, string> {
    const variables: Record<string, string> = {
      id: leadData.id || "",
      email: leadData.email || "",
      firstname: leadData.firstName || "",
      lastname: leadData.lastName || "",
      fullname: this.getFullName(leadData),
      phone: leadData.phone || "",
      companyname: leadData.companyName || "",
      companywebsite: leadData.companyWebsite || "",
      jobtitle: leadData.jobTitle || "",
      industry: leadData.industry || "",
      companysize: leadData.companySize || "",
      annualrevenue: leadData.annualRevenue || "",
      address: leadData.address || "",
      state: leadData.state || "",
      country: leadData.country || "",
      source: leadData.source || "",
      linkedinurl: leadData.linkedinUrl || "",
      conversionrate: leadData.conversionRate?.toString() || "",
      organizationid: leadData.organizationId || "",
      assignedto: leadData.assignedTo || "",

      tfirstname: this.toTitleCase(leadData.firstName || ""),
      tlastname: this.toTitleCase(leadData.lastName || ""),
      tcompanyname: this.toTitleCase(leadData.companyName || ""),
      tjobtitle: this.toTitleCase(leadData.jobTitle || ""),
      tindustry: this.toTitleCase(leadData.industry || ""),
    };

    Object.entries(this.config.customVariables).forEach(([key, value]) => {
      variables[this.normalizeKey(key)] = value;
    });

    return variables;
  }

  /**
   * Replace variables in the template string
   */
  private async replaceVariables(
    template: string,
    variables: Record<string, string>,
    context: Context,
  ): Promise<string> {
    let processed = await this.processAdvancedSyntax(template, variables, context);

    if (!this.config.allowUndefinedVariables) {
      const undefinedVariableRegex = /\[\[[^\]]+\]\]/g;
      processed = processed.replace(undefinedVariableRegex, this.config.undefinedVariableReplacement);
    }

    return processed;
  }

  /**
   * Handle [[key || fallback]] syntax
   */
  private async processAdvancedSyntax(
    template: string,
    variables: Record<string, string>,
    context: Context,
  ): Promise<string> {
    const regex = /\[\[([a-zA-Z0-9_-]+)(?:\s*\|\|\s*(.+?))?\]\]/g;
    const matches = [...template.matchAll(regex)];
    if (matches.length === 0) {
      return template;
    }

    const replacements = await Promise.all(
      matches.map(async ([raw, key, fallback]) => {
        const normalized = this.normalizeKey(key);
        const value = this.getLeadValueByKey(normalized, variables);

        if (value) {
          return { raw, replacement: value };
        }

        if (this.config.enableSpecialVariables) {
          const fn = this.specialVariables[normalized];
          if (fn) {
            try {
              const replacement = await fn({
                key: normalized,
                fallback,
                variables,
                config: {
                  unsubscribe: {
                    baseUrl: this.config.unsubscribeBaseUrl,
                    key: this.config.unsubscribeKey,
                  },
                },
                context,
              });
              return { raw, replacement };
            } catch (error) {
              logger.error("Special variable function error", {
                key,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }

        return {
          raw,
          replacement: fallback ?? this.config.undefinedVariableReplacement,
        };
      }),
    );

    return replacements.reduce((acc, { raw, replacement }) => acc.replace(raw, replacement), template);
  }

  private getLeadValueByKey(key: string, variables: Record<string, string>): string | undefined {
    return variables[key];
  }

  private normalizeKey(key: string): string {
    return this.config.caseSensitive ? key : key.toLowerCase();
  }

  private getFullName(leadData: LeadWithEnrichment): string {
    const firstName = leadData.firstName || "";
    const lastName = leadData.lastName || "";
    return `${firstName} ${lastName}`.trim();
  }

  private toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  }

  validateTemplate(template: string, leadData: LeadWithEnrichment): { isValid: boolean; undefinedVariables: string[] } {
    const variables = this.getLeadVariables(leadData);
    const regex = /\[\[([a-zA-Z0-9_-]+)(?:\s*\|\|\s*(.+?))?\]\]/g;
    const matches = [...template.matchAll(regex)];

    const undefinedVariables = matches
      .map(([raw, key]) => {
        const normalized = this.normalizeKey(key);
        const hasLead = !!variables[normalized];
        const isCustom = Object.prototype.hasOwnProperty.call(this.config.customVariables, normalized);
        const isSpecial = !!this.specialVariables[normalized];
        if (!hasLead && !isCustom && !isSpecial) {
          return raw;
        }
        return null;
      })
      .filter((v): v is string => v !== null);

    return {
      isValid: undefinedVariables.length === 0,
      undefinedVariables,
    };
  }

  getTemplateVariables(template: string): string[] {
    const regex = /\[\[([a-zA-Z0-9_-]+)(?:\s*\|\|\s*(.+?))?\]\]/g;
    const matches = [...template.matchAll(regex)];
    return [...new Set(matches.map((m) => m[1]))];
  }
}

// ============================================================================
// HELPERS
// ============================================================================
export const createTemplateProcessor = (config?: TemplateProcessorConfig): TemplateProcessor =>
  new TemplateProcessor(config);

export const processTemplate = (
  template: string,
  leadData: LeadWithEnrichment,
  config?: TemplateProcessorConfig,
  sequence?: SequenceStep,
  templateData?: TemplateData,
): Promise<string> => {
  const processor = createTemplateProcessor(config);
  return processor.processTemplate(template, leadData, sequence, templateData);
};

export const validateTemplates = (
  templates: string[],
  leadData: LeadWithEnrichment,
  config?: TemplateProcessorConfig,
): Array<{ template: string; isValid: boolean; undefinedVariables: string[] }> => {
  const processor = createTemplateProcessor(config);
  return templates.map((template) => ({
    template,
    ...processor.validateTemplate(template, leadData),
  }));
};
