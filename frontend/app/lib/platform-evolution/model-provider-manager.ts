/**
 * TATTVA AI - Model & Provider Manager with Canary Testing Isolation
 * Monitors real-time model availability, costs per 1M tokens, latency,
 * and rate limits. Safely evaluates candidate models in isolated canaries
 * before promoting to live production routing.
 */

import { ProviderModelMetadata, CanaryTestResult } from "./types";
import { aiQualityEvaluator } from "./ai-quality-evaluator";

export class ModelProviderManager {
  private static instance: ModelProviderManager;

  private registeredModels: Map<string, ProviderModelMetadata> = new Map();
  private canaryTestHistory: CanaryTestResult[] = [];

  private constructor() {
    this.seedDefaultProviders();
  }

  public static getInstance(): ModelProviderManager {
    if (!ModelProviderManager.instance) {
      ModelProviderManager.instance = new ModelProviderManager();
    }
    return ModelProviderManager.instance;
  }

  private seedDefaultProviders(): void {
    const defaultModels: ProviderModelMetadata[] = [
      {
        id: "gemini-2.5-flash",
        provider: "google-gemini",
        displayName: "Gemini 2.5 Flash (Production Standard)",
        tier: "fast",
        contextWindowTokens: 1048576, // 1M
        costPer1MTokensInUsd: 0.075,
        costPer1MTokensOutUsd: 0.3,
        isAvailable: true,
        consecutiveFailures: 0,
        averageLatencyMs: 380,
        errorRatePercent: 0.12,
        circuitState: "CLOSED",
      },
      {
        id: "gemini-2.5-pro",
        provider: "google-gemini",
        displayName: "Gemini 2.5 Pro (Deep Reasoning & Architect)",
        tier: "flagship",
        contextWindowTokens: 2097152, // 2M
        costPer1MTokensInUsd: 1.25,
        costPer1MTokensOutUsd: 5.0,
        isAvailable: true,
        consecutiveFailures: 0,
        averageLatencyMs: 950,
        errorRatePercent: 0.24,
        circuitState: "CLOSED",
      },
      {
        id: "claude-3-7-sonnet",
        provider: "anthropic",
        displayName: "Claude 3.7 Sonnet (Hybrid Fallback)",
        tier: "flagship",
        contextWindowTokens: 200000,
        costPer1MTokensInUsd: 3.0,
        costPer1MTokensOutUsd: 15.0,
        isAvailable: true,
        consecutiveFailures: 0,
        averageLatencyMs: 1100,
        errorRatePercent: 0.35,
        circuitState: "CLOSED",
      },
      {
        id: "tattva-local-engine",
        provider: "local-engine",
        displayName: "TATTVA Offline Engine (Air-Gapped / Fallback)",
        tier: "local",
        contextWindowTokens: 32768,
        costPer1MTokensInUsd: 0.0,
        costPer1MTokensOutUsd: 0.0,
        isAvailable: true,
        consecutiveFailures: 0,
        averageLatencyMs: 250,
        errorRatePercent: 0.05,
        circuitState: "CLOSED",
      },
    ];

    for (const m of defaultModels) {
      this.registeredModels.set(m.id, m);
    }
  }

  public getRegisteredModels(): ProviderModelMetadata[] {
    return Array.from(this.registeredModels.values());
  }

  public getModel(id: string): ProviderModelMetadata | undefined {
    return this.registeredModels.get(id);
  }

  /**
   * Run an isolated canary test on a candidate model before promotion
   */
  public runCanaryTest(candidateModel: ProviderModelMetadata, baselineModelId = "gemini-2.5-flash"): CanaryTestResult {
    const baseline = this.registeredModels.get(baselineModelId) || Array.from(this.registeredModels.values())[0];

    // Evaluate candidate on permanent benchmark suite
    const evalResult = aiQualityEvaluator.evaluateResponses(candidateModel.id);

    // Compute deltas
    const accuracyDelta = Number((evalResult.overallScorePercent - 92.0).toFixed(1));
    const latencyDelta = Number((((candidateModel.averageLatencyMs - baseline.averageLatencyMs) / baseline.averageLatencyMs) * 100).toFixed(1));
    const costDelta = Number((((candidateModel.costPer1MTokensInUsd - baseline.costPer1MTokensInUsd) / baseline.costPer1MTokensInUsd) * 100).toFixed(1));

    let recommendation: CanaryTestResult["recommendation"] = "further_testing_needed";
    let rationale = "";

    if (evalResult.overallScorePercent >= 90.0 && candidateModel.errorRatePercent < 1.0) {
      if (candidateModel.averageLatencyMs <= baseline.averageLatencyMs * 1.25) {
        recommendation = "promote_to_production";
        rationale = `Candidate passed benchmark validation gate with ${evalResult.overallScorePercent}% score and competitive latency (${candidateModel.averageLatencyMs}ms).`;
      } else {
        recommendation = "further_testing_needed";
        rationale = `Quality benchmark passed, but latency delta (${latencyDelta}%) exceeds strict production SLA.`;
      }
    } else {
      recommendation = "reject";
      rationale = `Candidate failed benchmark gate or has high error rate (${candidateModel.errorRatePercent}%).`;
    }

    const canaryResult: CanaryTestResult = {
      candidateModelId: candidateModel.id,
      testSuiteRunId: evalResult.id,
      baselineModelId,
      accuracyDeltaPercent: accuracyDelta,
      latencyDeltaPercent: latencyDelta,
      costDeltaPercent: costDelta,
      recommendation,
      detailedRationale: rationale,
      testedAt: new Date().toISOString(),
    };

    this.canaryTestHistory.unshift(canaryResult);
    if (this.canaryTestHistory.length > 50) this.canaryTestHistory.length = 50;

    // Register or update in model registry
    this.registeredModels.set(candidateModel.id, candidateModel);

    return canaryResult;
  }

  public getCanaryHistory(): CanaryTestResult[] {
    return [...this.canaryTestHistory];
  }
}

export const modelProviderManager = ModelProviderManager.getInstance();
