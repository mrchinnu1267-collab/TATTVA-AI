/**
 * TATTVA AI - Automated Exploratory Data Analysis (EDA) Engine
 * Computes descriptive statistics, distributions, IQR outlier detection, and Pearson correlation matrices
 */

import {
  Dataset,
  EDASummary,
  NumericColumnStats,
  CategoricalColumnStats,
  CorrelationPair,
  OutlierSummary,
} from "./types";

export class EDAEngine {
  /**
   * Generates comprehensive exploratory data analysis for a dataset
   */
  public static runEDA(dataset: Dataset): EDASummary {
    const rowCount = dataset.rowCount;
    const columnCount = dataset.columnCount;
    const missingValuesByColumn: Record<string, number> = {};
    let missingValuesTotal = 0;

    // 1. Missing values
    for (const col of dataset.columns) {
      let missing = 0;
      for (const row of dataset.rows) {
        const val = row[col.name];
        if (val === null || val === undefined || val === "") {
          missing++;
        }
      }
      missingValuesByColumn[col.name] = missing;
      missingValuesTotal += missing;
    }

    // 2. Numeric Statistics
    const numericStats: Record<string, NumericColumnStats> = {};
    const numericCols = dataset.columns.filter((c) => c.type === "numeric");

    for (const col of numericCols) {
      const nums = dataset.rows
        .map((r) => r[col.name])
        .filter((v) => typeof v === "number" && !isNaN(v))
        .sort((a, b) => a - b);

      if (nums.length > 0) {
        const min = nums[0];
        const max = nums[nums.length - 1];
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;

        const median = this.getPercentile(nums, 50);
        const q25 = this.getPercentile(nums, 25);
        const q75 = this.getPercentile(nums, 75);
        const iqr = q75 - q25;

        // Variance & StdDev
        const sqDiffSum = nums.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
        const variance = nums.length > 1 ? sqDiffSum / (nums.length - 1) : 0;
        const stdDev = Math.sqrt(variance);

        // Skewness: 3 * (mean - median) / stdDev (Pearson's second skewness coeff)
        const skewness = stdDev > 0 ? (3 * (mean - median)) / stdDev : 0;

        numericStats[col.name] = {
          column: col.name,
          min: this.round2(min),
          max: this.round2(max),
          mean: this.round2(mean),
          median: this.round2(median),
          stdDev: this.round2(stdDev),
          q25: this.round2(q25),
          q75: this.round2(q75),
          iqr: this.round2(iqr),
          skewness: this.round2(skewness),
        };
      }
    }

    // 3. Categorical Statistics
    const categoricalStats: Record<string, CategoricalColumnStats> = {};
    const catCols = dataset.columns.filter((c) => c.type === "categorical" || c.type === "text");

    for (const col of catCols) {
      const counts: Record<string, number> = {};
      let totalValid = 0;

      for (const row of dataset.rows) {
        const val = row[col.name];
        if (val !== null && val !== undefined && val !== "") {
          const str = String(val);
          counts[str] = (counts[str] || 0) + 1;
          totalValid++;
        }
      }

      const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const mode = sortedEntries.length > 0 ? sortedEntries[0][0] : "N/A";

      const topValues = sortedEntries.slice(0, 5).map(([value, count]) => ({
        value,
        count,
        percentage: totalValid > 0 ? this.round2((count / totalValid) * 100) : 0,
      }));

      categoricalStats[col.name] = {
        column: col.name,
        cardinality: Object.keys(counts).length,
        mode,
        topValues,
      };
    }

    // 4. Outlier Detection (Tukey's IQR Method: Q1 - 1.5*IQR, Q3 + 1.5*IQR)
    const outliers: OutlierSummary[] = [];
    for (const col of numericCols) {
      const stat = numericStats[col.name];
      if (!stat || stat.iqr === 0) continue;

      const lowerBound = stat.q25 - 1.5 * stat.iqr;
      const upperBound = stat.q75 + 1.5 * stat.iqr;

      const foundOutliers: number[] = [];
      for (const row of dataset.rows) {
        const v = row[col.name];
        if (typeof v === "number" && (v < lowerBound || v > upperBound)) {
          foundOutliers.push(v);
        }
      }

      if (foundOutliers.length > 0) {
        outliers.push({
          column: col.name,
          outlierCount: foundOutliers.length,
          outlierPercentage: this.round2((foundOutliers.length / dataset.rows.length) * 100),
          lowerBound: this.round2(lowerBound),
          upperBound: this.round2(upperBound),
          sampleOutliers: foundOutliers.slice(0, 5).map((x) => this.round2(x)),
        });
      }
    }

    // 5. Pearson Correlation Matrix for numeric pairs
    const correlations: CorrelationPair[] = [];
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const c1 = numericCols[i].name;
        const c2 = numericCols[j].name;
        const r = this.computePearsonR(dataset.rows, c1, c2);

        if (r !== null) {
          correlations.push({
            col1: c1,
            col2: c2,
            pearsonR: this.round2(r),
            strength: this.getCorrelationStrength(r),
          });
        }
      }
    }

    return {
      datasetId: dataset.id,
      datasetName: dataset.name,
      rowCount,
      columnCount,
      missingValuesTotal,
      missingValuesByColumn,
      numericStats,
      categoricalStats,
      correlations,
      outliers,
      generatedAt: new Date().toISOString(),
    };
  }

  private static computePearsonR(rows: Record<string, any>[], col1: string, col2: string): number | null {
    const pairs: [number, number][] = [];
    for (const r of rows) {
      const v1 = r[col1];
      const v2 = r[col2];
      if (typeof v1 === "number" && typeof v2 === "number" && !isNaN(v1) && !isNaN(v2)) {
        pairs.push([v1, v2]);
      }
    }

    const n = pairs.length;
    if (n < 3) return null;

    const mean1 = pairs.reduce((acc, p) => acc + p[0], 0) / n;
    const mean2 = pairs.reduce((acc, p) => acc + p[1], 0) / n;

    let num = 0;
    let den1 = 0;
    let den2 = 0;

    for (const [x, y] of pairs) {
      const dx = x - mean1;
      const dy = y - mean2;
      num += dx * dy;
      den1 += dx * dx;
      den2 += dy * dy;
    }

    const den = Math.sqrt(den1 * den2);
    if (den === 0) return 0;
    return num / den;
  }

  private static getCorrelationStrength(
    r: number
  ): "strong_positive" | "moderate_positive" | "weak" | "moderate_negative" | "strong_negative" {
    if (r >= 0.7) return "strong_positive";
    if (r >= 0.3) return "moderate_positive";
    if (r <= -0.7) return "strong_negative";
    if (r <= -0.3) return "moderate_negative";
    return "weak";
  }

  private static getPercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private static round2(val: number): number {
    return Math.round(val * 100) / 100;
  }
}
