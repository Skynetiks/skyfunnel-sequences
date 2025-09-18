// sesEmailSender.ts
import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
  type SendEmailCommandOutput,
} from "@aws-sdk/client-ses";
import type { EmailData, EmailResult } from "./emailService"; // adjust path
import { env } from "../config/env";

// Configure once, reuse
const sesClient = new SESClient({
  region: env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function sendWithSES(emailData: EmailData): Promise<EmailResult> {
  if (env.NODE_ENV === "development") {
    return {
      success: true,
      messageId: "mock-id-" + Date.now(),
    };
  }

  try {
    const params: SendEmailCommandInput = {
      Source: emailData.fromEmail!,
      Destination: {
        ToAddresses: [emailData.to],
        CcAddresses: emailData.cc,
        BccAddresses: emailData.bcc,
      },
      Message: {
        Subject: { Data: emailData.subject },
        Body: {
          Html: { Data: emailData.body }, // you can add Text alternative too
        },
      },
      ReplyToAddresses: emailData.replyTo ? [emailData.replyTo] : undefined,
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);

    return {
      success: true,
      messageId: response.MessageId,
      metadata: response as SendEmailCommandOutput,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
