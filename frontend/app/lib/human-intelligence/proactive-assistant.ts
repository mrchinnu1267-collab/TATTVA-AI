/**
 * TATTVA AI - Proactive Assistance & Next-Step Guidance Engine
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ConversationalGoal } from "./types";

export interface ProactiveSuggestion {
  category: "verification" | "configuration" | "next_phase" | "best_practice";
  promptSuggestion: string;
  actionText: string;
}

export class ProactiveAssistant {
  /**
   * Determine a relevant, non-intrusive next step based on conversation topic and goal
   */
  public static generateNextStep(
    userPrompt: string,
    assistantReply: string,
    goal: ConversationalGoal
  ): ProactiveSuggestion | undefined {
    const lowerPrompt = userPrompt.toLowerCase();
    const lowerReply = assistantReply.toLowerCase();

    // 1. Bug / Error Troubleshooting -> Verification test
    if (goal === "error_troubleshooting" || lowerReply.includes("fix") || lowerReply.includes("resolve")) {
      return {
        category: "verification",
        actionText: "Verify the fix",
        promptSuggestion: "Run your test or build command to verify this fix, and let me know if you encounter any other warnings.",
      };
    }

    // 2. Integration / Database / Configuration (e.g. Supabase, Firebase, OAuth)
    if (
      lowerPrompt.includes("supabase") ||
      lowerPrompt.includes("firebase") ||
      lowerPrompt.includes("database") ||
      lowerPrompt.includes("oauth") ||
      lowerPrompt.includes("env") ||
      lowerPrompt.includes("api key")
    ) {
      return {
        category: "configuration",
        actionText: "Verify connection",
        promptSuggestion: "Would you like me to walk you through a quick test script to verify this connection and ensure your environment variables are loaded securely?",
      };
    }

    // 3. Project Ideation / New Feature Roadmap
    if (goal === "ideation" || lowerPrompt.includes("build a") || lowerPrompt.includes("create an app")) {
      return {
        category: "next_phase",
        actionText: "Implementation roadmap",
        promptSuggestion: "When you are ready, we can draft the data schema or break this down into a milestone checklist for phase 1.",
      };
    }

    // 4. Code Implementation -> Best practice / Edge case check
    if (goal === "implementation_request" && assistantReply.includes("```")) {
      return {
        category: "best_practice",
        actionText: "Edge cases & testing",
        promptSuggestion: "Would you like me to generate unit tests or check edge cases for this implementation?",
      };
    }

    return undefined;
  }
}

