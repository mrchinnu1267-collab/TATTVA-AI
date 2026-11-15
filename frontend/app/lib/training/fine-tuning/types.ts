/**
 * TATTVA AI - Custom Model Fine-Tuning Engine Types
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type TrainingMethod = "qlora" | "lora" | "full_sft";

export interface LoraConfig {
  r: number;
  loraAlpha: number;
  loraDropout: number;
  targetModules: string[];
  bias: "none" | "all" | "lora_only";
  taskType: "CAUSAL_LM";
}

export interface TrainingHyperparameters {
  method: TrainingMethod;
  learningRate: number;
  batchSize: number;
  gradientAccumulationSteps: number;
  numEpochs: number;
  warmupRatio: number;
  weightDecay: number;
  maxSeqLength: number;
  optim: "paged_adamw_8bit" | "adamw_torch";
  fp16: boolean;
  bf16: boolean;
  gradientCheckpointing: boolean;
  loggingSteps: number;
  saveSteps: number;
  lora: LoraConfig;
}

export interface HardwareFeasibility {
  totalGpuVramMb: number;
  estimatedPeakVramMb: number;
  isFeasibleLocally: boolean;
  headroomMb: number;
  targetDevice: "cuda" | "cpu" | "cloud_required";
  warningMessage?: string;
}

export interface FineTuningJobSpec {
  jobId: string;
  jobName: string;
  baseModelId: string;
  targetModelVersion: string;
  datasetId: string;
  datasetFormat: "chatml" | "alpaca" | "huggingface";
  hyperparameters: TrainingHyperparameters;
  hardwareFeasibility: HardwareFeasibility;
  trainingScriptPath: string;
  configFilePath: string;
  outputAdapterDir: string;
  requiresHumanApproval: boolean;
  approvalGranted: boolean;
  status: "configured" | "pending_approval" | "approved" | "training" | "completed" | "failed";
  createdAt: string;
}
