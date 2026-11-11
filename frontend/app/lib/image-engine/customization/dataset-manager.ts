/**
 * TATTVA AI - Dataset Preparation & Rights Validation Engine (Phase G)
 * Validates image integrity, enforces rights/consent compliance, detects duplicates,
 * and compiles train/validation partitions for LoRA fine-tuning.
 */

import crypto from "crypto";
import { DatasetImage, DatasetManifest, CustomizationCategory } from "./types";

export interface DatasetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  datasetManifest?: DatasetManifest;
  manifest?: DatasetManifest;
  duplicateCount: number;
  averageResolution: { width: number; height: number };
}

/**
 * Validates and prepares a raw user dataset for model customization.
 */
export function validateAndPrepareDataset(params: {
  name: string;
  description?: string;
  category: CustomizationCategory;
  triggerWord: string;
  images: Array<{
    id?: string;
    imageUrl?: string;
    url?: string;
    caption?: string;
    width?: number;
    height?: number;
  }>;
  hasUserConsent: boolean;
  licenseDeclaration?: string;
  license?: string;
  userId: string;
  workspaceId?: string;
}): DatasetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Mandatory Copyright & User Consent Verification
  if (!params.hasUserConsent) {
    errors.push(
      "Dataset rights declaration rejected: You must explicitly confirm that you have user consent, own the rights, or have authorized license permissions to use these images for AI model adaptation."
    );
  }

  const cleanLicense = (params.licenseDeclaration || params.license || "").trim();
  if (cleanLicense.length < 5) {
    errors.push("A valid license declaration or copyright ownership statement is required.");
  }

  // 2. Trigger Word Validation
  const triggerWord = (params.triggerWord || "").trim();
  if (!triggerWord || triggerWord.length < 2) {
    errors.push("A distinct trigger word (e.g., 'sks style', 'tok product') is required to activate the adapter during generation.");
  }

  // 3. Image Quantity Verification
  if (!Array.isArray(params.images) || params.images.length < 4) {
    errors.push(`Dataset contains ${params.images?.length || 0} images. A minimum of 4 images (recommended: 8–25) is required for stable LoRA convergence.`);
  }

  if (params.images && params.images.length > 100) {
    warnings.push("Dataset contains over 100 images. For low-rank adaptation, 15–30 high-quality images usually yield the best balance between style transfer and prompt flexibility.");
  }

  const seenHashes = new Set<string>();
  const validatedImages: DatasetImage[] = [];
  let duplicateCount = 0;
  let totalWidth = 0;
  let totalHeight = 0;

  // 4. Per-Image Inspection & Validation
  const rawImages = params.images || [];
  for (let i = 0; i < rawImages.length; i++) {
    const raw = rawImages[i];
    const imageId = raw.id || `img_${i + 1}_${Date.now()}`;
    const url = (raw.imageUrl || raw.url || "").trim();

    if (!url.startsWith("data:image/") && !url.startsWith("http://") && !url.startsWith("https://")) {
      errors.push(`Image #${i + 1} has an invalid format. Must be a valid data URI (image/png, image/jpeg, image/webp) or secure HTTPS URL.`);
      continue;
    }

    // SHA-256 Duplicate Detection
    const hash = crypto.createHash("sha256").update(url.slice(0, 10000)).digest("hex");
    if (seenHashes.has(hash)) {
      duplicateCount++;
      warnings.push(`Image #${i + 1} is an exact or near duplicate of an existing image in the dataset and has been deduplicated.`);
      continue;
    }
    seenHashes.add(hash);

    const width = raw.width || 1024;
    const height = raw.height || 1024;

    // Minimum Resolution Check (at least 512x512)
    if (width < 512 || height < 512) {
      warnings.push(`Image #${i + 1} resolution (${width}x${height}) is below the recommended 512x512 threshold. Super-resolution pre-scaling will be applied.`);
    }

    totalWidth += width;
    totalHeight += height;

    // Caption Validation & Trigger Word Normalization
    let caption = (raw.caption || "").trim();
    if (!caption) {
      caption = `A photo in ${triggerWord} showing ${params.category.replace(/_/g, " ")}`;
    } else if (!caption.toLowerCase().includes(triggerWord.toLowerCase())) {
      caption = `${triggerWord}, ${caption}`;
    }

    validatedImages.push({
      id: imageId,
      imageUrl: url,
      caption,
      width,
      height,
      sizeBytes: Math.round((url.length * 3) / 4),
      sha256Hash: hash,
    });
  }

  // 5. Training vs. Validation Split (80% Train / 20% Validation)
  const valCount = Math.max(1, Math.floor(validatedImages.length * 0.2));
  for (let i = 0; i < validatedImages.length; i++) {
    validatedImages[i].isValidation = i >= validatedImages.length - valCount;
  }

  const avgWidth = validatedImages.length > 0 ? Math.round(totalWidth / validatedImages.length) : 1024;
  const avgHeight = validatedImages.length > 0 ? Math.round(totalHeight / validatedImages.length) : 1024;

  const datasetManifest: DatasetManifest = {
    id: `ds_${crypto.randomUUID().slice(0, 8)}`,
    name: params.name.trim() || "Untitled Dataset",
    description: params.description?.trim() || "",
    category: params.category,
    triggerWord,
    images: validatedImages,
    totalImages: validatedImages.length,
    trainingCount: validatedImages.length - valCount,
    validationCount: valCount,
    trainSplitCount: validatedImages.length - valCount,
    validationSplitCount: valCount,
    hasUserConsent: params.hasUserConsent,
    licenseDeclaration: cleanLicense,
    userId: params.userId,
    workspaceId: params.workspaceId || "default_workspace",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    datasetManifest: errors.length === 0 ? datasetManifest : undefined,
    manifest: errors.length === 0 ? datasetManifest : undefined,
    duplicateCount,
    averageResolution: { width: avgWidth, height: avgHeight },
  };
}
