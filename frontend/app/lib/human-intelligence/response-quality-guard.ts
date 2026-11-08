/**
 * TATTVA AI - Response Quality Control & Pre-Flight Validation Guard
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ConversationalGoal, CommunicationPreference } from "./types";
import { AdaptiveCommunicationEngine } from "./adaptive-communication";
import { BackgroundExecutor } from "./background-executor";

export interface QualityValidationResult {
  isValid: boolean;
  sanitizedContent: string;
  adjustmentsMade: string[];
}

export class ResponseQualityGuard {
  /**
   * Pre-flight response inspection and quality enhancement
   */
  public static validateAndEnhance(
    rawResponse: string,
    userPrompt: string,
    goal: ConversationalGoal,
    preference: CommunicationPreference
  ): QualityValidationResult {
    const adjustmentsMade: string[] = [];
    let text = rawResponse;

    // 1. Strip raw internal implementation leaks (stack traces, JSON dumps, prompt markers)
    const { cleanContent, sanitizedLogs } = BackgroundExecutor.sanitizeChatResponse(text);
    if (sanitizedLogs.length > 0) {
      adjustmentsMade.push(...sanitizedLogs);
      text = cleanContent;
    }

    // 2. Strip robotic cliches and conversational boilerplate
    const deBoilerplated = AdaptiveCommunicationEngine.stripRoboticBoilerplate(text);
    if (deBoilerplated !== text) {
      adjustmentsMade.push("Removed robotic boilerplate / repetitive introductions");
      text = deBoilerplated;
    }

    // 3. For short direct questions with concise preference, trim excessive padding if present
    if (goal === "direct_question" || preference.length === "concise") {
      const paragraphs = text.split("\n\n").filter(Boolean);
      // If output is over 3 verbose paragraphs for a simple query like "What is DNS?", condense to key paragraph + list
      if (paragraphs.length > 4 && !text.includes("```") && !text.includes("|")) {
        text = paragraphs.slice(0, 3).join("\n\n");
        adjustmentsMade.push("Trimmed excessive verbosity for concise direct question");
      }
    }

    // 4. Ensure non-empty response
    if (!text.trim()) {
      text = "I have reviewed your request. Please let me know how you would like to proceed.";
      adjustmentsMade.push("Substituted empty content with clean placeholder");
    }

    return {
      isValid: true,
      sanitizedContent: text,
      adjustmentsMade,
    };
  }
}
