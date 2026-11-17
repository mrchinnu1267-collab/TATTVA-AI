/**
 * TATTVA AI - Knowledge Graph Contradiction & Freshness Detector
 * Detects semantic conflicts, contradictory claims, and outdated information
 * across ingested documents and connected entities.
 * Conceptualized & Engineered by Kotapati Gowtham Chowdary
 */

import { KnowledgeGraphStore } from "./graph-store";
import { Contradiction, KnowledgeNode, KnowledgeEdge } from "./types";
import * as crypto from "node:crypto";

export class ContradictionDetector {
  /**
   * Scans a knowledge graph store for contradictions, incompatibilities,
   * and outdated property conflicts.
   */
  public static detectContradictions(store: KnowledgeGraphStore): Contradiction[] {
    const contradictions: Contradiction[] = [];
    const edges = store.getAllEdges();
    const nodes = store.getAllNodes();
    const nodesById = new Map<string, KnowledgeNode>(nodes.map((n) => [n.id, n]));

    // 1. Detect explicit 'contradicts' edges
    for (const edge of edges) {
      if (edge.relation === "contradicts") {
        const src = nodesById.get(edge.sourceNodeId);
        const tgt = nodesById.get(edge.targetNodeId);
        if (src && tgt) {
          contradictions.push({
            id: `contra_${crypto.randomBytes(6).toString("hex")}`,
            entityAId: src.id,
            entityBId: tgt.id,
            entityAName: src.name,
            entityBName: tgt.name,
            claimA: `${src.name} is marked as contradictory or incompatible with ${tgt.name}.`,
            claimB: edge.evidenceSnippet || "Direct incompatibility identified in document source.",
            docAId: edge.sourceDocumentId,
            detectedAt: new Date().toISOString(),
            severity: "high",
            resolutionSuggestion: `Review architectural compatibility matrices between ${src.name} and ${tgt.name}. Verify if a shim, adapter, or version upgrade resolves the conflict.`,
          });
        }
      }
    }

    // 2. Detect conflicting relational edges between the same two entities
    // e.g. A alternative_to B AND A part_of B (mutually conflicting roles)
    const pairEdges = new Map<string, KnowledgeEdge[]>();
    for (const edge of edges) {
      const pairKey = [edge.sourceNodeId, edge.targetNodeId].sort().join("::");
      if (!pairEdges.has(pairKey)) {
        pairEdges.set(pairKey, []);
      }
      pairEdges.get(pairKey)!.push(edge);
    }

    for (const [pairKey, eList] of pairEdges.entries()) {
      const hasAlternative = eList.find((e) => e.relation === "alternative_to");
      const hasPartOf = eList.find((e) => e.relation === "part_of");
      const hasExtends = eList.find((e) => e.relation === "extends");

      if (hasAlternative && hasPartOf) {
        const [idA, idB] = pairKey.split("::");
        const nodeA = nodesById.get(idA);
        const nodeB = nodesById.get(idB);
        if (nodeA && nodeB) {
          contradictions.push({
            id: `contra_${crypto.randomBytes(6).toString("hex")}`,
            entityAId: nodeA.id,
            entityBId: nodeB.id,
            entityAName: nodeA.name,
            entityBName: nodeB.name,
            claimA: `Document claims ${nodeA.name} is an alternative to ${nodeB.name}: "${hasAlternative.evidenceSnippet}"`,
            claimB: `Document claims ${nodeA.name} is a component/part of ${nodeB.name}: "${hasPartOf.evidenceSnippet}"`,
            docAId: hasAlternative.sourceDocumentId,
            docBId: hasPartOf.sourceDocumentId,
            detectedAt: new Date().toISOString(),
            severity: "medium",
            resolutionSuggestion: `Clarify whether ${nodeA.name} is an independent replacement or an integrated subsystem of ${nodeB.name}. Check document author dates.`,
          });
        }
      }

      if (hasAlternative && hasExtends) {
        const [idA, idB] = pairKey.split("::");
        const nodeA = nodesById.get(idA);
        const nodeB = nodesById.get(idB);
        if (nodeA && nodeB) {
          contradictions.push({
            id: `contra_${crypto.randomBytes(6).toString("hex")}`,
            entityAId: nodeA.id,
            entityBId: nodeB.id,
            entityAName: nodeA.name,
            entityBName: nodeB.name,
            claimA: `Relationship indicates direct alternative: "${hasAlternative.evidenceSnippet}"`,
            claimB: `Relationship indicates direct inheritance/extension: "${hasExtends.evidenceSnippet}"`,
            docAId: hasAlternative.sourceDocumentId,
            docBId: hasExtends.sourceDocumentId,
            detectedAt: new Date().toISOString(),
            severity: "low",
            resolutionSuggestion: `Inspect whether ${nodeA.name} extends ${nodeB.name}'s interfaces while competing in functionality.`,
          });
        }
      }
    }

    // 3. Detect conflicting version / deprecation statements across descriptions & evidence
    for (const node of nodes) {
      const nodeEdges = store.getEdgesForNode(node.id);
      const deprecationEvidence = nodeEdges.find((e) =>
        e.evidenceSnippet.toLowerCase().includes("deprecated") ||
        e.relation === "supersedes"
      );
      const recommendedEvidence = nodeEdges.find((e) =>
        e.evidenceSnippet.toLowerCase().includes("recommended") ||
        e.evidenceSnippet.toLowerCase().includes("default choice") ||
        e.evidenceSnippet.toLowerCase().includes("standard")
      );

      if (deprecationEvidence && recommendedEvidence && deprecationEvidence.id !== recommendedEvidence.id) {
        contradictions.push({
          id: `contra_${crypto.randomBytes(6).toString("hex")}`,
          entityAId: node.id,
          entityBId: node.id,
          entityAName: node.name,
          entityBName: node.name,
          claimA: `Claimed as recommended or default: "${recommendedEvidence.evidenceSnippet}"`,
          claimB: `Claimed as deprecated or superseded: "${deprecationEvidence.evidenceSnippet}"`,
          docAId: recommendedEvidence.sourceDocumentId,
          docBId: deprecationEvidence.sourceDocumentId,
          detectedAt: new Date().toISOString(),
          severity: "high",
          resolutionSuggestion: `Outdated information detected: One document still marks ${node.name} as default, while a newer reference marks it as deprecated. Adopt the newer specification.`,
        });
      }
    }

    return contradictions;
  }
}
