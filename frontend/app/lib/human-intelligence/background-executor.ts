/**
 * TATTVA AI - Background Execution System & Privacy Isolation Engine
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ProgressStage, DeveloperDebugInfo } from "./types";

export const HUMAN_PROGRESS_MESSAGES: Record<ProgressStage, string> = {
  understanding: "Understanding your request...",
  researching: "Researching relevant information...",
  analyzing: "Analyzing your documents...",
  preparing: "Preparing your solution...",
  verifying: "Verifying the results...",
  completed: "Completed successfully.",
};

export class BackgroundExecutor {
  /**
   * Get human-friendly progress message for any execution stage
   */
  public static getProgressMessage(stage: ProgressStage): string {
    return HUMAN_PROGRESS_MESSAGES[stage] || "Processing your request...";
  }

  /**
   * Scrub internal implementation leaks, stack traces, raw JSON, and system prompts from user output
   */
  public static sanitizeChatResponse(rawContent: string): {
    cleanContent: string;
    sanitizedLogs: string[];
  } {
    const sanitizedLogs: string[] = [];
    let text = rawContent;

    // 1. Strip raw Python tracebacks / error dumps
    if (/Traceback \(most recent call last\):[\s\S]*?(?:Error|Exception):/i.test(text)) {
      sanitizedLogs.push("Stripped raw Python execution traceback from user view");
      text = text.replace(/Traceback \(most recent call last\):[\s\S]*?(?:Error|Exception):[^\n]*/gi, "");
    }

    // 2. Strip internal system prompt echoes if model leaked them
    const leakSignatures = [
      /\[Real-Time Live Clock[^\]]*\]:[^\n]*/gi,
      /\[Real-Time Live Weather[^\]]*\]:[\s\S]*?accurately\./gi,
      /LIVE WEB SEARCH RESULTS:[\s\S]*?---\n/gi,
      /You are TATTVA AI, a premier intelligent[^\n]*/gi,
      /CREATOR & PROUD IDENTITY:[\s\S]*?kotapati Gowtham Chowdary" made me\./gi,
      /CONFIDENTIALITY & ZERO TRUST:[\s\S]*?details\./gi,
      /RETRIEVED KNOWLEDGE CONTEXT:[\s\S]*?---\n/gi,
      /DOCUMENT, REPORT & PRESENTATION PROTOCOL:[\s\S]*?language\./gi,
      /HANDWRITING, DOCUMENT & FILE INTELLIGENCE PROTOCOL:[\s\S]*?takeaways\]/gi,
    ];

    for (const pattern of leakSignatures) {
      if (pattern.test(text)) {
        sanitizedLogs.push(`Stripped internal system prompt signature: ${pattern.source.slice(0, 40)}`);
        text = text.replace(pattern, "");
      }
    }

    // 3. Strip raw JSON payloads dumped directly into prose if not part of a coding block
    if (text.trim().startsWith("{") && text.trim().endsWith("}") && !text.includes("```")) {
      try {
        const parsed = JSON.parse(text.trim());
        if (parsed.content || parsed.message || parsed.text) {
          text = parsed.content || parsed.message || parsed.text;
          sanitizedLogs.push("Extracted content string from raw JSON payload");
        } else if (parsed.error) {
          text = `I encountered an unexpected issue: ${parsed.error}`;
          sanitizedLogs.push("Sanitized error message from raw JSON payload");
        }
      } catch {
        // Not JSON
      }
    }

    // 4. Strip internal execution markers
    text = text
      .replace(/\[INTERNAL_EXECUTION_LOG:[^\]]+\]/gi, "")
      .replace(/\[TOOL_OUTPUT_RAW:[^\]]+\]/gi, "")
      .trim();

    // 5. Unwrap pseudo-file blocks into clean markdown content
    text = text.replace(/```(?:file:[^\n]*|pptx:[^\n]*|docx:[^\n]*|xlsx:[^\n]*|pdf:[^\n]*|[^\n]*\.(?:pptx|docx|xlsx|pdf))\n([\s\S]*?)```/gi, (_match, inner) => {
      sanitizedLogs.push("Unwrapped pseudo-file code block into clean markdown");
      return inner.trim();
    });

    // 6. Strip pseudo download links and fake download notices
    text = text
      .replace(/(?:📥\s*)?\[(?:Download|Click here to download)[^\]]*\]\((?:file:[^)]*|[^)]*\.(?:pptx|docx|xlsx|pdf|csv))\)\s*🚀?/gi, "")
      .replace(/📥\s*\[[^\]]+\]\([^)]+\)\s*🚀?/gi, "")
      .replace(/You can (?:easily\s+)?download (?:the\s+)?[^\n]*(?:presentation|document|file|spreadsheet)[^\n]*below:?/gi, "")
      .replace(/Once you share a few details, I will (?:instantly\s+)?(?:structure and\s+)?generate the complete presentation for you!?[^\n]*/gi, "Once you share a few details, I will structure and present the complete presentation outline and slides right here for you.")
      .replace(/✨\s*I have prepared your complete presentation on ([^\n!]+)!/gi, "Here is your complete presentation on **$1**:")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return {
      cleanContent: text || "I am ready to help you with the next step.",
      sanitizedLogs,
    };
  }

  /**
   * Format human-friendly error messages that hide scary stack traces or internal HTTP codes
   */
  public static formatSafeUserError(
    rawError: string,
    debugInfo?: Partial<DeveloperDebugInfo>
  ): { userMessage: string; debugInfo: DeveloperDebugInfo } {
    let userMessage = "I encountered a temporary issue while processing your request. Please try again in a moment, and I will be happy to assist you.";

    const lower = rawError.toLowerCase();

    if (lower.includes("rate limit") || lower.includes("429")) {
      userMessage = "We are currently experiencing high request volume. Please wait a few seconds and try your request again.";
    } else if (lower.includes("timeout") || lower.includes("econnreset") || lower.includes("503")) {
      userMessage = "The connection timed out while processing your request. Please try again shortly.";
    } else if (lower.includes("apikey") || lower.includes("unauthorized") || lower.includes("401")) {
      userMessage = "The AI service is temporarily unavailable due to a configuration check. Please check your provider settings or try again in a few moments.";
    } else if (lower.includes("safety") || lower.includes("blocked") || lower.includes("harmful")) {
      userMessage = "This request could not be completed as it triggered our safety guidelines. Please rephrase your request.";
    }

    const compiledDebug: DeveloperDebugInfo = {
      stagesExecuted: debugInfo?.stagesExecuted || ["understanding"],
      executionTimeMs: debugInfo?.executionTimeMs || 0,
      toolsUsed: debugInfo?.toolsUsed || [],
      intent: debugInfo?.intent || "general_chat",
      complexityScore: debugInfo?.complexityScore || 1,
      internalTechnicalLogs: debugInfo?.internalTechnicalLogs || [],
      technicalError: rawError,
    };

    return {
      userMessage,
      debugInfo: compiledDebug,
    };
  }
}

