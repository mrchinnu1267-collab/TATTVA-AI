/**
 * TATTVA AI - Long-Term AI Research Lab Types (Phase 27)
 * Formal schemas for empirical AI research, knowledge distillation, and SLM benchmarking
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface ResearchExperiment {
  id: string;
  title: string;
  objective: string;
  baseModel: string;
  datasetName: string;
  datasetLicensing: "MIT" | "Apache-2.0" | "CC-BY-4.0" | "Research-Only";
  computeSpec: {
    hardware: string;
    quantization: "fp16" | "bf16" | "int8" | "int4";
    batchSize: number;
    trainingHours: number;
  };
  methodology: "LoRA" | "QLoRA" | "Knowledge_Distillation" | "Direct_Preference_Optimization";
  empiricalResults: {
    evalAccuracy: number;
    baselineAccuracy: number;
    latencyMs: number;
    perplexity?: number;
    tokenPerSec: number;
  };
  limitations: string[];
  reproducibilitySteps: string[];
  createdAt: string;
}

export interface DistillationSpec {
  id: string;
  teacherModel: string;
  studentModel: string;
  temperature: number; // typically 2.0 - 4.0
  alpha: number; // weight between hard loss and soft distillation loss (e.g. 0.5)
  reasoningTraceExtraction: boolean;
  trainingSamples: number;
  status: "configured" | "extracting_traces" | "training" | "completed";
}

export interface BenchmarkScore {
  benchmark: "Indic_MMMLU" | "GSM8K_Hindi" | "HumanEval_Python" | "ARC_Challenge";
  sampleCount: number;
  accuracy: number;
  averageLatencyMs: number;
  vramUsageMB: number;
}

export interface ModelBenchmarkComparison {
  teacherScores: BenchmarkScore[];
  studentScores: BenchmarkScore[];
  compressionRatio: number; // e.g. 70B / 3B = 23.3x
  latencySpeedup: number;   // e.g. 3.2x
  accuracyRetention: number; // e.g. 91.5%
}
