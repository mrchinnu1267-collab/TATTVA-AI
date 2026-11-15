/**
 * TATTVA AI - Feedback Intelligence Service (Phase 24)
 * Privacy-first feedback ingestion, tenant isolation, and actionable intelligence reporting
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  UserFeedbackRecord,
  FeedbackCategoryDetailed,
  FeedbackIntelligenceReport,
  FeedbackClusterSummary,
} from "./types";
import { feedbackCollector } from "../continuous-learning/feedback-collector";

export class FeedbackIntelligenceService {
  private static instance: FeedbackIntelligenceService;
  private feedbackStore: Map<string, UserFeedbackRecord> = new Map();

  public static getInstance(): FeedbackIntelligenceService {
    if (!FeedbackIntelligenceService.instance) {
      FeedbackIntelligenceService.instance = new FeedbackIntelligenceService();
    }
    return FeedbackIntelligenceService.instance;
  }

  /**
   * Submits user feedback with mandatory privacy and consent checks
   */
  public submitFeedback(params: {
    userId: string;
    workspaceId?: string;
    category: FeedbackCategoryDetailed;
    rating: "positive" | "negative";
    userComments?: string;
    conversationSnippet?: string;
    modelUsed?: string;
    toolInvolved?: string;
    userConsentedToStore: boolean;
    consentToAnonymizedImprovement?: boolean;
  }): { success: boolean; record?: UserFeedbackRecord; error?: string } {
    // 1. Mandatory consent check
    if (!params.userConsentedToStore) {
      return {
        success: false,
        error: "User consent is required to store feedback. Unconsented data was discarded immediately.",
      };
    }

    // 2. PII Scrubbing
    const scrubbedComments = params.userComments
      ? feedbackCollector.scrubPII(params.userComments)
      : undefined;
    const scrubbedSnippet = params.conversationSnippet
      ? feedbackCollector.scrubPII(params.conversationSnippet)
      : undefined;

    const id = `fb_rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record: UserFeedbackRecord = {
      id,
      userId: params.userId,
      workspaceId: params.workspaceId,
      category: params.category,
      rating: params.rating,
      userComments: scrubbedComments,
      conversationContextSnippet: scrubbedSnippet,
      modelUsed: params.modelUsed,
      toolInvolved: params.toolInvolved,
      userConsentedToStore: true,
      consentToAnonymizedImprovement: params.consentToAnonymizedImprovement ?? false,
      createdAt: Date.now(),
    };

    this.feedbackStore.set(id, record);
    return { success: true, record };
  }

  /**
   * Lists feedback strictly isolated to the requesting user and/or workspace
   */
  public listFeedback(userId: string, workspaceId?: string): UserFeedbackRecord[] {
    return Array.from(this.feedbackStore.values()).filter((record) => {
      // Must match userId or specific workspace where user belongs
      if (workspaceId && record.workspaceId) {
        return record.workspaceId === workspaceId && record.userId === userId;
      }
      return record.userId === userId;
    });
  }

  /**
   * Permanently deletes a single feedback record with ownership validation
   */
  public deleteFeedback(feedbackId: string, userId: string): boolean {
    const record = this.feedbackStore.get(feedbackId);
    if (!record) return false;
    if (record.userId !== userId) return false; // Cross-user delete forbidden

    this.feedbackStore.delete(feedbackId);
    return true;
  }

  /**
   * Purges all feedback for a user (GDPR / CCPA "Right to be Forgotten")
   */
  public purgeAllUserData(userId: string): number {
    let deletedCount = 0;
    for (const [id, record] of this.feedbackStore.entries()) {
      if (record.userId === userId) {
        this.feedbackStore.delete(id);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Generates aggregated feedback intelligence report
   */
  public generateIntelligenceReport(workspaceId?: string): FeedbackIntelligenceReport {
    let items = Array.from(this.feedbackStore.values());
    if (workspaceId) {
      items = items.filter((i) => i.workspaceId === workspaceId);
    }

    const total = items.length;
    if (total === 0) {
      return {
        totalFeedbackCount: 0,
        positiveCount: 0,
        negativeCount: 0,
        satisfactionRate: 100,
        clusters: [],
        topReportedProblems: [],
        generatedAt: Date.now(),
      };
    }

    const positiveCount = items.filter((i) => i.rating === "positive").length;
    const negativeCount = items.filter((i) => i.rating === "negative").length;
    const satisfactionRate = Math.round((positiveCount / total) * 100);

    const categoryMap = new Map<FeedbackCategoryDetailed, UserFeedbackRecord[]>();
    for (const item of items) {
      const group = categoryMap.get(item.category) || [];
      group.push(item);
      categoryMap.set(item.category, group);
    }

    const clusters: FeedbackClusterSummary[] = [];
    const recommendedActions: Record<FeedbackCategoryDetailed, string> = {
      helpful: "Identify best-performing prompt patterns and promote to standard template",
      not_helpful: "Review conversational flow and adjust tone guidance",
      incorrect_answer: "Enforce stricter anti-hallucination thresholds and RAG citation checks",
      poor_explanation: "Enable step-by-step reasoning decomposition in prompt analyzer",
      missing_feature: "Queue feature request in engineering backlog",
      failed_tool_execution: "Audit tool parameters and add schema error recovery retries",
      document_processing_problem: "Inspect document parser bounds and encoding canonicalization",
      user_experience_issue: "Refine frontend UI loading indicators and response streaming states",
    };

    for (const [cat, records] of categoryMap.entries()) {
      clusters.push({
        category: cat,
        count: records.length,
        percentage: Math.round((records.length / total) * 100),
        sampleComments: records
          .map((r) => r.userComments)
          .filter((c): c is string => Boolean(c))
          .slice(0, 3),
        recommendedAction: recommendedActions[cat],
      });
    }

    // Sort clusters by count descending
    clusters.sort((a, b) => b.count - a.count);

    const topProblems = clusters
      .filter((c) => c.category !== "helpful")
      .slice(0, 3)
      .map((c) => `${c.category.replace(/_/g, " ")} (${c.count} reports - ${c.recommendedAction})`);

    return {
      totalFeedbackCount: total,
      positiveCount,
      negativeCount,
      satisfactionRate,
      clusters,
      topReportedProblems: topProblems,
      generatedAt: Date.now(),
    };
  }
}

export const feedbackIntelligenceService = FeedbackIntelligenceService.getInstance();
