/**
 * TATTVA AI - Advanced Data Science & Analytics Platform
 * Core Data Structures and Interfaces
 */

export type ColumnDataType = "numeric" | "categorical" | "datetime" | "boolean" | "text";

export interface ColumnSchema {
  name: string;
  type: ColumnDataType;
  nullable: boolean;
  uniqueCount: number;
  sampleValues: any[];
}

export interface Dataset {
  id: string;
  name: string;
  tenantId: string;
  workspaceId: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnSchema[];
  rows: Record<string, any>[];
  createdAt: string;
}

export interface NumericColumnStats {
  column: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  q25: number;
  q75: number;
  iqr: number;
  skewness: number;
}

export interface CategoricalColumnStats {
  column: string;
  cardinality: number;
  mode: string;
  topValues: { value: string; count: number; percentage: number }[];
}

export interface CorrelationPair {
  col1: string;
  col2: string;
  pearsonR: number; // -1 to 1
  strength: "strong_positive" | "moderate_positive" | "weak" | "moderate_negative" | "strong_negative";
}

export interface OutlierSummary {
  column: string;
  outlierCount: number;
  outlierPercentage: number;
  lowerBound: number;
  upperBound: number;
  sampleOutliers: number[];
}

export interface EDASummary {
  datasetId: string;
  datasetName: string;
  rowCount: number;
  columnCount: number;
  missingValuesTotal: number;
  missingValuesByColumn: Record<string, number>;
  numericStats: Record<string, NumericColumnStats>;
  categoricalStats: Record<string, CategoricalColumnStats>;
  correlations: CorrelationPair[];
  outliers: OutlierSummary[];
  generatedAt: string;
}

export interface CleaningRecommendation {
  id: string;
  column: string;
  issue: string;
  severity: "low" | "medium" | "high";
  recommendedAction: string;
  pythonSnippet: string;
}

export type ChartType = "bar" | "line" | "scatter" | "heatmap" | "distribution" | "boxplot";

export interface ChartConfig {
  type: ChartType;
  title: string;
  xColumn: string;
  yColumn?: string;
  seriesName?: string;
  dataPoints: { x: any; y?: any; label?: string }[];
}

export interface NLQueryResult {
  query: string;
  interpretation: string;
  resultRows: Record<string, any>[];
  totalMatchingRows: number;
  aggregationSummary?: string;
  suggestedChart?: ChartConfig;
  executionTimeMs: number;
}

export type MLTaskType = "classification" | "regression" | "clustering" | "time_series";

export interface SuggestedMLAlgorithm {
  name: string;
  family: string;
  rationale: string;
  pros: string[];
  cons: string[];
  hyperparameters: Record<string, any>;
}

export interface MLModelRecommendation {
  targetColumn: string;
  taskType: MLTaskType;
  suggestedAlgorithms: SuggestedMLAlgorithm[];
  featureEngineeringSuggestions: string[];
  evaluationMetrics: string[];
  pythonPipelineSnippet: string;
}

export type StatisticalTestType =
  | "two_sample_t_test"
  | "paired_t_test"
  | "anova"
  | "chi_square"
  | "linear_regression";

export interface StatisticalTestResult {
  testType: StatisticalTestType;
  testName: string;
  nullHypothesis: string;
  alternativeHypothesis: string;
  testStatistic: number;
  pValue: number;
  degreesOfFreedom?: number;
  alpha: number; // default 0.05
  isSignificant: boolean;
  conclusion: "reject_null" | "fail_to_reject_null";
  interpretation: string;
  confidenceInterval?: [number, number];
}

export interface AnalyticsReportBundle {
  datasetId: string;
  datasetName: string;
  eda: EDASummary;
  recommendations: CleaningRecommendation[];
  markdownReport: string;
  generatedAt: string;
}
