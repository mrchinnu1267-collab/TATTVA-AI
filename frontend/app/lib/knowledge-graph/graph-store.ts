/**
 * TATTVA AI - Tenant-Isolated Knowledge Graph Store
 * Manages directed property knowledge graphs with tenant/workspace partition,
 * adjacency indexing, topological path traversal, and multi-hop neighborhood queries.
 * Conceptualized & Engineered by Kotapati Gowtham Chowdary
 */

import { KnowledgeNode, KnowledgeEdge, Subgraph, TraversalPath } from "./types";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export interface GraphStoreOptions {
  tenantId: string;
  workspaceId: string;
}

const STORAGE_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", ".tattva_knowledge_graphs")
    : path.join(process.cwd(), ".tattva_knowledge_graphs");

function getStoragePath(tenantId: string, workspaceId: string): string {
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeWs = workspaceId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(STORAGE_DIR, `${safeTenant}__${safeWs}.json`);
}

export class KnowledgeGraphStore {
  private static instances = new Map<string, KnowledgeGraphStore>();

  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, KnowledgeEdge> = new Map();
  // Adjacency index: nodeId -> Set of edgeIds (both outgoing and incoming for bidirectional traversal)
  private outgoingEdges: Map<string, Set<string>> = new Map();
  private incomingEdges: Map<string, Set<string>> = new Map();
  private nameIndex: Map<string, string> = new Map(); // normalized name -> nodeId

  private tenantId: string;
  private workspaceId: string;

  private constructor(tenantId: string, workspaceId: string) {
    this.tenantId = tenantId;
    this.workspaceId = workspaceId;
    this.loadFromDisk();
  }

  public saveToDisk(): void {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      const filePath = getStoragePath(this.tenantId, this.workspaceId);
      const data = {
        nodes: Array.from(this.nodes.values()),
        edges: Array.from(this.edges.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");
    } catch {
      // Non-blocking in ephemeral execution
    }
  }

  public loadFromDisk(): void {
    try {
      const filePath = getStoragePath(this.tenantId, this.workspaceId);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.nodes)) {
          for (const n of data.nodes) {
            this.nodes.set(n.id, n);
            this.nameIndex.set(n.name.trim().toLowerCase(), n.id);
            for (const a of n.aliases || []) {
              this.nameIndex.set(a.trim().toLowerCase(), n.id);
            }
            if (!this.outgoingEdges.has(n.id)) this.outgoingEdges.set(n.id, new Set());
            if (!this.incomingEdges.has(n.id)) this.incomingEdges.set(n.id, new Set());
          }
        }
        if (Array.isArray(data.edges)) {
          for (const e of data.edges) {
            this.edges.set(e.id, e);
            if (!this.outgoingEdges.has(e.sourceNodeId)) this.outgoingEdges.set(e.sourceNodeId, new Set());
            if (!this.incomingEdges.has(e.targetNodeId)) this.incomingEdges.set(e.targetNodeId, new Set());
            this.outgoingEdges.get(e.sourceNodeId)!.add(e.id);
            this.incomingEdges.get(e.targetNodeId)!.add(e.id);
          }
        }
      }
    } catch {
      // Non-blocking
    }
  }

  /**
   * Get or create a tenant-isolated instance of KnowledgeGraphStore
   */
  public static getInstance(tenantId: string, workspaceId: string = "default"): KnowledgeGraphStore {
    const key = `${tenantId.trim()}::${workspaceId.trim()}`;
    if (!KnowledgeGraphStore.instances.has(key)) {
      KnowledgeGraphStore.instances.set(key, new KnowledgeGraphStore(tenantId, workspaceId));
    }
    return KnowledgeGraphStore.instances.get(key)!;
  }

  /**
   * Clear all stores (used for testing or tenant reset)
   */
  public static resetAll(): void {
    KnowledgeGraphStore.instances.clear();
  }

  // --- Node Operations ---

  public addOrUpdateNode(node: Omit<KnowledgeNode, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt"> & { id?: string }): KnowledgeNode {
    const normName = node.name.trim().toLowerCase();
    const existingId = this.nameIndex.get(normName) || node.id;

    const now = new Date().toISOString();

    if (existingId && this.nodes.has(existingId)) {
      const existing = this.nodes.get(existingId)!;
      // Merge properties and documents
      const mergedAliases = Array.from(new Set([...existing.aliases, ...node.aliases]));
      const mergedDocs = Array.from(new Set([...existing.sourceDocumentIds, ...(node.sourceDocumentIds || [])]));
      const updated: KnowledgeNode = {
        ...existing,
        name: node.name,
        type: node.type || existing.type,
        description: node.description && node.description.length > existing.description.length ? node.description : existing.description,
        aliases: mergedAliases,
        sourceDocumentIds: mergedDocs,
        confidence: Math.max(existing.confidence, node.confidence || 0.8),
        properties: { ...existing.properties, ...node.properties },
        updatedAt: now,
      };
      this.nodes.set(existing.id, updated);
      return updated;
    }

    const id = node.id || `node_${crypto.randomBytes(6).toString("hex")}`;
    const newNode: KnowledgeNode = {
      id,
      name: node.name.trim(),
      type: node.type,
      description: node.description || "",
      aliases: node.aliases || [],
      sourceDocumentIds: node.sourceDocumentIds || [],
      confidence: node.confidence ?? 0.85,
      tenantId: this.tenantId,
      workspaceId: this.workspaceId,
      createdAt: now,
      updatedAt: now,
      properties: node.properties || {},
    };

    this.nodes.set(id, newNode);
    this.nameIndex.set(normName, id);
    for (const alias of newNode.aliases) {
      this.nameIndex.set(alias.trim().toLowerCase(), id);
    }

    this.outgoingEdges.set(id, new Set());
    this.incomingEdges.set(id, new Set());
    this.saveToDisk();
    return newNode;
  }

  public getNode(idOrName: string): KnowledgeNode | undefined {
    if (this.nodes.has(idOrName)) {
      return this.nodes.get(idOrName);
    }
    const id = this.nameIndex.get(idOrName.trim().toLowerCase());
    return id ? this.nodes.get(id) : undefined;
  }

  public searchNodes(query: string, limit: number = 10): KnowledgeNode[] {
    const q = query.trim().toLowerCase();
    if (!q) return Array.from(this.nodes.values()).slice(0, limit);

    const matches: Array<{ node: KnowledgeNode; score: number }> = [];

    for (const node of this.nodes.values()) {
      let score = 0;
      const nName = node.name.toLowerCase();
      if (nName === q) score += 100;
      else if (nName.startsWith(q)) score += 50;
      else if (nName.includes(q)) score += 30;

      for (const alias of node.aliases) {
        const aName = alias.toLowerCase();
        if (aName === q) score += 90;
        else if (aName.includes(q)) score += 20;
      }

      if (node.description.toLowerCase().includes(q)) score += 10;
      if (node.type.toLowerCase().includes(q)) score += 5;

      if (score > 0) {
        matches.push({ node, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit).map((m) => m.node);
  }

  // --- Edge Operations ---

  public addEdge(edge: Omit<KnowledgeEdge, "id" | "tenantId" | "workspaceId" | "createdAt"> & { id?: string }): KnowledgeEdge {
    const sourceNode = this.getNode(edge.sourceNodeId);
    const targetNode = this.getNode(edge.targetNodeId);

    if (!sourceNode || !targetNode) {
      throw new Error(`Cannot create edge: source or target node not found (${edge.sourceNodeId} -> ${edge.targetNodeId})`);
    }

    // Check for existing edge with same source, target, and relation
    const existingOut = this.outgoingEdges.get(sourceNode.id);
    if (existingOut) {
      for (const edgeId of existingOut) {
        const e = this.edges.get(edgeId);
        if (e && e.targetNodeId === targetNode.id && e.relation === edge.relation) {
          // Update confidence and evidence if stronger
          e.confidence = Math.max(e.confidence, edge.confidence || 0.8);
          if (edge.evidenceSnippet && !e.evidenceSnippet.includes(edge.evidenceSnippet)) {
            e.evidenceSnippet = `${e.evidenceSnippet} | ${edge.evidenceSnippet}`.slice(0, 500);
          }
          return e;
        }
      }
    }

    const id = edge.id || `edge_${crypto.randomBytes(6).toString("hex")}`;
    const newEdge: KnowledgeEdge = {
      id,
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
      relation: edge.relation,
      confidence: edge.confidence ?? 0.85,
      evidenceSnippet: edge.evidenceSnippet || "",
      sourceDocumentId: edge.sourceDocumentId,
      tenantId: this.tenantId,
      workspaceId: this.workspaceId,
      createdAt: new Date().toISOString(),
      weight: edge.weight ?? 1.0,
    };

    this.edges.set(id, newEdge);

    if (!this.outgoingEdges.has(sourceNode.id)) this.outgoingEdges.set(sourceNode.id, new Set());
    if (!this.incomingEdges.has(targetNode.id)) this.incomingEdges.set(targetNode.id, new Set());

    this.outgoingEdges.get(sourceNode.id)!.add(id);
    this.incomingEdges.get(targetNode.id)!.add(id);
    this.saveToDisk();

    return newEdge;
  }

  public getEdgesForNode(nodeId: string): KnowledgeEdge[] {
    const outIds = this.outgoingEdges.get(nodeId) || new Set();
    const inIds = this.incomingEdges.get(nodeId) || new Set();
    const allEdgeIds = new Set([...outIds, ...inIds]);
    return Array.from(allEdgeIds).map((id) => this.edges.get(id)!).filter(Boolean);
  }

  // --- Subgraph & Neighborhood Queries ---

  public getNeighbors(nodeId: string): { incoming: Array<{ node: KnowledgeNode; edge: KnowledgeEdge }>; outgoing: Array<{ node: KnowledgeNode; edge: KnowledgeEdge }> } {
    const outEdges = this.outgoingEdges.get(nodeId) || new Set();
    const inEdges = this.incomingEdges.get(nodeId) || new Set();

    const outgoing: Array<{ node: KnowledgeNode; edge: KnowledgeEdge }> = [];
    for (const eid of outEdges) {
      const edge = this.edges.get(eid);
      if (edge && this.nodes.has(edge.targetNodeId)) {
        outgoing.push({ node: this.nodes.get(edge.targetNodeId)!, edge });
      }
    }

    const incoming: Array<{ node: KnowledgeNode; edge: KnowledgeEdge }> = [];
    for (const eid of inEdges) {
      const edge = this.edges.get(eid);
      if (edge && this.nodes.has(edge.sourceNodeId)) {
        incoming.push({ node: this.nodes.get(edge.sourceNodeId)!, edge });
      }
    }

    return { incoming, outgoing };
  }

  public extractSubgraph(seedNodeIdOrName: string, depth: number = 2): Subgraph {
    const seed = this.getNode(seedNodeIdOrName);
    if (!seed) {
      return { nodes: [], edges: [], depth };
    }

    const visitedNodes = new Set<string>([seed.id]);
    const collectedEdges = new Set<string>();

    let currentLevel = [seed.id];

    for (let d = 0; d < depth; d++) {
      const nextLevel: string[] = [];
      for (const nid of currentLevel) {
        const outE = this.outgoingEdges.get(nid) || new Set();
        const inE = this.incomingEdges.get(nid) || new Set();

        for (const eid of outE) {
          collectedEdges.add(eid);
          const e = this.edges.get(eid);
          if (e && !visitedNodes.has(e.targetNodeId)) {
            visitedNodes.add(e.targetNodeId);
            nextLevel.push(e.targetNodeId);
          }
        }

        for (const eid of inE) {
          collectedEdges.add(eid);
          const e = this.edges.get(eid);
          if (e && !visitedNodes.has(e.sourceNodeId)) {
            visitedNodes.add(e.sourceNodeId);
            nextLevel.push(e.sourceNodeId);
          }
        }
      }
      currentLevel = nextLevel;
      if (currentLevel.length === 0) break;
    }

    const nodes = Array.from(visitedNodes).map((id) => this.nodes.get(id)!).filter(Boolean);
    const edges = Array.from(collectedEdges).map((id) => this.edges.get(id)!).filter(Boolean);

    return {
      nodes,
      edges,
      centerNodeId: seed.id,
      depth,
    };
  }

  // --- Path Traversal & Shortest Path (BFS) ---

  public findShortestPath(startIdOrName: string, endIdOrName: string, maxHops: number = 4): TraversalPath | null {
    const startNode = this.getNode(startIdOrName);
    const endNode = this.getNode(endIdOrName);

    if (!startNode || !endNode) return null;
    if (startNode.id === endNode.id) {
      return {
        nodes: [startNode],
        edges: [],
        hopCount: 0,
        explanation: `${startNode.name} is the identical node.`,
      };
    }

    // BFS Queue: [currentNodeId, pathNodes, pathEdges]
    interface QueueItem {
      currId: string;
      nodes: KnowledgeNode[];
      edges: KnowledgeEdge[];
    }

    const queue: QueueItem[] = [{ currId: startNode.id, nodes: [startNode], edges: [] }];
    const visited = new Set<string>([startNode.id]);

    while (queue.length > 0) {
      const { currId, nodes, edges } = queue.shift()!;

      if (edges.length >= maxHops) continue;

      const outEdges = this.outgoingEdges.get(currId) || new Set();
      for (const eid of outEdges) {
        const edge = this.edges.get(eid);
        if (!edge) continue;

        const nextNode = this.nodes.get(edge.targetNodeId);
        if (!nextNode) continue;

        if (nextNode.id === endNode.id) {
          const finalNodes = [...nodes, nextNode];
          const finalEdges = [...edges, edge];
          const explanation = finalEdges
            .map((e, idx) => `${finalNodes[idx].name} --[${e.relation}]--> ${finalNodes[idx + 1].name}`)
            .join(", then ");

          return {
            nodes: finalNodes,
            edges: finalEdges,
            hopCount: finalEdges.length,
            explanation,
          };
        }

        if (!visited.has(nextNode.id)) {
          visited.add(nextNode.id);
          queue.push({
            currId: nextNode.id,
            nodes: [...nodes, nextNode],
            edges: [...edges, edge],
          });
        }
      }
    }

    return null;
  }

  // --- Statistics & Health ---

  public getStats(): { totalNodes: number; totalEdges: number; tenantId: string; workspaceId: string } {
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      tenantId: this.tenantId,
      workspaceId: this.workspaceId,
    };
  }

  public getAllNodes(): KnowledgeNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): KnowledgeEdge[] {
    return Array.from(this.edges.values());
  }
}
