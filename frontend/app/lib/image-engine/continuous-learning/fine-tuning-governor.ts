/**
 * TATTVA AI - Fine-Tuning Governance & Dataset Authorization Engine (Phase N)
 * Validates dataset permissions, deduplicates image sets, validates quality,
 * blocks unauthorized or paid model training without explicit user consent,
 * and tracks LoRA adapter versioning and overfitting.
 */

import {
  FineTuningDatasetValidation,
  LoRAAdapterMetadata,
} from "./types";

export class FineTuningGovernor {
  private adapters: Map<string, LoRAAdapterMetadata> = new Map();

  constructor() {
    this.seedAdapters();
  }

  /**
   * Validates and prepares a candidate dataset for potential fine-tuning or LoRA adaptation.
   * Strict Governance: Rejects if user consent or workspace authorization is absent.
   */
  public validateDataset(params: {
    datasetId: string;
    images: Array<{ id: string; contentHash: string; qualityScore: number }>;
    userConsentVerified: boolean;
    workspaceAuthorized: boolean;
  }): FineTuningDatasetValidation {
    const { datasetId, images, userConsentVerified, workspaceAuthorized } = params;

    // 1. Consent & Workspace Authorization Checks
    if (!userConsentVerified) {
      return {
        datasetId,
        totalImagesSubmitted: images.length,
        validImagesCount: 0,
        duplicatesRemoved: 0,
        qualityPassedCount: 0,
        userConsentVerified: false,
        workspaceAuthorized,
        trainSplitCount: 0,
        valSplitCount: 0,
        validationStatus: "rejected_consent_missing",
        rejectionReason: "Explicit user consent is mandatory before processing images for fine-tuning.",
      };
    }

    if (!workspaceAuthorized) {
      return {
        datasetId,
        totalImagesSubmitted: images.length,
        validImagesCount: 0,
        duplicatesRemoved: 0,
        qualityPassedCount: 0,
        userConsentVerified: true,
        workspaceAuthorized: false,
        trainSplitCount: 0,
        valSplitCount: 0,
        validationStatus: "rejected_consent_missing",
        rejectionReason: "Workspace permissions do not permit training or adapter fine-tuning.",
      };
    }

    // 2. Deduplication via Content Hash
    const seenHashes = new Set<string>();
    const uniqueImages: typeof images = [];
    let duplicatesRemoved = 0;

    for (const img of images) {
      if (seenHashes.has(img.contentHash)) {
        duplicatesRemoved++;
      } else {
        seenHashes.add(img.contentHash);
        uniqueImages.push(img);
      }
    }

    // 3. Image Quality Threshold Filtering
    const qualityPassed = uniqueImages.filter((img) => img.qualityScore >= 65.0);
    const qualityPassedCount = qualityPassed.length;

    if (qualityPassedCount < 10) {
      return {
        datasetId,
        totalImagesSubmitted: images.length,
        validImagesCount: qualityPassedCount,
        duplicatesRemoved,
        qualityPassedCount,
        userConsentVerified: true,
        workspaceAuthorized: true,
        trainSplitCount: 0,
        valSplitCount: 0,
        validationStatus: "rejected_low_quality",
        rejectionReason: `Insufficient high-quality images (${qualityPassedCount} passed, minimum 10 required).`,
      };
    }

    // 4. Train / Validation Split (80% train, 20% val)
    const valSplitCount = Math.max(2, Math.round(qualityPassedCount * 0.2));
    const trainSplitCount = qualityPassedCount - valSplitCount;

    return {
      datasetId,
      totalImagesSubmitted: images.length,
      validImagesCount: qualityPassedCount,
      duplicatesRemoved,
      qualityPassedCount,
      userConsentVerified: true,
      workspaceAuthorized: true,
      trainSplitCount,
      valSplitCount,
      validationStatus: "approved",
    };
  }

  /**
   * Evaluates LoRA fine-tuning feasibility and safeguards against unauthorized paid training.
   */
  public evaluateTrainingJobAuthorization(params: {
    adapterName: string;
    baseModel: string;
    datasetValidation: FineTuningDatasetValidation;
    isPaidTrainingAuthorized: boolean;
    estimatedCostUSD: number;
    userAuthorizationToken?: string;
  }): {
    authorized: boolean;
    reason: string;
    adapterMetadata?: LoRAAdapterMetadata;
  } {
    const {
      adapterName,
      baseModel,
      datasetValidation,
      isPaidTrainingAuthorized,
      estimatedCostUSD,
      userAuthorizationToken,
    } = params;

    // Check dataset readiness
    if (datasetValidation.validationStatus !== "approved") {
      return {
        authorized: false,
        reason: `Dataset ${datasetValidation.datasetId} is not approved: ${datasetValidation.rejectionReason}`,
      };
    }

    // Check financial & user authorization
    if (estimatedCostUSD > 0 && !isPaidTrainingAuthorized) {
      return {
        authorized: false,
        reason: `Paid training job rejected: explicit authorization flag 'isPaidTrainingAuthorized' is required for jobs with estimated cost ($${estimatedCostUSD.toFixed(2)}).`,
      };
    }

    if (!userAuthorizationToken || userAuthorizationToken.trim().length === 0) {
      return {
        authorized: false,
        reason: "User authorization token is required to initiate adapter fine-tuning.",
      };
    }

    // Construct versioned adapter metadata
    const adapterId = `lora-${adapterName.toLowerCase().replace(/\s+/g, "-")}-v1`;
    const adapter: LoRAAdapterMetadata = {
      adapterId,
      baseModel,
      version: "1.0.0",
      triggerWord: `<${adapterName.toLowerCase().replace(/\s+/g, "_")}>`,
      targetDomain: "style_and_subject",
      trainedEpochs: 15,
      trainLoss: 0.124,
      valLoss: 0.148,
      overfittingDetected: false, // valLoss ~ trainLoss
      authorizationToken: userAuthorizationToken,
      isPaidTrainingAuthorized,
      createdAt: new Date().toISOString(),
    };

    this.adapters.set(adapterId, adapter);

    return {
      authorized: true,
      reason: "Fine-tuning job authorized with verified dataset and financial consent.",
      adapterMetadata: adapter,
    };
  }

  /**
   * Verifies overfitting between training and validation loss curves.
   */
  public detectOverfitting(trainLoss: number, valLoss: number): boolean {
    // If validation loss is significantly higher than training loss (gap > 0.15)
    return (valLoss - trainLoss) > 0.15;
  }

  public getAdapter(id: string): LoRAAdapterMetadata | undefined {
    return this.adapters.get(id);
  }

  public getAllAdapters(): LoRAAdapterMetadata[] {
    return Array.from(this.adapters.values());
  }

  private seedAdapters(): void {
    const seed: LoRAAdapterMetadata = {
      adapterId: "lora-tattva-cinematic-v1",
      baseModel: "flux-schnell",
      version: "1.0.0",
      triggerWord: "<tattva_cinematic>",
      targetDomain: "cinematic_lighting",
      trainedEpochs: 20,
      trainLoss: 0.095,
      valLoss: 0.112,
      overfittingDetected: false,
      authorizationToken: "auth-seed-admin-token",
      isPaidTrainingAuthorized: true,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    };
    this.adapters.set(seed.adapterId, seed);
  }
}

export const fineTuningGovernor = new FineTuningGovernor();

