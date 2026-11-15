/**
 * TATTVA AI - AI Quality Monitoring Engine
 * Evaluates real-time operational quality against documented empirical baselines
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { AIQualityMetricSnapshot } from "./types";

export class QualityMonitor {
  private static instance: QualityMonitor;
  private snapshots: AIQualityMetricSnapshot[] = [];

  // Documented empirical Phase 14 baseline standards
  private readonly BASELINE_QUALITY_SCORE = 0.812; // 81.2% benchmark accuracy
  private readonly BASELINE_RESPONSE_TIME_MS = 1450; // 1450ms average latency

  public static getInstance(): QualityMonitor {
    if (!QualityMonitor.instance) {
      QualityMonitor.instance = new QualityMonitor();
    }
    return QualityMonitor.instance;
  }

  /**
   * Captures an operational quality metric snapshot
   */
  public recordSnapshot(metrics: {
    answerQualityScore: number;
    avgResponseTimeMs: number;
    providerFailureRate: number;
    ragRetrievalPrecision: number;
    agentSuccessRate: number;
    multilingualIndicAccuracy: number;
    hallucinationRate: number;
    userSatisfactionRate: number;
  }): AIQualityMetricSnapshot {
    const snapshot: AIQualityMetricSnapshot = {
      timestamp: new Date().toISOString(),
      answerQualityScore: metrics.answerQualityScore,
      baselineQualityScore: this.BASELINE_QUALITY_SCORE,
      avgResponseTimeMs: metrics.avgResponseTimeMs,
      baselineResponseTimeMs: this.BASELINE_RESPONSE_TIME_MS,
      providerFailureRate: metrics.providerFailureRate,
      ragRetrievalPrecision: metrics.ragRetrievalPrecision,
      agentSuccessRate: metrics.agentSuccessRate,
      multilingualIndicAccuracy: metrics.multilingualIndicAccuracy,
      hallucinationRate: metrics.hallucinationRate,
      userSatisfactionRate: metrics.userSatisfactionRate,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Evaluates if any metric is currently degraded beyond documented acceptable thresholds
   */
  public evaluateHealth(snapshot: AIQualityMetricSnapshot): {
    healthy: boolean;
    anomalies: string[];
    degradationPercent: number;
  } {
    const anomalies: string[] = [];

    // Quality degradation check (> 3% drop relative to baseline)
    const qualityDelta = snapshot.answerQualityScore - snapshot.baselineQualityScore;
    const degradationPercent = Number(((qualityDelta / snapshot.baselineQualityScore) * 100).toFixed(2));

    if (degradationPercent < -3.0) {
      anomalies.push(`Answer quality degraded by ${Math.abs(degradationPercent)}% relative to Phase 14 baseline`);
    }

    if (snapshot.providerFailureRate > 0.05) {
      anomalies.push(`Provider failure rate ${(snapshot.providerFailureRate * 100).toFixed(1)}% exceeds 5.0% ceiling`);
    }

    if (snapshot.ragRetrievalPrecision < 0.75) {
      anomalies.push(`RAG retrieval precision ${(snapshot.ragRetrievalPrecision * 100).toFixed(1)}% dropped below 75% target`);
    }

    if (snapshot.agentSuccessRate < 0.85) {
      anomalies.push(`Agent tool execution success ${(snapshot.agentSuccessRate * 100).toFixed(1)}% dropped below 85% SLA`);
    }

    if (snapshot.hallucinationRate > 0.05) {
      anomalies.push(`Hallucination rate ${(snapshot.hallucinationRate * 100).toFixed(1)}% exceeds 5.0% threshold`);
    }

    return {
      healthy: anomalies.length === 0,
      anomalies,
      degradationPercent,
    };
  }

  public getLatestSnapshot(): AIQualityMetricSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  public clear(): void {
    this.snapshots = [];
  }
}

export const qualityMonitor = QualityMonitor.getInstance();
