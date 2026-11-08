/**
 * TATTVA AI - Adaptive Communication & Emotional Awareness Engine
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  ConversationalSignal,
  CommunicationPreference,
  HumanContextAnalysis,
} from "./types";

const SIGNAL_TRIGGERS: Array<{ signal: ConversationalSignal; patterns: RegExp[] }> = [
  {
    signal: "frustration",
    patterns: [
      /\b(still not working|failed again|same problem|same issue|you keep doing this|wrong again|frustrated|frustrating|annoying|waste of time|ugh|broken again|stop giving me)\b/i,
      /\b(why is this so hard|not helping|doesn't work|not working at all)\b/i,
    ],
  },
  {
    signal: "confusion",
    patterns: [
      /\b(i don't understand|i do not understand|what do you mean|confused|confusing|lost|what is the difference|can you explain simpler|eli5|too complicated)\b/i,
    ],
  },
  {
    signal: "urgency",
    patterns: [
      /\b(urgent|asap|emergency|hurry|production down|critical|immediately|quick fix|right now)\b/i,
    ],
  },
  {
    signal: "curiosity",
    patterns: [
      /\b(how does that work|why does it|under the hood|curious|interesting|tell me more|what makes it)\b/i,
    ],
  },
  {
    signal: "satisfaction",
    patterns: [
      /\b(thank you|thanks|great job|perfect|awesome|worked|it worked|fixed now|brilliant|kudos)\b/i,
    ],
  },
  {
    signal: "dissatisfaction",
    patterns: [
      /\b(that is wrong|that's incorrect|not what i asked|irrelevant|unhelpful|bad answer)\b/i,
    ],
  },
];

export class AdaptiveCommunicationEngine {
  /**
   * Detect conversational signals from the user message
   */
  public static detectSignals(prompt: string): ConversationalSignal[] {
    const detected: ConversationalSignal[] = [];

    for (const group of SIGNAL_TRIGGERS) {
      if (group.patterns.some((p) => p.test(prompt))) {
        detected.push(group.signal);
      }
    }

    if (detected.length === 0) {
      detected.push("neutral");
    }

    return detected;
  }

  /**
   * Determine preferred communication style
   */
  public static inferCommunicationPreference(
    prompt: string,
    historyLength: number
  ): CommunicationPreference {
    const clean = prompt.toLowerCase();

    // Length
    let length: "concise" | "balanced" | "detailed" = "balanced";
    if (/\b(brief|short|tldr|quick summary|one sentence|concise|bullet points only)\b/i.test(clean)) {
      length = "concise";
    } else if (
      /\b(detailed|in detail|comprehensive|deep dive|step-by-step|step by step|in-depth|explain thoroughly)\b/i.test(
        clean
      )
    ) {
      length = "detailed";
    } else if (clean.split(/\s+/).length <= 6 && historyLength === 0) {
      // Default to crisp answer for very short initial queries
      length = "concise";
    }

    // Technical depth
    let technicalDepth: "accessible" | "technical" | "expert" = "technical";
    if (/\b(simple|eli5|beginner|easy to understand|plain english|layman)\b/i.test(clean)) {
      technicalDepth = "accessible";
    } else if (/\b(expert|senior|advanced|kernel|low-level|architecture|internals|optimization)\b/i.test(clean)) {
      technicalDepth = "expert";
    }

    const wantsExamples = /\b(example|examples|code sample|demo|show me how)\b/i.test(clean);
    const wantsSteps = /\b(steps?|walkthrough|step by step|guide|numbered)\b/i.test(clean);

    return {
      length,
      technicalDepth,
      wantsExamples,
      wantsSteps,
    };
  }

  /**
   * Build contextual human-centred instruction block for AI prompt
   */
  public static buildHumanGuidancePrompt(analysis: HumanContextAnalysis): string {
    const guidelines: string[] = [];

    // 1. Natural conversation rules
    guidelines.push("NATURAL HUMAN CONVERSATION PRINCIPLES:");
    guidelines.push("- Communicate like an experienced, helpful human technical peer.");
    guidelines.push("- NEVER use robotic conversational filler (e.g. NEVER write 'Certainly!', 'I would be happy to help you with that', 'Sure, here is...', 'As an AI language model...').");
    guidelines.push("- NEVER parrot or repeat the user's question back to them.");
    guidelines.push("- Jump straight into the substantive answer or solution.");

    // 2. Goal-specific guidance
    if (analysis.goal === "direct_question" || analysis.communicationPreference.length === "concise") {
      guidelines.push("\nRESPONSE LENGTH & FOCUS: CONCISE");
      guidelines.push("- Provide a direct, authoritative, and concise answer upfront without overwhelming paragraphs.");
      guidelines.push("- Avoid tangential fluff or unnecessary background history.");
    } else if (analysis.goal === "detailed_explanation" || analysis.communicationPreference.length === "detailed") {
      guidelines.push("\nRESPONSE LENGTH & FOCUS: COMPREHENSIVE");
      guidelines.push("- Provide a structured, thorough breakdown with clear headings, core principles, and actionable real-world examples.");
      if (analysis.communicationPreference.wantsExamples) {
        guidelines.push("- Include concrete, functional code examples or diagrams where beneficial.");
      }
    }

    // 3. Emotional & Error Signals
    if (analysis.isRepeatedError || analysis.signals.includes("frustration")) {
      guidelines.push("\nCRITICAL - REPEATED ISSUE & FRUSTRATION AWARENESS:");
      guidelines.push("- The user is encountering a persistent issue or frustration. Acknowledge this with natural human empathy (e.g., 'I understand this is frustrating after several attempts; let's isolate the root cause directly').");
      guidelines.push("- DO NOT repeat previous failed recommendations or generic boilerplate.");
      if (analysis.failedSolutionsAttempted.length > 0) {
        guidelines.push(`- PREVIOUS ATTEMPTS THAT FAILED (DO NOT REPEAT): ${analysis.failedSolutionsAttempted.join(" | ")}`);
      }
      guidelines.push("- Isolate the single root cause and give one clear, verifiable action step to resolve it.");
    } else if (analysis.signals.includes("confusion")) {
      guidelines.push("\nUSER SIGNAL: CONFUSION");
      guidelines.push("- Break the concept down simply using everyday analogies.");
      guidelines.push("- Avoid dense jargon unless immediately followed by an accessible explanation.");
    } else if (analysis.signals.includes("urgency")) {
      guidelines.push("\nUSER SIGNAL: URGENCY");
      guidelines.push("- Deliver the immediate fix or answer on line 1.");
      guidelines.push("- Omit all non-essential theory.");
    }

    // 4. Reference Resolution
    if (analysis.referenceResolution.isAmbiguousReference && analysis.referenceResolution.referencedSubject) {
      guidelines.push(`\nCONTEXTUAL RESOLUTION: The user's query refers back to: "${analysis.referenceResolution.referencedSubject}". Address this subject directly without asking them to repeat it.`);
    }

    return guidelines.join("\n");
  }

  /**
   * Strip robotic boilerplate from output text if the model hallucinates cliches
   */
  public static stripRoboticBoilerplate(text: string): string {
    return text
      .replace(/^(?:certainly!?|sure!?|of course!?|absolutely!?)[,\s]*/i, "")
      .replace(/^(?:i(?:'d|\s+would)?\s+be\s+(?:happy|glad|delighted)\s+to\s+help(?:\s+you)?(?:\s+with\s+that)?)[.!:]?\s*/i, "")
      .replace(/^(?:i\s+can\s+(?:certainly\s+)?(?:help|assist)(?:\s+you)?(?:\s+with\s+that)?)[.!:]?\s*/i, "")
      .replace(/^(?:here\s+is\s+the\s+(?:information|solution|answer|code))[:!]?\s*/i, "")
      .replace(/^as an ai (?:language )?model,?\s*/i, "")
      .replace(/^i understand you are asking (?:about|for|to) [^.!?]+[.!?]\s*/i, "")
      .replace(/^great question!?\s*/i, "")
      .trim();
  }
}
