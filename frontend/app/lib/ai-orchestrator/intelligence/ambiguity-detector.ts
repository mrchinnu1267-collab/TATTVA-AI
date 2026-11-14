/**
 * TATTVA AI - Ambiguity & Underspecification Detector
 * Identifies genuine underspecification and formulates targeted, single-shot clarifications
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ContextReferenceInfo } from "./schema";

const VAGUE_STANDALONE_PROMPTS = [
  "help", "fix", "do it", "make it", "code", "run", "why", "how", "what", "tell me", "start", "create"
];

export class AmbiguityDetector {
  private static instance: AmbiguityDetector;

  public static getInstance(): AmbiguityDetector {
    if (!AmbiguityDetector.instance) {
      AmbiguityDetector.instance = new AmbiguityDetector();
    }
    return AmbiguityDetector.instance;
  }

  public detectAmbiguity(
    rawPrompt: string,
    resolvedPrompt: string,
    contextInfo: ContextReferenceInfo,
    hasAttachments: boolean = false
  ): {
    isAmbiguous: boolean;
    clarificationQuestion?: string;
    ambiguityReason?: string;
  } {
    const clean = rawPrompt.trim().toLowerCase();

    // 1. If context or attachment already resolves it, it is NOT ambiguous
    if (contextInfo.hasAnaphora || hasAttachments) {
      return { isAmbiguous: false };
    }

    // 2. Extremely short vague prompts without history
    if (VAGUE_STANDALONE_PROMPTS.includes(clean) || (clean.length < 5 && !clean.includes("hi") && !clean.includes("hey"))) {
      return {
        isAmbiguous: true,
        clarificationQuestion: "What specific topic, problem, or project would you like me to build or explain for you?",
        ambiguityReason: "Prompt is a single generic word without context or target entity.",
      };
    }

    // 3. Ambiguous pronouns with zero prior context
    if (
      /^(fix this|solve this|explain this|debug it|run it|what does it mean)$/i.test(clean) &&
      !contextInfo.referencedTopic &&
      !contextInfo.referencedFile &&
      !hasAttachments
    ) {
      return {
        isAmbiguous: true,
        clarificationQuestion: "Could you please paste the specific code, error message, or document you would like me to analyze?",
        ambiguityReason: "Prompt uses demonstrative pronoun ('this'/'it') with no prior topic or attachment.",
      };
    }

    // Default: Sufficiently specified to proceed with execution
    return { isAmbiguous: false };
  }
}

export const ambiguityDetector = AmbiguityDetector.getInstance();
