/**
 * TATTVA AI - Continuous Optimization Engine Types (Phase 25)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface MetricComparison {
  metricName: string;
  baselineValue: number;
  optimizedValue: number;
  improvementPercentage: number;
  unit: string;
}

export interface OptimizationResult {
  dimension: "latency" | "token_cost" | "rag_retrieval" | "file_processing" | "memory";
  baselineScore: number;
  optimizedScore: number;
  improvementDelta: number;
  qualityPreserved: boolean;
  notes: string;
}

export interface OptimizationSummary {
  timestamp: number;
  comparisons: MetricComparison[];
  totalCostSavedMonthlyEstimate: number;
  averageLatencyReductionMs: number;
  regressionCheckPassed: boolean;
}
