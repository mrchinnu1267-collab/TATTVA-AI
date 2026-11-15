/**
 * TATTVA AI - Automatic Subscribed Image Agent Coordinator
 * Orchestrates parallel job submission, companion integration, Sharp validation,
 * automatic fallback, and Supabase Storage persistence.
 */

import sharp from "sharp";
import crypto from "crypto";
import { StorageService } from "../services/storage.service";
import { auditIntegrationFeasibility } from "./feasibility-auditor";
import { compileDualPrompts } from "./prompt-intelligence";
import { SubscribedJobManager } from "./job-manager";
import { CompanionClient } from "./companion-client";
import { ExternalImageAgentAAdapter } from "./external-agent-a-adapter";
import { ExternalImageAgentBAdapter } from "./external-agent-b-adapter";
import {
  ConnectionMode,
  GenerationJob,
  ImageIntentCategory,
  SubscribedAgentId,
  ImageSourceClassification,
} from "./types";

export interface OrchestrationOptions {
  userId: string;
  workspaceId: string;
  prompt: string;
  category?: ImageIntentCategory;
  aspectRatio?: string;
  agentAMode?: ConnectionMode;
  agentBMode?: ConnectionMode;
  onJobUpdate?: (job: GenerationJob) => void;
  timeoutMs?: number;
  userAccessToken?: string;
}

export class AutomaticSubscribedAgentCoordinator {
  /**
   * Executes full dual-agent image generation pipeline concurrently
   */
  public static async orchestrateDualGeneration(
    options: OrchestrationOptions
  ): Promise<GenerationJob> {
    const {
      userId,
      workspaceId,
      prompt,
      category = "photorealistic",
      aspectRatio = "1:1",
      timeoutMs = 60_000,
      onJobUpdate,
    } = options;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("A valid prompt string is required for image generation.");
    }

    // 1. Audit Integration Feasibility & Connectivity
    const feasibility = await auditIntegrationFeasibility({
      agentAMode: options.agentAMode,
      agentBMode: options.agentBMode,
    });

    // 2. Prompt Intelligence: Decompose semantics & compile specialized prompts
    const compiled = compileDualPrompts(prompt, category, aspectRatio);

    // 3. Create Persistent Generation Job (Queued State)
    const job = SubscribedJobManager.createJob({
      userId,
      workspaceId,
      originalPrompt: prompt.trim(),
      category: compiled.dimensions.imageType,
      aspectRatio,
      agentAPrompt: compiled.agentA.prompt,
      agentBPrompt: compiled.agentB.prompt,
      agentAMode: feasibility.matrix.agent_a.currentMode,
      agentBMode: feasibility.matrix.agent_b.currentMode,
    });
    onJobUpdate?.(job);

    // 4. Parallel Independent Job Execution
    const executeAgent = async (
      agentId: SubscribedAgentId,
      agentPrompt: string,
      mode: ConnectionMode,
      canAutoSubmit: boolean
    ) => {
      const now = new Date().toISOString();

      // Check if this agent is genuinely automatable
      if (!canAutoSubmit) {
        SubscribedJobManager.updateSubJob(job.jobId, agentId, {
          status: "failed",
          error: `Automated generation not available for ${agentId === "agent_a" ? "Agent A" : "Agent B"} in user-assisted mode. Local companion connector (127.0.0.1:4848) or OAuth is required.`,
          completedAt: now,
          progressPercent: 0,
        });
        return;
      }

      try {
        // Step A: Submitting
        SubscribedJobManager.updateSubJob(job.jobId, agentId, {
          status: "submitting",
          progressPercent: 15,
        });
        onJobUpdate?.(SubscribedJobManager.getJob(job.jobId, userId, workspaceId)!);

        // Step B: Submit to Local Companion Bridge
        const submitResult = await CompanionClient.submitJob({
          jobId: job.jobId,
          agentId,
          prompt: agentPrompt,
          category: compiled.dimensions.imageType,
          aspectRatio,
        });

        SubscribedJobManager.updateSubJob(job.jobId, agentId, {
          status: "processing",
          providerJobId: submitResult.providerJobId,
          progressPercent: 35,
        });
        onJobUpdate?.(SubscribedJobManager.getJob(job.jobId, userId, workspaceId)!);

        // Step C: Poll for Completion
        const result = await CompanionClient.pollUntilCompletion(
          job.jobId,
          agentId,
          (progress) => {
            SubscribedJobManager.updateSubJob(job.jobId, agentId, {
              status: "processing",
              progressPercent: Math.min(progress, 90),
            });
            onJobUpdate?.(SubscribedJobManager.getJob(job.jobId, userId, workspaceId)!);
          },
          timeoutMs
        );

        // Step D: Validate Returned Image Payload with Sharp
        const validation = await this.validateImagePayload(result.imageDataUri);
        const sha256 = crypto.createHash("sha256").update(validation.buffer).digest("hex");
        const sourceClassification: ImageSourceClassification =
          agentId === "agent_a" ? "external_subscribed_agent_a" : "external_subscribed_agent_b";

        // Step E: Persist to Supabase Storage & Local Workspace Vault
        const agentDisplayName =
          agentId === "agent_a" ? "Image Agent A (Subscribed)" : "Image Agent B (Subscribed)";

        const storageRecord = await StorageService.persistImage({
          dataUriOrBuffer: validation.buffer,
          prompt: agentPrompt,
          originalPrompt: prompt.trim(),
          provider: agentId === "agent_a" ? "subscribed_agent_a" : "subscribed_agent_b",
          model: agentDisplayName,
          agentId,
          parameters: {
            width: validation.width,
            height: validation.height,
            aspectRatio: validation.aspectRatio,
            quality: "subscribed_high",
            style: category,
          },
          operation: "subscribed_agent_automatic_generation",
          userId,
          workspaceId,
          userAccessToken: options.userAccessToken,
          sourceClassification,
        });

        // Step F: Mark SubJob Completed
        SubscribedJobManager.updateSubJob(job.jobId, agentId, {
          status: "completed",
          progressPercent: 100,
          outputImage: result.imageDataUri,
          imageUrl: storageRecord.url,
          metadata: {
            format: validation.format,
            width: validation.width,
            height: validation.height,
            aspectRatio: validation.aspectRatio,
            fileSizeBytes: validation.fileSizeBytes,
            storagePath: storageRecord.url,
            sourceClassification,
            sha256,
          },
          completedAt: new Date().toISOString(),
        });
        onJobUpdate?.(SubscribedJobManager.getJob(job.jobId, userId, workspaceId)!);
      } catch (err: any) {
        SubscribedJobManager.updateSubJob(job.jobId, agentId, {
          status: "failed",
          error: err.message || `Unexpected error during ${agentId} generation.`,
          completedAt: new Date().toISOString(),
          progressPercent: 0,
        });
        onJobUpdate?.(SubscribedJobManager.getJob(job.jobId, userId, workspaceId)!);
      }
    };

    // Run both jobs concurrently with independent failure isolation
    await Promise.allSettled([
      executeAgent(
        "agent_a",
        compiled.agentA.prompt,
        feasibility.matrix.agent_a.currentMode,
        feasibility.matrix.agent_a.canAutoSubmit
      ),
      executeAgent(
        "agent_b",
        compiled.agentB.prompt,
        feasibility.matrix.agent_b.currentMode,
        feasibility.matrix.agent_b.canAutoSubmit
      ),
    ]);

    // 5. Automatic Fallback Evaluation
    const finalJob = SubscribedJobManager.getJob(job.jobId, userId, workspaceId)!;

    if (finalJob.agentAJob.status === "failed" && finalJob.agentBJob.status === "completed") {
      finalJob.fallbackApplied = true;
      finalJob.fallbackNotes = "Agent A generation failed; Agent B succeeded independently.";
    } else if (finalJob.agentBJob.status === "failed" && finalJob.agentAJob.status === "completed") {
      finalJob.fallbackApplied = true;
      finalJob.fallbackNotes = "Agent B generation failed; Agent A succeeded independently.";
    } else if (finalJob.agentAJob.status === "failed" && finalJob.agentBJob.status === "failed") {
      finalJob.fallbackApplied = false;
      finalJob.fallbackNotes = "Both agents failed execution. Inspect error messages.";
    }

    onJobUpdate?.(finalJob);
    return finalJob;
  }

  /**
   * Performs deep verification on raw image data URI using Sharp.
   */
  public static async validateImagePayload(dataUriOrBase64: string): Promise<{
    valid: boolean;
    buffer: Buffer;
    format: string;
    width: number;
    height: number;
    aspectRatio: string;
    fileSizeBytes: number;
  }> {
    let buffer: Buffer;
    const cleanData = dataUriOrBase64.trim();

    if (cleanData.startsWith("data:")) {
      const commaIndex = cleanData.indexOf(",");
      if (commaIndex === -1) {
        throw new Error("Invalid image payload: missing base64 comma separator.");
      }
      buffer = Buffer.from(cleanData.slice(commaIndex + 1), "base64");
    } else {
      buffer = Buffer.from(cleanData, "base64");
    }

    if (buffer.length === 0) {
      throw new Error("Received empty image payload.");
    }

    if (buffer.length > 25 * 1024 * 1024) {
      throw new Error("Image payload exceeds maximum permitted size of 25MB.");
    }

    let meta;
    try {
      meta = await sharp(buffer).metadata();
    } catch {
      throw new Error("Could not parse image header or dimensions.");
    }

    if (!meta.format || !meta.width || !meta.height) {
      throw new Error("Could not parse image header or dimensions.");
    }

    const supported = ["png", "jpeg", "webp", "avif"];
    if (!supported.includes(meta.format)) {
      throw new Error(`Unsupported image format '${meta.format}'. Expected PNG, JPEG, or WebP.`);
    }

    return {
      valid: true,
      buffer,
      format: meta.format,
      width: meta.width,
      height: meta.height,
      aspectRatio: (meta.width / meta.height).toFixed(2),
      fileSizeBytes: buffer.length,
    };
  }
}
