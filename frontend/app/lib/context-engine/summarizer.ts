/**
 * TATTVA AI - Context Summarizer & Token Compressor
 * Generates compact historical summaries to prevent sending unbounded chat logs to Gemini
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ContextMessage, ConversationSummary } from "./types";

export class ContextSummarizer {
  /**
   * Generates or updates a compact conversation summary from older messages
   */
  public static summarizeTurns(
    olderMessages: ContextMessage[],
    existingSummary?: ConversationSummary,
    conversationId: string = "default",
    userId: string = "guest_user",
    workspaceId?: string
  ): ConversationSummary {
    if (olderMessages.length === 0) {
      return (
        existingSummary || {
          conversationId,
          workspaceId,
          userId,
          summaryText: "",
          keyTopics: [],
          activeDecisions: [],
          resolvedErrors: [],
          turnsSummarized: 0,
          updatedAt: Date.now(),
        }
      );
    }

    const topics: string[] = existingSummary ? [...existingSummary.keyTopics] : [];
    const decisions: string[] = existingSummary ? [...existingSummary.activeDecisions] : [];
    const errors: string[] = existingSummary ? [...existingSummary.resolvedErrors] : [];

    const summaryPoints: string[] = existingSummary?.summaryText
      ? [existingSummary.summaryText]
      : [];

    for (const msg of olderMessages) {
      const text = msg.content.trim();
      if (!text) continue;

      // Extract topics from user questions
      if (msg.role === "user") {
        const firstLine = text.split("\n")[0].trim();
        if (firstLine.length > 5 && firstLine.length < 120 && !topics.includes(firstLine)) {
          topics.push(firstLine);
        }

        // Check for error mentions
        const errorMatch = text.match(/(?:error|failed|exception|broken|bug):\s*([^\n.]+)/i);
        if (errorMatch && !errors.includes(errorMatch[1].trim())) {
          errors.push(errorMatch[1].trim());
        }
      }

      // Extract key decisions or solutions from assistant messages
      if (msg.role === "assistant") {
        const lines = text.split("\n").map((l) => l.trim());
        const keyLines = lines.filter(
          (l) =>
            l.length > 15 &&
            (l.startsWith("- ") || l.startsWith("1.") || l.startsWith("✓") || l.includes("solution") || l.includes("configured"))
        );
        for (const k of keyLines.slice(0, 2)) {
          const cleanLine = k.replace(/^[-*✓\d.]+\s*/, "").slice(0, 100);
          if (!decisions.includes(cleanLine)) {
            decisions.push(cleanLine);
          }
        }
      }
    }

    // Keep top topics and decisions
    const trimmedTopics = topics.slice(-6);
    const trimmedDecisions = decisions.slice(-6);
    const trimmedErrors = errors.slice(-4);

    const compiledSummary = [
      trimmedTopics.length > 0 ? `Key Topics Discussed: ${trimmedTopics.join(" • ")}` : "",
      trimmedDecisions.length > 0 ? `Decisions & Solutions Established: ${trimmedDecisions.join("; ")}` : "",
      trimmedErrors.length > 0 ? `Issues Addressed: ${trimmedErrors.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      conversationId,
      workspaceId,
      userId,
      summaryText: compiledSummary,
      keyTopics: trimmedTopics,
      activeDecisions: trimmedDecisions,
      resolvedErrors: trimmedErrors,
      turnsSummarized: (existingSummary?.turnsSummarized || 0) + olderMessages.length,
      lastSummarizedMessageId: olderMessages[olderMessages.length - 1]?.id,
      updatedAt: Date.now(),
    };
  }
}

