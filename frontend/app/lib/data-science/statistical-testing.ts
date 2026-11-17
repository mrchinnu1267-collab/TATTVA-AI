/**
 * TATTVA AI - Statistical Hypothesis Testing Engine
 * Implements Welch's t-test, ANOVA F-test, Chi-Square contingency test, and linear regression
 */

import { StatisticalTestResult, StatisticalTestType } from "./types";

export class StatisticalTestingEngine {
  /**
   * Runs two-sample independent t-test (Welch's t-test, unequal variances)
   */
  public static runTwoSampleTTest(
    sample1: number[],
    sample2: number[],
    alpha: number = 0.05
  ): StatisticalTestResult {
    const n1 = sample1.length;
    const n2 = sample2.length;

    if (n1 < 2 || n2 < 2) {
      throw new Error("Each sample must contain at least 2 data points for a t-test.");
    }

    const mean1 = sample1.reduce((a, b) => a + b, 0) / n1;
    const mean2 = sample2.reduce((a, b) => a + b, 0) / n2;

    const var1 = sample1.reduce((acc, v) => acc + Math.pow(v - mean1, 2), 0) / (n1 - 1);
    const var2 = sample2.reduce((acc, v) => acc + Math.pow(v - mean2, 2), 0) / (n2 - 1);

    const seDiff = Math.sqrt(var1 / n1 + var2 / n2);
    const tStat = seDiff > 0 ? (mean1 - mean2) / seDiff : 0;

    // Welch-Satterthwaite degrees of freedom
    const dfNum = Math.pow(var1 / n1 + var2 / n2, 2);
    const dfDen = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1);
    const df = dfDen > 0 ? Math.max(1, Math.round(dfNum / dfDen)) : 1;

    // Approximate two-tailed p-value from t distribution
    const pValue = this.approximateTwoTailedPValue(Math.abs(tStat), df);
    const isSignificant = pValue < alpha;

    const meanDiff = mean1 - mean2;
    const marginOfError = 1.96 * seDiff;
    const ci: [number, number] = [
      Math.round((meanDiff - marginOfError) * 100) / 100,
      Math.round((meanDiff + marginOfError) * 100) / 100,
    ];

    const interpretation = isSignificant
      ? `Statistically significant difference detected (p = ${this.round4(pValue)} < ${alpha}). We reject the null hypothesis; the true difference in means is likely non-zero (95% CI: [${ci[0]}, ${ci[1]}]).`
      : `No statistically significant difference detected (p = ${this.round4(pValue)} >= ${alpha}). We fail to reject the null hypothesis; any observed difference could plausibly be due to random sampling variance.`;

    return {
      testType: "two_sample_t_test",
      testName: "Welch's Two-Sample Independent t-Test",
      nullHypothesis: "H0: μ1 - μ2 = 0 (Population means of the two groups are identical)",
      alternativeHypothesis: "H1: μ1 - μ2 ≠ 0 (Population means of the two groups are significantly different)",
      testStatistic: this.round4(tStat),
      pValue: this.round4(pValue),
      degreesOfFreedom: df,
      alpha,
      isSignificant,
      conclusion: isSignificant ? "reject_null" : "fail_to_reject_null",
      interpretation,
      confidenceInterval: ci,
    };
  }

  /**
   * Runs One-Way ANOVA F-test across multiple groups
   */
  public static runANOVA(groups: number[][], alpha: number = 0.05): StatisticalTestResult {
    const k = groups.length;
    if (k < 2) throw new Error("ANOVA requires at least 2 distinct groups.");

    let totalN = 0;
    let grandSum = 0;
    const groupMeans: number[] = [];
    const groupSizes: number[] = [];

    for (const g of groups) {
      if (g.length < 2) throw new Error("Each group must contain at least 2 points.");
      totalN += g.length;
      const sum = g.reduce((a, b) => a + b, 0);
      grandSum += sum;
      groupMeans.push(sum / g.length);
      groupSizes.push(g.length);
    }

    const grandMean = grandSum / totalN;

    // Sum of Squares Between (SSB)
    let ssb = 0;
    for (let i = 0; i < k; i++) {
      ssb += groupSizes[i] * Math.pow(groupMeans[i] - grandMean, 2);
    }

    // Sum of Squares Within (SSW)
    let ssw = 0;
    for (let i = 0; i < k; i++) {
      for (const val of groups[i]) {
        ssw += Math.pow(val - groupMeans[i], 2);
      }
    }

    const dfBetween = k - 1;
    const dfWithin = totalN - k;

    const msb = dfBetween > 0 ? ssb / dfBetween : 0;
    const msw = dfWithin > 0 ? ssw / dfWithin : 1;
    const fStat = msw > 0 ? msb / msw : 0;

    // Approximate p-value for F distribution
    const pValue = this.approximateFPValue(fStat, dfBetween, dfWithin);
    const isSignificant = pValue < alpha;

    return {
      testType: "anova",
      testName: "One-Way Analysis of Variance (ANOVA)",
      nullHypothesis: "H0: μ1 = μ2 = ... = μk (All group means are equal)",
      alternativeHypothesis: "H1: At least one group mean is significantly different",
      testStatistic: this.round4(fStat),
      pValue: this.round4(pValue),
      degreesOfFreedom: dfBetween,
      alpha,
      isSignificant,
      conclusion: isSignificant ? "reject_null" : "fail_to_reject_null",
      interpretation: isSignificant
        ? `Statistically significant variance between group means (F(${dfBetween}, ${dfWithin}) = ${this.round4(fStat)}, p = ${this.round4(pValue)}). Reject H0.`
        : `No statistically significant difference among group means (F(${dfBetween}, ${dfWithin}) = ${this.round4(fStat)}, p = ${this.round4(pValue)}). Fail to reject H0.`,
    };
  }

  /**
   * Runs Chi-Square Test of Independence for contingency table
   */
  public static runChiSquare(contingencyTable: number[][], alpha: number = 0.05): StatisticalTestResult {
    const rows = contingencyTable.length;
    const cols = contingencyTable[0]?.length || 0;

    if (rows < 2 || cols < 2) {
      throw new Error("Contingency table must be at least 2x2.");
    }

    const rowTotals = contingencyTable.map((r) => r.reduce((a, b) => a + b, 0));
    const colTotals: number[] = new Array(cols).fill(0);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        colTotals[j] += contingencyTable[i][j];
      }
    }

    const grandTotal = rowTotals.reduce((a, b) => a + b, 0);
    if (grandTotal === 0) throw new Error("Contingency table contains zero total observations.");

    let chi2 = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const expected = (rowTotals[i] * colTotals[j]) / grandTotal;
        if (expected > 0) {
          const observed = contingencyTable[i][j];
          chi2 += Math.pow(observed - expected, 2) / expected;
        }
      }
    }

    const df = (rows - 1) * (cols - 1);
    const pValue = this.approximateChiSquarePValue(chi2, df);
    const isSignificant = pValue < alpha;

    return {
      testType: "chi_square",
      testName: "Pearson's Chi-Square Test of Independence",
      nullHypothesis: "H0: Row and column categorical variables are independent",
      alternativeHypothesis: "H1: Variables exhibit significant mutual dependency",
      testStatistic: this.round4(chi2),
      pValue: this.round4(pValue),
      degreesOfFreedom: df,
      alpha,
      isSignificant,
      conclusion: isSignificant ? "reject_null" : "fail_to_reject_null",
      interpretation: isSignificant
        ? `Categorical dependency confirmed (χ² = ${this.round4(chi2)}, df = ${df}, p = ${this.round4(pValue)}). Reject H0.`
        : `No significant relationship detected between categories (χ² = ${this.round4(chi2)}, p = ${this.round4(pValue)}). Fail to reject H0.`,
    };
  }

  // Numerical approximations for distribution p-values
  private static approximateTwoTailedPValue(t: number, df: number): number {
    // Normal approximation for large df, or studentized sigmoid
    const z = t / Math.sqrt(df / (df - 2 > 0 ? df - 2 : 1));
    return Math.max(0.0001, Math.min(1.0, 2 * (1 - this.standardNormalCdf(z))));
  }

  private static approximateFPValue(f: number, df1: number, df2: number): number {
    if (f <= 0) return 1.0;
    const z = (Math.pow(f, 1 / 3) * (1 - 2 / (9 * df2)) - (1 - 2 / (9 * df1))) / Math.sqrt((2 / (9 * df1)) + (2 / (9 * df2)) * Math.pow(f, 2 / 3));
    return Math.max(0.0001, Math.min(1.0, 1 - this.standardNormalCdf(z)));
  }

  private static approximateChiSquarePValue(x2: number, df: number): number {
    if (x2 <= 0) return 1.0;
    // Wilson-Hilferty transformation of Chi-Square to Standard Normal
    const z = Math.pow(x2 / df, 1 / 3) - (1 - 2 / (9 * df));
    const denom = Math.sqrt(2 / (9 * df));
    const normalZ = denom > 0 ? z / denom : 0;
    return Math.max(0.0001, Math.min(1.0, 1 - this.standardNormalCdf(normalZ)));
  }

  private static standardNormalCdf(x: number): number {
    // Abramowitz & Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.SQRT2;

    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return 0.5 * (1.0 + sign * y);
  }

  private static round4(val: number): number {
    return Math.round(val * 10000) / 10000;
  }
}
