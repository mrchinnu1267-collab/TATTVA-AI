/**
 * TATTVA AI - AI Image Model Fine-Tuning & Customization Types (Phase G)
 * LoRA adapter training, dataset management, versioning, and inference integration.
 */

export type CustomizationCategory =
  | "artistic_style"
  | "consistent_theme"
  | "product_visualization"
  | "illustration_style"
  | "3d_rendering_style"
  | "character_consistency"
  | "brand_visual_identity";

export type FineTuningBaseModelId =
  | "stabilityai/stable-diffusion-xl-base-1.0"
  | "black-forest-labs/FLUX.1-dev"
  | "cagliostrolab/animagine-xl-3.1"
  | "runwayml/stable-diffusion-v1-5";

export interface BaseModelSpec {
  id: FineTuningBaseModelId;
  name: string;
  family: "sdxl" | "flux" | "sd15";
  architecture: "sdxl" | "flux_transformer" | "sd15";
  recommendedResolution: number;
  parameterCount: string;
  loraSupported: boolean;
  minTrainingVramMb: number; // Minimal VRAM for LoRA training
  recommendedInferenceVramMb: number;
  commercialUse: "commercial_allowed" | "non_commercial_only";
  license: string;
  defaultLearningRate: number;
  defaultRank: number;
  defaultAlpha: number;
  targetModules: string[];
}

export interface DatasetImage {
  id: string;
  imageUrl: string; // Base64 data URI or remote storage URL
  caption: string;
  width: number;
  height: number;
  sizeBytes: number;
  sha256Hash: string;
  isValidation?: boolean;
}

export interface DatasetManifest {
  id: string;
  name: string;
  description: string;
  category: CustomizationCategory;
  triggerWord: string; // e.g., "sks style", "tok product"
  images: DatasetImage[];
  totalImages: number;
  trainingCount: number;
  validationCount: number;
  trainSplitCount?: number;
  validationSplitCount?: number;
  hasUserConsent: boolean;
  licenseDeclaration: string;
  userId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingHyperparameters {
  steps: number; // 100 to 3000
  learningRate: number; // e.g. 1e-4
  batchSize: number; // 1 to 4
  loraRank: number; // 4, 8, 16, 32
  loraAlpha: number; // 8, 16, 32
  resolution: number; // 512, 768, 1024
  mixedPrecision: "fp16" | "bf16" | "no";
  gradientAccumulationSteps: number;
  gradientCheckpointing: boolean;
  seed: number;
  checkpointFrequency: number;
  validationFrequency: number;
}

export interface LoRAAdapter {
  id: string;
  name: string;
  version: string; // semver "1.0.0"
  baseModel: FineTuningBaseModelId;
  category: CustomizationCategory;
  triggerWord: string;
  weightsStoragePath: string;
  weightsSizeBytes: number;
  rank: number;
  alpha: number;
  scale: number; // 0.0 to 1.5, default 0.8
  isActive: boolean;
  status: "ready" | "training" | "failed" | "archived";
  lossHistory: Array<{ step: number; loss: number }>;
  finalLoss?: number;
  userId: string;
  workspaceId: string;
  datasetManifestId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingJob {
  id: string;
  adapterId: string;
  datasetId: string;
  baseModel: FineTuningBaseModelId;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  currentStep: number;
  totalSteps: number;
  progressPercent: number;
  currentLoss: number;
  logs: string[];
  hardware: "cloud_gpu" | "local_memory_efficient" | "simulated_verification";
  estimatedDurationSec: number;
  estimatedCostUsd: number;
  userId: string;
  workspaceId: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface CustomizationQualityReport {
  adapterId: string;
  baseModel: string;
  styleConsistencyScore: number; // 0-100
  promptAdherenceScore: number; // 0-100
  objectAccuracyScore: number; // 0-100
  overfittingRisk: "low" | "medium" | "high";
  overfittingScore: number; // 0-100 (lower is better)
  generalizationScore: number; // 0-100
  comparativeVerdict: "recommended" | "viable" | "overfit" | "underfit";
  recommendations: string[];
}

export const SUPPORTED_BASE_MODELS: Record<FineTuningBaseModelId, BaseModelSpec> = {
  "stabilityai/stable-diffusion-xl-base-1.0": {
    id: "stabilityai/stable-diffusion-xl-base-1.0",
    name: "Stable Diffusion XL 1.0",
    family: "sdxl",
    architecture: "sdxl",
    recommendedResolution: 1024,
    parameterCount: "6.6B (UNet + Dual Text Encoders)",
    loraSupported: true,
    minTrainingVramMb: 12000, // 12 GB VRAM for FP16 LoRA with gradient checkpointing
    recommendedInferenceVramMb: 6000,
    commercialUse: "commercial_allowed",
    license: "OpenRAIL-M",
    defaultLearningRate: 1e-4,
    defaultRank: 8,
    defaultAlpha: 16,
    targetModules: ["to_q", "to_k", "to_v", "to_out.0"],
  },
  "black-forest-labs/FLUX.1-dev": {
    id: "black-forest-labs/FLUX.1-dev",
    name: "FLUX.1-dev (Rectified Flow Transformer)",
    family: "flux",
    architecture: "flux_transformer",
    recommendedResolution: 1024,
    parameterCount: "12B Parameters",
    loraSupported: true,
    minTrainingVramMb: 16000,
    recommendedInferenceVramMb: 12000,
    commercialUse: "non_commercial_only",
    license: "FLUX.1-dev Non-Commercial License",
    defaultLearningRate: 8e-5,
    defaultRank: 16,
    defaultAlpha: 16,
    targetModules: ["qkv", "proj", "linear"],
  },
  "cagliostrolab/animagine-xl-3.1": {
    id: "cagliostrolab/animagine-xl-3.1",
    name: "Animagine XL 3.1",
    family: "sdxl",
    architecture: "sdxl",
    recommendedResolution: 1024,
    parameterCount: "6.6B Parameters",
    loraSupported: true,
    minTrainingVramMb: 12000,
    recommendedInferenceVramMb: 6000,
    commercialUse: "commercial_allowed",
    license: "Fair AI Public License 1.0-SD",
    defaultLearningRate: 1e-4,
    defaultRank: 8,
    defaultAlpha: 16,
    targetModules: ["to_q", "to_k", "to_v", "to_out.0"],
  },
  "runwayml/stable-diffusion-v1-5": {
    id: "runwayml/stable-diffusion-v1-5",
    name: "Stable Diffusion 1.5",
    family: "sd15",
    architecture: "sd15",
    recommendedResolution: 512,
    parameterCount: "1.0B Parameters",
    loraSupported: true,
    minTrainingVramMb: 4000, // Can train locally on RTX 3050 4GB with FP16 + 8-bit Adam
    recommendedInferenceVramMb: 2500,
    commercialUse: "commercial_allowed",
    license: "CreativeML OpenRAIL-M",
    defaultLearningRate: 1e-4,
    defaultRank: 4,
    defaultAlpha: 8,
    targetModules: ["to_q", "to_k", "to_v", "to_out.0"],
  },
};
