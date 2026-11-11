/**
 * TATTVA AI - Continuous Benchmarking & Regression Monitoring Service (Phase N)
 * Periodically monitors generation adherence across all categories, detects performance regressions,
 * triggers administrative alerts, and protects production configurations from degradation.
 */

import {
  ContinuousBenchmarkAlert,
} from "./types";

export class ContinuousBenchmarkingService {
  private alerts: ContinuousBenchmarkAlert[] = [];
  private baselineCategoryScores: Record<string, number> = {
    simple_generation: 85.0,
    complex_generation: 82.0,
    object_count: 84.5,
    attribute_accuracy: 87.6,
    spatial_accuracy: 82.5,
    reference_fidelity: 83.4,
    text_accuracy: 81.0,
    artistic_generation: 88.0,
  };

  constructor() {
    this.seedAlerts();
  }

  /**
   * Evaluates current candidate scores against baselines and records any regressions.
   */
  public evaluateAccuracyRegression(
    currentScores: Record<string, number>
  ): { hasRegressions: boolean; newAlerts: ContinuousBenchmarkAlert[] } {
    const newAlerts: ContinuousBenchmarkAlert[] = [];

    for (const [category, baselineScore] of Object.entries(this.baselineCategoryScores)) {
      const currentScore = currentScores[category];
      if (currentScore === undefined) continue;

      const delta = currentScore - baselineScore; // Negative delta indicates degradation

      if (delta < -2.0) {
        const severity = delta < -5.0 ? "critical" : "warning";
        const alert: ContinuousBenchmarkAlert = {
          id: `alert-${Date.now()}-${category}`,
          timestamp: new Date().toISOString(),
          severity,
          category,
          metricName: "Prompt Adherence %",
          priorScore: baselineScore,
          currentScore,
          regressionDelta: Number(delta.toFixed(1)),
          message: `Accuracy regression detected in '${category}': dropped from ${baselineScore}% to ${currentScore}% (${delta.toFixed(1)}%). Immediate review required.`,
          resolved: false,
        };

        this.alerts.unshift(alert);
        newAlerts.push(alert);
      }
    }

    return {
      hasRegressions: newAlerts.length > 0,
      newAlerts,
    };
  }

  /**
   * Resolves an alert.
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;
    alert.resolved = true;
    return true;
  }

  /**
   * Returns active, unresolved alerts.
   */
  public getActiveAlerts(): ContinuousBenchmarkAlert[] {
    return this.alerts.filter((a) => !a.resolved);
  }

  /**
   * Returns all alerts (resolved and active).
   */
  public getAllAlerts(): ContinuousBenchmarkAlert[] {
    return [...this.alerts];
  }

  private seedAlerts(): void {
    const seed: ContinuousBenchmarkAlert = {
      id: "alert-seed-sd15-text",
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
      severity: "warning",
      category: "text_accuracy",
      metricName: "Prompt Adherence %",
      priorScore: 48.0,
      currentScore: 42.1,
      regressionDelta: -5.9,
      message: "Accuracy regression detected in 'text_accuracy' on local SD 1.5 pipeline. Recommend routing typography prompts exclusively to FLUX.",
      resolved: true,
    };
    this.alerts.push(seed);
  }
}

export const continuousBenchmarkingService = new ContinuousBenchmarkingService();

