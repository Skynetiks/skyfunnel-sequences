import { logger } from "./logger";

// ============================================================================
// TYPES
// ============================================================================

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  leadId: string;
  sequenceId: string;
  stepId: string;
  templateId: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  metadata?: Record<string, unknown>;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  disposition?: "attachment" | "inline";
  cid?: string;
}

export interface EmailProvider {
  name: string;
  sendEmail(emailData: EmailData): Promise<EmailResult>;
  validateEmail(emailData: EmailData): Promise<boolean>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  providerId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailServiceConfig {
  defaultFromEmail: string;
  defaultFromName: string;
  defaultReplyTo?: string;
  retryAttempts?: number;
  retryDelay?: number;
  enableValidation?: boolean;
  enableLogging?: boolean;
}

// ============================================================================
// EMAIL SERVICE CLASS
// ============================================================================

export class EmailService {
  private config: Required<EmailServiceConfig>;
  private providers: Map<string, EmailProvider> = new Map();
  private defaultProvider?: EmailProvider;

  constructor(config: EmailServiceConfig) {
    this.config = {
      defaultFromEmail: config.defaultFromEmail,
      defaultFromName: config.defaultFromName,
      defaultReplyTo: config.defaultReplyTo ?? config.defaultFromEmail,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enableValidation: config.enableValidation ?? true,
      enableLogging: config.enableLogging ?? true,
    };
  }

  /**
   * Registers an email provider
   */
  registerProvider(provider: EmailProvider, isDefault = false): void {
    this.providers.set(provider.name, provider);

    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = provider;
    }

    if (this.config.enableLogging) {
      logger.info("Email provider registered", {
        provider: provider.name,
        isDefault,
      });
    }
  }

  /**
   * Sends an email using the default or specified provider
   */
  async sendEmail(emailData: EmailData, providerName?: string): Promise<EmailResult> {
    const provider = providerName ? this.providers.get(providerName) : this.defaultProvider;

    if (!provider) {
      const error = `No email provider found${providerName ? ` named ${providerName}` : ""}`;
      logger.error("Email sending failed", { error, emailData: this.sanitizeEmailData(emailData) });
      return { success: false, error };
    }

    try {
      // Validate email data if enabled
      if (this.config.enableValidation) {
        const isValid = await this.validateEmailData(emailData);
        if (!isValid) {
          const error = "Email data validation failed";
          logger.error("Email sending failed", { error, emailData: this.sanitizeEmailData(emailData) });
          return { success: false, error };
        }
      }

      // Prepare email data with defaults
      const preparedEmailData = this.prepareEmailData(emailData);

      if (this.config.enableLogging) {
        logger.info("Sending email", {
          to: preparedEmailData.to,
          subject: preparedEmailData.subject,
          provider: provider.name,
          leadId: preparedEmailData.leadId,
          stepId: preparedEmailData.stepId,
        });
      }

      // Send email with retry logic
      const result = await this.sendWithRetry(provider, preparedEmailData);

      if (this.config.enableLogging) {
        if (result.success) {
          logger.info("Email sent successfully", {
            to: preparedEmailData.to,
            messageId: result.messageId,
            provider: provider.name,
            leadId: preparedEmailData.leadId,
            stepId: preparedEmailData.stepId,
          });
        } else {
          logger.error("Email sending failed", {
            to: preparedEmailData.to,
            error: result.error,
            provider: provider.name,
            leadId: preparedEmailData.leadId,
            stepId: preparedEmailData.stepId,
          });
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Email sending failed with exception", {
        error: errorMessage,
        provider: provider.name,
        emailData: this.sanitizeEmailData(emailData),
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Validates email data
   */
  private async validateEmailData(emailData: EmailData): Promise<boolean> {
    try {
      // Basic validation
      if (!emailData.to || !emailData.to.includes("@")) {
        logger.warn("Invalid email address", { to: emailData.to });
        return false;
      }

      if (!emailData.subject || emailData.subject.trim().length === 0) {
        logger.warn("Empty email subject");
        return false;
      }

      if (!emailData.body || emailData.body.trim().length === 0) {
        logger.warn("Empty email body");
        return false;
      }

      // Provider-specific validation
      const provider = this.defaultProvider;
      if (provider && typeof provider.validateEmail === "function") {
        return await provider.validateEmail(emailData);
      }

      return true;
    } catch (error) {
      logger.error("Email validation failed", { error });
      return false;
    }
  }

  /**
   * Prepares email data with default values
   */
  private prepareEmailData(emailData: EmailData): EmailData {
    return {
      ...emailData,
      fromEmail: emailData.fromEmail || this.config.defaultFromEmail,
      fromName: emailData.fromName || this.config.defaultFromName,
      replyTo: emailData.replyTo || this.config.defaultReplyTo,
    };
  }

  /**
   * Sends email with retry logic
   */
  private async sendWithRetry(provider: EmailProvider, emailData: EmailData): Promise<EmailResult> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await provider.sendEmail(emailData);

        if (result.success) {
          return result;
        }

        lastError = result.error;

        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * attempt;
          logger.warn("Email sending failed, retrying", {
            attempt,
            maxAttempts: this.config.retryAttempts,
            delay,
            error: lastError,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * attempt;
          logger.warn("Email sending failed with exception, retrying", {
            attempt,
            maxAttempts: this.config.retryAttempts,
            delay,
            error: lastError,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return { success: false, error: lastError || "Max retry attempts exceeded" };
  }

  /**
   * Sanitizes email data for logging (removes sensitive information)
   */
  private sanitizeEmailData(emailData: EmailData): Partial<EmailData> {
    return {
      to: emailData.to,
      subject: emailData.subject,
      leadId: emailData.leadId,
      sequenceId: emailData.sequenceId,
      stepId: emailData.stepId,
      templateId: emailData.templateId,
    };
  }

  /**
   * Gets list of registered providers
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Gets the default provider name
   */
  getDefaultProvider(): string | undefined {
    return this.defaultProvider?.name;
  }
}

/**
 * Creates email data from template processing result
 */
export const createEmailData = (
  to: string,
  subject: string,
  body: string,
  leadId: string,
  sequenceId: string,
  stepId: string,
  templateId: string,
  options?: Partial<EmailData>,
): EmailData => {
  return {
    to,
    subject,
    body,
    leadId,
    sequenceId,
    stepId,
    templateId,
    ...options,
  };
};
