/**
 * TATTVA AI - ControlNet Conditioning & Provider Adapter (Phase D)
 * Manages Canny, Depth, Pose, Line-art, and Scribble conditioning maps,
 * hardware capability checks, and provider dispatch.
 */

import {
  ControlNetConditioning,
  ControlNetType,
  SceneSpatialLayout,
  SpatialBoundingBox,
} from "./types";
import { ImageProviderId } from "../types";
import { getModelById } from "../multi-model-router/model-registry";

export interface ControlNetCompatibilityCheck {
  supported: boolean;
  providerId: ImageProviderId;
  modelIdentifier?: string;
  reason?: string;
  recommendedFallback: "cloud_space" | "prompt_guidance" | "gemini_multimodal";
}

/**
 * Validates whether a specific provider and model can execute ControlNet conditioning.
 * Enforces local RTX 3050 (4 GB VRAM) safety checks.
 */
export function checkControlNetSupport(
  providerId: ImageProviderId,
  controlType: ControlNetType,
  modelId?: string
): ControlNetCompatibilityCheck {
  // 1. Local Hardware Assessment: RTX 3050 4GB VRAM
  if (providerId === "local") {
    // SDXL ControlNet requires ~10-12GB VRAM; SD 1.5 ControlNet with fp16 can run in ~3.8GB
    // But under production safety standards, 4GB cannot guarantee concurrent stability.
    return {
      supported: false,
      providerId: "local",
      reason: "Local RTX 3050 (4 GB VRAM) has insufficient memory for reliable ControlNet conditioning.",
      recommendedFallback: "cloud_space",
    };
  }

  // 2. Gemini Multimodal
  if (providerId === "gemini") {
    // Gemini supports native multimodal reference and visual conditioning via input images
    return {
      supported: true,
      providerId: "gemini",
      modelIdentifier: "gemini-3.1-flash-image",
      recommendedFallback: "gemini_multimodal",
    };
  }

  // 3. Hugging Face Spaces & Dedicated Pipelines
  if (providerId === "huggingface") {
    return {
      supported: true,
      providerId: "huggingface",
      modelIdentifier: "InstantX/FLUX.1-dev-Controlnet-Canny",
      recommendedFallback: "cloud_space",
    };
  }

  // 4. OpenAI DALL-E 3
  if (providerId === "openai") {
    return {
      supported: false,
      providerId: "openai",
      reason: "OpenAI DALL-E 3 generations API accepts text prompts only and does not support ControlNet conditioning.",
      recommendedFallback: "prompt_guidance",
    };
  }

  return {
    supported: false,
    providerId,
    reason: `Provider '${providerId}' does not support ControlNet conditioning.`,
    recommendedFallback: "prompt_guidance",
  };
}

/**
 * Synthesizes a grayscale depth map SVG data URI from bounding boxes and depth layers.
 * Foreground = White/Light Gray (#FFFFFF / #DCDCDC)
 * Midground = Medium Gray (#808080)
 * Background = Dark Gray / Black (#202020)
 */
export function generateSyntheticDepthMap(layout: SceneSpatialLayout): string {
  const { width, height, boxes } = layout;

  // Background gradient: dark horizon
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#1a1a1a" />`;

  // Draw ground plane gradient
  svg += `<linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#2a2a2a" />
    <stop offset="100%" stop-color="#4a4a4a" />
  </linearGradient>`;
  svg += `<rect y="${height * 0.45}" width="${width}" height="${height * 0.55}" fill="url(#groundGrad)" />`;

  // Draw objects sorted from background to foreground
  const sortedBoxes = [...boxes].sort((a, b) => {
    const layerOrder = { background: 0, midground: 1, foreground: 2 };
    return layerOrder[a.layer] - layerOrder[b.layer];
  });

  for (const box of sortedBoxes) {
    const bx = Math.round(box.x * width);
    const by = Math.round(box.y * height);
    const bw = Math.round(box.width * width);
    const bh = Math.round(box.height * height);

    let fillColor = "#808080"; // midground
    if (box.layer === "foreground") fillColor = "#f0f0f0";
    if (box.layer === "background") fillColor = "#3a3a3a";

    // Rounded silhouette representation
    const rx = Math.round(bw * 0.15);
    svg += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${rx}" fill="${fillColor}" opacity="0.95" />`;
  }

  svg += `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Synthesizes a Canny edge boundary map SVG data URI from bounding boxes.
 * High-contrast white wireframes on pure black background.
 */
export function generateSyntheticCannyMap(layout: SceneSpatialLayout): string {
  const { width, height, boxes } = layout;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#000000" />`;

  // Horizon line
  svg += `<line x1="0" y1="${height * 0.5}" x2="${width}" y2="${height * 0.5}" stroke="#ffffff" stroke-width="2" stroke-dasharray="4,4" />`;

  for (const box of boxes) {
    const bx = Math.round(box.x * width);
    const by = Math.round(box.y * height);
    const bw = Math.round(box.width * width);
    const bh = Math.round(box.height * height);

    svg += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="#ffffff" stroke-width="3" />`;
    svg += `<line x1="${bx}" y1="${by}" x2="${bx + bw}" y2="${by + bh}" stroke="#ffffff" stroke-width="1.5" />`;
  }

  svg += `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
