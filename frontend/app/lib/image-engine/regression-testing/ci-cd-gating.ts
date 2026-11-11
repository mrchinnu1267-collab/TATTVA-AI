/**
 * TATTVA AI - CI/CD Pre-Deployment Gating & Cost Protection Service (Phase O)
 * Evaluates whether pull requests or pre-release candidate builds pass quality baselines
 * before production deployment, enforcing hard spending limits and zero-secret logging.
 */

import {
  RegressionDetectionReport,
} from "./types";

export interface CICDDeploymentGateResult {
  gatePassed: boolean;
  verdict: "passed" | "blocked";
  deploymentBlockers: string[];
  costAudit: {
    totalSpendUSD: number;
    configuredSpendingCapUSD: number;
    isUnderBudget: boolean;
  };
  sanitizedSummaryText: string;
}

export class CICDGatingService {
  private readonly DEFAULT_CI_SPENDING_CAP_USD = 0.05; // Maximum $0.05 per CI test run

  /**
   * Evaluates the deployment gate for CI/CD runners (GitHub Actions / Vercel pre-deploy hooks).
   */
  public evaluateDeploymentGate(params: {
    report: RegressionDetectionReport;
    totalSpendUSD?: number;
    customSpendingCapUSD?: number;
  }): CICDDeploymentGateResult {
    const { report, totalSpendUSD = 0.0025, customSpendingCapUSD } = params;
    const spendingCap = customSpendingCapUSD ?? this.DEFAULT_CI_SPENDING_CAP_USD;

    const deploymentBlockers: string[] = [];

    // 1. Check Regression Report Verdict
    if (report.deploymentGateVerdict === "blocked" || report.hasCriticalRegression) {
      deploymentBlockers.push(...report.deploymentBlockReasons);
    }

    // 2. Check Cost Ceiling
    const isUnderBudget = totalSpendUSD <= spendingCap;
    if (!isUnderBudget) {
      deploymentBlockers.push(
        `CI execution cost ($${totalSpendUSD.toFixed(4)}) exceeded allowable spending cap ($${spendingCap.toFixed(4)}).`
      );
    }

    const gatePassed = deploymentBlockers.length === 0;
    const verdict = gatePassed ? "passed" : "blocked";

    // 3. Construct Sanitized Log Summary (Strict Secret Masking)
    const sanitizedSummaryText = this.sanitizeCILogText(`
======================================================
TATTVA AI PRE-DEPLOYMENT ACCURACY REGRESSION GATE
======================================================
Timestamp:      ${report.timestamp}
Report ID:      ${report.reportId}
Model Tested:   ${report.modelIdentifier} on ${report.provider}
Benchmark Tier: ${report.tier} (${report.sampleCount} test cases)
Test Mode:      ${report.testMode}

BASELINE COMPARISON:
- Baseline Adherence:  ${report.overallBaselineAdherence}%
- Candidate Adherence: ${report.overallCandidateAdherence}%
- Net Delta:           ${report.overallDeltaPercent >= 0 ? "+" : ""}${report.overallDeltaPercent}%
- Severity:            ${report.overallSeverity.toUpperCase()}

COST AUDIT:
- Incurred Spend:      $${totalSpendUSD.toFixed(4)}
- Configured Cap:      $${spendingCap.toFixed(4)}
- Budget Compliance:   ${isUnderBudget ? "PASS" : "EXCEEDED"}

GATE VERDICT:          ${verdict.toUpperCase()}
${deploymentBlockers.length > 0 ? "BLOCKERS:\n- " + deploymentBlockers.join("\n- ") : "All accuracy and cost regression checks satisfied."}
======================================================
    `.trim());

    return {
      gatePassed,
      verdict,
      deploymentBlockers,
      costAudit: {
        totalSpendUSD,
        configuredSpendingCapUSD: spendingCap,
        isUnderBudget,
      },
      sanitizedSummaryText,
    };
  }

  /**
   * Sanitizes all sensitive API keys, auth headers, and secrets from CI log outputs.
   */
  public sanitizeCILogText(text: string): string {
    return text
      .replace(/\b(?:sk-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z-_]{35})\b/g, "[REDACTED_API_KEY]")
      .replace(/\bBearer\s+[a-zA-Z0-9._-]+\b/gi, "Bearer [REDACTED_TOKEN]")
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, "[REDACTED_EMAIL]");
  }
}

export const cicdGatingService = new CICDGatingService();

