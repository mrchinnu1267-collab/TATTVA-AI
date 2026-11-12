/**
 * TATTVA AI - Intelligent Model & Workflow Router (Phase C)
 * Automatically evaluates prompt complexity, visual domain, reference conditioning,
 * provider quotas, latency expectations, and cost to select the optimal model pipeline.
 */

import {
  ImageWorkflowType,
  RouterSelectionDecision,
  RoutingAnalysisParams,
  ModelSpecification,
} from "./types";
import {
  SUPPORTED_MODELS,
  getModelById,
  listAvailableModels,
} from "./model-registry";
import { rankModelsByCategory, getBenchmarkMetric } from "./benchmark-system";
import { getCooldownRemaining, isRunningOnVercel } from "../providers";
import { checkProviderReferenceSupport } from "../reference-conditioning/capabilities";
import { classifyConditioningIntent } from "../reference-conditioning/analyzer";
import { isProviderCompatibleWithOperation } from "../provider-capabilities";
import { ImageProviderChoice, ImageProviderId } from "../types";

/**
 * Checks whether a given provider is currently healthy and not in cooldown.
 */
function isProviderAvailable(providerId: ImageProviderId): boolean {
  if (getCooldownRemaining(providerId) > 0) return false;

  // In testing environments, all providers are treated as available for routing
  if (process.env.NODE_ENV === "test") return true;

  // Check credential configuration
  if (providerId === "openai" && !Boolean((process.env.OPENAI_API_KEY || "").trim())) {
    return false;
  }
  if (providerId === "gemini" && !Boolean((process.env.GEMINI_API_KEY || "").trim())) {
    return false;
  }
  if (providerId === "huggingface" && !Boolean((process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim())) {
    return false;
  }
  if (providerId === "pollinations") {
    return true;
  }
  if (providerId === "local") {
    const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    const localUrl = (process.env.LOCAL_IMAGE_ENGINE_URL || "").trim();
    const isLocalhost = !localUrl || /^https?:\/\/(127\.0\.0\.1|localhost)/i.test(localUrl);
    // On Vercel, localhost engine cannot be accessed and should be skipped
    if (onVercel && isLocalhost) {
      return false;
    }
  }

  return true;
}

/**
 * Routes an incoming image generation request to the premier model pipeline.
 */
export function routeImageRequest(params: RoutingAnalysisParams): RouterSelectionDecision {
  const { prompt, referenceImage, quality = "balanced", isOffline = false, preferredProvider } = params;
  const p = prompt.toLowerCase().trim();
  const warnings: string[] = [];

  // ===========================================================================
  // 1. WORKFLOW & INTENT CLASSIFICATION
  // ===========================================================================
  let workflow: ImageWorkflowType = "text_to_image";
  let confidence = 0.85;
  let typographyOverlayNeeded = false;
  let controlMethod: string | undefined = undefined;

  if (params.requestedWorkflow) {
    workflow = params.requestedWorkflow;
    confidence = 0.95;
  } else if (referenceImage) {
    const intent = classifyConditioningIntent(prompt);
    switch (intent.intentType) {
      case "keep_character":
        workflow = "character_preservation";
        controlMethod = "reference-character-lock";
        confidence = 0.94;
        break;
      case "change_background":
        workflow = "background_replacement";
        controlMethod = "background-inpaint";
        confidence = 0.92;
        break;
      case "preserve_composition":
        workflow = "composition_transfer";
        controlMethod = "controlnet-depth";
        confidence = 0.90;
        break;
      case "change_color":
      case "add_object":
        workflow = "inpainting";
        controlMethod = "localized-edit";
        confidence = 0.88;
        break;
      case "style_transfer":
        workflow = "style_transfer";
        controlMethod = "style-adapter";
        confidence = 0.89;
        break;
      default:
        workflow = "image_to_image";
        controlMethod = "img2img";
        confidence = 0.85;
        break;
    }
  } else {
    // Text-to-Image Domain Specializations
    const hasQuotedText = /"([^"]+)"/.test(prompt);
    const isPoster = /poster|banner|flyer|typography|headline|logo|badge/i.test(p);
    const isAnime = /anime|manga|ghibli|cel\s+shaded|vtuber|kawaii|studio\s+ghibli|makoto\s+shinkai/i.test(p);
    const isProduct = /product|commercial|bottle|sneaker|watch|packaging|cosmetic|studio\s+shot|luxury\s+brand/i.test(p);
    const isPortrait = /portrait|close-up\s+face|headshot|avatar|human\s+face|elderly\s+man|young\s+woman/i.test(p);
    const isPhotoreal = /photorealistic|national\s+geographic|photo|photograph|35mm\s+lens|nikon|canon|dslr|raw\s+photo/i.test(p);
    const isComplex = /(?:bustling|crowded|grand|ballroom|temple|harbor|market|orbital|snowfall).{50,}/i.test(p) || p.length > 200;
    const isFastRequested = quality === "fast" || /quick|fast|draft|speed/i.test(p);

    if (hasQuotedText || isPoster) {
      workflow = "poster_typography";
      typographyOverlayNeeded = hasQuotedText;
      confidence = 0.95;
    } else if (isAnime) {
      workflow = "anime_illustration";
      confidence = 0.93;
    } else if (isProduct) {
      workflow = "product_photography";
      confidence = 0.91;
    } else if (isPortrait) {
      workflow = "portrait_generation";
      confidence = 0.89;
    } else if (isPhotoreal) {
      workflow = "photorealism";
      confidence = 0.92;
    } else if (isFastRequested) {
      workflow = "fast_generation";
      confidence = 0.88;
    } else if (isComplex) {
      workflow = "high_complexity_scene";
      confidence = 0.90;
    }
  }

  // ===========================================================================
  // 2. MODEL CANDIDATE POOL FILTERING
  // ===========================================================================
  let candidateModels: ModelSpecification[] = listAvailableModels();

  // If user requested offline execution, restrict strictly to local engine
  if (isOffline) {
    candidateModels = candidateModels.filter((m) => m.offlineCapable && m.providerId === "local");
  }

  // CRITICAL: If reference image is present, eliminate models that do not support reference conditioning!
  // Never silently discard reference images!
  if (referenceImage) {
    candidateModels = candidateModels.filter((m) => {
      const cap = checkProviderReferenceSupport(m.providerId);
      return cap.supportsReferenceImage && m.supportsReferenceImage;
    });

    if (preferredProvider === "openai") {
      warnings.push(
        "OpenAI DALL-E 3 does not accept reference images. Routed to reference-compatible multimodal provider."
      );
    }
  }

  // Filter for inpainting / outpainting capable models if editing workflow requested
  if (workflow === "inpainting") {
    const inpaintCapable = candidateModels.filter(
      (m) => m.supportsInpainting && isProviderCompatibleWithOperation(m.providerId, "inpainting")
    );
    if (inpaintCapable.length > 0) {
      candidateModels = inpaintCapable;
    }
  } else if (workflow === "outpainting") {
    const outpaintCapable = candidateModels.filter(
      (m) => isProviderCompatibleWithOperation(m.providerId, "outpainting")
    );
    if (outpaintCapable.length > 0) {
      candidateModels = outpaintCapable;
    }
  }

  // Adapter Compatibility Check (Phase G)
  if (params.activeAdapterId) {
    // If an adapter is active, prioritize base models matching the adapter architecture (SDXL, FLUX, SD 1.5)
    const adapterTarget = params.activeAdapterId.toLowerCase();
    const isFluxAdapter = adapterTarget.includes("flux");
    const isAnimeAdapter = adapterTarget.includes("anime") || adapterTarget.includes("animagine");
    const isSD15Adapter = adapterTarget.includes("sd15") || adapterTarget.includes("1.5") || adapterTarget.includes("v1-5");

    const adapterCompatible = candidateModels.filter((m) => {
      if (isFluxAdapter) return m.family === "flux";
      if (isAnimeAdapter) return m.id.includes("animagine") || m.family === "sdxl";
      if (isSD15Adapter) return m.family === "sd15" || m.id.includes("sd15");
      // Default to SDXL family for general style / art nouveau / 3D LoRAs
      return m.family === "sdxl" || m.family === "flux";
    });

    if (adapterCompatible.length > 0) {
      candidateModels = adapterCompatible;
    } else {
      warnings.push(`Active custom adapter '${params.activeAdapterId}' may require an SDXL/FLUX-compatible engine.`);
    }
  }

  // Respect user's explicit provider choice if compatible
  if (preferredProvider && preferredProvider !== "auto") {
    const userMatches = candidateModels.filter((m) => m.providerId === preferredProvider);
    if (userMatches.length > 0) {
      candidateModels = userMatches;
    } else {
      warnings.push(
        `Preferred provider '${preferredProvider}' is incompatible with request requirements. Selecting best compatible model.`
      );
    }
  }

  // ===========================================================================
  // 3. QUALITY BENCHMARK RANKING & SELECTION
  // ===========================================================================
  const ranked = rankModelsByCategory(workflow);
  let primaryModel: ModelSpecification | undefined = undefined;

  // Find highest ranked candidate that is currently available (not in cooldown)
  for (const rankItem of ranked) {
    const matched = candidateModels.find((m) => m.id === rankItem.modelId);
    if (matched && isProviderAvailable(matched.providerId)) {
      primaryModel = matched;
      break;
    }
  }

  // Fallback: If no benchmark match was healthy, pick from candidates based on domain
  if (!primaryModel) {
    if (referenceImage) {
      primaryModel =
        candidateModels.find((m) => m.providerId === "gemini" && isProviderAvailable("gemini")) ||
        candidateModels.find((m) => m.providerId === "huggingface" && isProviderAvailable("huggingface")) ||
        candidateModels.find((m) => m.providerId === "local") ||
        candidateModels[0];
    } else if (workflow === "poster_typography" || workflow === "photorealism") {
      primaryModel =
        candidateModels.find((m) => m.id === "flux-1-dev" && isProviderAvailable("huggingface")) ||
        candidateModels.find((m) => m.id === "flux-1-schnell" && isProviderAvailable("huggingface")) ||
        candidateModels.find((m) => m.providerId === "gemini" && isProviderAvailable("gemini")) ||
        candidateModels[0];
    } else if (workflow === "anime_illustration") {
      primaryModel =
        candidateModels.find((m) => m.id === "animagine-xl-3.1" && isProviderAvailable("huggingface")) ||
        candidateModels.find((m) => m.id === "flux-1-schnell" && isProviderAvailable("huggingface")) ||
        candidateModels[0];
    } else if (quality === "fast") {
      primaryModel =
        candidateModels.find((m) => m.id === "ap123-sdxl-lightning" && isProviderAvailable("huggingface")) ||
        candidateModels.find((m) => m.id === "flux-1-schnell" && isProviderAvailable("huggingface")) ||
        candidateModels[0];
    } else {
      primaryModel =
        candidateModels.find((m) => isProviderAvailable(m.providerId)) ||
        candidateModels[0];
    }
  }

  // Guarantee valid primary model fallback
  if (!primaryModel) {
    primaryModel = SUPPORTED_MODELS["flux-1-schnell"] || Object.values(SUPPORTED_MODELS)[0];
  }

  // ===========================================================================
  // 4. FALLBACK CHAIN ASSEMBLY WITH STRICT OPERATION COMPATIBILITY
  // ===========================================================================
  // Filter remaining candidate models to build ordered fallback chain
  const fallbackModels = candidateModels.filter((m) => m.id !== primaryModel!.id);
  const providerChainSet = new Set<ImageProviderId>();
  providerChainSet.add(primaryModel.providerId);

  // On Vercel cloud serverless, prioritize ultra-fast cloud fallback (Pollinations Turbo: 5-7s)
  // before slow ZeroGPU Gradio spaces to protect against serverless timeout kills
  if (isRunningOnVercel() && !referenceImage && isProviderAvailable("pollinations")) {
    providerChainSet.add("pollinations");
  }

  for (const fb of fallbackModels) {
    if (workflow === "inpainting" && !isProviderCompatibleWithOperation(fb.providerId, "inpainting")) continue;
    if (workflow === "outpainting" && !isProviderCompatibleWithOperation(fb.providerId, "outpainting")) continue;
    if (referenceImage && !isProviderCompatibleWithOperation(fb.providerId, "reference_image")) continue;
    providerChainSet.add(fb.providerId);
  }

  // Ensure full fallback fleet is accessible, but STRICTLY RESPECT ACTUAL OPERATION SUPPORT
  if (!isOffline) {
    const backupFleet: ImageProviderId[] = ["huggingface", "pollinations", "gemini", "local", "openai"];
    for (const p of backupFleet) {
      // 1. Reference Image Compatibility (OpenAI & Pollinations do not support reference inputs)
      if (referenceImage && !isProviderCompatibleWithOperation(p, "reference_image")) {
        continue;
      }
      // 2. Inpainting Compatibility
      if (workflow === "inpainting" && !isProviderCompatibleWithOperation(p, "inpainting")) {
        continue;
      }
      // 3. Outpainting Compatibility
      if (workflow === "outpainting" && !isProviderCompatibleWithOperation(p, "outpainting")) {
        continue;
      }
      // 4. Image Editing / Composition Transfer Compatibility
      if (
        (workflow === "background_replacement" || workflow === "character_preservation" || workflow === "style_transfer") &&
        !isProviderCompatibleWithOperation(p, "image_editing")
      ) {
        continue;
      }
      providerChainSet.add(p);
    }
  }

  const fallbackChain: ImageProviderId[] = Array.from(providerChainSet);

  // ===========================================================================
  // 5. RATIONALE & METRIC SYNTHESIS
  // ===========================================================================
  const metric = getBenchmarkMetric(primaryModel.id, workflow);
  const estimatedCost = primaryModel.pricingUsdPerMegapixel;
  const estimatedLatency = metric?.averageLatencyMs || primaryModel.averageLatencyMs;

  const rationale = [
    `Workflow: "${workflow}" (confidence: ${Math.round(confidence * 100)}%).`,
    `Selected: "${primaryModel.name}" via ${primaryModel.providerId.toUpperCase()}.`,
    `Strengths: ${primaryModel.strengths.slice(0, 2).join(", ")}.`,
    referenceImage ? `Reference image preserved for ${primaryModel.providerId} conditioning.` : "",
    estimatedCost === 0 ? "Cost: Free tier / local execution." : `Estimated cost: $${estimatedCost.toFixed(4)}/MP.`,
    `Estimated latency: ${(estimatedLatency / 1000).toFixed(1)}s.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    workflow,
    confidence,
    primaryModel,
    fallbackModels,
    fallbackChain,
    executionMode: isOffline ? "local" : primaryModel.hosting === "local_offline" ? "local" : "cloud",
    controlMethod,
    typographyOverlayNeeded,
    selectionRationale: rationale,
    estimatedCostUsd: estimatedCost,
    estimatedLatencyMs: estimatedLatency,
    referenceSafe: Boolean(referenceImage),
    quotaAware: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
