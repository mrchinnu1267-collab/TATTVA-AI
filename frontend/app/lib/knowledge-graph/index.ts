/**
 * TATTVA AI - Knowledge Graph Engine Facade
 * Unified entry point for multi-tenant entity extraction, graph organization,
 * relationship traversal, and semantic QA.
 * Conceptualized & Engineered by Kotapati Gowtham Chowdary
 */

import { KnowledgeGraphStore } from "./graph-store";
import { EntityExtractor } from "./entity-extractor";
import { ContradictionDetector } from "./contradiction-detector";
import { GraphQAEngine } from "./graph-qa-engine";
import {
  KnowledgeNode,
  KnowledgeEdge,
  Subgraph,
  TraversalPath,
  GraphQAResult,
  Contradiction,
  GraphIngestionResult,
} from "./types";

export * from "./types";
export { KnowledgeGraphStore } from "./graph-store";
export { EntityExtractor } from "./entity-extractor";
export { ContradictionDetector } from "./contradiction-detector";
export { GraphQAEngine } from "./graph-qa-engine";

export class KnowledgeGraphEngine {
  /**
   * Ingest text or document content into the tenant's knowledge graph
   */
  public static async ingestContent(
    tenantId: string,
    workspaceId: string,
    content: string,
    sourceDocumentId?: string
  ): Promise<GraphIngestionResult> {
    const store = KnowledgeGraphStore.getInstance(tenantId, workspaceId);
    const extraction = EntityExtractor.extractFromText(content);

    let nodesCreated = 0;
    let nodesUpdated = 0;
    let edgesCreated = 0;

    const nodeNameToId = new Map<string, string>();

    // 1. Ingest entities
    for (const ent of extraction.entities) {
      const existing = store.getNode(ent.name);
      const node = store.addOrUpdateNode({
        name: ent.name,
        type: ent.type,
        description: ent.description,
        aliases: ent.aliases,
        sourceDocumentIds: sourceDocumentId ? [sourceDocumentId] : [],
        confidence: ent.confidence,
        properties: ent.properties,
      });

      nodeNameToId.set(ent.name.toLowerCase(), node.id);
      if (existing) {
        nodesUpdated++;
      } else {
        nodesCreated++;
      }
    }

    // 2. Ingest relations
    for (const rel of extraction.relations) {
      const srcId = nodeNameToId.get(rel.sourceName.toLowerCase()) || store.getNode(rel.sourceName)?.id;
      const tgtId = nodeNameToId.get(rel.targetName.toLowerCase()) || store.getNode(rel.targetName)?.id;

      if (srcId && tgtId) {
        store.addEdge({
          sourceNodeId: srcId,
          targetNodeId: tgtId,
          relation: rel.relation,
          confidence: rel.confidence,
          evidenceSnippet: rel.evidenceSnippet,
          sourceDocumentId,
          weight: 1.0,
        });
        edgesCreated++;
      }
    }

    // 3. Scan for contradictions
    const contradictions = ContradictionDetector.detectContradictions(store);

    return {
      nodesCreated,
      nodesUpdated,
      edgesCreated,
      contradictionsDetected: contradictions.length,
      documentId: sourceDocumentId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Query a subgraph around a specific node or entity name
   */
  public static getSubgraph(
    tenantId: string,
    workspaceId: string,
    seedNodeOrName: string,
    depth: number = 2
  ): Subgraph {
    const store = KnowledgeGraphStore.getInstance(tenantId, workspaceId);
    return store.extractSubgraph(seedNodeOrName, depth);
  }

  /**
   * Traverse relationship paths between two entities
   */
  public static traversePath(
    tenantId: string,
    workspaceId: string,
    source: string,
    target: string
  ): TraversalPath | null {
    const store = KnowledgeGraphStore.getInstance(tenantId, workspaceId);
    return store.findShortestPath(source, target);
  }

  /**
   * Answer natural language questions using graph traversal and citations
   */
  public static async queryGraphQA(
    tenantId: string,
    workspaceId: string,
    question: string
  ): Promise<GraphQAResult> {
    const store = KnowledgeGraphStore.getInstance(tenantId, workspaceId);
    return GraphQAEngine.answerQuestion(store, question);
  }

  /**
   * Detect contradictions across the tenant's knowledge graph
   */
  public static getContradictions(tenantId: string, workspaceId: string): Contradiction[] {
    const store = KnowledgeGraphStore.getInstance(tenantId, workspaceId);
    return ContradictionDetector.detectContradictions(store);
  }

  /**
   * Retrieve graph statistics
   */
  public static getStats(tenantId: string, workspaceId: string) {
    const store = KnowledgeGraphStore.getInstance(tenantId, workspaceId);
    return store.getStats();
  }

  /**
   * Search nodes
   */
  public static searchNodes(tenantId: string, workspaceId: string, query: string, limit: number = 10): KnowledgeNode[] {
    const store = KnowledgeGraphStore.getInstance(tenantId, workspaceId);
    return store.searchNodes(query, limit);
  }
}
