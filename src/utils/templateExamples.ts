/* eslint-disable no-console */
/**
 * Template Examples and Usage Guide
 *
 * This file demonstrates the advanced template processing capabilities
 * with fallback values and special variables.
 */

import { createTemplateProcessor } from "./templateProcessor";
import type { LeadData } from "../db/queries/lead";

// ============================================================================
// EXAMPLE TEMPLATES
// ============================================================================

export const exampleTemplates = {
  // Basic template with fallback values
  welcomeEmail: `
    Hello [[firstName || there]],

    Welcome to our service! We're excited to have [[companyName || your company]] on board.

    Your email: [[email || not provided]]
    Company: [[companyName || Not specified]]

    Best regards,
    The Team
  `,

  // Template with special unsubscribe link
  newsletterEmail: `
    Hi [[firstName || Friend]],

    Here's your weekly newsletter from [[companyName || our company]].

    If you no longer wish to receive these emails, you can [[unsubscribe || unsubscribe here]].

    Thanks,
    Newsletter Team
  `,

  // Complex template with multiple fallbacks
  personalizedEmail: `
    Dear [[firstName || Valued Customer]],

    We noticed you work at [[companyName || a great company]] as a [[jobTitle || professional]].
    Your company in the [[industry || business]] industry is doing amazing work!

    Company Size: [[companySize || Not specified]]
    Location: [[state || Unknown]], [[country || Unknown]]

    [[unsubscribe || Click here to unsubscribe]]
  `,

  // Template with computed values
  advancedEmail: `
    Hello [[firstName || Friend]],

    Your full name is: [[fullName || Not provided]]
    Your company [[companyName || Company]] is in [[industry || Business]].

    LinkedIn: [[linkedinUrl || Not available]]
    Source: [[source || Direct]]

    [[unsubscribe || Unsubscribe]]
  `,

  // Example with your specific syntax
  customSyntaxExample: `
    Hello [[lastname || sdfsdf]],

    Your name is [[firstName || there]] [[lastName || unknown]].
    Company: [[companyName || Not specified]]

    [[unsubscribe || Click here to unsubscribe]]
  `,
};

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

export const demonstrateTemplateProcessing = () => {
  // Sample lead data
  const sampleLead: LeadData = {
    id: "lead_123",
    email: "john.doe@example.com",
    firstName: "john",
    lastName: "doe",
    companyName: "acme corp",
    jobTitle: "software engineer",
    industry: "technology",
    companySize: "50-100",
    state: "California",
    country: "USA",
    linkedinUrl: "https://linkedin.com/in/johndoe",
    source: "LinkedIn",
    isSubscribedToEmail: true,
    isEmailValid: "VALID",
  };

  // Create template processor with advanced features
  const processor = createTemplateProcessor({
    enableSpecialVariables: true,
    unsubscribeBaseUrl: "https://myapp.com/",
    unsubscribeKey: "unsubscribe",
    caseSensitive: false,
  });

  console.log("=== Template Processing Examples ===\n");

  // Process each example template
  Object.entries(exampleTemplates).forEach(([name, template]) => {
    console.log(`--- ${name} ---`);
    console.log("Original:");
    console.log(template);
    console.log("\nProcessed:");
    console.log(processor.processTemplate(template, sampleLead));
    console.log("\n" + "=".repeat(50) + "\n");
  });
};

// ============================================================================
// TEMPLATE VALIDATION EXAMPLES
// ============================================================================

export const demonstrateTemplateValidation = () => {
  const processor = createTemplateProcessor({
    allowUndefinedVariables: false,
  });

  const testTemplate = `
    Hello [[firstName || there]],
    Your company: [[companyName || Not specified]]
    Invalid variable: [[invalidVar || fallback value]]
    Another invalid: {{alsoInvalid}}
  `;

  const sampleLead: LeadData = {
    id: "test_123",
    email: "test@example.com",
    firstName: "John",
    isSubscribedToEmail: true,
    isEmailValid: "VALID",
  };

  console.log("=== Template Validation Example ===\n");

  const validation = processor.validateTemplate(testTemplate, sampleLead);
  console.log("Template validation result:", validation);

  if (!validation.isValid) {
    console.log("Undefined variables found:", validation.undefinedVariables);
  }

  console.log("\nTemplate variables used:");
  const variables = processor.getTemplateVariables(testTemplate);
  console.log(variables);
};

// ============================================================================
// CONFIGURATION EXAMPLES
// ============================================================================

export const demonstrateConfigurations = () => {
  const sampleLead: LeadData = {
    id: "config_test",
    email: "config@example.com",
    firstName: "Config",
    lastName: "Test",
    isSubscribedToEmail: true,
    isEmailValid: "VALID",
  };

  const template = "Hello [[firstName || there]], your name is [[fullName || unknown]]";

  console.log("=== Configuration Examples ===\n");

  // Case sensitive
  console.log("Case sensitive (true):");
  const caseSensitiveProcessor = createTemplateProcessor({ caseSensitive: true });
  console.log(caseSensitiveProcessor.processTemplate(template, sampleLead));

  // Case insensitive (default)
  console.log("\nCase insensitive (default):");
  const caseInsensitiveProcessor = createTemplateProcessor({ caseSensitive: false });
  console.log(caseInsensitiveProcessor.processTemplate(template, sampleLead));

  // With custom variables
  console.log("\nWith custom variables:");
  const customProcessor = createTemplateProcessor({
    customVariables: {
      greeting: "Welcome",
      signature: "Best regards, Custom Team",
    },
  });
  const customTemplate = "[[greeting]] [[firstName || there]], [[signature]]";
  console.log(customProcessor.processTemplate(customTemplate, sampleLead));
};

// ============================================================================
// RUN EXAMPLES (for testing)
// ============================================================================

if (require.main === module) {
  console.log("Running template processing examples...\n");
  demonstrateTemplateProcessing();
  demonstrateTemplateValidation();
  demonstrateConfigurations();
}
