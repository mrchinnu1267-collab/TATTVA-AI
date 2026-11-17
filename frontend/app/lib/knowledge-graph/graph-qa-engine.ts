/**
 * TATTVA AI - Knowledge Graph Semantic & Relationship QA Engine
 * Performs graph-traversal grounded question answering with exact source citations,
 * multi-hop path explanations, and contradiction resolution.
 * Conceptualized & Engineered by Kotapati Gowtham Chowdary
 */

import { KnowledgeGraphStore } from "./graph-store";
import { ContradictionDetector } from "./contradiction-detector";
import { GraphQAResult, GraphQACitation, KnowledgeNode, KnowledgeEdge, TraversalPath } from "./types";

export class GraphQAEngine {
  /**
   * Answers relationship-based and factual questions using the tenant's knowledge graph.
   */
  public static async answerQuestion(
    store: KnowledgeGraphStore,
    question: string
  ): Promise<GraphQAResult> {
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return {
        question: "",
        answer: "Please provide a valid question to query the knowledge graph.",
        targetEntities: [],
        relationships: [],
        citations: [],
        contradictionsFound: [],
        confidence: 0,
      };
    }

    const q = question.trim();
    const allNodes = store.getAllNodes();

    // 1. Identify entities mentioned in the question
    const matchedNodes: KnowledgeNode[] = [];
    for (const node of allNodes) {
      const names = [node.name, ...node.aliases];
      for (const name of names) {
        const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, "i");
        if (regex.test(q)) {
          if (!matchedNodes.some((m) => m.id === node.id)) {
            matchedNodes.push(node);
          }
          break;
        }
      }
    }

    // If no direct matches, fallback to fuzzy search on keywords
    if (matchedNodes.length === 0) {
      const words = q.split(/\s+/).filter((w) => w.length > 3);
      for (const w of words) {
        const results = store.searchNodes(w, 2);
        for (const res of results) {
          if (!matchedNodes.some((m) => m.id === res.id)) {
            matchedNodes.push(res);
          }
        }
      }
    }

    // 2. Traversal & Relationship Analysis
    let traversalPath: TraversalPath | undefined;
    const collectedEdges = new Set<KnowledgeEdge>();
    const citations: GraphQACitation[] = [];

    if (matchedNodes.length >= 2) {
      // Find paths between the primary two matched entities
      const path = store.findShortestPath(matchedNodes[0].id, matchedNodes[1].id, 4);
      if (path) {
        traversalPath = path;
        for (const edge of path.edges) {
          collectedEdges.add(edge);
        }
      }
    }

    // Collect direct edges for each matched node
    for (const node of matchedNodes) {
      const edges = store.getEdgesForNode(node.id);
      for (const e of edges) {
        collectedEdges.add(e);
      }
    }

    // Extract citations from evidence snippets
    for (const edge of collectedEdges) {
      if (edge.evidenceSnippet) {
        citations.push({
          documentId: edge.sourceDocumentId,
          snippet: edge.evidenceSnippet,
          confidence: edge.confidence,
        });
      }
    }

    // 3. Scan for contradictions involving these entities
    const allContradictions = ContradictionDetector.detectContradictions(store);
    const relevantContradictions = allContradictions.filter((c) =>
      matchedNodes.some((n) => n.id === c.entityAId || n.id === c.entityBId)
    );

    // 4. Synthesize Answer
    const relationships = Array.from(collectedEdges);
    const answer = synthesizeGraphAnswer(q, matchedNodes, relationships, traversalPath, relevantContradictions);

    const confidence = matchedNodes.length > 0 ? (traversalPath ? 0.95 : 0.85) : 0.4;

    return {
      question: q,
      answer,
      targetEntities: matchedNodes,
      relationships,
      traversalPath,
      citations: citations.slice(0, 10),
      contradictionsFound: relevantContradictions,
      confidence,
    };
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function synthesizeGraphAnswer(
  question: string,
  nodes: KnowledgeNode[],
  relationships: KnowledgeEdge[],
  path?: TraversalPath,
  contradictions: any[] = []
): string {
  if (nodes.length === 0) {
    return `No entities matching the query were found in your knowledge graph. You can ingest relevant documentation or code to populate relationships.`;
  }

  const sections: string[] = [];

  // Entity Overview
  const entityDesc = nodes
    .map((n) => `**${n.name}** (${n.type}): ${n.description || "Identified domain entity"}`)
    .join("\n- ");
  sections.push(`### Relevant Entities\n- ${entityDesc}`);

  // Path & Connectivity Explanation
  if (path && path.edges.length > 0) {
    sections.push(
      `### Structural Connection (${path.hopCount} hop${path.hopCount > 1 ? "s" : ""})\n` +
      `${path.explanation}.\n\n` +
      `This establishes a direct architectural linkage between **${path.nodes[0].name}** and **${path.nodes[path.nodes.length - 1].name}**.`
    );
  } else if (relationships.length > 0) {
    const relSummary = relationships
      .slice(0, 8)
      .map((r) => {
        return `- [${r.relation.toUpperCase()}] Evidence: "${r.evidenceSnippet.slice(0, 180)}..." (Confidence: ${(r.confidence * 100).toFixed(0)}%)`;
      })
      .join("\n");
    sections.push(`### Discovered Relationships\n${relSummary}`);
  }

  // Contradictions or Caveats
  if (contradictions.length > 0) {
    const contraSummary = contradictions
      .map(
        (c) =>
          `- **Conflict between ${c.entityAName} & ${c.entityBName}** (${c.severity.toUpperCase()}):\n  * Claim A: ${c.claimA}\n  * Claim B: ${c.claimB}\n  * Suggestion: ${c.resolutionSuggestion}`
      )
      .join("\n");
    sections.push(`### ⚠️ Identified Contradictions & Outdated Claims\n${contraSummary}`);
  }

  return sections.join("\n\n");
}
