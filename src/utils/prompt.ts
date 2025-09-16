import type { LeadWithEnrichment } from "../db/queries/lead";

class PromptSection {
  private title: string;
  private lines: string[] = [];

  constructor(title: string) {
    this.title = title;
  }

  addLine(label: string, value?: string | number | null) {
    if (value === undefined || value === null) {
      return this;
    }

    const str = typeof value === "string" ? value.trim() : String(value);
    if (str) {
      this.lines.push(`- ${label}: ${str}`);
    }

    return this;
  }

  isEmpty(): boolean {
    return this.lines.length === 0;
  }

  render(): string {
    if (this.isEmpty()) {
      return "";
    }
    return `${this.title}:\n${this.lines.join("\n")}\n`;
  }
}

export function buildAiOpenerPrompt(lead: LeadWithEnrichment): string {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email || "";

  const sections: PromptSection[] = [];

  // === Lead Information ===
  const leadInfo = new PromptSection("Lead Information")
    .addLine("Name", fullName)
    .addLine("Email", lead.email)
    .addLine("Job Title", lead.enrichment?.jobTitle ?? lead.jobTitle)
    .addLine("Company", lead.enrichment?.companyName ?? lead.companyName)
    .addLine("Industry", lead.enrichment?.companyIndustry ?? lead.industry)
    .addLine("Company Size", lead.enrichment?.companySize ?? lead.companySize);

  const location = [lead.country, lead.state, lead.address].filter(Boolean).join(", ");
  leadInfo.addLine("Location", location);

  if (!leadInfo.isEmpty()) {
    sections.push(leadInfo);
  }

  // === Enrichment Data ===
  const enrichment = new PromptSection("Enrichment Data")
    .addLine("LinkedIn URL", lead.enrichment?.linkedinUrl ?? lead.linkedinUrl)
    .addLine("Connections", lead.enrichment?.connectionsCount)
    .addLine("Keywords", lead.enrichment?.keywords?.join(", "))
    .addLine("Description", lead.enrichment?.description);

  if (!enrichment.isEmpty()) {
    sections.push(enrichment);
  }

  // === Company Info ===
  const company = new PromptSection("Company Info")
    .addLine("Website", lead.enrichment?.companyWebsite ?? lead.companyWebsite)
    .addLine("Description", lead.enrichment?.companyDescription)
    .addLine("Logo", lead.enrichment?.companyLogoUrl);

  if (!company.isEmpty()) {
    sections.push(company);
  }

  // === Guidelines (always included) ===
  const guidelines = `
Guidelines:
- Use only the most relevant details.
- Avoid repeating info already obvious from the name/company.
- Focus on building rapport, showing curiosity, or complimenting.
- Output only the email opener text, no explanations.
  `.trim();

  return `
You are a sales AI assistant. Write a short, personalized email opener (1–2 sentences).
Make it friendly, relevant, and engaging.

${sections.map((s) => s.render()).join("\n")}${guidelines ? "\n" + guidelines : ""}
  `.trim();
}
