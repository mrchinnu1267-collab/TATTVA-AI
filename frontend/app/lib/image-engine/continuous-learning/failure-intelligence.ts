/**
 * TATTVA AI - Failure Intelligence & Root-Cause Attribution Engine (Phase N)
 * Analyzes generation feedback records, classifies defects into 11 failure problem categories,
 * attributes errors to 8 subsystem origins, and mines recurring patterns for continuous learning.
 */

import {
  ImageGenerationFeedbackRecord,
  FailureProblemCategory,
  SubsystemFailureSource,
  FailureIntelligenceEntry,
  FailurePatternSummary,
} from "./types";

export class FailureIntelligenceEngine {
  /**
   * Evaluates a feedback record and extracts all detected failure entries.
   */
  public analyzeFeedbackRecord(record: ImageGenerationFeedbackRecord): FailureIntelligenceEntry[] {
    const entries: FailureIntelligenceEntry[] = [];

    // If generation passed with high adherence and no failed requirements, no failure entry
    if (record.evaluationResults.verdict === "pass" && record.failedRequirements.length === 0) {
      return entries;
    }

    const failedReqs = record.failedRequirements.length > 0
      ? record.failedRequirements
      : ["General prompt adherence discrepancy"];

    for (const failedReq of failedReqs) {
      const problemCategory = this.classifyProblemCategory(failedReq, record);
      const subsystemSource = this.attributeSubsystemOrigin(problemCategory, record);
      const confidence = this.computeAttributionConfidence(record, problemCategory);

      entries.push({
        feedbackId: record.id,
        problemCategory,
        subsystemSource,
        confidence,
        diagnosticEvidence: `Failed requirement: "${failedReq}". Model: ${record.modelIdentifier} on ${record.selectedProvider}.`,
        recurrenceWeight: 1.0,
        identifiedPatterns: this.extractPatternTokens(failedReq, record.sanitizedPrompt),
      });
    }

    // Check voluntary user feedback discrepancies
    if (record.userFeedback && record.userFeedback.issueType !== "correct_result") {
      const userProblem = this.mapUserIssueToProblemCategory(record.userFeedback.issueType);
      const userSubsystem = this.attributeSubsystemOrigin(userProblem, record);

      entries.push({
        feedbackId: record.id,
        problemCategory: userProblem,
        subsystemSource: userSubsystem,
        confidence: 0.82,
        diagnosticEvidence: `Voluntary user reported issue: "${record.userFeedback.issueType}" with rating ${record.userFeedback.satisfactionRating}/5. Comments: ${record.userFeedback.userComments || "None"}.`,
        recurrenceWeight: 1.2, // Voluntary user feedback weighted higher
        identifiedPatterns: [record.userFeedback.issueType],
      });
    }

    return entries;
  }

  /**
   * Classifies a failure string into one of the 11 standard problem categories.
   */
  public classifyProblemCategory(
    failedText: string,
    record: ImageGenerationFeedbackRecord
  ): FailureProblemCategory {
    const text = failedText.toLowerCase();

    if (text.includes("count") || text.includes("number of") || text.includes("quantity")) {
      return "incorrect_object_counts";
    }
    if (text.includes("missing") || text.includes("absent") || text.includes("not detected")) {
      return "missing_objects";
    }
    if (text.includes("extra") || text.includes("unrequested") || text.includes("duplicate")) {
      return "extra_objects";
    }
    if (text.includes("color") || text.includes("tint") || text.includes("hue")) {
      return "incorrect_colors";
    }
    if (text.includes("material") || text.includes("metal") || text.includes("wood") || text.includes("glass")) {
      return "incorrect_materials";
    }
    if (text.includes("attribute") || text.includes("wearing") || text.includes("texture")) {
      return "incorrect_attributes";
    }
    if (text.includes("position") || text.includes("left of") || text.includes("right of") || text.includes("above") || text.includes("spatial")) {
      return "wrong_positioning";
    }
    if (text.includes("background") || text.includes("environment") || text.includes("setting")) {
      return "incorrect_backgrounds";
    }
    if (text.includes("reference") || text.includes("identity") || text.includes("face") || text.includes("consistency")) {
      return "reference_inconsistencies";
    }
    if (text.includes("text") || text.includes("spelling") || text.includes("ocr") || text.includes("typography") || text.includes("letters")) {
      return "incorrect_text";
    }

    return "composition_mismatches";
  }

  /**
   * Attributes the architectural root cause across the 8 subsystems.
   */
  public attributeSubsystemOrigin(
    problemCategory: FailureProblemCategory,
    record: ImageGenerationFeedbackRecord
  ): SubsystemFailureSource {
    const prompt = record.sanitizedPrompt.toLowerCase();

    switch (problemCategory) {
      case "incorrect_object_counts":
        // If prompt had conflicting numbers or wordy counting, prompt understanding; else model capability
        if (prompt.includes("few") || prompt.includes("several") || prompt.includes("some")) {
          return "prompt_understanding";
        }
        return "model_capability";

      case "missing_objects":
        if (record.structuredRequirements.length > 5) {
          return "prompt_compilation"; // Token attention diluted by long list
        }
        return "model_capability";

      case "wrong_positioning":
        if (prompt.includes("left") || prompt.includes("right") || prompt.includes("behind")) {
          return "spatial_control";
        }
        return "model_capability";

      case "reference_inconsistencies":
        return "reference_conditioning";

      case "incorrect_text":
        // Base diffusion models natively struggle with text latents
        if (record.modelIdentifier.includes("stable-diffusion-1.5")) {
          return "model_capability";
        }
        return "prompt_compilation";

      case "extra_objects":
        return "prompt_compilation"; // Missing negative prompt constraint

      case "incorrect_colors":
      case "incorrect_materials":
      case "incorrect_attributes":
        return "prompt_compilation"; // Cross-attention feature bleeding

      case "composition_mismatches":
      case "incorrect_backgrounds":
      default:
        return "provider_routing";
    }
  }

  /**
   * Synthesizes recurring failure patterns across an entire corpus of feedback records.
   */
  public aggregateCorpusPatterns(records: ImageGenerationFeedbackRecord[]): FailurePatternSummary[] {
    const tally: Map<string, {
      problemCategory: FailureProblemCategory;
      subsystemSource: SubsystemFailureSource;
      count: number;
      models: Set<string>;
    }> = new Map();

    let totalFailures = 0;

    for (const record of records) {
      const entries = this.analyzeFeedbackRecord(record);
      for (const entry of entries) {
        totalFailures++;
        const key = `${entry.problemCategory}__${entry.subsystemSource}`;
        const existing = tally.get(key);
        if (existing) {
          existing.count += entry.recurrenceWeight;
          existing.models.add(record.modelIdentifier);
        } else {
          tally.set(key, {
            problemCategory: entry.problemCategory,
            subsystemSource: entry.subsystemSource,
            count: entry.recurrenceWeight,
            models: new Set([record.modelIdentifier]),
          });
        }
      }
    }

    if (totalFailures === 0) {
      return [];
    }

    const summaries: FailurePatternSummary[] = [];

    tally.forEach((val) => {
      summaries.push({
        problemCategory: val.problemCategory,
        subsystemSource: val.subsystemSource,
        frequency: Math.round(val.count),
        percentageOfFailures: Number(((val.count / totalFailures) * 100).toFixed(1)),
        primaryAffectedModels: Array.from(val.models),
        recommendedMitigation: this.getMitigationRecommendation(val.problemCategory, val.subsystemSource),
      });
    });

    return summaries.sort((a, b) => b.frequency - a.frequency);
  }

  private mapUserIssueToProblemCategory(issue: string): FailureProblemCategory {
    switch (issue) {
      case "incorrect_object": return "missing_objects";
      case "wrong_color": return "incorrect_colors";
      case "wrong_positioning": return "wrong_positioning";
      case "missing_details": return "incorrect_attributes";
      case "reference_mismatch": return "reference_inconsistencies";
      case "incorrect_text": return "incorrect_text";
      default: return "composition_mismatches";
    }
  }

  private computeAttributionConfidence(
    record: ImageGenerationFeedbackRecord,
    category: FailureProblemCategory
  ): number {
    if (category === "incorrect_text" || category === "incorrect_object_counts") {
      return 0.92;
    }
    if (category === "wrong_positioning" || category === "reference_inconsistencies") {
      return 0.88;
    }
    return 0.80;
  }

  private extractPatternTokens(failedReq: string, prompt: string): string[] {
    const tokens: string[] = [];
    const words = failedReq.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    tokens.push(...words.slice(0, 3));
    return tokens;
  }

  private getMitigationRecommendation(
    category: FailureProblemCategory,
    subsystem: SubsystemFailureSource
  ): string {
    switch (category) {
      case "incorrect_object_counts":
        return "Inject explicit numeral token anchors and enforce regional count bounds in negative prompt.";
      case "incorrect_text":
        return "Apply high-contrast typographic token quotes and activate OCR post-generation inpainting.";
      case "wrong_positioning":
        return "Compile normalized bounding-box coordinates into regional layout prompts.";
      case "incorrect_colors":
        return "Bind colors to specific subject nouns using bracketed attention syntax.";
      case "reference_inconsistencies":
        return "Increase IP-Adapter identity weight from 0.65 to 0.85 and apply face-landmark guidance.";
      default:
        return "Reroute to higher capability model or apply surgical inpainting on failed region.";
    }
  }
}

export const failureIntelligence = new FailureIntelligenceEngine();

