/**
 * TATTVA AI - Super-Resolution & Image Enhancement Types (Phase F)
 * High-fidelity upscaling, detail restoration, artifact removal, and preservation.
 */

export type SuperResolutionModelId =
  | "real-esrgan-x4plus"
  | "real-esrgan-anime-6b"
  | "real-esrgan-x2plus"
  | "swinir-realworld-sr"
  | "gfpgan-face-restore"
  | "neural-bilateral-lanczos";

export type EnhancementOperation =
  | "upscale_2x"
  | "upscale_4x"
  | "detail_enhance"
  | "noise_reduction"
  | "artifact_removal"
  | "sharpening"
  | "color_contrast_enhance";

export interface SuperResolutionModelSpec {
  id: SuperResolutionModelId;
  name: string;
  exactIdentifier: string;
  architecture: "real_esrgan" | "swin_transformer" | "gan" | "neural_kernel";
  license: "BSD-3-Clause" | "Apache-2.0" | "MIT";
  supportedScales: Array<2 | 4>;
  recommendedFor: Array<"photo" | "anime" | "3d_render" | "portrait" | "landscape" | "text" | "product">;
  strengths: string[];
  maxInputResolution: { width: number; height: number };
  maxOutputResolution: { width: number; height: number };
  vramRequirementMb: number; // Minimal VRAM for RTX 3050 4GB awareness
  averageLatencyMs: number;
  hosting: "local_cuda" | "cloud_space" | "universal_server";
}

export interface ImageEnhancementOptions {
  image: string; // Base64 data URI
  scale?: 2 | 4;
  operations?: EnhancementOperation[];
  model?: "auto" | SuperResolutionModelId;
  preserveFaces?: boolean;
  preserveColors?: boolean;
  preserveText?: boolean;
  noiseLevel?: "low" | "medium" | "high";
  sharpnessStrength?: number; // 0.0 to 1.0 (default 0.5)
  userId?: string;
  workspaceId?: string;
}

export interface QualityMetrics {
  /** Peak Signal-to-Noise Ratio (dB). Higher indicates higher numerical reconstruction fidelity. */
  psnr: number;
  /** Structural Similarity Index (0.0 to 1.0). Evaluates luminance, contrast, and structural preservation. */
  ssim: number;
  /** Percentage increase in high-frequency edge definition (Laplacian variance delta). */
  sharpnessGainPercent: number;
  /** Color fidelity score (0 to 100) based on RGB channel histogram cosine similarity. */
  colorFidelityScore: number;
  /** Estimated compression artifact and noise suppression rate (0 to 100). */
  artifactReductionScore: number;
  /** Face fidelity preservation score if faces are detected (0 to 100). */
  facePreservationScore?: number;
  /** Objective explanation of what the computed metrics signify and their real-world trade-offs. */
  explanation: string;
}

export interface StorageMetadata {
  originalPath?: string;
  enhancedPath?: string;
  storageBucket?: string;
  publicUrl?: string;
  signedUrl?: string;
  storedSeparately: boolean;
  storageMethod: "supabase" | "local_vault";
}

export interface ImageEnhancementResult {
  originalImage: string; // Base64 data URI
  enhancedImage: string; // Base64 data URI
  originalWidth: number;
  originalHeight: number;
  originalSizeBytes: number;
  enhancedWidth: number;
  enhancedHeight: number;
  enhancedSizeBytes: number;
  scaleFactor: 2 | 4;
  appliedOperations: EnhancementOperation[];
  modelUsed: SuperResolutionModelId;
  modelName: string;
  provider: "local-cuda" | "huggingface-space" | "cloud-superres" | "neural-lanczos-engine";
  latencyMs: number;
  metrics: QualityMetrics;
  storage?: StorageMetadata;
  notes: string;
  warnings?: string[];
}

export const SUPER_RES_MODELS: Record<SuperResolutionModelId, SuperResolutionModelSpec> = {
  "real-esrgan-x4plus": {
    id: "real-esrgan-x4plus",
    name: "Real-ESRGAN x4plus",
    exactIdentifier: "xinntao/Real-ESRGAN",
    architecture: "real_esrgan",
    license: "BSD-3-Clause",
    supportedScales: [2, 4],
    recommendedFor: ["photo", "3d_render", "landscape", "product"],
    strengths: ["fine detail reconstruction", "ringing artifact removal", "photorealism"],
    maxInputResolution: { width: 1024, height: 1024 },
    maxOutputResolution: { width: 4096, height: 4096 },
    vramRequirementMb: 3200, // Compatible with RTX 3050 4GB
    averageLatencyMs: 3400,
    hosting: "cloud_space",
  },
  "real-esrgan-anime-6b": {
    id: "real-esrgan-anime-6b",
    name: "Real-ESRGAN Anime 6B",
    exactIdentifier: "RealESRGAN_x4plus_anime_6B",
    architecture: "real_esrgan",
    license: "BSD-3-Clause",
    supportedScales: [2, 4],
    recommendedFor: ["anime"],
    strengths: ["clean line-art preservation", "zero color bleeding", "halftone artifact reduction"],
    maxInputResolution: { width: 1024, height: 1024 },
    maxOutputResolution: { width: 4096, height: 4096 },
    vramRequirementMb: 2400,
    averageLatencyMs: 2900,
    hosting: "cloud_space",
  },
  "real-esrgan-x2plus": {
    id: "real-esrgan-x2plus",
    name: "Real-ESRGAN x2plus",
    exactIdentifier: "RealESRGAN_x2plus",
    architecture: "real_esrgan",
    license: "BSD-3-Clause",
    supportedScales: [2],
    recommendedFor: ["photo", "product", "text"],
    strengths: ["high speed", "subtle sharpening", "conservative hallucination"],
    maxInputResolution: { width: 1536, height: 1536 },
    maxOutputResolution: { width: 3072, height: 3072 },
    vramRequirementMb: 2100,
    averageLatencyMs: 2200,
    hosting: "cloud_space",
  },
  "swinir-realworld-sr": {
    id: "swinir-realworld-sr",
    name: "SwinIR Real-World Super-Resolution",
    exactIdentifier: "JingyunLiang/SwinIR",
    architecture: "swin_transformer",
    license: "Apache-2.0",
    supportedScales: [2, 4],
    recommendedFor: ["photo", "portrait", "landscape"],
    strengths: ["long-range spatial attention", "noise reduction", "JPEG compression artifact removal"],
    maxInputResolution: { width: 1024, height: 1024 },
    maxOutputResolution: { width: 4096, height: 4096 },
    vramRequirementMb: 3600,
    averageLatencyMs: 4100,
    hosting: "cloud_space",
  },
  "gfpgan-face-restore": {
    id: "gfpgan-face-restore",
    name: "GFPGAN Facial Restoration v1.4",
    exactIdentifier: "TencentARC/GFPGAN",
    architecture: "gan",
    license: "Apache-2.0",
    supportedScales: [2, 4],
    recommendedFor: ["portrait"],
    strengths: ["facial landmark identity preservation", "eye and teeth clarity", "hair strand detail"],
    maxInputResolution: { width: 1024, height: 1024 },
    maxOutputResolution: { width: 2048, height: 2048 },
    vramRequirementMb: 3100,
    averageLatencyMs: 3600,
    hosting: "cloud_space",
  },
  "neural-bilateral-lanczos": {
    id: "neural-bilateral-lanczos",
    name: "TATTVA Neural Bilateral Lanczos Engine",
    exactIdentifier: "tattva/neural-lanczos-v2",
    architecture: "neural_kernel",
    license: "MIT",
    supportedScales: [2, 4],
    recommendedFor: ["photo", "anime", "3d_render", "portrait", "landscape", "text", "product"],
    strengths: ["100% cloud & serverless uptime", "zero GPU memory limit", "pure color preservation", "sharp text lines"],
    maxInputResolution: { width: 2048, height: 2048 },
    maxOutputResolution: { width: 8192, height: 8192 },
    vramRequirementMb: 0, // Zero VRAM requirement; runs in any environment
    averageLatencyMs: 850,
    hosting: "universal_server",
  },
};
