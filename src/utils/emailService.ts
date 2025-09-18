import type { SendEmailCommandOutput } from "@aws-sdk/client-ses";
import { logger } from "./logger";
import { sendWithSES } from "./ses";

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

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: SendEmailCommandOutput;
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
   * Sends an email with retry logic
   */
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      if (this.config.enableValidation) {
        const isValid = this.validateEmailData(emailData);
        if (!isValid) {
          const error = "Email data validation failed";
          logger.error("Email sending failed", { error, emailData: this.sanitizeEmailData(emailData) });
          return { success: false, error };
        }
      }

      const preparedEmailData = this.prepareEmailData(emailData);

      if (this.config.enableLogging) {
        logger.info("Sending email", {
          to: preparedEmailData.to,
          subject: preparedEmailData.subject,
          leadId: preparedEmailData.leadId,
          stepId: preparedEmailData.stepId,
        });
      }

      return await this.sendWithRetry(preparedEmailData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Email sending failed with exception", {
        error: errorMessage,
        emailData: this.sanitizeEmailData(emailData),
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Internal function that actually sends the email
   * Replace with nodemailer, SES, Resend, etc.
   */
  private async internalSend(emailData: EmailData): Promise<EmailResult> {
    const res = sendWithSES(emailData);
    return res;
  }

  /**
   * Validation
   */
  private validateEmailData(emailData: EmailData): boolean {
    if (!emailData.to || !emailData.to.includes("@")) {
      logger.warn("Invalid email address", { to: emailData.to });
      return false;
    }
    if (!emailData.subject?.trim()) {
      logger.warn("Empty email subject");
      return false;
    }
    if (!emailData.body?.trim()) {
      logger.warn("Empty email body");
      return false;
    }
    return true;
  }

  /**
   * Apply defaults
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
   * Retry wrapper around internalSend
   */
  private async sendWithRetry(emailData: EmailData): Promise<EmailResult> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await this.internalSend(emailData);
        if (result.success) {
          return result;
        }

        lastError = result.error;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      if (attempt < this.config.retryAttempts) {
        const delay = this.config.retryDelay * attempt;
        logger.warn("Retrying email send", { attempt, error: lastError, delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return { success: false, error: lastError || "Max retry attempts exceeded" };
  }

  /**
   * Sanitize logs
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
}

// ============================================================================
// HELPER
// ============================================================================

export const createEmailData = (
  to: string,
  subject: string,
  body: string,
  leadId: string,
  sequenceId: string,
  stepId: string,
  templateId: string,
  options?: Partial<EmailData>,
): EmailData => ({
  to,
  subject,
  body,
  leadId,
  sequenceId,
  stepId,
  templateId,
  ...options,
});
