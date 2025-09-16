import { logger } from "./logger";
import type { PendingLead } from "../db/queries/scheduler";
import {
  fetchLeadData,
  fetchSequenceStep,
  fetchEmailTemplate,
  type LeadData,
  type SequenceStep,
  type TemplateData,
  type LeadWithEnrichment,
} from "../db/queries/lead";
import { createTemplateProcessor, type TemplateProcessorConfig } from "./templateProcessor";
import { createEmailData, type EmailServiceConfig } from "./emailService";

// ============================================================================
// LEAD PROCESSOR CONFIGURATION
// ============================================================================

export interface LeadProcessorConfig {
  emailService: EmailServiceConfig;
  templateProcessor?: TemplateProcessorConfig;
  enableValidation?: boolean;
  enableLogging?: boolean;
}

// ============================================================================
// LEAD PROCESSOR CLASS
// ============================================================================

export class LeadProcessor {
  private templateProcessor: ReturnType<typeof createTemplateProcessor>;
  private config: Required<LeadProcessorConfig>;

  constructor(config: LeadProcessorConfig) {
    this.config = {
      emailService: config.emailService,
      templateProcessor: config.templateProcessor ?? {},
      enableValidation: config.enableValidation ?? true,
      enableLogging: config.enableLogging ?? true,
    };
    this.templateProcessor = createTemplateProcessor(this.config.templateProcessor);
  }

  /**
   * Processes a lead by fetching data, preparing email, and sending it
   */
  async processLead(lead: PendingLead): Promise<void> {
    const { lead_id, step_id, sequence_id, current_step } = lead;

    if (this.config.enableLogging) {
      logger.info("Starting lead processing", {
        leadId: lead_id,
        stepId: step_id,
        sequenceId: sequence_id,
        currentStep: current_step,
      });
    }

    try {
      // Fetch all required data in parallel
      const [leadData, sequenceStep] = await Promise.all([fetchLeadData(lead_id), fetchSequenceStep(step_id)]);

      // Validate required data
      this.validateLeadData(leadData, lead_id);
      this.validateSequenceStep(sequenceStep, step_id);

      // Validate lead eligibility
      this.validateLeadEligibility(leadData, lead_id);

      // Fetch email template data
      let templateData: TemplateData | null = null;
      if (sequenceStep.templateId) {
        templateData = await fetchEmailTemplate(sequenceStep.templateId);
      }

      // Prepare and send email
      const emailData = await this.prepareEmailData(leadData, sequenceStep, templateData);
      console.log("emailData", emailData);
      //   TODO: SEND EMAIL

      if (this.config.enableLogging) {
        logger.info("Lead processed successfully", {
          leadId: lead_id,
          stepId: step_id,
          sequenceId: sequence_id,
          emailSent: true,
          templateId: sequenceStep.templateId,
          //   messageId: result.messageId,
        });
      }
    } catch (error) {
      if (this.config.enableLogging) {
        logger.error("Failed to process lead", {
          leadId: lead_id,
          stepId: step_id,
          sequenceId: sequence_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }

  /**
   * Validates lead data exists
   */
  private validateLeadData(leadData: LeadData | null, leadId: string): asserts leadData is LeadData {
    if (!leadData) {
      throw new Error(`Lead not found: ${leadId}`);
    }
  }

  /**
   * Validates sequence step exists
   */
  private validateSequenceStep(
    sequenceStep: SequenceStep | null,
    stepId: string,
  ): asserts sequenceStep is SequenceStep {
    if (!sequenceStep) {
      throw new Error(`Sequence step not found: ${stepId}`);
    }
  }

  /**
   * Validates lead eligibility for email sending
   */
  private validateLeadEligibility(leadData: LeadData, leadId: string): void {
    if (!leadData.email) {
      throw new Error(`Lead ${leadId} has no email address`);
    }

    if (!leadData.isSubscribedToEmail) {
      logger.warn("Lead is not subscribed to email, skipping", {
        leadId: leadId,
        email: leadData.email,
      });
      throw new Error(`Lead ${leadId} is not subscribed to email`);
    }

    if (leadData.isEmailValid === "INVALID") {
      logger.warn("Lead email is marked as invalid, skipping", {
        leadId: leadId,
        email: leadData.email,
        emailValidity: leadData.isEmailValid,
      });
      throw new Error(`Lead ${leadId} email is marked as invalid`);
    }
  }

  /**
   * Prepares email data for sending
   */
  private async prepareEmailData(
    leadData: LeadWithEnrichment,
    sequenceStep: SequenceStep,
    templateData?: TemplateData | null,
  ) {
    // Use template data if available
    const subject = templateData?.sequenceTemplate.subject || templateData?.emailTemplate.subject || "No Subject";
    const body = templateData?.emailTemplate.body || "";

    // Process templates with lead data
    const processedSubject = await this.templateProcessor.processTemplate(subject, leadData);
    const processedBody = await this.templateProcessor.processTemplate(body, leadData);

    return createEmailData(
      leadData.email!,
      processedSubject,
      processedBody,
      leadData.id,
      sequenceStep.sequenceId,
      sequenceStep.id,
      sequenceStep.templateId,
    );
  }

  /**
   * Gets the template processor instance
   */
  getTemplateProcessor() {
    return this.templateProcessor;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a default lead processor instance
 */
export const createLeadProcessor = (config?: Partial<LeadProcessorConfig>): LeadProcessor => {
  const defaultConfig: LeadProcessorConfig = {
    emailService: {
      defaultFromEmail: "noreply@example.com",
      defaultFromName: "Your Company",
      retryAttempts: 3,
      retryDelay: 1000,
      enableValidation: true,
      enableLogging: true,
    },
    templateProcessor: {
      caseSensitive: false,
      allowUndefinedVariables: true,
      undefinedVariableReplacement: "",
      enableSpecialVariables: true,
      unsubscribeBaseUrl: process.env.MAIN_APP_BASE_URL || "",
      unsubscribeKey: "unsubscribe",
    },
    enableValidation: true,
    enableLogging: true,
    ...config,
  };

  return new LeadProcessor(defaultConfig);
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use createLeadProcessor() and call processLead() method instead
 */
export const processLead = async (lead: PendingLead): Promise<void> => {
  const processor = createLeadProcessor();
  return processor.processLead(lead);
};
