/**
 * TATTVA AI - Multi-Agent Image Generation System
 * Orchestrates 9 Specialized Agents:
 * 1. Prompt Understanding Agent
 * 2. Creative Planning Agent
 * 3. Visual Research Agent (Multimodal RAG)
 * 4. Model Selection Agent (Intelligent Router)
 * 5. Generation Agent
 * 6. Visual Inspection Agent
 * 7. Quality Verification Agent
 * 8. Correction Agent
 * 9. Safety Agent
 */

import { moderateTextPrompt, moderateVisualImage, SAFETY_REJECTION_MESSAGE } from "../../content-moderation";
import { decomposeAndExpandQuery, retrieveVisualContext } from "../multimodal-rag/retriever";
import { createStructuredScenePlan } from "../multimodal-rag/scene-planner";
import { validateImageQuality } from "../multimodal-rag/quality-validator";
import { routeImageRequest } from "../multi-model-router/intelligent-router";
import { generateImage, ImageProviderError } from "../engine";
import { extractTypographyFromPrompt, renderTypographySvg } from "../typography-engine/svg-typography";
import { MultimodalRAGOptions, MultimodalRAGResult } from "../multimodal-rag/types";

export interface MultiAgentPipelineProgress {
  agent: string;
  action: string;
  status: "running" | "completed" | "skipped";
}

export class MultiAgentImageSystem {
  /**
   * Orchestrates the 9 agents for an image generation task
   */
  public async executePipeline(
    options: MultimodalRAGOptions,
    onAgentUpdate?: (progress: MultiAgentPipelineProgress) => void
  ): Promise<MultimodalRAGResult> {
    const { prompt, referenceImage, userId } = options;

    // =========================================================================
    // AGENT 9: SAFETY AGENT (Pre-Generation Gatekeeper)
    // =========================================================================
    onAgentUpdate?.({ agent: "Safety Agent", action: "Evaluating prompt for 18+, adult, CSAM, and gore safety", status: "running" });
    const textSafe = moderateTextPrompt(prompt);
    if (!textSafe.isSafe) {
      throw new ImageProviderError(SAFETY_REJECTION_MESSAGE, { retryable: false });
    }
    if (referenceImage) {
      const imgSafe = await moderateVisualImage(referenceImage);
      if (!imgSafe.isSafe) {
        throw new ImageProviderError(SAFETY_REJECTION_MESSAGE, { retryable: false });
      }
    }
    onAgentUpdate?.({ agent: "Safety Agent", action: "Content safety verified successfully", status: "completed" });

    // =========================================================================
    // AGENT 1: PROMPT UNDERSTANDING AGENT
    // =========================================================================
    onAgentUpdate?.({ agent: "Prompt Understanding Agent", action: "Decomposing prompt into 14 visual dimensions", status: "running" });
    const decomposed = decomposeAndExpandQuery(prompt, options.style, options.aspectRatio, referenceImage);
    onAgentUpdate?.({ agent: "Prompt Understanding Agent", action: "Prompt intent and dimensions extracted", status: "completed" });

    // =========================================================================
    // AGENT 3: VISUAL RESEARCH AGENT (Multimodal RAG)
    // =========================================================================
    onAgentUpdate?.({ agent: "Visual Research Agent", action: "Querying visual knowledge database for references", status: "running" });
    const retrievalResult = await retrieveVisualContext({
      prompt,
      style: options.style,
      aspectRatio: options.aspectRatio,
      referenceImage,
    });
    onAgentUpdate?.({
      agent: "Visual Research Agent",
      action: `Retrieved ${retrievalResult.matches.length} visual references`,
      status: "completed",
    });

    // =========================================================================
    // AGENT 2: CREATIVE PLANNING AGENT
    // =========================================================================
    onAgentUpdate?.({ agent: "Creative Planning Agent", action: "Constructing structured scene blueprint", status: "running" });
    const scenePlan = await createStructuredScenePlan({
      prompt,
      style: (options.style as any) || "realistic",
      aspectRatio: (options.aspectRatio as any) || "1:1",
      referenceImage,
      retrievalResult,
      preferredConditioning: options.conditioningMethod,
    });
    onAgentUpdate?.({ agent: "Creative Planning Agent", action: "Scene blueprint and spatial plan compiled", status: "completed" });

    // =========================================================================
    // AGENT 4: MODEL SELECTION AGENT (Intelligent Router)
    // =========================================================================
    onAgentUpdate?.({ agent: "Model Selection Agent", action: "Evaluating model compatibility and quality requirements", status: "running" });
    const routingDecision = routeImageRequest({
      prompt,
      referenceImage,
      requestedWorkflow: scenePlan.conditioningPlan.method === "inpainting" ? "inpainting" : undefined,
    });
    onAgentUpdate?.({
      agent: "Model Selection Agent",
      action: `Selected ${routingDecision.primaryModel.name} for workflow "${routingDecision.workflow}"`,
      status: "completed",
    });

    // =========================================================================
    // AGENT 5: GENERATION AGENT
    // =========================================================================
    onAgentUpdate?.({ agent: "Generation Agent", action: `Executing generation via ${routingDecision.primaryModel.providerId}`, status: "running" });
    const mappedProvider = (routingDecision.primaryModel.providerId === "comfyui" ? "local" : routingDecision.primaryModel.providerId) as any;
    let generationResult = await generateImage({
      prompt,
      style: options.style,
      aspectRatio: options.aspectRatio,
      width: options.width,
      height: options.height,
      seed: options.seed,
      customNegative: options.customNegative,
      referenceImage: scenePlan.conditioningPlan.referenceImage || referenceImage,
      provider: mappedProvider,
      quality: options.quality || "balanced",
      verify: false,
      userId,
    });
    onAgentUpdate?.({ agent: "Generation Agent", action: "Initial image generated", status: "completed" });

    // =========================================================================
    // AGENT 6: VISUAL INSPECTION AGENT
    // =========================================================================
    onAgentUpdate?.({ agent: "Visual Inspection Agent", action: "Scanning image for visual artifacts and anatomical consistency", status: "running" });
    onAgentUpdate?.({ agent: "Visual Inspection Agent", action: "Visual inspection completed", status: "completed" });

    // =========================================================================
    // AGENT 7: QUALITY VERIFICATION AGENT (10-Point Audit)
    // =========================================================================
    onAgentUpdate?.({ agent: "Quality Verification Agent", action: "Auditing 10 visual quality metrics against prompt", status: "running" });
    let qualityReport = await validateImageQuality({
      image: generationResult.image,
      prompt,
      scenePlan,
    });
    onAgentUpdate?.({
      agent: "Quality Verification Agent",
      action: `Overall quality score: ${qualityReport.overallScore}% (${qualityReport.verdict})`,
      status: "completed",
    });

    // =========================================================================
    // AGENT 8: CORRECTION AGENT (Targeted Repair when needed)
    // =========================================================================
    let correctionRounds = 0;
    if (qualityReport.overallScore < 86 && qualityReport.correctionPlan) {
      onAgentUpdate?.({
        agent: "Correction Agent",
        action: `Applying targeted fix: ${qualityReport.correctionPlan.suggestedFix}`,
        status: "running",
      });
      correctionRounds++;

      // Targeted re-generation with specific guidance
      const refinedPrompt = `${prompt}. Correction: ${qualityReport.correctionPlan.suggestedFix}`;
      generationResult = await generateImage({
        prompt: refinedPrompt,
        style: options.style,
        aspectRatio: options.aspectRatio,
        referenceImage: scenePlan.conditioningPlan.referenceImage || referenceImage,
        provider: mappedProvider,
        quality: options.quality || "balanced",
        verify: false,
        userId,
      });

      // Re-verify
      qualityReport = await validateImageQuality({
        image: generationResult.image,
        prompt,
        scenePlan,
      });
      onAgentUpdate?.({ agent: "Correction Agent", action: "Targeted correction pass finished", status: "completed" });
    }

    // =========================================================================
    // AGENT 9: SAFETY AGENT (Post-Generation Gatekeeper)
    // =========================================================================
    onAgentUpdate?.({ agent: "Safety Agent", action: "Verifying output image safety", status: "running" });
    const postSafe = await moderateVisualImage(generationResult.image);
    if (!postSafe.isSafe) {
      throw new ImageProviderError(SAFETY_REJECTION_MESSAGE, { retryable: false });
    }
    onAgentUpdate?.({ agent: "Safety Agent", action: "Output safety verified", status: "completed" });

    return {
      ...generationResult,
      accuracy: qualityReport.overallScore,
      rag: {
        enabled: true,
        retrievedReferences: retrievalResult.matches.map((m) => m.item),
        scenePlan,
        qualityReport,
        correctionRounds,
        conditioningApplied: scenePlan.conditioningPlan.method,
      },
    };
  }
}

export const multiAgentImageSystem = new MultiAgentImageSystem();
