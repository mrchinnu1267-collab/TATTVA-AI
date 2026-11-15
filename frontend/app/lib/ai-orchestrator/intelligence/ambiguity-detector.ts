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
    ambiguityScore: number;
    missingDetails: string[];
    clarificationQuestion?: string;
    ambiguityReason?: string;
  } {
    const clean = rawPrompt.trim().toLowerCase();

    // 1. If context or attachment already resolves it, it is NOT ambiguous
    if (contextInfo.hasAnaphora || hasAttachments) {
      return {
        isAmbiguous: false,
        ambiguityScore: 5,
        missingDetails: [],
      };
    }

    // 2. Extremely short vague prompts without history
    if (VAGUE_STANDALONE_PROMPTS.includes(clean) || (clean.length < 5 && !clean.includes("hi") && !clean.includes("hey"))) {
      return {
        isAmbiguous: true,
        ambiguityScore: 95,
        missingDetails: ["Target topic or subject", "Desired operation", "Input parameters"],
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
        ambiguityScore: 85,
        missingDetails: ["Referenced document, code snippet, or error text"],
        clarificationQuestion: "Could you please paste the specific code, error message, or document you would like me to analyze?",
        ambiguityReason: "Prompt uses demonstrative pronoun ('this'/'it') with no prior topic or attachment.",
      };
    }

    // 4. Underspecified instruction checks (e.g. "build me an app" with 0 features)
    if (/^(make an app|build an app|create a website|build software)$/i.test(clean)) {
      return {
        isAmbiguous: true,
        ambiguityScore: 70,
        missingDetails: ["App domain/purpose", "Key features or pages", "Target tech stack"],
        clarificationQuestion: "What type of application would you like to build, and what are its key features?",
        ambiguityReason: "High-level goal without domain requirements or functionality scope.",
      };
    }

    // Default: Sufficiently specified to proceed with execution
    return {
      isAmbiguous: false,
      ambiguityScore: 10,
      missingDetails: [],
    };
  }
}

export const ambiguityDetector = AmbiguityDetector.getInstance();
