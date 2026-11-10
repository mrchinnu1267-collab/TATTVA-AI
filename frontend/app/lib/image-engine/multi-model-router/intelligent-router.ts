/**
 * TATTVA AI - Intelligent Model & Workflow Router
 * Automatically maps user prompts to the premier generative pipeline,
 * evaluating quality, latency, hardware constraints, and mode requirements.
 */

import {
  ExecutionMode,
  ImageWorkflowType,
  RouterSelectionDecision,
} from "./types";
import { SUPPORTED_MODELS } from "./model-registry";

export interface RoutingAnalysisParams {
  prompt: string;
  referenceImage?: string;
  preferredMode?: ExecutionMode;
  isOffline?: boolean;
  requestedWorkflow?: ImageWorkflowType;
}

export function routeImageRequest(params: RoutingAnalysisParams): RouterSelectionDecision {
  const { prompt, referenceImage, isOffline = false } = params;
  const p = prompt.toLowerCase().trim();

  // 1. Determine Execution Mode
  let executionMode: ExecutionMode = params.preferredMode || "advanced_hybrid";
  if (isOffline) {
    executionMode = "offline";
  }

  // 2. Classify Workflow Type
  let workflow: ImageWorkflowType = "text_to_image";
  let controlMethod: any = "none";
  let typographyOverlayNeeded = false;
  let upscaleTargetMultiplier: 2 | 4 | undefined = undefined;

  if (params.requestedWorkflow) {
    workflow = params.requestedWorkflow;
  } else if (referenceImage) {
    if (/change\s+the\s+background|replace\s+the\s+background|remove\s+background/i.test(p)) {
      workflow = "background_replacement";
      controlMethod = "inpaint";
    } else if (/inpaint|edit\s+this|remove\s+object|fix\s+this\s+part/i.test(p)) {
      workflow = "inpainting";
      controlMethod = "inpaint";
    } else if (/outpaint|extend\s+canvas|expand\s+image|un-crop/i.test(p)) {
      workflow = "outpainting";
      controlMethod = "inpaint";
    } else if (/in\s+the\s+style\s+of|style\s+transfer|make\s+it\s+look\s+like/i.test(p)) {
      workflow = "style_transfer";
      controlMethod = "ip-adapter";
    } else if (/variation|similar\s+to\s+this|different\s+version/i.test(p)) {
      workflow = "image_variations";
      controlMethod = "ip-adapter";
    } else if (/restore|enhance|clean\s+up|denoise|fix\s+scratch/i.test(p)) {
      workflow = "image_restoration";
    } else if (/upscale|high\s+res|4k|super\s+resolution/i.test(p)) {
      workflow = "super_resolution";
      upscaleTargetMultiplier = 4;
    } else {
      workflow = "image_to_image";
      controlMethod = "ip-adapter";
    }
  } else {
    // Text-to-Image Domain Specializations
    if (/poster|banner|flyer|typography|headline|logo|badge/i.test(p) || /"([^"]+)"/.test(prompt)) {
      workflow = "poster_creation";
      typographyOverlayNeeded = /"([^"]+)"/.test(prompt);
    } else if (/product|commercial|bottle|sneaker|watch|packaging|cosmetic|studio\s+shot/i.test(p)) {
      workflow = "product_photography";
      controlMethod = "controlnet-depth";
    } else if (/portrait|close-up\s+face|headshot|avatar|human\s+face/i.test(p)) {
      workflow = "portrait_generation";
      controlMethod = "controlnet-pose";
    } else if (/anime|manga|ghibli|cel\s+shaded|vtuber|kawaii/i.test(p)) {
      workflow = "anime_artwork";
    } else if (/transparent\s+background|cutout|isolated\s+on\s+white|png\s+icon/i.test(p)) {
      workflow = "transparent_background";
    }
  }

  // 3. Model Selection based on Mode and Workflow
  let primaryModel = SUPPORTED_MODELS["flux-1-dev"];
  const fallbackModels = [
    SUPPORTED_MODELS["gemini-3.1-flash-image"],
    SUPPORTED_MODELS["local-cuda-diffusion"],
  ];

  if (executionMode === "offline") {
    primaryModel = SUPPORTED_MODELS["local-cuda-diffusion"];
  } else if (executionMode === "independent_free") {
    primaryModel = SUPPORTED_MODELS["local-cuda-diffusion"];
  } else {
    // Advanced Hybrid Mode - Pick best model for workflow
    if (workflow === "poster_creation" || workflow === "product_photography") {
      primaryModel = SUPPORTED_MODELS["flux-1-dev"];
    } else if (workflow === "anime_artwork") {
      primaryModel = SUPPORTED_MODELS["flux-1-dev"];
    } else if (workflow === "background_replacement" || workflow === "inpainting") {
      primaryModel = SUPPORTED_MODELS["gemini-3.1-flash-image"];
    } else {
      primaryModel = SUPPORTED_MODELS["gemini-3.1-flash-image"];
    }
  }

  const rationale = `Selected workflow "${workflow}" conditioned via "${controlMethod}". Primary model "${primaryModel.name}" chosen for premier ${primaryModel.strengths.slice(0, 2).join(" & ")}.`;

  return {
    workflow,
    primaryModel,
    fallbackModels,
    executionMode,
    controlMethod,
    typographyOverlayNeeded,
    upscaleTargetMultiplier,
    selectionRationale: rationale,
    estimatedCostUsd: primaryModel.costPerMegapixelUsd,
  };
}

