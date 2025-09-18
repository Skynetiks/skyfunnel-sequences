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
  bodyHTML: string;
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
  logger.debug("Fetching lead data", { leadId });
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
        JOIN "LeadEnrichment" e ON e."leadId" = l.id
        WHERE l.id = ${leadId}
      `;

    //   lead                         lead_enrichment
    //

    if (!lead) {
      logger.error("No lead data found", { leadId });
      return null;
    }

    logger.debug("Lead data found", { lead });

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

// ============================================================================
// SEQUENCE QUERIES
// ============================================================================

/**
 * Fetches sequence step data with template information
 */
export const fetchSequenceStep = async (stepId: string): Promise<SequenceStep | null> => {
  logger.debug("Fetching sequence step", { stepId });
  try {
    const [step] = await sql<SequenceStep[]>`
    SELECT
        s.id,
        s."sequenceId",
        s."stepNumber",
        s."minIntervalMin",
        s."timeWindows",
        s."requireNoReply",
        s."stopOnBounce"
      FROM "SequenceStep" s
      WHERE s.id = ${stepId}
    `;

    if (!step) {
      logger.error("No sequence step found", { stepId });
      return null;
    }

    return step || null;
  } catch (error) {
    logger.error("Failed to fetch sequence step", { stepId, error });
    throw new Error(`Failed to fetch sequence step ${stepId}`);
  }
};

// ============================================================================
// TEMPLATE QUERIES
// ============================================================================

/**
 * Fetches sequence template and email campaign template data
 */
export const fetchEmailTemplate = async (stepId: string): Promise<TemplateData | null> => {
  try {
    console.log("Fetching email template", { stepId });
    const [result] = await sql`
       SELECT
        st.id,
        st.subject AS "sequenceSubject",
        ect.id AS "emailTemplateId",
        ect.name,
        ect."bodyHTML"
        FROM "_SequenceStepToSequenceTemplate" j
        JOIN "SequenceTemplate" st ON j."B" = st.id
        JOIN "EmailCampaignTemplate" ect ON st."templateId" = ect.id
        WHERE j."A" = ${stepId}
        ORDER BY random()
        LIMIT 1;
      `;

    if (!result) {
      logger.error("No email template found", { stepId });
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
        bodyHTML: result.bodyHTML,
      },
    };
  } catch (error) {
    logger.error("Failed to fetch email template", {
      error,
    });
    throw new Error(`Failed to fetch email template`);
  }
};
