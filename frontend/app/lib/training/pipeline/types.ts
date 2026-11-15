/**
 * TATTVA AI - Universal Training Pipeline Types
 * Defines interfaces for SFT formats (Alpaca, ChatML, HuggingFace),
 * validation pipelines, dataset contamination guards, and export artifacts.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type FineTuningFormat = "alpaca" | "chatml" | "huggingface" | "jsonl";

export interface AlpacaSample {
  instruction: string;
  input?: string;
  output: string;
  system?: string;
  history?: [string, string][];
}

export interface ChatMLMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatMLSample {
  messages: ChatMLMessage[];
  tools?: any[];
}

export interface HuggingFaceRow {
  prompt: string;
  completion: string;
  id?: string;
  subset?: string;
}

export type SftRecord = AlpacaSample | ChatMLSample | HuggingFaceRow;

export interface UniversalTrainingDatasetConfig {
  datasetId: string;
  format: FineTuningFormat;
  maxSamples?: number;
  validationRatio?: number; // e.g., 0.1 for 10% validation split
  seed?: number;
  deduplicate?: boolean;
  qualityFilter?: boolean;
  exportOutputDir?: string;
}

export interface SftExportResult {
  datasetId: string;
  format: FineTuningFormat;
  totalRecordsLoaded: number;
  totalCleanRecords: number;
  duplicateCount: number;
  filteredCount: number;
  trainCount: number;
  valCount: number;
  trainFilePath: string;
  valFilePath?: string;
  sha256Checksum: string;
  createdAt: string;
}

export class DataContaminationViolation extends Error {
  constructor(message: string) {
    super(`Data Contamination Violation: ${message}`);
    this.name = "DataContaminationViolation";
  }
}
