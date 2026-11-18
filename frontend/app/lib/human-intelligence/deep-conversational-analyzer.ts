/**
 * TATTVA AI - Deep Conversational Understanding Engine
 * Analyzes sarcasm, humor, indirect requests, implied questions, topic changes, corrections, and contradictions
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface DeepConversationalAnalysis {
  isSarcastic: boolean;
  sarcasmDetails?: {
    confidence: number;
    underlyingIntent: string;
    literalVsRealContrast: string;
  };
  isIndirectRequest: boolean;
  indirectDetails?: {
    impliedGoal: string;
    actionableDirective: string;
  };
  isUserCorrection: boolean;
  correctionDetails?: {
    correctedParameter?: string;
    replacedValue?: string;
    newValue?: string;
  };
  isTopicTransition: boolean;
  topicTransitionDetails?: {
    transitionType: "explicit_pivot" | "natural_shift" | "continuation";
    newTopicHint?: string;
  };
  isHumorOrBanter: boolean;
  humorDetails?: {
    category: "banter" | "sci_fi_cliche" | "joke_request" | "witty_remark";
    suggestedRegister: string;
  };
  guidanceDirectives: string[];
}

export class DeepConversationalAnalyzer {
  private static instance: DeepConversationalAnalyzer;

  public static getInstance(): DeepConversationalAnalyzer {
    if (!DeepConversationalAnalyzer.instance) {
      DeepConversationalAnalyzer.instance = new DeepConversationalAnalyzer();
    }
    return DeepConversationalAnalyzer.instance;
  }

  /**
   * Analyzes non-literal nuances: sarcasm, humor, indirect intent, corrections, topic switches
   */
  public analyzeNuances(
    prompt: string,
    history: Array<{ role: string; content: string }> = []
  ): DeepConversationalAnalysis {
    const clean = prompt.trim();
    const cleanLower = clean.toLowerCase();
    const directives: string[] = [];

    // 1. Sarcasm & Irony Detection
    let isSarcastic = false;
    let sarcasmDetails: DeepConversationalAnalysis["sarcasmDetails"] = undefined;

    const sarcasmPatterns = [
      /\b(oh\s+(?:great|wonderful|fantastic|brilliant|perfect|lovely)[,!]?\s+(?:another|now|it|my|this|the|we))\b/i,
      /\b(just what i (?:needed|wanted|asked for))\b/i,
      /\b(thanks for (?:breaking|crashing|ruining))\b/i,
      /\b(wow,?\s+so\s+helpful)\b/i,
      /\b(because that worked so well)\b/i,
      /\b(?:brilliant|fantastic|wonderful|great|lovely|perfect)[!.,]?\s+.*?\b(?:crashed|failed|broke|broken|error|down)\b/i,
    ];

    if (sarcasmPatterns.some((p) => p.test(cleanLower))) {
      isSarcastic = true;
      sarcasmDetails = {
        confidence: 0.88,
        underlyingIntent: "User is expressing irony/frustration regarding an unexpected error or breakdown.",
        literalVsRealContrast: "Surface words seem positive ('wonderful/brilliant'), but actual intent expresses annoyance.",
      };
      directives.push(
        "SARCASM & IRONY DETECTED: Do NOT respond literally or cheerfully to the sarcastic compliment. Acknowledge the actual frustration calmly, avoid defensiveness, and jump straight into diagnosing and resolving the underlying breakdown."
      );
    }

    // 2. Indirect Requests & Implied Questions
    let isIndirectRequest = false;
    let indirectDetails: DeepConversationalAnalysis["indirectDetails"] = undefined;

    const indirectPatterns = [
      {
        pattern: /\b(?:it would be (?:great|nice|cool|helpful) if|i wish (?:we could|this had|it was)|if only)\b/i,
        goal: "Feature enhancement or performance optimization desire",
      },
      {
        pattern: /\b(?:i(?:'m| am) wondering (?:how|why|what|if)|curious (?:how|why|what))\b/i,
        goal: "Implied technical explanation or architectural walkthrough",
      },
      {
        pattern: /\b(?:not sure (?:where|how|what|why)|uncertain (?:where|how))\b/i,
        goal: "Implied guidance on file location, configuration, or parameter placement",
      },
      {
        pattern: /\b(?:would be better if this loop wasn't|could this be faster)\b/i,
        goal: "Algorithm optimization request",
      },
    ];

    for (const item of indirectPatterns) {
      if (item.pattern.test(cleanLower)) {
        isIndirectRequest = true;
        indirectDetails = {
          impliedGoal: item.goal,
          actionableDirective: `Treat this indirect statement as an actionable technical request for ${item.goal}.`,
        };
        directives.push(
          `INDIRECT REQUEST DETECTED: The user stated an implied desire (${item.goal}). Proactively fulfill this need with direct, concrete code or steps without asking them to rephrase as a command.`
        );
        break;
      }
    }

    // 3. User Corrections & Revisions
    let isUserCorrection = false;
    let correctionDetails: DeepConversationalAnalysis["correctionDetails"] = undefined;

    const correctionMatch = cleanLower.match(
      /\b(?:actually,?\s+(?:i meant|let's use|switch to)|wait,?\s+no|i meant|scratch that|instead of ([a-z0-9_-]+),?\s+(?:let's use|use|switch to) ([a-z0-9_-]+))\b/i
    );

    if (
      correctionMatch ||
      /^(actually|wait no|scratch that|no i meant|my bad, i meant)\b/i.test(cleanLower)
    ) {
      isUserCorrection = true;
      correctionDetails = {
        correctedParameter: "active_context",
        replacedValue: correctionMatch?.[1] || "previous_assumption",
        newValue: correctionMatch?.[2] || clean.slice(0, 50),
      };
      directives.push(
        "USER CORRECTION: The user is correcting a prior statement or preference. Immediately adopt the new specification, invalidate the prior assumption, and do not repeat the discarded option."
      );
    }

    // 4. Topic Transitions & Focus Shifts
    let isTopicTransition = false;
    let topicTransitionDetails: DeepConversationalAnalysis["topicTransitionDetails"] = undefined;

    const topicShiftPatterns = [
      /\b(?:by the way,?\s+(?:moving on|switching to|on another topic)|on a different note|switching gears|changing topics?|different question)\b/i,
      /\b(?:enough about that|unrelated question|unrelated,?\s+but)\b/i,
    ];

    if (topicShiftPatterns.some((p) => p.test(cleanLower))) {
      isTopicTransition = true;
      topicTransitionDetails = {
        transitionType: "explicit_pivot",
        newTopicHint: clean.slice(0, 60),
      };
      directives.push(
        "TOPIC TRANSITION DETECTED: The user is deliberately shifting focus to a new subject. Cleanly pivot to the new topic without dragging stale assumptions from the prior thread."
      );
    }

    // 5. Humor, Sci-Fi Cliches & Playful Banter
    let isHumorOrBanter = false;
    let humorDetails: DeepConversationalAnalysis["humorDetails"] = undefined;

    if (/\b(?:are you (?:skynet|hal 9000|terminator|sentient)|will robots take over|tell me a (?:joke|programming joke)|make me a sandwich)\b/i.test(cleanLower)) {
      isHumorOrBanter = true;
      humorDetails = {
        category: cleanLower.includes("joke") ? "joke_request" : "sci_fi_cliche",
        suggestedRegister: "Witty, playful, intellectually self-aware, and warmly grounded as an AI assistant.",
      };
      directives.push(
        "PLAYFUL BANTER / HUMOR DETECTED: Respond with natural wit, intelligence, warmth, and self-awareness. Avoid stiff robotic disclaimers while keeping the interaction fun and helpful."
      );
    }

    return {
      isSarcastic,
      sarcasmDetails,
      isIndirectRequest,
      indirectDetails,
      isUserCorrection,
      correctionDetails,
      isTopicTransition,
      topicTransitionDetails,
      isHumorOrBanter,
      humorDetails,
      guidanceDirectives: directives,
    };
  }
}

export const deepConversationalAnalyzer = DeepConversationalAnalyzer.getInstance();
