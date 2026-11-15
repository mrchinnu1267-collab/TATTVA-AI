/**
 * TATTVA AI - Privacy-Preserving Feedback Collector (Phase 20)
 * Scrubs PII, anonymizes inputs, and catalogs user satisfaction signals
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { UserFeedbackEntry, FeedbackSignalType, FailureCategoryType } from "./types";

export class FeedbackCollector {
  private static instance: FeedbackCollector;
  private feedbackEntries: UserFeedbackEntry[] = [];

  public static getInstance(): FeedbackCollector {
    if (!FeedbackCollector.instance) {
      FeedbackCollector.instance = new FeedbackCollector();
    }
    return FeedbackCollector.instance;
  }

  /**
   * Scrubs Personally Identifiable Information (PII) from strings
   */
  public scrubPII(text: string): string {
    return text
      // 1. API Keys & Secrets first (to prevent sub-sequence matching by phone/number regexes)
      .replace(/\b(?:sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z\-_]{25,50}|ghp_[a-zA-Z0-9]{30,45})\b/g, "[REDACTED_SECRET]")
      // 2. Emails
      .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "[REDACTED_EMAIL]")
      // 3. Phone numbers (with word boundaries)
      .replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]")
      // 4. Credit card formats
      .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, "[REDACTED_CARD]");
  }

  /**
   * Ingests user feedback with privacy-first sanitization
   */
  public recordFeedback(params: {
    signal: FeedbackSignalType;
    ratingScore?: number;
    prompt: string;
    response: string;
    userCorrection?: string;
    category?: FailureCategoryType;
  }): UserFeedbackEntry {
    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const scrubbedPrompt = this.scrubPII(params.prompt);
    const scrubbedCorrection = params.userCorrection ? this.scrubPII(params.userCorrection) : undefined;

    // Auto-infer failure category if not provided
    let category = params.category;
    if (!category && (params.signal === "thumbs_down" || (params.ratingScore && params.ratingScore <= 2))) {
      const lower = (params.userCorrection || "").toLowerCase();
      if (lower.includes("format") || lower.includes("json") || lower.includes("markdown")) {
        category = "format_error";
      } else if (lower.includes("wrong answer") || lower.includes("hallucinat") || lower.includes("fake")) {
        category = "hallucination";
      } else if (lower.includes("constraint") || lower.includes("i told you not to")) {
        category = "missed_constraint";
      } else if (lower.includes("telugu") || lower.includes("hindi") || lower.includes("language")) {
        category = "language_error";
      } else {
        category = "wrong_intent";
      }
    }

    const entry: UserFeedbackEntry = {
      feedbackId,
      signal: params.signal,
      ratingScore: params.ratingScore,
      rawPrompt: scrubbedPrompt, // store scrubbed by default
      modelResponse: params.response.slice(0, 1000),
      userCorrection: scrubbedCorrection,
      category,
      scrubbedPrompt,
      scrubbedCorrection,
      isAnonymized: true,
      createdAt: Date.now(),
    };

    this.feedbackEntries.push(entry);
    return entry;
  }

  public listFeedback(): UserFeedbackEntry[] {
    return [...this.feedbackEntries];
  }

  public getNegativeFeedback(): UserFeedbackEntry[] {
    return this.feedbackEntries.filter(
      (f) => f.signal === "thumbs_down" || (f.ratingScore !== undefined && f.ratingScore <= 2) || f.userCorrection
    );
  }
}

export const feedbackCollector = FeedbackCollector.getInstance();
