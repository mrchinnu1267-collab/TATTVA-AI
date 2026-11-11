/**
 * TATTVA AI - Spatial Layout Parser & Coordinate Compiler (Phase D)
 * Translates natural language spatial directives into structured 2D bounding boxes,
 * depth tiers, and spatial prompt conditioning.
 */

import {
  SpatialBoundingBox,
  SceneSpatialLayout,
  SceneCompositionType,
  SceneDepthLayer,
  HorizontalAlignment,
} from "./types";

interface ParsedSpatialDirective {
  label: string;
  horizontal: HorizontalAlignment;
  layer: SceneDepthLayer;
  relativeSize: "small" | "medium" | "large";
}

/**
 * Extracts explicit and implicit spatial relationships from natural language prompts.
 */
export function parseSpatialDirectives(prompt: string): ParsedSpatialDirective[] {
  const p = prompt.toLowerCase();
  const directives: ParsedSpatialDirective[] = [];

  // Patterns for positioning
  const clauses = prompt.split(/[,.;]|\band\b/i).map((c) => c.trim()).filter(Boolean);

  for (const clause of clauses) {
    const cl = clause.toLowerCase();
    let horizontal: HorizontalAlignment = "center";
    let layer: SceneDepthLayer = "midground";
    let relativeSize: "small" | "medium" | "large" = "medium";

    // Horizontal detection
    if (/center-left/i.test(cl)) {
      horizontal = "center-left";
    } else if (/on\s+the\s+left|far\s+left|left\s+side|to\s+the\s+left|\bleft\b/i.test(cl)) {
      horizontal = "left";
    } else if (/center-right/i.test(cl)) {
      horizontal = "center-right";
    } else if (/on\s+the\s+right|far\s+right|right\s+side|to\s+the\s+right|\bright\b/i.test(cl)) {
      horizontal = "right";
    } else if (/center|centered|in\s+the\s+middle|centerpiece/i.test(cl)) {
      horizontal = "center";
    }

    // Depth tier detection
    if (/foreground|in\s+the\s+front|front\s+and\s+center|close-up/i.test(cl)) {
      layer = "foreground";
    } else if (/background|in\s+the\s+distance|behind|far\s+away|backdrop/i.test(cl)) {
      layer = "background";
    } else if (/midground|middle\s+ground/i.test(cl)) {
      layer = "midground";
    }

    // Size detection
    if (/massive|giant|huge|towering|large|dominant/i.test(cl)) {
      relativeSize = "large";
    } else if (/small|tiny|distant|subtle|miniature/i.test(cl)) {
      relativeSize = "small";
    }

    // Extract core subject noun
    const subjectClean = clause
      .replace(/(on the (?:left|right)|in the (?:foreground|background|center|middle)|far (?:left|right))/gi, "")
      .replace(/^(a|an|the)\s+/i, "")
      .trim();

    if (subjectClean.length > 2) {
      directives.push({
        label: subjectClean,
        horizontal,
        layer,
        relativeSize,
      });
    }
  }

  return directives;
}

/**
 * Converts spatial directives into normalized bounding boxes [0.0 - 1.0].
 */
export function compileBoundingBoxesFromDirectives(
  directives: ParsedSpatialDirective[]
): SpatialBoundingBox[] {
  return directives.map((d, idx) => {
    // Determine width and height by size
    let width = 0.35;
    let height = 0.45;
    if (d.relativeSize === "large") {
      width = 0.55;
      height = 0.65;
    } else if (d.relativeSize === "small") {
      width = 0.22;
      height = 0.28;
    }

    // Foreground objects are naturally rendered larger
    if (d.layer === "foreground") {
      width = Math.min(0.8, width * 1.25);
      height = Math.min(0.85, height * 1.25);
    } else if (d.layer === "background") {
      width = Math.max(0.2, width * 0.75);
      height = Math.max(0.25, height * 0.75);
    }

    // Determine X position
    let x = 0.32; // center default
    switch (d.horizontal) {
      case "left":
        x = 0.05;
        break;
      case "center-left":
        x = 0.2;
        break;
      case "center":
        x = 0.5 - width / 2;
        break;
      case "center-right":
        x = 0.8 - width;
        break;
      case "right":
        x = 0.95 - width;
        break;
    }

    // Determine Y position based on depth layer
    let y = 0.3;
    if (d.layer === "foreground") {
      y = 0.5 - height * 0.3; // Lower in frame
    } else if (d.layer === "background") {
      y = 0.15; // Higher in frame
    } else {
      y = 0.35 - height * 0.2;
    }

    // Clamp coordinates safely within [0, 1]
    const clampedX = Math.max(0.02, Math.min(0.98 - width, x));
    const clampedY = Math.max(0.02, Math.min(0.98 - height, y));

    return {
      id: `box-${idx + 1}-${d.label.slice(0, 12).replace(/\s+/g, "_")}`,
      label: d.label,
      x: Number(clampedX.toFixed(3)),
      y: Number(clampedY.toFixed(3)),
      width: Number(width.toFixed(3)),
      height: Number(height.toFixed(3)),
      layer: d.layer,
      importance: d.layer === "foreground" || d.relativeSize === "large" ? "critical" : "standard",
    };
  });
}

/**
 * Detects overall scene composition structure
 */
export function detectSceneComposition(prompt: string, boxes: SpatialBoundingBox[]): SceneCompositionType {
  const p = prompt.toLowerCase();
  if (/rule\s+of\s+thirds/i.test(p)) return "rule_of_thirds";
  if (/symmetr|centered|centered\s+composition/i.test(p)) return "centered_symmetry";
  if (/panoram|wide\s+angle|cinematic\s+wide/i.test(p)) return "panoramic";
  if (/close-up|macro|extreme\s+close/i.test(p)) return "close_up";
  if (/diagonal|dynamic\s+angle/i.test(p)) return "diagonal";
  if (/establishing\s+shot/i.test(p)) return "wide_establishing";

  // Check box distribution
  if (boxes.length === 1 && Math.abs(boxes[0].x + boxes[0].width / 2 - 0.5) < 0.1) {
    return "centered_symmetry";
  }

  return "custom";
}

/**
 * Builds a complete SceneSpatialLayout from a prompt or manual box inputs.
 */
export function buildSceneSpatialLayout(
  prompt: string,
  options: {
    width?: number;
    height?: number;
    customBoxes?: SpatialBoundingBox[];
    composition?: SceneCompositionType;
  } = {}
): SceneSpatialLayout {
  const width = options.width || 1024;
  const height = options.height || 1024;

  const boxes = options.customBoxes && options.customBoxes.length > 0
    ? options.customBoxes
    : compileBoundingBoxesFromDirectives(parseSpatialDirectives(prompt));

  const composition = options.composition || detectSceneComposition(prompt, boxes);

  // Generate spatial prompt guidance injection
  const spatialClauses = boxes.map((box) => {
    const horizDesc =
      box.x < 0.3 ? "on the left" : box.x > 0.6 ? "on the right" : "centered";
    return `[${box.layer.toUpperCase()}: ${box.label} positioned ${horizDesc} at coordinates (${Math.round(box.x * 100)}%, ${Math.round(box.y * 100)}%)]`;
  });

  const promptGuidance = spatialClauses.length > 0
    ? `Explicit Spatial Composition: ${spatialClauses.join(", ")}.`
    : undefined;

  return {
    width,
    height,
    composition,
    boxes,
    promptGuidance,
  };
}

/**
 * Injects spatial composition directives into an existing model prompt.
 */
export function enrichPromptWithSpatialLayout(
  basePrompt: string,
  layout: SceneSpatialLayout
): string {
  if (!layout.promptGuidance || layout.boxes.length === 0) {
    return basePrompt;
  }
  return `${basePrompt} | ${layout.promptGuidance}`;
}
