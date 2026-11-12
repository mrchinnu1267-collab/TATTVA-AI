/**
 * TATTVA AI - Phase W: Maintenance Hub
 * Central Orchestrator for Engine Maintenance, Quality Monitoring & Production Health
 */

import {
  ProductionTelemetryFilter,
  ProductionEventRecord,
  ModelHealthWatchRecord,
  UserQualityFeedbackSubmission,
  RegressionCheckResult,
  SafeImprovementProposal,
  ReliabilityStatusSummary,
  MonthlyQualityReport,
  MaintenanceErrorCategory,
  FeatureType,
} from "./types";
import { ModelHealthWatcher } from "./model-health-watcher";
import { UserFeedbackCollector } from "./user-feedback-collector";
import { RegressionGatekeeper } from "./regression-gatekeeper";
import { SafeImprovementEngine } from "./safe-improvement-engine";
import { ReliabilityRecoveryManager } from "./reliability-recovery-manager";
import { MonthlyReportGenerator } from "./monthly-report-generator";
import { ImageProviderId } from "../types";

export class MaintenanceHub {
  private static instance: MaintenanceHub;
  private healthWatcher: ModelHealthWatcher;
  private feedbackCollector: UserFeedbackCollector;
  private regressionGatekeeper: RegressionGatekeeper;
  private improvementEngine: SafeImprovementEngine;
  private reliabilityManager: ReliabilityRecoveryManager;
  private monthlyReportGenerator: MonthlyReportGenerator;
  private eventHistory: ProductionEventRecord[] = [];

  private constructor() {
    this.healthWatcher = ModelHealthWatcher.getInstance();
    this.feedbackCollector = UserFeedbackCollector.getInstance();
    this.regressionGatekeeper = RegressionGatekeeper.getInstance();
    this.improvementEngine = SafeImprovementEngine.getInstance();
    this.reliabilityManager = ReliabilityRecoveryManager.getInstance();
    this.monthlyReportGenerator = MonthlyReportGenerator.getInstance();
    this.seedProductionTelemetry();
  }

  public static getInstance(): MaintenanceHub {
    if (!MaintenanceHub.instance) {
      MaintenanceHub.instance = new MaintenanceHub();
    }
    return MaintenanceHub.instance;
  }

  private seedProductionTelemetry(): void {
    const providers: ImageProviderId[] = ["gemini", "huggingface", "pollinations", "local"];
    const models: Record<ImageProviderId, string> = {
      gemini: "gemini-2.5-flash-image",
      huggingface: "black-forest-labs/FLUX.1-dev",
      pollinations: "flux",
      local: "sdxl-controlnet-fp8",
      openai: "dall-e-3",
    };
    const features: FeatureType[] = [
      "text_to_image",
      "reference_conditioning",
      "image_to_image",
      "surgical_inpainting",
      "spatial_control",
      "super_resolution",
    ];

    // Seed 40 representative production events
    for (let i = 1; i <= 40; i++) {
      const p = providers[i % providers.length];
      const feat = features[i % features.length];
      const isFailed = i === 12 || i === 27; // 2 failures out of 40 = 95% success rate

      this.eventHistory.push({
        id: `ev-${String(i).padStart(3, "0")}`,
        timestamp: new Date(Date.now() - (40 - i) * 15 * 60 * 1000).toISOString(),
        provider: p,
        model: models[p],
        feature: feat,
        latencyMs: 1800 + (i % 7) * 200,
        success: !isFailed,
        errorCategory: isFailed ? (i === 12 ? "incorrect_quantities" : "provider_timeout") : undefined,
        errorMessage: isFailed ? (i === 12 ? "Instance count mismatch" : "Gateway timeout after 30s") : undefined,
        costUsd: p === "pollinations" ? 0 : 0.015,
        storageSuccess: true,
        referenceImageProcessed: feat === "reference_conditioning",
      });
    }
  }

  /**
   * Queries production telemetry events using dynamic filters
   */
  public queryTelemetry(filter: ProductionTelemetryFilter): {
    totalEvents: number;
    filteredEvents: ProductionEventRecord[];
    successRatePct: number;
    averageLatencyMs: number;
  } {
    let filtered = [...this.eventHistory];

    if (filter.provider && filter.provider !== "all") {
      filtered = filtered.filter((e) => e.provider === filter.provider);
    }
    if (filter.model && filter.model !== "all") {
      filtered = filtered.filter((e) => e.model === filter.model);
    }
    if (filter.feature && filter.feature !== "all") {
      filtered = filtered.filter((e) => e.feature === filter.feature);
    }
    if (filter.errorCategory && filter.errorCategory !== "all") {
      filtered = filtered.filter((e) => e.errorCategory === filter.errorCategory);
    }

    const total = filtered.length;
    const successes = filtered.filter((e) => e.success).length;
    const avgLatency = total > 0 ? filtered.reduce((sum, e) => sum + e.latencyMs, 0) / total : 0;

    return {
      totalEvents: total,
      filteredEvents: filtered,
      successRatePct: total > 0 ? Math.round((successes / total) * 1000) / 10 : 100,
      averageLatencyMs: Math.round(avgLatency),
    };
  }

  // Model Health
  public getModelHealth(): ModelHealthWatchRecord[] {
    return this.healthWatcher.getAllHealthRecords();
  }

  // User Feedback
  public submitUserFeedback(feedback: Omit<UserQualityFeedbackSubmission, "id" | "timestamp" | "isSubjective">) {
    return this.feedbackCollector.submitFeedback(feedback);
  }

  public getUserFeedbackAggregates() {
    return this.feedbackCollector.getAggregates();
  }

  // Regression
  public runRegressionCheck(triggeredBy?: RegressionCheckResult["triggeredBy"]) {
    return this.regressionGatekeeper.runRegressionCheck(triggeredBy);
  }

  // Safe Improvement
  public submitImprovementProposal(
    category: MaintenanceErrorCategory,
    component: string,
    evidence: string,
    reproduction: string[],
    fixDescription: string
  ) {
    return this.improvementEngine.submitProposal(category, component, evidence, reproduction, fixDescription);
  }

  public approveImprovementProposal(proposalId: string, approverName: string) {
    return this.improvementEngine.approveProposal(proposalId, approverName);
  }

  public getAllProposals(): SafeImprovementProposal[] {
    return this.improvementEngine.getAllProposals();
  }

  // Reliability
  public getReliabilityStatus(): ReliabilityStatusSummary {
    return this.reliabilityManager.getReliabilityStatus();
  }

  // Monthly Report
  public getMonthlyQualityReport(): MonthlyQualityReport {
    return this.monthlyReportGenerator.generateMonthlyReport();
  }
}

