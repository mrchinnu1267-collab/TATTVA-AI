/**
 * TATTVA AI - Accuracy Regression Detection Engine (Phase O)
 * Performs statistical hypothesis testing (two-proportion z-test) to differentiate
 * genuine systemic accuracy degradation from stochastic diffusion sampling variance.
 */

import {
  ApprovedAccuracyBaseline,
  RegressionEvaluationDimension,
  RegressionBenchmarkCategory,
  DimensionRegressionDelta,
  CategoryRegressionDelta,
  RegressionSeverity,
} from "./types";

export class RegressionDetector {
  /**
   * Evaluates candidate evaluation scores against the approved baseline.
   */
  public evaluateRegressions(params: {
    baseline: ApprovedAccuracyBaseline;
    candidateDimensions: Record<RegressionEvaluationDimension, number>;
    candidateCategories: Record<RegressionBenchmarkCategory, number>;
    candidateOverallAdherence: number;
    sampleSize: number;
  }): {
    overallDeltaPercent: number;
    overallSeverity: RegressionSeverity;
    hasCriticalRegression: boolean;
    dimensionDeltas: DimensionRegressionDelta[];
    categoryDeltas: CategoryRegressionDelta[];
    deploymentGateVerdict: "passed" | "blocked";
    deploymentBlockReasons: string[];
  } {
    const { baseline, candidateDimensions, candidateCategories, candidateOverallAdherence, sampleSize } = params;

    const overallDeltaPercent = Number((candidateOverallAdherence - baseline.overallPromptAdherence).toFixed(1));
    const dimensionDeltas: DimensionRegressionDelta[] = [];
    const categoryDeltas: CategoryRegressionDelta[] = [];
    const deploymentBlockReasons: string[] = [];
    let hasCriticalRegression = false;

    // 1. Evaluate 9 Dimensions
    for (const [dimKey, baseScore] of Object.entries(baseline.dimensionBaselines)) {
      const dim = dimKey as RegressionEvaluationDimension;
      const candScore = candidateDimensions[dim] ?? baseScore;
      const delta = Number((candScore - baseScore).toFixed(1));

      const { zScore, isSignificant } = this.calculateZScore(
        candScore,
        baseScore,
        sampleSize,
        baseline.sampleCount
      );

      let severity: RegressionSeverity = "none";
      let isRegression = false;

      if (delta < 0) {
        if (delta <= -4.0 && (isSignificant || sampleSize <= 50)) {
          severity = "critical_regression";
          isRegression = true;
          hasCriticalRegression = true;
          deploymentBlockReasons.push(`Critical regression in dimension '${dim}': dropped ${Math.abs(delta)}% (z=${zScore.toFixed(2)}).`);
        } else if (delta <= -2.0 || isSignificant) {
          severity = "warning";
          isRegression = true;
        } else {
          severity = "minor_variance"; // Random diffusion noise
        }
      }

      dimensionDeltas.push({
        dimension: dim,
        baselineScore: baseScore,
        candidateScore: candScore,
        deltaPercent: delta,
        isRegression,
        severity,
        statisticalZScore: zScore,
        isStatisticallySignificant: isSignificant,
      });
    }

    // 2. Evaluate 13 Categories
    for (const [catKey, baseScore] of Object.entries(baseline.categoryBaselines)) {
      const cat = catKey as RegressionBenchmarkCategory;
      const candScore = candidateCategories[cat] ?? baseScore;
      const delta = Number((candScore - baseScore).toFixed(1));

      let severity: RegressionSeverity = "none";
      let isRegression = false;

      if (delta < 0) {
        if (delta <= -4.5) {
          severity = "critical_regression";
          isRegression = true;
          hasCriticalRegression = true;
          deploymentBlockReasons.push(`Critical regression in category '${cat}': dropped ${Math.abs(delta)}%.`);
        } else if (delta <= -2.5) {
          severity = "warning";
          isRegression = true;
        } else {
          severity = "minor_variance";
        }
      }

      categoryDeltas.push({
        category: cat,
        baselineScore: baseScore,
        candidateScore: candScore,
        deltaPercent: delta,
        isRegression,
        severity,
      });
    }

    // Overall severity evaluation
    let overallSeverity: RegressionSeverity = "none";
    if (overallDeltaPercent < 0) {
      if (overallDeltaPercent <= -baseline.maxAllowedRegressionDeltaPercent || hasCriticalRegression) {
        overallSeverity = "critical_regression";
        if (!deploymentBlockReasons.some((r) => r.includes("Overall adherence"))) {
          deploymentBlockReasons.push(
            `Overall prompt adherence dropped ${Math.abs(overallDeltaPercent)}% (allowed threshold: -${baseline.maxAllowedRegressionDeltaPercent}%).`
          );
        }
      } else if (overallDeltaPercent <= -1.5) {
        overallSeverity = "warning";
      } else {
        overallSeverity = "minor_variance";
      }
    }

    const deploymentGateVerdict = (hasCriticalRegression || overallSeverity === "critical_regression")
      ? "blocked"
      : "passed";

    return {
      overallDeltaPercent,
      overallSeverity,
      hasCriticalRegression,
      dimensionDeltas,
      categoryDeltas,
      deploymentGateVerdict,
      deploymentBlockReasons,
    };
  }

  /**
   * Computes two-proportion pooled z-test to assess statistical significance.
   */
  public calculateZScore(
    candPercent: number,
    basePercent: number,
    nCand: number,
    nBase: number
  ): { zScore: number; isSignificant: boolean } {
    const p1 = candPercent / 100;
    const p2 = basePercent / 100;

    const pooledP = (p1 * nCand + p2 * nBase) / (nCand + nBase);
    const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1 / nCand + 1 / nBase));

    if (standardError === 0) {
      return { zScore: 0, isSignificant: false };
    }

    const z = (p1 - p2) / standardError;
    // z < -1.96 corresponds to p < 0.05 (two-tailed 95% confidence)
    const isSignificant = z <= -1.96;

    return {
      zScore: Number(z.toFixed(2)),
      isSignificant,
    };
  }
}

export const regressionDetector = new RegressionDetector();

