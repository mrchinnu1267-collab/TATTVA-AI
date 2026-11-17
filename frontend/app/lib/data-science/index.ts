/**
 * TATTVA AI - Advanced Data Science & Analytics Platform Facade
 * Unified interface orchestrating EDA, NL queries, ML recommendations, and hypothesis testing
 */

export * from "./types";
export { DataParser } from "./data-parser";
export { EDAEngine } from "./eda-engine";
export { CleanerRecommender } from "./cleaner-recommender";
export { NLQueryEngine } from "./nl-query-engine";
export { MLRecommender } from "./ml-recommender";
export { StatisticalTestingEngine } from "./statistical-testing";
export { DatasetStore } from "./dataset-store";

import { DataParser } from "./data-parser";
import { EDAEngine } from "./eda-engine";
import { CleanerRecommender } from "./cleaner-recommender";
import { NLQueryEngine } from "./nl-query-engine";
import { MLRecommender } from "./ml-recommender";
import { StatisticalTestingEngine } from "./statistical-testing";
import { DatasetStore } from "./dataset-store";
import {
  Dataset,
  EDASummary,
  CleaningRecommendation,
  NLQueryResult,
  MLModelRecommendation,
  StatisticalTestResult,
  AnalyticsReportBundle,
} from "./types";

export class DataSciencePlatformEngine {
  public static listDatasets(tenantId: string, workspaceId: string): Dataset[] {
    return DatasetStore.listDatasets(tenantId, workspaceId);
  }

  public static getDataset(tenantId: string, workspaceId: string, datasetId: string): Dataset | null {
    return DatasetStore.getDataset(tenantId, workspaceId, datasetId);
  }

  public static ingestCSV(
    tenantId: string,
    workspaceId: string,
    name: string,
    csvContent: string
  ): Dataset {
    const rows = DataParser.parseCSV(csvContent);
    return DatasetStore.saveDataset(tenantId, workspaceId, name, rows);
  }

  public static ingestJSON(
    tenantId: string,
    workspaceId: string,
    name: string,
    records: Record<string, any>[]
  ): Dataset {
    return DatasetStore.saveDataset(tenantId, workspaceId, name, records);
  }

  public static runEDA(dataset: Dataset): EDASummary {
    return EDAEngine.runEDA(dataset);
  }

  public static getCleaningRecommendations(eda: EDASummary): CleaningRecommendation[] {
    return CleanerRecommender.generateRecommendations(eda);
  }

  public static queryDataset(dataset: Dataset, query: string): NLQueryResult {
    return NLQueryEngine.executeQuery(dataset, query);
  }

  public static recommendML(dataset: Dataset, targetColumn?: string): MLModelRecommendation {
    return MLRecommender.recommendPipeline(dataset, targetColumn);
  }

  public static runTTest(
    sample1: number[],
    sample2: number[],
    alpha: number = 0.05
  ): StatisticalTestResult {
    return StatisticalTestingEngine.runTwoSampleTTest(sample1, sample2, alpha);
  }

  public static runANOVA(groups: number[][], alpha: number = 0.05): StatisticalTestResult {
    return StatisticalTestingEngine.runANOVA(groups, alpha);
  }

  public static runChiSquare(contingencyTable: number[][], alpha: number = 0.05): StatisticalTestResult {
    return StatisticalTestingEngine.runChiSquare(contingencyTable, alpha);
  }

  public static generateAnalyticsReport(dataset: Dataset): AnalyticsReportBundle {
    const eda = this.runEDA(dataset);
    const recommendations = this.getCleaningRecommendations(eda);

    const mdLines: string[] = [];
    mdLines.push(`# Exploratory Data Analysis & Analytics Report: ${dataset.name}`);
    mdLines.push(`**Generated:** ${new Date().toUTCString()} | **Dataset ID:** \`${dataset.id}\``);
    mdLines.push(`- **Total Rows:** ${dataset.rowCount}`);
    mdLines.push(`- **Total Columns:** ${dataset.columnCount}`);
    mdLines.push(`- **Total Missing Values:** ${eda.missingValuesTotal}`);
    mdLines.push(`\n## 1. Summary Statistics`);
    for (const [col, stats] of Object.entries(eda.numericStats)) {
      mdLines.push(`- **${col}:** Mean: ${stats.mean}, Median: ${stats.median}, StdDev: ${stats.stdDev}, Min: ${stats.min}, Max: ${stats.max}, IQR: ${stats.iqr}`);
    }

    if (eda.correlations.length > 0) {
      mdLines.push(`\n## 2. Top Correlated Pairs`);
      for (const corr of eda.correlations.slice(0, 5)) {
        mdLines.push(`- \`${corr.col1}\` vs \`${corr.col2}\`: Pearson r = ${corr.pearsonR} (${corr.strength.replace("_", " ")})`);
      }
    }

    if (eda.outliers.length > 0) {
      mdLines.push(`\n## 3. Detected Outliers`);
      for (const out of eda.outliers) {
        mdLines.push(`- **${out.column}:** ${out.outlierCount} outliers (${out.outlierPercentage}%), Bounds: [${out.lowerBound}, ${out.upperBound}]`);
      }
    }

    if (recommendations.length > 0) {
      mdLines.push(`\n## 4. Recommended Cleaning Recipes`);
      for (const rec of recommendations) {
        mdLines.push(`### [${rec.severity.toUpperCase()}] ${rec.issue}`);
        mdLines.push(`${rec.recommendedAction}`);
        mdLines.push(`\`\`\`python\n${rec.pythonSnippet}\n\`\`\``);
      }
    }

    return {
      datasetId: dataset.id,
      datasetName: dataset.name,
      eda,
      recommendations,
      markdownReport: mdLines.join("\n"),
      generatedAt: new Date().toISOString(),
    };
  }
}
