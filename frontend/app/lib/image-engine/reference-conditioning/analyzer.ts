/**
 * TATTVA AI - Reference Image Analyzer & Intent Engine (Phase B)
 * Extracts visual semantics, spatial relationships, and classifies user reference-conditioning intent.
 */

import { geminiVision, getGeminiApiKey } from "../gemini";
import type {
  ConditioningIntent,
  ConditioningIntentType,
  ReferenceAnalysis,
  SpatialRelationship,
} from "./types";

/**
 * Classifies the user's reference transformation intent from their instruction prompt.
 */
export function classifyConditioningIntent(prompt: string): ConditioningIntent {
  const p = prompt.toLowerCase().trim();

  // 1. Keep the same character / person / entity
  if (
    /(?:keep|maintain|preserve|same)\s+(?:the\s+)?(?:same\s+)?(?:character|person|model|girl|boy|man|woman|cat|dog|subject|identity|face|appearance)/i.test(p) ||
    /consistent\s+(?:character|person|subject|identity)/i.test(p) ||
    /with\s+the\s+same\s+(?:face|facial\s+features|character)/i.test(p)
  ) {
    return {
      intentType: "keep_character",
      explanation: "Preserve the primary character identity, face, and anatomical structure from the reference image.",
      recommendedStrength: 0.70,
      preservationDirectives: [
        "Lock character identity, facial structure, skin tone, hair style, and body proportions from reference.",
        "Maintain identical facial features and character recognition.",
      ],
      modificationDirectives: [
        "Apply only the newly requested pose, environment, or actions while keeping character constant.",
      ],
      lockedEntities: ["primary character", "facial identity", "hair style"],
      targetModifications: ["pose", "context", "clothing if specified"],
    };
  }

  // 2. Change only the background
  if (
    /(?:change|replace|modify|new|different|swap|remove)\s+(?:only\s+)?(?:the\s+)?background/i.test(p) ||
    /(?:place|move|put|transport)\s+(?:the\s+)?(?:subject|character|him|her|it)\s+(?:in|into|onto|at)\s+/i.test(p) ||
    /keep\s+(?:the\s+)?(?:subject|character)\s+(?:and|but)\s+(?:change|replace)\s+(?:the\s+)?background/i.test(p)
  ) {
    return {
      intentType: "change_background",
      explanation: "Retain the subject entirely while placing them into a completely new background or environment.",
      recommendedStrength: 0.80,
      preservationDirectives: [
        "Keep the foreground subject, attire, silhouette, and posture completely intact.",
        "Preserve foreground subject lighting cues and boundaries.",
      ],
      modificationDirectives: [
        "Completely replace the background and environment with the requested setting.",
        "Harmonize ambient lighting from the new environment onto the subject edges.",
      ],
      lockedEntities: ["foreground subject", "subject clothing", "subject posture"],
      targetModifications: ["background environment", "ambient lighting", "setting"],
    };
  }

  // 3. Preserve the original composition / layout
  if (
    /(?:preserve|keep|maintain|recreate|same)\s+(?:the\s+)?(?:original\s+)?(?:composition|layout|camera\s+angle|framing|pose|perspective|shot)/i.test(p) ||
    /same\s+(?:pose|stance|angle|framing)/i.test(p)
  ) {
    return {
      intentType: "preserve_composition",
      explanation: "Maintain the exact camera perspective, spatial geometry, and layout arrangement of the reference image.",
      recommendedStrength: 0.65,
      preservationDirectives: [
        "Preserve camera framing, angle (e.g. eye-level, low-angle, close-up), and aspect ratio.",
        "Preserve the relative spatial positions of objects in the scene.",
      ],
      modificationDirectives: [
        "Render the scene elements with requested stylistic or substantive variations while adhering to the layout grid.",
      ],
      lockedEntities: ["camera perspective", "spatial layout", "subject positioning"],
      targetModifications: ["textures", "visual style", "specific materials"],
    };
  }

  // 4. Change the clothing / color / specific attribute
  if (
    /(?:change|make|turn|recolor|dye|modify)\s+(?:the\s+)?(?:clothing|clothes|shirt|dress|suit|jacket|pants|outfit|hair|eyes|color)/i.test(p) ||
    /in\s+(?:red|blue|green|black|white|yellow|purple|pink|gold|silver)\s+(?:color|shirt|dress|clothing|outfit)/i.test(p)
  ) {
    return {
      intentType: "change_color",
      explanation: "Modify specific color or clothing attributes while retaining subject geometry and scene layout.",
      recommendedStrength: 0.75,
      preservationDirectives: [
        "Preserve the subject's anatomy, pose, composition, and background.",
        "Maintain identical scene lighting and surface shadows.",
      ],
      modificationDirectives: [
        "Surgically alter the specified garment, hair, or object color as requested.",
      ],
      lockedEntities: ["subject anatomy", "scene composition", "background elements"],
      targetModifications: ["garment color", "targeted surface hue"],
    };
  }

  // 5. Add an object without modifying existing subjects
  if (
    /(?:add|include|insert|place)\s+(?:an?\s+)?([a-zA-Z\s]+)\s+(?:without\s+modifying|next\s+to|beside|holding|with)\s+/i.test(p) ||
    /without\s+(?:modifying|changing|altering)\s+(?:existing|the)\s+(?:subject|character|elements)/i.test(p)
  ) {
    return {
      intentType: "add_object",
      explanation: "Insert new requested items into the composition without disturbing existing subjects or scenery.",
      recommendedStrength: 0.60,
      preservationDirectives: [
        "Preserve existing subjects and background layout exactly as framed in the reference.",
        "Maintain current subject expression, pose, and attire.",
      ],
      modificationDirectives: [
        "Seamlessly introduce the new requested object into an appropriate spatial pocket with matching lighting.",
      ],
      lockedEntities: ["existing subjects", "original background"],
      targetModifications: ["inserted object", "local occlusion shadows"],
    };
  }

  // 6. Style Transfer
  if (
    /(?:in\s+the\s+style\s+of|style\s+transfer|make\s+it\s+look\s+like|render\s+as\s+anime|anime\s+version|oil\s+painting\s+version|3d\s+version|cartoon\s+version)/i.test(p)
  ) {
    return {
      intentType: "style_transfer",
      explanation: "Restyle the reference image into a new visual medium while preserving subject identity and layout.",
      recommendedStrength: 0.65,
      preservationDirectives: [
        "Preserve core subject geometry, silhouette, and recognizable features.",
      ],
      modificationDirectives: [
        "Render the full composition in the requested artistic medium and texture palette.",
      ],
      lockedEntities: ["core silhouette", "spatial composition"],
      targetModifications: ["rendering medium", "surface shaders", "brushwork"],
    };
  }

  // Default: General Reference-Conditioned Generation
  return {
    intentType: "general_img2img",
    explanation: "Condition the generation on reference image visual attributes and structure.",
    recommendedStrength: 0.65,
    preservationDirectives: [
      "Retain primary aesthetic cues, character silhouette, and palette from reference.",
    ],
    modificationDirectives: [
      "Synthesize user prompt requirements while maintaining visual harmony with reference.",
    ],
    lockedEntities: ["primary subject aesthetic"],
    targetModifications: ["user requested additions and changes"],
  };
}

/**
 * Parses image semantics deterministically when vision API is unavailable.
 */
function analyzeReferenceDeterministically(userInstruction?: string): ReferenceAnalysis {
  const intent = userInstruction ? classifyConditioningIntent(userInstruction) : null;
  const subject = intent?.lockedEntities[0] || "primary visual subject";

  return {
    primarySubject: subject,
    secondaryObjects: ["background environment", "ambient scene elements"],
    composition: "centered eye-level composition with balanced framing",
    colorPalette: ["natural tones", "ambient reference colors"],
    shapesAndSilhouettes: ["defined subject silhouette", "structural contours"],
    spatialRelationships: [
      { entity: subject, position: "centered", relationToOther: "focal point of frame" },
      { entity: "background", position: "background", relationToOther: "behind primary subject" },
    ],
    preservedDetails: [
      "Subject silhouette and proportions",
      "Core color tonality and spatial depth",
      ...(intent ? intent.preservationDirectives : []),
    ],
    source: "structural_heuristic",
  };
}

/**
 * Analyzes reference image visual characteristics, subjects, composition, and colors.
 */
export async function analyzeReferenceImage(
  referenceImageDataUri: string,
  userInstruction?: string
): Promise<ReferenceAnalysis> {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const prompt = `You are an expert Reference Image Visual Conditioning Auditor for TATTVA AI.
Analyze the attached reference image in detail.
${userInstruction ? `USER INSTRUCTION FOR THIS IMAGE: "${userInstruction}"` : ""}

Respond with strict JSON ONLY:
{
  "primarySubject": "Concise description of the main focal subject",
  "secondaryObjects": ["List of distinct secondary objects or elements"],
  "composition": "Camera perspective, framing, shot type, and layout geometry",
  "colorPalette": ["3 to 5 dominant color hex codes or descriptive colors"],
  "shapesAndSilhouettes": ["Key geometric forms, silhouettes, and structural features"],
  "spatialRelationships": [
    { "entity": "subject or object", "position": "foreground|midground|background|centered|left|right|top|bottom", "relationToOther": "relative placement" }
  ],
  "preservedDetails": ["Key specific visual details that must be preserved if requested"],
  "detectedText": ["Any visible typography or quoted text in image"]
}`;

      const res = await geminiVision(prompt, referenceImageDataUri, {
        json: true,
        temperature: 0.1,
        timeoutMs: 40_000,
      });

      const cleaned = res.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && typeof parsed.primarySubject === "string") {
        return {
          primarySubject: parsed.primarySubject,
          secondaryObjects: Array.isArray(parsed.secondaryObjects) ? parsed.secondaryObjects : [],
          composition: parsed.composition || "centered framing",
          colorPalette: Array.isArray(parsed.colorPalette) ? parsed.colorPalette : [],
          shapesAndSilhouettes: Array.isArray(parsed.shapesAndSilhouettes) ? parsed.shapesAndSilhouettes : [],
          spatialRelationships: Array.isArray(parsed.spatialRelationships)
            ? (parsed.spatialRelationships as SpatialRelationship[])
            : [],
          preservedDetails: Array.isArray(parsed.preservedDetails) ? parsed.preservedDetails : [],
          detectedText: Array.isArray(parsed.detectedText) ? parsed.detectedText : undefined,
          source: "vision",
        };
      }
    } catch (visionError) {
      console.warn("[Reference Conditioner] Vision analysis fallback triggered:", visionError);
    }
  }

  return analyzeReferenceDeterministically(userInstruction);
}

