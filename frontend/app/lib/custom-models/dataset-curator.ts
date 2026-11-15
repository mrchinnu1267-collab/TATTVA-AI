/**
 * TATTVA AI - Training Data Preparation & Curation Engine (Phase 19)
 * Formats ChatML instructions, filters quality, cleans Indic scripts, and deduplicates
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { TrainingExample, ChatMLMessage } from "./types";

export class DatasetCurator {
  private static instance: DatasetCurator;

  public static getInstance(): DatasetCurator {
    if (!DatasetCurator.instance) {
      DatasetCurator.instance = new DatasetCurator();
    }
    return DatasetCurator.instance;
  }

  /**
   * Formats multi-turn dialogue into standard ChatML prompt string
   */
  public formatToChatML(messages: ChatMLMessage[]): string {
    return (
      messages
        .map((m) => `<|im_start|>${m.role}\n${m.content.trim()}<|im_end|>`)
        .join("\n") + "\n<|im_start|>assistant\n"
    );
  }

  /**
   * Curates raw conversational pairs into validated high-quality training examples
   */
  public curateExample(
    id: string,
    systemPrompt: string,
    userQuery: string,
    assistantResponse: string,
    domain: string = "general"
  ): TrainingExample | null {
    const cleanUser = userQuery.trim();
    const cleanAssoc = assistantResponse.trim();

    // 1. Length & Quality Filters
    if (cleanUser.length < 5 || cleanAssoc.length < 10) return null;
    if (cleanAssoc.includes("I cannot assist") || cleanAssoc.includes("As an AI model")) return null;

    // 2. Language Detection & Indic script validation
    let language: TrainingExample["language"] = "en";
    const hasTelugu = /[\u0C00-\u0C7F]/.test(cleanUser) || /[\u0C00-\u0C7F]/.test(cleanAssoc);
    const hasHindi = /[\u0900-\u097F]/.test(cleanUser) || /[\u0900-\u097F]/.test(cleanAssoc);

    if (hasTelugu && hasHindi) language = "mixed";
    else if (hasTelugu) language = "te";
    else if (hasHindi) language = "hi";

    // 3. Compute Quality Score (0 to 100)
    let quality = 70;
    if (cleanAssoc.length > 150) quality += 10;
    if (cleanAssoc.includes("```")) quality += 10; // Code formatting bonus
    if (hasTelugu || hasHindi) quality += 10; // Multilingual Indic bonus

    const messages: ChatMLMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: cleanUser },
      { role: "assistant", content: cleanAssoc },
    ];

    const tokenEstimate = Math.ceil((systemPrompt.length + cleanUser.length + cleanAssoc.length) / 4);

    return {
      id,
      messages,
      language,
      domain,
      qualityScore: Math.min(100, quality),
      tokenCount: tokenEstimate,
    };
  }

  /**
   * Exports batch of examples to JSONL string for PyTorch / Unsloth training
   */
  public exportToJSONL(examples: TrainingExample[]): string {
    return examples
      .filter((e) => e.qualityScore >= 75)
      .map((e) =>
        JSON.stringify({
          id: e.id,
          language: e.language,
          domain: e.domain,
          messages: e.messages,
          text: this.formatToChatML(e.messages),
        })
      )
      .join("\n");
  }
}

export const datasetCurator = DatasetCurator.getInstance();
