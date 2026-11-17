/**
 * TATTVA AI - Natural Language Tabular Query Engine
 * Translates conversational user inquiries into deterministic aggregations, filters, and chart configurations
 */

import { Dataset, NLQueryResult, ChartConfig } from "./types";

export class NLQueryEngine {
  public static executeQuery(dataset: Dataset, query: string): NLQueryResult {
    const start = Date.now();
    const qLower = query.toLowerCase().trim();
    const rows = [...dataset.rows];

    // Detect numeric and categorical column names
    const numericCols = dataset.columns.filter((c) => c.type === "numeric").map((c) => c.name);
    const catCols = dataset.columns.filter((c) => c.type === "categorical" || c.type === "text").map((c) => c.name);

    // Identify referenced columns
    const matchedNumeric = numericCols.find((c) => qLower.includes(c.toLowerCase()));
    const matchedCat = catCols.find((c) => qLower.includes(c.toLowerCase()));

    // 1. Aggregation: MAX / HIGHEST
    if (qLower.includes("highest") || qLower.includes("max") || qLower.includes("maximum") || qLower.includes("top")) {
      const targetCol = matchedNumeric || numericCols[0] || dataset.columns[0].name;
      const sorted = rows.sort((a, b) => (Number(b[targetCol]) || 0) - (Number(a[targetCol]) || 0));
      const topRows = sorted.slice(0, 5);

      const val = topRows[0] ? topRows[0][targetCol] : "N/A";
      const summary = `Found highest ${targetCol} = ${val} in dataset.`;

      const chart: ChartConfig = {
        type: "bar",
        title: `Top 5 Records by ${targetCol}`,
        xColumn: matchedCat || dataset.columns[0].name,
        yColumn: targetCol,
        dataPoints: topRows.map((r) => ({
          x: r[matchedCat || dataset.columns[0].name] || "Row",
          y: r[targetCol],
        })),
      };

      return {
        query,
        interpretation: `Sorted by '${targetCol}' descending to find top records.`,
        resultRows: topRows,
        totalMatchingRows: topRows.length,
        aggregationSummary: summary,
        suggestedChart: chart,
        executionTimeMs: Date.now() - start,
      };
    }

    // 2. Aggregation: MIN / LOWEST
    if (qLower.includes("lowest") || qLower.includes("min") || qLower.includes("minimum") || qLower.includes("bottom")) {
      const targetCol = matchedNumeric || numericCols[0] || dataset.columns[0].name;
      const sorted = rows.sort((a, b) => (Number(a[targetCol]) || 0) - (Number(b[targetCol]) || 0));
      const bottomRows = sorted.slice(0, 5);

      const val = bottomRows[0] ? bottomRows[0][targetCol] : "N/A";
      const summary = `Found lowest ${targetCol} = ${val} in dataset.`;

      return {
        query,
        interpretation: `Sorted by '${targetCol}' ascending to find lowest records.`,
        resultRows: bottomRows,
        totalMatchingRows: bottomRows.length,
        aggregationSummary: summary,
        executionTimeMs: Date.now() - start,
      };
    }

    // 3. Aggregation: AVERAGE / MEAN
    if (qLower.includes("average") || qLower.includes("mean") || qLower.includes("avg")) {
      const targetCol = matchedNumeric || numericCols[0];
      if (targetCol) {
        const nums = rows.map((r) => Number(r[targetCol])).filter((v) => !isNaN(v));
        const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        const roundedAvg = Math.round(avg * 100) / 100;

        return {
          query,
          interpretation: `Computed arithmetic mean for numeric column '${targetCol}'.`,
          resultRows: [{ column: targetCol, average: roundedAvg, count: nums.length }],
          totalMatchingRows: 1,
          aggregationSummary: `The overall average of ${targetCol} is ${roundedAvg}.`,
          executionTimeMs: Date.now() - start,
        };
      }
    }

    // 4. Aggregation: TOTAL / SUM
    if (qLower.includes("total") || qLower.includes("sum")) {
      const targetCol = matchedNumeric || numericCols[0];
      if (targetCol) {
        const nums = rows.map((r) => Number(r[targetCol])).filter((v) => !isNaN(v));
        const sum = nums.reduce((a, b) => a + b, 0);
        const roundedSum = Math.round(sum * 100) / 100;

        return {
          query,
          interpretation: `Calculated sum across column '${targetCol}'.`,
          resultRows: [{ column: targetCol, sum: roundedSum, count: nums.length }],
          totalMatchingRows: 1,
          aggregationSummary: `The total sum of ${targetCol} is ${roundedSum}.`,
          executionTimeMs: Date.now() - start,
        };
      }
    }

    // 5. Categorical Group By
    if (matchedCat && matchedNumeric) {
      const groups: Record<string, { sum: number; count: number }> = {};
      for (const r of rows) {
        const cat = String(r[matchedCat] || "Unknown");
        const val = Number(r[matchedNumeric]) || 0;
        if (!groups[cat]) groups[cat] = { sum: 0, count: 0 };
        groups[cat].sum += val;
        groups[cat].count += 1;
      }

      const aggregated = Object.entries(groups).map(([category, stats]) => ({
        [matchedCat]: category,
        sum: Math.round(stats.sum * 100) / 100,
        average: Math.round((stats.sum / stats.count) * 100) / 100,
        count: stats.count,
      }));

      const chart: ChartConfig = {
        type: "bar",
        title: `${matchedNumeric} by ${matchedCat}`,
        xColumn: matchedCat,
        yColumn: "sum",
        dataPoints: aggregated.map((a) => ({ x: a[matchedCat], y: a.sum })),
      };

      return {
        query,
        interpretation: `Aggregated '${matchedNumeric}' grouped by '${matchedCat}'.`,
        resultRows: aggregated,
        totalMatchingRows: aggregated.length,
        aggregationSummary: `Aggregated data grouped by ${matchedCat} across ${aggregated.length} categories.`,
        suggestedChart: chart,
        executionTimeMs: Date.now() - start,
      };
    }

    // Default Fallback: Return sample rows matching query or top rows
    const sample = rows.slice(0, 10);
    return {
      query,
      interpretation: `Sample inspection of dataset (${dataset.rowCount} total rows).`,
      resultRows: sample,
      totalMatchingRows: sample.length,
      aggregationSummary: `Retrieved ${sample.length} representative rows from ${dataset.name}.`,
      executionTimeMs: Date.now() - start,
    };
  }
}
