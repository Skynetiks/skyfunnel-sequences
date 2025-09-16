import { env } from "../config/env";
import type { LeadWithEnrichment } from "../db/queries/lead";
import { logger } from "./logger";
import { buildAiOpenerPrompt } from "./prompt";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

export async function generateAiOpener(lead: LeadWithEnrichment): Promise<string> {
  try {
    const prompt = buildAiOpenerPrompt(lead);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    // Gemini may return multiple alternatives; we pick the first text
    return response?.text?.trim() || "";
  } catch (error) {
    logger.error("Failed to generate AI opener:", { error });
    return "Hi! Let's connect."; // fallback opener
  }
}
