/**
 * TATTVA AI - Scene Graph Generation & Semantic Relationship Engine (Phase R)
 * Converts unstructured natural language instructions into hierarchical Scene Graphs
 * containing entities, attribute tuples, spatial/semantic relationship edges,
 * and camera/lighting specifications.
 */

import { SceneGraph, SceneNode, SceneEdge, RelationshipType, EntityAttribute } from "./types";

export class SceneGraphGenerator {
  /**
   * Generates a structured Scene Graph from a user generation prompt.
   */
  public static generate(prompt: string): SceneGraph {
    const p = prompt.trim();
    const id = `sg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const nodes: SceneNode[] = [];
    const edges: SceneEdge[] = [];
    const detectedContradictions: string[] = [];

    // 1. Identify primary entities & quantities
    const entities = this.extractEntities(p);
    entities.forEach((ent, index) => {
      const nodeId = `node_${index + 1}_${ent.name.toLowerCase().replace(/\s+/g, "_")}`;
      nodes.push({
        id: nodeId,
        name: ent.name,
        entityType: index === 0 ? "subject" : "secondary_object",
        quantity: ent.quantity,
        attributes: ent.attributes,
        boundingBox: this.estimateBoundingBox(ent.name, index, entities.length),
        layerDepth: index === 0 ? "foreground" : index === 1 ? "midground" : "background",
      });
    });

    // 2. Identify spatial and semantic relationships between extracted entities
    const rels = this.extractRelationships(p, nodes);
    rels.forEach((rel, idx) => {
      edges.push({
        id: `edge_${idx + 1}`,
        sourceNodeId: rel.sourceId,
        targetNodeId: rel.targetId,
        relationship: rel.type,
        confidence: rel.confidence,
        spatialTolerancePx: 30,
      });
    });

    // 3. Extract Camera & Lighting Settings
    const cameraSettings = this.extractCameraSettings(p);
    const lightingPlan = this.extractLightingPlan(p);

    // 4. Validate Graph Consistency (e.g. A left of B while B left of A)
    const isGraphConsistent = this.validateConsistency(edges, detectedContradictions);

    return {
      id,
      rawPrompt: p,
      rootSceneTitle: nodes[0]?.name ? `Scene centered on ${nodes[0].name}` : "General Scene",
      nodes,
      edges,
      cameraSettings,
      lightingPlan,
      isGraphConsistent,
      detectedContradictions,
    };
  }

  private static extractEntities(prompt: string): Array<{ name: string; quantity: number; attributes: EntityAttribute[] }> {
    const list: Array<{ name: string; quantity: number; attributes: EntityAttribute[] }> = [];
    const lower = prompt.toLowerCase();

    // Word counts map
    const countWords: Record<string, number> = {
      one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    };

    // Colors
    const colors = ["red", "blue", "green", "black", "white", "golden", "silver", "crimson", "azure", "emerald", "amber"];
    // Materials
    const materials = ["glass", "wooden", "marble", "metallic", "ceramic", "leather", "titanium", "stone", "bronze"];

    // Match patterns like "a red car", "two tall trees", "a blue house"
    const regex = /\b(one|two|three|four|five|six|seven|eight|nine|ten|a|an|\d+)?\s*([a-z]+)?\s*([a-z]+)?\s*(car|house|tree|trees|apples?|cherries?|pavilion|easel|clock|books?|dog|artist|mountain|lake|temple|station|watchmaker|pomegranate)\b/gi;
    let match;

    while ((match = regex.exec(lower)) !== null) {
      const words = [match[1], match[2], match[3]].filter(Boolean).map((w) => w.toLowerCase());
      let quantity = 1;
      for (const w of words) {
        if (!isNaN(Number(w))) {
          quantity = Number(w);
        } else if (countWords[w]) {
          quantity = countWords[w];
        }
      }

      const noun = match[4].toLowerCase();
      const attributes: EntityAttribute[] = [];
      const potentialAttrs = words.filter((w) => isNaN(Number(w)) && !countWords[w]);

      for (const attr of potentialAttrs) {
        if (!attr) continue;
        const a = attr.toLowerCase();
        if (colors.includes(a)) {
          attributes.push({ category: "color", name: "color", value: a, confidence: 0.95 });
        } else if (materials.includes(a)) {
          attributes.push({ category: "material", name: "material", value: a, confidence: 0.92 });
        } else {
          attributes.push({ category: "texture", name: "style", value: a, confidence: 0.85 });
        }
      }

      // Quantity attribute
      attributes.push({ category: "quantity", name: "count", value: String(quantity), confidence: 1.0 });

      list.push({
        name: noun,
        quantity,
        attributes,
      });
    }

    // Default fallback if regex captured nothing
    if (list.length === 0) {
      list.push({
        name: "main_subject",
        quantity: 1,
        attributes: [{ category: "state", name: "salience", value: "primary", confidence: 0.8 }],
      });
    }

    return list;
  }

  private static extractRelationships(
    prompt: string,
    nodes: SceneNode[]
  ): Array<{ sourceId: string; targetId: string; type: RelationshipType; confidence: number }> {
    const rels: Array<{ sourceId: string; targetId: string; type: RelationshipType; confidence: number }> = [];
    const lower = prompt.toLowerCase();

    if (nodes.length >= 2) {
      if (lower.includes("left of")) {
        rels.push({ sourceId: nodes[0].id, targetId: nodes[1].id, type: "left_of", confidence: 0.95 });
      } else if (lower.includes("right of")) {
        rels.push({ sourceId: nodes[0].id, targetId: nodes[1].id, type: "right_of", confidence: 0.95 });
      }

      if (lower.includes("behind") && nodes.length >= 3) {
        rels.push({ sourceId: nodes[2].id, targetId: nodes[1].id, type: "behind", confidence: 0.9 });
      } else if (lower.includes("in front of") && nodes.length >= 2) {
        rels.push({ sourceId: nodes[0].id, targetId: nodes[1].id, type: "in_front_of", confidence: 0.9 });
      }

      if (lower.includes("wearing") || lower.includes("with a") || lower.includes("holding")) {
        rels.push({ sourceId: nodes[0].id, targetId: nodes[1].id, type: "holding", confidence: 0.88 });
      }
    }

    return rels;
  }

  private static estimateBoundingBox(name: string, index: number, total: number): [number, number, number, number] {
    if (total === 1) {
      return [150, 150, 850, 850];
    }
    if (index === 0) {
      return [200, 100, 800, 480]; // Left half
    } else if (index === 1) {
      return [200, 520, 800, 900]; // Right half
    }
    return [50, 400, 350, 700]; // Background top
  }

  private static extractCameraSettings(prompt: string) {
    const lower = prompt.toLowerCase();
    let lens = "50mm Standard Prime";
    if (lower.includes("macro")) lens = "100mm f/2.8 Macro";
    else if (lower.includes("telephoto")) lens = "200mm f/2.8 Telephoto";
    else if (lower.includes("wide") || lower.includes("aerial")) lens = "24mm Ultra-Wide";

    let angle = "Eye-level";
    if (lower.includes("low-angle")) angle = "Low-angle heroic";
    else if (lower.includes("aerial") || lower.includes("top-down")) angle = "Overhead Birds-Eye";

    return { lens, angle, framing: "Cinematic 16:9 composition" };
  }

  private static extractLightingPlan(prompt: string) {
    const lower = prompt.toLowerCase();
    let primary = "Soft natural daylight";
    if (lower.includes("sunset") || lower.includes("golden hour")) primary = "Warm golden hour directional light";
    else if (lower.includes("neon") || lower.includes("twilight")) primary = "Vibrant neon rim lighting";
    else if (lower.includes("studio")) primary = "Three-point high-CRI softbox studio lighting";

    return {
      primaryLight: primary,
      ambientLight: "Subtle diffuse bounce fill",
      direction: "35-degree key light offset",
    };
  }

  private static validateConsistency(edges: SceneEdge[], contradictions: string[]): boolean {
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const e1 = edges[i];
        const e2 = edges[j];
        if (
          e1.sourceNodeId === e2.targetNodeId &&
          e1.targetNodeId === e2.sourceNodeId &&
          e1.relationship === "left_of" &&
          e2.relationship === "left_of"
        ) {
          contradictions.push(`Conflicting circular spatial relationship: Node ${e1.sourceNodeId} and Node ${e1.targetNodeId} cannot both be left of each other.`);
          return false;
        }
      }
    }
    return true;
  }
}

