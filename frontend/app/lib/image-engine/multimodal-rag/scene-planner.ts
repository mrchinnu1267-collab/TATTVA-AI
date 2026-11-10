/**
 * TATTVA AI - Advanced Multimodal Scene Planner
 * Generates Structured Scene Representations & Conditioning Strategies
 * from user prompts and retrieved visual references.
 */

import {
  ConditioningMethod,
  ConditioningPlan,
  MultimodalRetrievalResult,
  StructuredSceneObject,
  StructuredScenePlan,
  StructuredTextElement,
} from "./types";
import { AspectRatio, ImageStyle } from "../types";
import { geminiText, getGeminiApiKey } from "../gemini";

/**
 * Creates a structured scene representation using Gemini or deterministic semantic parser
 */
export async function createStructuredScenePlan(params: {
  prompt: string;
  style?: ImageStyle;
  aspectRatio?: AspectRatio;
  referenceImage?: string;
  retrievalResult?: MultimodalRetrievalResult;
  preferredConditioning?: ConditioningMethod;
}): Promise<StructuredScenePlan> {
  const { prompt, style = "realistic", referenceImage, retrievalResult } = params;
  const primaryRef = retrievalResult?.primaryReference;

  // 1. Determine Conditioning Strategy
  const conditioningPlan: ConditioningPlan = determineConditioningPlan(
    prompt,
    referenceImage,
    retrievalResult,
    params.preferredConditioning
  );

  // 2. Try structured generation via Gemini if API key is present
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const promptInstruction = `You are a master Visual Scene Architect for TATTVA AI Multimodal Image Generation.
Analyze this image prompt and retrieved visual reference context.
Produce a strict, production-grade JSON Structured Scene Representation.

USER PROMPT:
"""${prompt}"""

RETRIEVED VISUAL REFERENCE CONTEXT:
${retrievalResult?.aggregatedVisualContext || "None"}

INSTRUCTIONS:
- Identify the primary subject.
- Identify the environment/setting (time of day, weather, indoor/outdoor).
- Extract all required objects with their positions (foreground, midground, background, centered, left, right), exact counts if specified, colors, and attributes.
- Identify lighting style (incorporating retrieved reference lighting if it enhances fidelity).
- Identify composition (camera lens, perspective, framing).
- Identify color palette (4-6 hexadecimal or descriptive colors).
- If exact text is requested in quotes or signboards, extract as textElements.

Respond with valid JSON matching this schema:
{
  "subject": string,
  "environment": string,
  "objects": [
    {
      "name": string,
      "position": "foreground" | "midground" | "background" | "centered" | "left" | "right",
      "count": number,
      "color": string,
      "attributes": string[],
      "importance": "critical" | "secondary" | "ambient"
    }
  ],
  "lighting": string,
  "composition": string,
  "cameraAngle": string,
  "colorPalette": string[],
  "textElements": [
    {
      "text": string,
      "location": "top-center" | "center" | "bottom-center" | "embedded-sign" | "headline",
      "style": string
    }
  ],
  "rationale": string
}`;

      const response = await geminiText(promptInstruction, {
        json: true,
        temperature: 0.2,
        timeoutMs: 12_000,
      });

      const cleaned = response.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.subject && Array.isArray(parsed.objects)) {
        return {
          subject: parsed.subject,
          environment: parsed.environment || "Atmospheric setting",
          objects: parsed.objects,
          lighting: parsed.lighting || primaryRef?.lighting || "Cinematic natural lighting",
          style: style,
          composition: parsed.composition || primaryRef?.composition || "Balanced composition",
          cameraAngle: parsed.cameraAngle || primaryRef?.cameraAngle || "Eye-level 50mm perspective",
          colorPalette: Array.isArray(parsed.colorPalette) && parsed.colorPalette.length > 0
            ? parsed.colorPalette
            : primaryRef?.dominantColors || ["#1a202c", "#e2e8f0", "#3182ce"],
          textElements: Array.isArray(parsed.textElements) ? parsed.textElements : [],
          conditioningPlan,
          retrievedReferencesUsed: primaryRef ? [primaryRef.id] : [],
          rationale: parsed.rationale || "Synthesized from user prompt and retrieved visual knowledge.",
        };
      }
    } catch {
      // Fallback to deterministic parser
    }
  }

  // Fallback: Deterministic Scene Parser
  return parseSceneDeterministically(prompt, style, conditioningPlan, primaryRef);
}

/**
 * Determines optimal conditioning method based on user request & reference images
 */
function determineConditioningPlan(
  prompt: string,
  referenceImage?: string,
  retrievalResult?: MultimodalRetrievalResult,
  preferred?: ConditioningMethod
): ConditioningPlan {
  const p = prompt.toLowerCase();

  if (preferred) {
    return {
      method: preferred,
      referenceImage: referenceImage || retrievalResult?.primaryReference?.imageUrl,
      strength: 0.75,
    };
  }

  if (referenceImage) {
    // 1. Inpainting / Background Replacement
    if (/change\s+the\s+background|replace\s+the\s+background|new\s+background|modify\s+background/i.test(p)) {
      return {
        method: "inpainting",
        referenceImage,
        strength: 0.85,
        preservedRegions: ["main subject silhouette"],
        guidancePrompt: "Preserve the main subject exactly; regenerate environment and background per request.",
      };
    }

    // 2. Structural / Compositional Transfer (ControlNet depth/canny)
    if (/composition|same\s+layout|recreate\s+this\s+composition|structural\s+guidance|exact\s+pose/i.test(p)) {
      return {
        method: "controlnet-depth",
        referenceImage,
        strength: 0.7,
        guidancePrompt: "Adhere to the spatial depth map and geometry of the reference while rendering new elements.",
      };
    }

    // 3. Style Transfer
    if (/in\s+the\s+style\s+of|style\s+transfer|match\s+style|render\s+like/i.test(p)) {
      return {
        method: "style-transfer",
        referenceImage,
        strength: 0.65,
        styleBlendRatio: 0.8,
        guidancePrompt: "Transfer color grading, brushwork, and surface texture from reference.",
      };
    }

    // Default reference-guided IP-Adapter
    return {
      method: "ip-adapter",
      referenceImage,
      strength: 0.6,
      guidancePrompt: "Infuse visual attributes from reference image into user-requested subject.",
    };
  }

  // If top retrieved reference has high similarity, apply IP-Adapter or style guidance
  if (retrievalResult && retrievalResult.matches.length > 0 && retrievalResult.matches[0].rerankScore >= 0.7) {
    const top = retrievalResult.matches[0].item;
    return {
      method: top.conditioningTypes[0] || "ip-adapter",
      referenceImage: top.imageUrl,
      strength: 0.45,
      guidancePrompt: `Conditioned with visual reference: ${top.title}.`,
    };
  }

  return {
    method: "text-guided",
    strength: 1.0,
  };
}

/**
 * Deterministic scene parsing when LLM API is unavailable
 */
function parseSceneDeterministically(
  prompt: string,
  style: ImageStyle,
  conditioningPlan: ConditioningPlan,
  primaryRef?: any
): StructuredScenePlan {
  const words = prompt.split(/\s+/);
  const subject = words.slice(0, 5).join(" ");
  const lower = prompt.toLowerCase();

  // Extract objects
  const objects: StructuredSceneObject[] = [];
  const countMatches = prompt.match(/\b(exactly\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/gi);
  if (countMatches) {
    for (const match of countMatches.slice(0, 3)) {
      const parts = match.split(/\s+/);
      const countNum = parseInt(parts[parts.length - 2], 10) || 1;
      const objName = parts[parts.length - 1];
      objects.push({
        name: objName,
        position: "centered",
        count: countNum,
        attributes: ["explicit count specified"],
        importance: "critical",
      });
    }
  }

  if (objects.length === 0) {
    objects.push({
      name: subject,
      position: "foreground",
      attributes: ["primary visual focus"],
      importance: "critical",
    });
  }

  // Extract text in quotes
  const textMatches = prompt.match(/"([^"]+)"|'([^']+)'/g);
  const textElements: StructuredTextElement[] = [];
  if (textMatches) {
    for (const quote of textMatches) {
      const cleanText = quote.replace(/['"]/g, "").trim();
      if (cleanText) {
        textElements.push({
          text: cleanText,
          location: "embedded-sign",
          style: "crisp legible typography",
        });
      }
    }
  }

  return {
    subject,
    environment: lower.includes("night") ? "Night" : lower.includes("sunset") ? "Golden hour sunset" : "Daylight atmospheric scene",
    objects,
    lighting: primaryRef?.lighting || "Dynamic volumetric lighting with balanced contrast",
    style,
    composition: primaryRef?.composition || "Wide cinematic view with rule of thirds",
    cameraAngle: primaryRef?.cameraAngle || "Eye-level 50mm lens",
    colorPalette: primaryRef?.dominantColors || ["#0f172a", "#38bdf8", "#f59e0b", "#f8fafc"],
    textElements,
    conditioningPlan,
    retrievedReferencesUsed: primaryRef ? [primaryRef.id] : [],
    rationale: "Parsed from prompt and aligned with TATTVA visual reference architecture.",
  };
}
