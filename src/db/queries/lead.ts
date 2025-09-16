import { sql } from "..";
import { logger } from "../../utils/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface LeadData {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyWebsite?: string;
  jobTitle?: string;
  phone?: string;
  address?: string;
  state?: string;
  country?: string;
  industry?: string;
  companySize?: string;
  annualRevenue?: string;
  conversionRate?: number;
  source?: string;
  linkedinUrl?: string;
  organizationId?: string;
  assignedTo?: string;
  isSubscribedToEmail: boolean;
  isEmailValid: string;
}

export interface SequenceStep {
  id: string;
  sequenceId: string;
  stepNumber: number;
  templateId: string;
  minIntervalMin: number;
  timeWindows?: Record<string, unknown>;
  requireNoReply: boolean;
  stopOnBounce: boolean;
}

export interface SequenceTemplate {
  id: string;
  templateId: string;
  subject: string;
}

export interface EmailCampaignTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables?: string[];
}

export interface TemplateData {
  sequenceTemplate: SequenceTemplate;
  emailTemplate: EmailCampaignTemplate;
}

// ============================================================================
// LEAD QUERIES
// ============================================================================

export type LeadWithEnrichment = LeadData & {
  enrichment?: {
    linkedinUrl?: string;
    leadName?: string;
    leadAddress?: string;
    profileImageUrl?: string;
    jobTitle?: string;
    memberOf?: unknown;
    worksFor?: unknown;
    knowsLanguage?: unknown;
    connectionsCount?: number;

    companyName?: string;
    companyAddress?: string;
    companyIndustry?: string;
    companyWebsite?: string;
    companySize?: string;
    companyDescription?: string;
    companyLogoUrl?: string;

    description?: string;
    keywords?: string[];
    insightsData?: unknown;

    linkedinRawJson?: unknown;
  };
};

/**
 * Fetches lead data by lead ID
 */
export const fetchLeadData = async (leadId: string): Promise<LeadWithEnrichment | null> => {
  try {
    const [lead] = await sql<
      (LeadData & {
        enrichment_linkedinUrl: string | null;
        enrichment_leadName: string | null;
        enrichment_leadAddress: string | null;
        enrichment_profileImageUrl: string | null;
        enrichment_jobTitle: string | null;
        enrichment_memberOf: Record<string, unknown> | null;
        enrichment_worksFor: Record<string, unknown> | null;
        enrichment_knowsLanguage: Record<string, unknown> | null;
        enrichment_connectionsCount: number | null;
        enrichment_companyName: string | null;
        enrichment_companyAddress: string | null;
        enrichment_companyIndustry: string | null;
        enrichment_companyWebsite: string | null;
        enrichment_companySize: string | null;
        enrichment_companyDescription: string | null;
        enrichment_companyLogoUrl: string | null;
        enrichment_description: string | null;
        enrichment_keywords: string[] | null;
        enrichment_insightsData: Record<string, unknown> | null;
        enrichment_linkedinRawJson: Record<string, unknown> | null;
      })[]
    >`
        SELECT
          l.id,
          l.email,
          l."firstName",
          l."lastName",
          l."companyName",
          l."companyWebsite",
          l."jobTitle",
          l.phone,
          l.address,
          l.state,
          l.country,
          l.industry,
          l."companySize",
          l."annualRevenue",
          l."conversionRate",
          l.source,
          l."linkedinUrl",
          l."organizationId",
          l."assignedTo",
          l."isSubscribedToEmail",
          l."isEmailValid",
          e."linkedinUrl"        as "enrichment_linkedinUrl",
          e."leadName"           as "enrichment_leadName",
          e."leadAddress"        as "enrichment_leadAddress",
          e."profileImageUrl"    as "enrichment_profileImageUrl",
          e."jobTitle"           as "enrichment_jobTitle",
          e."memberOf"           as "enrichment_memberOf",
          e."worksFor"           as "enrichment_worksFor",
          e."knowsLanguage"      as "enrichment_knowsLanguage",
          e."connectionsCount"   as "enrichment_connectionsCount",
          e."companyName"        as "enrichment_companyName",
          e."companyAddress"     as "enrichment_companyAddress",
          e."companyIndustry"    as "enrichment_companyIndustry",
          e."companyWebsite"     as "enrichment_companyWebsite",
          e."companySize"        as "enrichment_companySize",
          e."companyDescription" as "enrichment_companyDescription",
          e."companyLogoUrl"     as "enrichment_companyLogoUrl",
          e."description"        as "enrichment_description",
          e."keywords"           as "enrichment_keywords",
          e."insightsData"       as "enrichment_insightsData",
          e."linkedinRawJson"    as "enrichment_linkedinRawJson"
        FROM "Lead" l
        LEFT JOIN "LeadEnrichment" e ON e."leadId" = l.id
        WHERE l.id = ${leadId}
      `;

    if (!lead) {
      return null;
    }

    const {
      enrichment_linkedinUrl,
      enrichment_leadName,
      enrichment_leadAddress,
      enrichment_profileImageUrl,
      enrichment_jobTitle,
      enrichment_memberOf,
      enrichment_worksFor,
      enrichment_knowsLanguage,
      enrichment_connectionsCount,
      enrichment_companyName,
      enrichment_companyAddress,
      enrichment_companyIndustry,
      enrichment_companyWebsite,
      enrichment_companySize,
      enrichment_companyDescription,
      enrichment_companyLogoUrl,
      enrichment_description,
      enrichment_keywords,
      enrichment_insightsData,
      enrichment_linkedinRawJson,
      ...rest
    } = lead;

    return {
      ...rest,
      enrichment: {
        linkedinUrl: enrichment_linkedinUrl ?? undefined,
        leadName: enrichment_leadName ?? undefined,
        leadAddress: enrichment_leadAddress ?? undefined,
        profileImageUrl: enrichment_profileImageUrl ?? undefined,
        jobTitle: enrichment_jobTitle ?? undefined,
        memberOf: enrichment_memberOf ?? undefined,
        worksFor: enrichment_worksFor ?? undefined,
        knowsLanguage: enrichment_knowsLanguage ?? undefined,
        connectionsCount: enrichment_connectionsCount ?? undefined,
        companyName: enrichment_companyName ?? undefined,
        companyAddress: enrichment_companyAddress ?? undefined,
        companyIndustry: enrichment_companyIndustry ?? undefined,
        companyWebsite: enrichment_companyWebsite ?? undefined,
        companySize: enrichment_companySize ?? undefined,
        companyDescription: enrichment_companyDescription ?? undefined,
        companyLogoUrl: enrichment_companyLogoUrl ?? undefined,
        description: enrichment_description ?? undefined,
        keywords: enrichment_keywords ?? undefined,
        insightsData: enrichment_insightsData ?? undefined,
        linkedinRawJson: enrichment_linkedinRawJson ?? undefined,
      },
    };
  } catch (error) {
    logger.error("Failed to fetch lead + enrichment", { leadId, error });
    throw new Error(`Failed to fetch lead data for ${leadId}`);
  }
};

/**
 * Fetches multiple leads by IDs
 */
export const fetchLeadsData = async (leadIds: string[]): Promise<LeadData[]> => {
  try {
    const leads = await sql<LeadData[]>`
      SELECT
        id,
        email,
        "firstName",
        "lastName",
        "companyName",
        "companyWebsite",
        "jobTitle",
        phone,
        address,
        state,
        country,
        industry,
        "companySize",
        "annualRevenue",
        "conversionRate",
        source,
        "linkedinUrl",
        "organizationId",
        "assignedTo",
        "isSubscribedToEmail",
        "isEmailValid"
      FROM "Lead"
      WHERE id = ANY(${leadIds})
    `;

    return leads;
  } catch (error) {
    logger.error("Failed to fetch leads data", { leadIds, error });
    throw new Error(`Failed to fetch leads data for ${leadIds.join(", ")}`);
  }
};

// ============================================================================
// SEQUENCE QUERIES
// ============================================================================

/**
 * Fetches sequence step data with template information
 */
export const fetchSequenceStep = async (stepId: string): Promise<SequenceStep | null> => {
  try {
    const [step] = await sql<SequenceStep[]>`
      SELECT
        s.id,
        s."sequenceId",
        s."stepNumber",
        s."templateId",
        s."minIntervalMin",
        s."timeWindows",
        s."requireNoReply",
        s."stopOnBounce"
      FROM "SequenceStep" s
      WHERE s.id = ${stepId}
    `;

    return step || null;
  } catch (error) {
    logger.error("Failed to fetch sequence step", { stepId, error });
    throw new Error(`Failed to fetch sequence step ${stepId}`);
  }
};

/**
 * Fetches multiple sequence steps by IDs
 */
export const fetchSequenceSteps = async (stepIds: string[]): Promise<SequenceStep[]> => {
  try {
    const steps = await sql<SequenceStep[]>`
      SELECT
        s.id,
        s."sequenceId",
        s."stepNumber",
        s."templateId",
        s."minIntervalMin",
        s."timeWindows",
        s."requireNoReply",
        s."stopOnBounce"
      FROM "SequenceStep" s
      WHERE s.id = ANY(${stepIds})
    `;

    return steps;
  } catch (error) {
    logger.error("Failed to fetch sequence steps", { stepIds, error });
    throw new Error(`Failed to fetch sequence steps for ${stepIds.join(", ")}`);
  }
};

// ============================================================================
// TEMPLATE QUERIES
// ============================================================================

/**
 * Fetches sequence template and email campaign template data
 */
export const fetchEmailTemplate = async (templateId: string): Promise<TemplateData | null> => {
  try {
    const [result] = await sql<
      Array<{
        id: string;
        templateId: string;
        sequenceSubject: string;
        emailTemplateId: string;
        name: string;
        emailSubject: string;
        body: string;
        variables?: string[];
      }>
    >`
      SELECT
        st.id,
        st."templateId",
        st.subject as "sequenceSubject",
        ect.id as "emailTemplateId",
        ect.name,
        ect.subject as "emailSubject",
        ect.body,
        ect.variables
      FROM "SequenceTemplate" st
      JOIN "EmailCampaignTemplate" ect ON st."templateId" = ect.id
      WHERE st.id = ${templateId}
    `;

    if (!result) {
      return null;
    }

    return {
      sequenceTemplate: {
        id: result.id,
        templateId: result.templateId,
        subject: result.sequenceSubject,
      },
      emailTemplate: {
        id: result.emailTemplateId,
        name: result.name,
        subject: result.emailSubject,
        body: result.body,
        variables: result.variables,
      },
    };
  } catch (error) {
    logger.error("Failed to fetch email template", { templateId, error });
    throw new Error(`Failed to fetch email template ${templateId}`);
  }
};

/**
 * Fetches multiple email templates by IDs
 */
export const fetchEmailTemplates = async (templateIds: string[]): Promise<Map<string, TemplateData>> => {
  try {
    const results = await sql<
      Array<{
        id: string;
        templateId: string;
        sequenceSubject: string;
        emailTemplateId: string;
        name: string;
        emailSubject: string;
        body: string;
        variables?: string[];
      }>
    >`
      SELECT
        st.id,
        st."templateId",
        st.subject as "sequenceSubject",
        ect.id as "emailTemplateId",
        ect.name,
        ect.subject as "emailSubject",
        ect.body,
        ect.variables
      FROM "SequenceTemplate" st
      JOIN "EmailCampaignTemplate" ect ON st."templateId" = ect.id
      WHERE st.id = ANY(${templateIds})
    `;

    const templateMap = new Map<string, TemplateData>();

    results.forEach((result) => {
      templateMap.set(result.id, {
        sequenceTemplate: {
          id: result.id,
          templateId: result.templateId,
          subject: result.sequenceSubject,
        },
        emailTemplate: {
          id: result.emailTemplateId,
          name: result.name,
          subject: result.emailSubject,
          body: result.body,
          variables: result.variables,
        },
      });
    });

    return templateMap;
  } catch (error) {
    logger.error("Failed to fetch email templates", { templateIds, error });
    throw new Error(`Failed to fetch email templates for ${templateIds.join(", ")}`);
  }
};

// ============================================================================
// BATCH QUERIES
// ============================================================================

/**
 * Fetches all required data for processing multiple leads in batch
 */
export const fetchBatchProcessingData = async (leadIds: string[], stepIds: string[], templateIds: string[]) => {
  try {
    const [leads, steps, templates] = await Promise.all([
      fetchLeadsData(leadIds),
      fetchSequenceSteps(stepIds),
      fetchEmailTemplates(templateIds),
    ]);

    return {
      leads,
      steps,
      templates,
    };
  } catch (error) {
    logger.error("Failed to fetch batch processing data", { leadIds, stepIds, templateIds, error });
    throw new Error("Failed to fetch batch processing data");
  }
};
