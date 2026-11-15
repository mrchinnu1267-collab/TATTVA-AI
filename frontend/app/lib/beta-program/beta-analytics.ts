/**
 * TATTVA AI - Beta Analytics & Usage Telemetry Engine (Phase 29)
 * Privacy-preserving, aggregate metric tracking without PII collection
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { BetaAnalyticsReport, BetaFeatureUsage } from "./types";
import { betaTesterManager } from "./tester-manager";
import { betaFeedbackAndBugManager } from "./feedback-and-bugs";

export class BetaAnalyticsEngine {
  private static instance: BetaAnalyticsEngine;

  private featureUsage: BetaFeatureUsage = {
    chatConversations: 0,
    documentAnalysis: 0,
    ragRetrievals: 0,
    imageGenerations: 0,
    audioVideoOperations: 0,
    agentToolExecutions: 0,
    evaluationLabRuns: 0,
  };

  private applicationErrors = 0;
  private failedApiRequests = 0;
  private latencySamples: number[] = [];
  private fileProcessingFailures = 0;
  private aiToolFailures = 0;

  public static getInstance(): BetaAnalyticsEngine {
    if (!BetaAnalyticsEngine.instance) {
      BetaAnalyticsEngine.instance = new BetaAnalyticsEngine();
    }
    return BetaAnalyticsEngine.instance;
  }

  public trackFeatureUsage(feature: keyof BetaFeatureUsage): void {
    if (this.featureUsage[feature] !== undefined) {
      this.featureUsage[feature]++;
    }
  }

  public recordApiRequest(latencyMs: number, success: boolean): void {
    this.latencySamples.push(latencyMs);
    if (!success) {
      this.failedApiRequests++;
    }
    // Keep last 1000 latency samples to preserve memory
    if (this.latencySamples.length > 1000) {
      this.latencySamples.shift();
    }
  }

  public recordApplicationError(): void {
    this.applicationErrors++;
  }

  public recordFileFailure(): void {
    this.fileProcessingFailures++;
  }

  public recordToolFailure(): void {
    this.aiToolFailures++;
  }

  public generateReport(): BetaAnalyticsReport {
    const allTesters = betaTesterManager.listTesters();
    const activeTesters = allTesters.filter((t) => t.status === "active").length;
    const revokedTesters = allTesters.filter((t) => t.status === "revoked").length;

    const bugSummary = betaFeedbackAndBugManager.getSummaryCounts();

    const avgLatency =
      this.latencySamples.length > 0
        ? Math.round(this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length)
        : 0;

    return {
      timestamp: new Date().toISOString(),
      totalRegisteredTesters: allTesters.length,
      activeTesters,
      revokedTesters,
      featureUsage: { ...this.featureUsage },
      applicationErrors: this.applicationErrors,
      failedApiRequests: this.failedApiRequests,
      avgResponseLatencyMs: avgLatency,
      fileProcessingFailures: this.fileProcessingFailures,
      aiToolFailures: this.aiToolFailures,
      feedbackSubmissions: bugSummary.total,
      bugsByStatus: bugSummary.byStatus,
      bugsBySeverity: bugSummary.bySeverity,
    };
  }

  public reset(): void {
    this.featureUsage = {
      chatConversations: 0,
      documentAnalysis: 0,
      ragRetrievals: 0,
      imageGenerations: 0,
      audioVideoOperations: 0,
      agentToolExecutions: 0,
      evaluationLabRuns: 0,
    };
    this.applicationErrors = 0;
    this.failedApiRequests = 0;
    this.latencySamples = [];
    this.fileProcessingFailures = 0;
    this.aiToolFailures = 0;
  }
}

export const betaAnalyticsEngine = BetaAnalyticsEngine.getInstance();
