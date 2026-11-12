/**
 * TATTVA AI - Central Monitoring Event Hub & Dispatcher (Phase Q)
 * Provides asynchronous, non-blocking telemetry ingestion with strict error isolation.
 * Guarantees that monitoring service degradation or logging crashes NEVER block
 * or interrupt live user image generation.
 */

import { ImageProviderId } from "../types";
import { AccuracyScorecard } from "../accuracy/types";
import { providerMonitor } from "./provider-monitor";
import { accuracyMonitor } from "./accuracy-monitor";
import { failureMonitor } from "./failure-monitor";
import { performanceMonitor } from "./performance-monitor";
import { costMonitor } from "./cost-monitor";
import { alertManager } from "./alert-manager";
import { GenerationFailureCategory } from "./types";

export interface GenerationTelemetryEvent {
  prompt: string;
  provider: ImageProviderId;
  modelId: string;
  success: boolean;
  generationLatencyMs: number;
  evaluationLatencyMs?: number;
  correctionLatencyMs?: number;
  totalDurationMs: number;
  scorecard?: AccuracyScorecard;
  isVerified?: boolean;
  category?: string;
  error?: {
    type?: "auth" | "timeout" | "rate_limit" | "network" | "quota" | "internal";
    message: string;
    failureCategory?: GenerationFailureCategory;
  };
  costs?: {
    generationCostUsd?: number;
    evaluationCostUsd?: number;
    correctionCostUsd?: number;
    isActualBilling?: boolean;
  };
}

class MonitoringHub {
  private static instance: MonitoringHub;

  private constructor() {}

  public static getInstance(): MonitoringHub {
    if (!MonitoringHub.instance) {
      MonitoringHub.instance = new MonitoringHub();
    }
    return MonitoringHub.instance;
  }

  /**
   * Ingests a generation event asynchronously with strict error isolation.
   * If any monitoring component fails, the error is safely caught and logged,
   * completely preserving the user's generation pipeline.
   */
  public ingestEventAsync(event: GenerationTelemetryEvent): void {
    // Process on next tick to decouple from user response path
    setImmediate(() => {
      try {
        this.processEvent(event);
      } catch (err) {
        console.warn("[MonitoringHub] Isolated telemetry processing warning (user path unaffected):", err);
      }
    });
  }

  /**
   * Synchronous ingestion for testing and deterministic audit verification.
   */
  public ingestEvent(event: GenerationTelemetryEvent): void {
    try {
      this.processEvent(event);
    } catch (err) {
      console.warn("[MonitoringHub] Non-critical monitoring ingestion error:", err);
    }
  }

  private processEvent(event: GenerationTelemetryEvent): void {
    // 1. Record Provider Health
    providerMonitor.recordRequest({
      providerId: event.provider,
      success: event.success,
      latencyMs: event.generationLatencyMs,
      errorType: event.error?.type,
      errorMessage: event.error?.message,
    });

    // 2. Record Performance Latencies
    performanceMonitor.recordExecution({
      generationMs: event.generationLatencyMs,
      evaluationMs: event.evaluationLatencyMs,
      correctionMs: event.correctionLatencyMs,
      totalMs: event.totalDurationMs,
      success: event.success,
    });

    // 3. Record Accuracy if evaluated
    if (event.scorecard) {
      accuracyMonitor.recordEvaluation({
        modelId: event.modelId,
        provider: event.provider,
        category: event.category,
        scorecard: event.scorecard,
        isVerified: event.isVerified ?? true,
      });
    } else if (event.isVerified === false) {
      accuracyMonitor.recordEvaluation({
        modelId: event.modelId,
        provider: event.provider,
        category: event.category,
        isVerified: false,
      });
    }

    // 4. Record Cost if specified
    if (event.costs) {
      costMonitor.recordCost({
        provider: event.provider,
        modelId: event.modelId,
        generationCostUsd: event.costs.generationCostUsd || 0,
        evaluationCostUsd: event.costs.evaluationCostUsd,
        correctionCostUsd: event.costs.correctionCostUsd,
        isActualBilling: event.costs.isActualBilling,
        success: event.success,
      });
    }

    // 5. Record Failure if unsuccessful
    if (!event.success && event.error) {
      const category: GenerationFailureCategory =
        event.error.failureCategory ||
        (event.error.type === "auth"
          ? "provider_failure"
          : event.error.type === "timeout"
          ? "provider_failure"
          : "provider_failure");

      failureMonitor.recordFailure({
        prompt: event.prompt,
        modelId: event.modelId,
        provider: event.provider,
        category,
        description: event.error.message,
      });

      // Trigger Alert if critical failure
      if (event.error.type === "auth") {
        alertManager.triggerAlert({
          type: "provider_outage",
          severity: "critical",
          title: `Authentication Failure on ${event.provider}`,
          message: `Authentication failed for provider '${event.provider}': ${event.error.message}`,
          sourceProvider: event.provider,
          sourceModel: event.modelId,
        });
      } else if (event.error.type === "quota") {
        alertManager.triggerAlert({
          type: "quota_exhaustion",
          severity: "critical",
          title: `Quota Exhausted on ${event.provider}`,
          message: `API Quota limit reached on provider '${event.provider}'. Provider set to cooldown.`,
          sourceProvider: event.provider,
          sourceModel: event.modelId,
        });
      }
    }
  }
}

export const monitoringHub = MonitoringHub.getInstance();

