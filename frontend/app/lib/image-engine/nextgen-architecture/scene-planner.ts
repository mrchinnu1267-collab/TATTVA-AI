/**
 * TATTVA AI - Phase S: Intelligent Scene Planning Engine
 * Decomposes complex multimodal prompts and instructions into structured scenes with
 * 2D bounding boxes, layer assignments, camera perspective, lighting plans, and
 * ambiguity detection that requests clarification rather than hallucinating details.
 */

import {
  StructuredScenePlan,
  PlannedObject,
  SpatialRelationshipConstraint,
  AmbiguityClarification,
  PerspectiveAngle,
  LightingStyle,
  CompositionRule,
  BoundingBox2D,
  ReferenceInputSpec,
} from "./types";

export class IntelligentScenePlanner {
  private static instance: IntelligentScenePlanner;

  private constructor() {}

  public static getInstance(): IntelligentScenePlanner {
    if (!IntelligentScenePlanner.instance) {
      IntelligentScenePlanner.instance = new IntelligentScenePlanner();
    }
    return IntelligentScenePlanner.instance;
  }

  /**
   * Plans a structured scene from natural language prompt and optional references
   */
  public planScene(
    prompt: string,
    referenceImages?: ReferenceInputSpec[],
    compositionHint?: CompositionRule
  ): StructuredScenePlan {
    const planId = `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const lowerPrompt = prompt.toLowerCase();

    // 1. Extract Objects and Quantities
    const objects = this.extractPlannedObjects(prompt);

    // 2. Extract Spatial Relationships
    const relationships = this.extractSpatialRelationships(lowerPrompt, objects);

    // 3. Extract Camera Perspective
    const camera = this.extractCameraSettings(lowerPrompt);

    // 4. Extract Lighting Plan
    const lighting = this.extractLightingPlan(lowerPrompt);

    // 5. Extract Composition & Aspect Ratio
    const composition = this.extractCompositionSettings(lowerPrompt, compositionHint);

    // 6. Detect Ambiguities & Contradictions
    const clarifications = this.detectAmbiguities(prompt, objects, relationships);

    // 7. Validate Scene Plan
    const validation = this.validatePlan(objects, relationships, clarifications);

    return {
      id: planId,
      rawPrompt: prompt,
      sceneTitle: this.generateSceneTitle(objects, lowerPrompt),
      environmentDescription: this.extractEnvironmentDescription(lowerPrompt),
      objects,
      relationships,
      camera,
      lighting,
      composition,
      clarifications,
      isValid: validation.isValid,
      validationScore: validation.score,
      validationNotes: validation.notes,
    };
  }

  private extractPlannedObjects(prompt: string): PlannedObject[] {
    const objects: PlannedObject[] = [];
    const countWords: Record<string, number> = {
      one: 1, a: 1, an: 1, single: 1,
      two: 2, pair: 2, couple: 2, both: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
    };

    const colorList = [
      "red", "blue", "green", "yellow", "black", "white", "golden", "silver",
      "purple", "orange", "crimson", "azure", "emerald", "amber", "pink", "gray", "bronze"
    ];

    const materialList = [
      "wooden", "metallic", "glass", "leather", "marble", "stone", "ceramic",
      "plastic", "silk", "velvet", "bronze", "copper", "crystal"
    ];

    // Common entities sorted by length descending so composite phrases ("sports car", "pine tree") match before single words
    const commonEntities = [
      "cyberpunk samurai", "vintage sports car", "sports car", "coffee cup", "oak tree",
      "pine tree", "neon sign", "ceramic bowl", "glass vase", "flower vase",
      "cat", "dog", "horse", "lion", "tiger", "bird", "owl", "eagle",
      "person", "man", "woman", "child", "robot", "astronaut",
      "car", "vehicle", "spaceship", "motorcycle", "bicycle", "boat",
      "tree", "flower", "rose", "mountain", "river", "lake",
      "table", "chair", "desk", "mug", "laptop", "book", "vase", "lantern",
      "building", "castle", "temple", "skyscraper", "cottage", "house", "billboard"
    ].sort((a, b) => b.length - a.length);

    const promptLower = prompt.toLowerCase();
    let assignedIndex = 0;

    for (const entity of commonEntities) {
      const regex = new RegExp(`\\b(\\w+)?\\s*(\\w+)?\\s*\\b(${entity}s?)\\b`, "gi");
      let match: RegExpExecArray | null;

      while ((match = regex.exec(promptLower)) !== null) {
        const fullMatch = match[0];
        const baseWord = match[3].toLowerCase();

        // Check if entity is already parsed or overlapping
        const existing = objects.find(o => o.name.toLowerCase() === entity || o.name.toLowerCase().includes(entity) || entity.includes(o.name.toLowerCase()));
        if (existing) continue;

        const startIndex = Math.max(0, match.index - 35);
        const contextSlice = promptLower.slice(startIndex, match.index + fullMatch.length);

        let quantity = 1;
        const wordsBefore = contextSlice.slice(0, contextSlice.length - baseWord.length).split(/\s+/).filter(Boolean);
        for (const w of wordsBefore.reverse()) {
          if (countWords[w]) {
            quantity = countWords[w];
            break;
          }
          if (/^\d+$/.test(w)) {
            quantity = parseInt(w, 10);
            break;
          }
        }
        if (quantity === 1 && baseWord.endsWith("s") && !["glass"].includes(baseWord)) {
          quantity = 2; // Plural default
        }

        const color = colorList.find(c => contextSlice.includes(c));
        const material = materialList.find(m => contextSlice.includes(m));

        // Assign heuristic normalized bounding boxes [xmin, ymin, xmax, ymax]
        const bbox = this.calculateInitialBoundingBox(assignedIndex, quantity, entity);
        const layer = this.assignLayer(entity, assignedIndex);

        objects.push({
          id: `obj_${assignedIndex + 1}_${entity.replace(/\s+/g, "_")}`,
          name: entity,
          category: assignedIndex === 0 ? "subject" : (assignedIndex === 1 ? "secondary" : "prop"),
          quantity,
          attributes: {
            color,
            material,
            shape: fullMatch.includes("round") ? "round" : (fullMatch.includes("square") ? "square" : undefined),
            state: fullMatch.includes("glowing") ? "glowing" : (fullMatch.includes("weathered") ? "weathered" : undefined),
          },
          boundingBox: bbox,
          layer,
          isMandatory: assignedIndex === 0 || quantity > 1,
          priority: assignedIndex === 0 ? 1 : 2,
        });

        assignedIndex++;
      }
    }

    // Fallback if no known entity found
    if (objects.length === 0) {
      objects.push({
        id: "obj_1_primary_subject",
        name: "primary subject",
        category: "subject",
        quantity: 1,
        attributes: {},
        boundingBox: { xmin: 0.25, ymin: 0.2, xmax: 0.75, ymax: 0.8 },
        layer: "foreground",
        isMandatory: true,
        priority: 1,
      });
    }

    return objects;
  }

  private calculateInitialBoundingBox(index: number, quantity: number, entity: string): BoundingBox2D {
    // If it's a wide environment or landscape
    if (["mountain", "river", "lake", "landscape", "sky", "building"].includes(entity)) {
      return { xmin: 0.0, ymin: 0.3, xmax: 1.0, ymax: 1.0 };
    }

    if (index === 0) {
      // Primary subject - center/rule of thirds
      return { xmin: 0.25, ymin: 0.15, xmax: 0.75, ymax: 0.85 };
    } else if (index === 1) {
      // Secondary object - right or left flanking
      return { xmin: 0.65, ymin: 0.4, xmax: 0.95, ymax: 0.85 };
    } else if (index === 2) {
      // Tertiary/prop - lower foreground
      return { xmin: 0.05, ymin: 0.5, xmax: 0.35, ymax: 0.85 };
    } else {
      // Default background/ambient
      return { xmin: 0.1, ymin: 0.1, xmax: 0.4, ymax: 0.4 };
    }
  }

  private assignLayer(entity: string, index: number): "foreground" | "midground" | "background" {
    if (["mountain", "sky", "clouds", "sun", "stars", "horizon"].includes(entity)) {
      return "background";
    }
    if (index === 0) return "foreground";
    if (index === 1) return "midground";
    return "midground";
  }

  private extractSpatialRelationships(
    promptLower: string,
    objects: PlannedObject[]
  ): SpatialRelationshipConstraint[] {
    const relationships: SpatialRelationshipConstraint[] = [];
    const relationKeywords: { regex: RegExp; rel: SpatialRelationshipConstraint["relation"] }[] = [
      { regex: /to the left of|left of|on the left/i, rel: "left_of" },
      { regex: /to the right of|right of|on the right/i, rel: "right_of" },
      { regex: /above|on top of|over/i, rel: "above" },
      { regex: /below|under|beneath/i, rel: "below" },
      { regex: /inside|within/i, rel: "inside" },
      { regex: /behind|in back of/i, rel: "behind" },
      { regex: /in front of|before/i, rel: "in_front_of" },
      { regex: /next to|beside|adjacent to/i, rel: "adjacent_to" },
      { regex: /holding|gripping/i, rel: "holding" },
      { regex: /wearing|dressed in/i, rel: "wearing" },
    ];

    for (const rk of relationKeywords) {
      if (rk.regex.test(promptLower)) {
        if (objects.length >= 2) {
          relationships.push({
            id: `rel_${relationships.length + 1}`,
            sourceObjectId: objects[0].id,
            targetObjectId: objects[1].id,
            relation: rk.rel,
            confidence: 0.92,
            tolerance: 0.05,
          });
        }
      }
    }

    return relationships;
  }

  private extractCameraSettings(promptLower: string): {
    perspective: PerspectiveAngle;
    focalLengthMm?: number;
    depthOfField: "shallow" | "medium" | "deep";
  } {
    let perspective: PerspectiveAngle = "eye-level";
    let focalLength = 50;
    let depthOfField: "shallow" | "medium" | "deep" = "medium";

    if (promptLower.includes("low angle") || promptLower.includes("from below") || promptLower.includes("worm's eye")) {
      perspective = "low-angle";
      focalLength = 24;
    } else if (promptLower.includes("drone") || promptLower.includes("aerial") || promptLower.includes("top down") || promptLower.includes("bird's eye")) {
      perspective = "drone-top-down";
      focalLength = 18;
      depthOfField = "deep";
    } else if (promptLower.includes("macro") || promptLower.includes("close up") || promptLower.includes("extreme close")) {
      perspective = "macro-close-up";
      focalLength = 100;
      depthOfField = "shallow";
    } else if (promptLower.includes("wide angle") || promptLower.includes("panoramic")) {
      perspective = "ultra-wide";
      focalLength = 16;
      depthOfField = "deep";
    } else if (promptLower.includes("dutch angle") || promptLower.includes("tilted")) {
      perspective = "dutch-angle";
      focalLength = 35;
    } else if (promptLower.includes("isometric")) {
      perspective = "isometric";
    }

    if (promptLower.includes("bokeh") || promptLower.includes("portrait") || promptLower.includes("blurred background")) {
      depthOfField = "shallow";
      focalLength = 85;
    }

    return { perspective, focalLengthMm: focalLength, depthOfField };
  }

  private extractLightingPlan(promptLower: string): {
    primaryStyle: LightingStyle;
    direction: "front" | "side" | "back" | "overhead" | "ambient";
    colorTemperatureK: number;
  } {
    let primaryStyle: LightingStyle = "studio-softbox";
    let direction: "front" | "side" | "back" | "overhead" | "ambient" = "side";
    let colorTemperatureK = 5400; // daylight neutral

    if (promptLower.includes("golden hour") || promptLower.includes("sunset") || promptLower.includes("sunrise")) {
      primaryStyle = "golden-hour";
      direction = "side";
      colorTemperatureK = 3200;
    } else if (promptLower.includes("volumetric") || promptLower.includes("god rays") || promptLower.includes("cinematic")) {
      primaryStyle = "volumetric-cinematic";
      direction = "back";
      colorTemperatureK = 4800;
    } else if (promptLower.includes("chiaroscuro") || promptLower.includes("high contrast") || promptLower.includes("noir")) {
      primaryStyle = "chiaroscuro-high-contrast";
      direction = "side";
      colorTemperatureK = 4500;
    } else if (promptLower.includes("neon") || promptLower.includes("cyberpunk")) {
      primaryStyle = "cyberpunk-neon";
      direction = "ambient";
      colorTemperatureK = 7500;
    } else if (promptLower.includes("overcast") || promptLower.includes("moody") || promptLower.includes("fog")) {
      primaryStyle = "overcast-moody";
      direction = "ambient";
      colorTemperatureK = 6500;
    } else if (promptLower.includes("backlit") || promptLower.includes("silhouette")) {
      primaryStyle = "dramatic-backlit";
      direction = "back";
      colorTemperatureK = 4000;
    }

    return { primaryStyle, direction, colorTemperatureK };
  }

  private extractCompositionSettings(
    promptLower: string,
    hint?: CompositionRule
  ): {
    rule: CompositionRule;
    aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9";
  } {
    let rule: CompositionRule = hint || "rule-of-thirds";
    let aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9" = "1:1";

    if (promptLower.includes("symmetric") || promptLower.includes("centered")) {
      rule = "center-symmetrical";
    } else if (promptLower.includes("golden ratio") || promptLower.includes("fibonacci")) {
      rule = "golden-ratio";
    } else if (promptLower.includes("leading lines") || promptLower.includes("diagonal")) {
      rule = "diagonal-leading-lines";
    }

    if (promptLower.includes("16:9") || promptLower.includes("widescreen") || promptLower.includes("cinematic")) {
      aspectRatio = "16:9";
    } else if (promptLower.includes("9:16") || promptLower.includes("vertical") || promptLower.includes("story") || promptLower.includes("portrait")) {
      aspectRatio = "9:16";
    } else if (promptLower.includes("21:9") || promptLower.includes("ultrawide")) {
      aspectRatio = "21:9";
    }

    return { rule, aspectRatio };
  }

  private detectAmbiguities(
    prompt: string,
    objects: PlannedObject[],
    relationships: SpatialRelationshipConstraint[]
  ): AmbiguityClarification[] {
    const clarifications: AmbiguityClarification[] = [];
    const lower = prompt.toLowerCase();

    // Check for vague plurals e.g. "some cars", "a bunch of flowers"
    if (/\b(some|several|multiple|a few|a bunch of)\s+([a-z]+)/i.test(lower)) {
      const match = lower.match(/\b(some|several|multiple|a few|a bunch of)\s+([a-z]+)/i);
      const entity = match ? match[2] : "objects";
      clarifications.push({
        id: `amb_quant_${Date.now()}`,
        field: "quantity",
        issue: `Ambiguous plural expression '${match ? match[0] : "multiple"}' detected for '${entity}'.`,
        suggestedDefaults: ["3", "4", "5"],
        requiresUserAction: false, // Default to 3 if user does not clarify
      });
    }

    // Check for vague spatial placement e.g. "put it somewhere" or contradictory placement
    if (relationships.length === 0 && objects.length >= 2) {
      clarifications.push({
        id: `amb_spatial_${Date.now()}`,
        field: "spatial_layout",
        issue: `Multiple objects (${objects.map(o => o.name).join(", ")}) mentioned without explicit relative positions.`,
        suggestedDefaults: [
          `${objects[0].name} in center foreground, ${objects[1].name} to the right`,
          `side-by-side balanced composition`,
        ],
        requiresUserAction: false,
      });
    }

    // Check for contradictory lighting
    if (lower.includes("dark night") && lower.includes("bright sunlight")) {
      clarifications.push({
        id: `amb_contradiction_${Date.now()}`,
        field: "lighting",
        issue: "Direct contradiction: prompt specifies both 'dark night' and 'bright sunlight'.",
        suggestedDefaults: ["Surreal dusk with celestial illumination", "Night setting with dramatic artificial neon lighting"],
        requiresUserAction: true,
      });
    }

    return clarifications;
  }

  private validatePlan(
    objects: PlannedObject[],
    relationships: SpatialRelationshipConstraint[],
    clarifications: AmbiguityClarification[]
  ): { isValid: boolean; score: number; notes: string[] } {
    const notes: string[] = [];
    let score = 1.0;

    if (objects.length === 0) {
      score -= 0.5;
      notes.push("No distinct subject entities identified.");
    } else {
      notes.push(`Extracted ${objects.length} distinct planned entities with bounding boxes.`);
    }

    const severeContradictions = clarifications.filter(c => c.requiresUserAction);
    if (severeContradictions.length > 0) {
      score -= 0.3 * severeContradictions.length;
      notes.push(`Found ${severeContradictions.length} unresolved ambiguity requiring confirmation.`);
    }

    const isValid = score >= 0.7;
    return {
      isValid,
      score: Math.max(0.0, Math.min(1.0, score)),
      notes,
    };
  }

  private generateSceneTitle(objects: PlannedObject[], promptLower: string): string {
    if (objects.length > 0) {
      const main = objects[0].name;
      const countStr = objects[0].quantity > 1 ? `${objects[0].quantity} ` : "";
      return `${countStr}${main.charAt(0).toUpperCase() + main.slice(1)} Composition`;
    }
    return promptLower.slice(0, 30).trim() + "...";
  }

  private extractEnvironmentDescription(promptLower: string): string {
    const environments = [
      "in a futuristic cyber city", "in a lush pine forest", "on a misty mountain ridge",
      "in a cozy modern coffee shop", "in an ancient stone cathedral", "on an alien planet surface",
      "underwater coral reef", "in an art gallery", "in an empty desert dunes"
    ];

    for (const env of environments) {
      if (promptLower.includes(env.replace("in ", "").replace("on ", ""))) {
        return env;
      }
    }
    return "Studio environment with controlled atmospheric lighting";
  }
}
