/**
 * TATTVA AI - Centralized Dataset Management System Types
 * Universal dataset metadata, schema adapters & format specifications
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type DatasetFormat = "csv" | "json" | "jsonl";
export type DatasetCategory =
  | "knowledge"
  | "conversational"
  | "instruction_following"
  | "reasoning"
  | "coding"
  | "mathematics"
  | "multilingual"
  | "tool_use"
  | "rag_evaluation"
  | "multimodal_evaluation";

export type DatasetType = "evaluation" | "training" | "benchmark";

export interface DatasetProvenance {
  originalAuthor: string;
  sourceUrl: string;
  curationMethodology: string;
  commercialUsePermitted: boolean;
  redistributionTerms: string;
}

export interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
  source: string;
  license: string;
  version: string;
  language: "hi-IN" | "te-IN" | "en-US" | "multilingual";
  recordCount: number;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  format: DatasetFormat;
  relativePath: string;
  categories: DatasetCategory[];
  intendedPurpose: string;
  dateImported: string;
  isActive: boolean;
  hasVerifiedAnswers: boolean;
  schemaType:
    | "mmmlu_mcq"
    | "indic_mcq"
    | "instruction_json"
    | "conversational_multiturn"
    | "coding_problem"
    | "math_problem"
    | "tool_use"
    | "rag_eval"
    | "multimodal_eval";
  datasetType?: DatasetType;
  provenance?: DatasetProvenance;
}

export interface UniversalQuestionRecord {
  id: number | string;
  question: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  expectedAnswer?: "A" | "B" | "C" | "D" | string;
  subject?: string;
  language: string;
  context?: string;
  criteria?: string[];
  conversationHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  expectedBehavior?: string;
  metadata?: Record<string, any>;
}

export interface DatasetRegistryManifest {
  version: string;
  lastUpdated: string;
  canonicalRoot: string;
  datasets: DatasetMetadata[];
}
