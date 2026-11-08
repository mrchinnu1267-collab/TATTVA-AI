/**
 * TATTVA AI - Contextual Understanding & Reference Resolution Engine
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  ConversationalGoal,
  ContextualReferenceResolution,
} from "./types";

const PRONOUN_REFERENCE_PATTERNS = [
  /^(fix|debug|solve|change|update|improve|explain|check|modify|run)\s+(this|that|it)\b/i,
  /\b(this|that|it|the same|same problem|previous one|last one)\b/i,
  /^(why did it fail|why isn't it working|still not working|still broken|same issue|failed again)\b/i,
  /^(continue|proceed|keep going|what next|next step|more|part 2)\b/i,
  /^(make it better|make it shorter|make it simpler|elaborate|add examples|give examples)\b/i,
];

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: Array<{ name: string; type: string; data?: string }>;
}

export class ContextResolver {
  /**
   * Determine the conversational goal based on prompt semantics and conversation context
   */
  public static identifyGoal(
    prompt: string,
    history: ChatHistoryMessage[] = []
  ): ConversationalGoal {
    const clean = prompt.trim().toLowerCase();

    // 1. Error Troubleshooting
    if (
      /\b(error|exception|fail|failed|failure|broken|not working|cannot open|can't open|bug|crash|traceback|syntax error|typeerror|rejected|500 internal|404 not found|econnrefused)\b/i.test(clean) ||
      /\b(why is this happening|what's wrong|same problem|still broken|fix this|resolve this error)\b/i.test(clean)
    ) {
      return "error_troubleshooting";
    }

    // 2. Continuation
    if (/^(continue|proceed|keep going|what next|next step|next|go on|part 2|resume)\b/i.test(clean)) {
      return "continuation";
    }

    // 3. Modification / Refinement
    if (
      /^(make it|change this|update this|refactor|rewrite|shorten|elaborate|add |remove |switch to|format this)\b/i.test(clean) ||
      /\b(make it (shorter|longer|simpler|cleaner|faster|better))\b/i.test(clean)
    ) {
      return "modification";
    }

    // 4. Detailed Explanation
    if (
      /\b(explain in detail|detailed explanation|step-by-step|deep dive|comprehensive guide|walk me through|how does .* work|teach me|with examples|tutorial)\b/i.test(clean) ||
      clean.includes("in depth") ||
      clean.includes("thoroughly")
    ) {
      return "detailed_explanation";
    }

    // 5. Implementation / Code Generation
    if (
      /\b(implement|create a function|build a|write code|write a script|generate a component|set up a|configure|scaffold)\b/i.test(clean)
    ) {
      return "implementation_request";
    }

    // 6. Ideation / Brainstorming
    if (
      /\b(brainstorm|ideas for|what if|architecture for|suggest some|design a system|explore)\b/i.test(clean)
    ) {
      return "ideation";
    }

    // 7. Check if short query without context is ambiguous
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length <= 2 && history.length === 0) {
      if (/^(it|this|that|fix|continue|why|how|what)\b/i.test(clean)) {
        return "clarification_needed";
      }
    }

    // 8. Direct short question
    if (
      words.length <= 15 &&
      (clean.startsWith("what is") ||
        clean.startsWith("who is") ||
        clean.startsWith("when was") ||
        clean.startsWith("where is") ||
        clean.startsWith("define") ||
        clean.startsWith("how to check") ||
        clean.startsWith("which")) &&
      !clean.includes("in detail") &&
      !clean.includes("comprehensively")
    ) {
      return "direct_question";
    }

    return "direct_question";
  }

  /**
   * Resolve pronouns ("this", "that", "it", "same problem", "continue") using previous conversation turns
   */
  public static resolveReferences(
    userPrompt: string,
    history: ChatHistoryMessage[] = []
  ): ContextualReferenceResolution {
    const cleanPrompt = userPrompt.trim();
    const isAmbiguous = PRONOUN_REFERENCE_PATTERNS.some((p) => p.test(cleanPrompt));

    if (!isAmbiguous || history.length === 0) {
      return {
        originalQuery: cleanPrompt,
        resolvedQuery: cleanPrompt,
        isAmbiguousReference: false,
      };
    }

    // Look back up to 6 recent messages
    const recentHistory = [...history].reverse().slice(0, 6);

    let referencedSubject = "";
    let referencedCodeSnippet = "";
    let referencedError = "";

    // 1. Check for errors mentioned in user or assistant messages
    for (const msg of recentHistory) {
      const errMatch = msg.content.match(/(?:error|failed|exception|cannot open|can't open|issue):\s*([^\n.]+)/i);
      if (errMatch && !referencedError) {
        referencedError = errMatch[1].trim();
      }

      // Check code blocks
      const codeMatch = msg.content.match(/```[a-z0-9]*\n([\s\S]*?)```/);
      if (codeMatch && !referencedCodeSnippet) {
        referencedCodeSnippet = codeMatch[1].trim().slice(0, 500);
      }

      // Check topic keywords
      if (!referencedSubject && msg.role === "user" && msg.content !== cleanPrompt) {
        const firstLine = msg.content.split("\n")[0].trim();
        if (firstLine.length > 5 && firstLine.length < 120) {
          referencedSubject = firstLine;
        }
      }
    }

    // Synthesize contextual query
    let resolvedQuery = cleanPrompt;

    if (cleanPrompt.toLowerCase().includes("same problem") || cleanPrompt.toLowerCase().includes("still not working")) {
      if (referencedError) {
        resolvedQuery = `${cleanPrompt} (Reference: User is still experiencing "${referencedError}")`;
      } else if (referencedSubject) {
        resolvedQuery = `${cleanPrompt} (Reference: Regarding previous discussion on "${referencedSubject}")`;
      }
    } else if (/^(fix\s+(this|it|that)|why did it fail)/i.test(cleanPrompt)) {
      if (referencedError) {
        resolvedQuery = `${cleanPrompt} (Reference: Resolve error "${referencedError}")`;
      } else if (referencedCodeSnippet) {
        resolvedQuery = `${cleanPrompt} (Reference: In the previously shared code snippet)`;
      } else if (referencedSubject) {
        resolvedQuery = `${cleanPrompt} (Reference: For "${referencedSubject}")`;
      }
    } else if (/^(continue|proceed|keep going|next step)/i.test(cleanPrompt)) {
      if (referencedSubject) {
        resolvedQuery = `${cleanPrompt} (Reference: Continuing implementation/discussion of "${referencedSubject}")`;
      }
    }

    return {
      originalQuery: cleanPrompt,
      resolvedQuery,
      isAmbiguousReference: true,
      referencedSubject: referencedSubject || undefined,
      referencedCodeSnippet: referencedCodeSnippet || undefined,
      referencedError: referencedError || undefined,
    };
  }

  /**
   * Detect if the user is repeatedly encountering an error and extract failed solution attempts
   */
  public static detectRepeatedError(
    prompt: string,
    history: ChatHistoryMessage[] = []
  ): { isRepeated: boolean; failedSolutions: string[] } {
    const clean = prompt.toLowerCase();
    const repeatedPhrases = [
      "still not working",
      "same problem",
      "same error",
      "failed again",
      "still failing",
      "didn't work",
      "did not work",
      "still broken",
      "not working",
      "repeating",
      "repeated",
    ];

    const hasRepeatedPhrase = repeatedPhrases.some((p) => clean.includes(p));
    const failedSolutions: string[] = [];

    // Count assistant attempts in history
    const assistantMessages = history.filter((m) => m.role === "assistant");
    if (hasRepeatedPhrase && assistantMessages.length >= 1) {
      for (const msg of assistantMessages.slice(-3)) {
        // Extract the main advice or solution summary
        const lines = msg.content
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 10 && !l.startsWith("```") && !l.startsWith("#"));
        if (lines.length > 0) {
          failedSolutions.push(lines[0].slice(0, 150));
        }
      }

      return {
        isRepeated: true,
        failedSolutions,
      };
    }

    return {
      isRepeated: false,
      failedSolutions: [],
    };
  }
}
