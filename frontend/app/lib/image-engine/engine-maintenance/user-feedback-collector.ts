/**
 * TATTVA AI - Phase W: User Feedback Collector
 * Privacy-Preserving Subjective Quality Ratings & Issue Reporting
 */

import { UserQualityFeedbackSubmission, UserFeedbackAggregates } from "./types";

export class UserFeedbackCollector {
  private static instance: UserFeedbackCollector;
  private submissions: UserQualityFeedbackSubmission[] = [];

  private constructor() {
    this.seedInitialFeedback();
  }

  public static getInstance(): UserFeedbackCollector {
    if (!UserFeedbackCollector.instance) {
      UserFeedbackCollector.instance = new UserFeedbackCollector();
    }
    return UserFeedbackCollector.instance;
  }

  private seedInitialFeedback(): void {
    // Seed initial representative telemetry
    this.submissions = [
      {
        id: "fb-001",
        generationId: "gen-prod-101",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        matchesPrompt: true,
        objectsAreCorrect: true,
        positioningIsCorrect: true,
        referenceSimilarityAcceptable: true,
        textIsReadable: true,
        imageQualityAcceptable: true,
        isSubjective: true,
      },
      {
        id: "fb-002",
        generationId: "gen-prod-102",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        matchesPrompt: true,
        objectsAreCorrect: false,
        positioningIsCorrect: true,
        referenceSimilarityAcceptable: true,
        textIsReadable: true,
        imageQualityAcceptable: true,
        specificIssueDetails: "Asked for 4 copper mugs, but received 5 mugs.",
        isSubjective: true,
      },
      {
        id: "fb-003",
        generationId: "gen-prod-103",
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        matchesPrompt: true,
        objectsAreCorrect: true,
        positioningIsCorrect: true,
        referenceSimilarityAcceptable: true,
        textIsReadable: true,
        imageQualityAcceptable: true,
        isSubjective: true,
      },
      {
        id: "fb-004",
        generationId: "gen-prod-104",
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        matchesPrompt: true,
        objectsAreCorrect: true,
        positioningIsCorrect: false,
        referenceSimilarityAcceptable: true,
        textIsReadable: true,
        imageQualityAcceptable: true,
        specificIssueDetails: "Desk lamp was rendered on left instead of center.",
        isSubjective: true,
      },
    ];
  }

  /**
   * Submits user quality feedback without re-uploading private images
   */
  public submitFeedback(feedback: Omit<UserQualityFeedbackSubmission, "id" | "timestamp" | "isSubjective">): UserQualityFeedbackSubmission {
    const submission: UserQualityFeedbackSubmission = {
      ...feedback,
      id: `fb-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      isSubjective: true, // Strictly flagged as subjective perception, not ground truth
    };

    this.submissions.push(submission);
    return submission;
  }

  /**
   * Calculates aggregated user quality trends
   */
  public getAggregates(): UserFeedbackAggregates {
    const total = this.submissions.length;
    if (total === 0) {
      return {
        totalFeedbackCount: 0,
        promptMatchRatePct: 100,
        objectsCorrectRatePct: 100,
        positioningCorrectRatePct: 100,
        referenceAcceptableRatePct: 100,
        textReadableRatePct: 100,
        imageQualityAcceptableRatePct: 100,
        recentIssueSummaries: [],
      };
    }

    const promptMatch = this.submissions.filter((s) => s.matchesPrompt).length;
    const objectsCorrect = this.submissions.filter((s) => s.objectsAreCorrect).length;
    const posCorrect = this.submissions.filter((s) => s.positioningIsCorrect).length;
    const refAcceptable = this.submissions.filter((s) => s.referenceSimilarityAcceptable).length;
    const textReadable = this.submissions.filter((s) => s.textIsReadable).length;
    const qualityAcceptable = this.submissions.filter((s) => s.imageQualityAcceptable).length;

    const issues = this.submissions
      .filter((s) => s.specificIssueDetails && s.specificIssueDetails.trim().length > 0)
      .map((s) => s.specificIssueDetails!)
      .slice(-5);

    return {
      totalFeedbackCount: total,
      promptMatchRatePct: Math.round((promptMatch / total) * 1000) / 10,
      objectsCorrectRatePct: Math.round((objectsCorrect / total) * 1000) / 10,
      positioningCorrectRatePct: Math.round((posCorrect / total) * 1000) / 10,
      referenceAcceptableRatePct: Math.round((refAcceptable / total) * 1000) / 10,
      textReadableRatePct: Math.round((textReadable / total) * 1000) / 10,
      imageQualityAcceptableRatePct: Math.round((qualityAcceptable / total) * 1000) / 10,
      recentIssueSummaries: issues,
    };
  }
}

